import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';
import { assertSessionActive, tokenFingerprint } from './sessionService';
import { Notification } from '../models/Notification';
import { NotificationDelivery } from '../models/NotificationDelivery';
import { RevokedToken } from '../models/RevokedToken';
import mongoose from 'mongoose';

const clients = new Map<string, Set<WebSocket>>();
const socketTokens = new WeakMap<WebSocket, string>();
const socketVersions = new WeakMap<WebSocket, number>();
const revisions = new Map<string, string>();

async function notificationRevision(recipient: string) {
  const [counts, delivery] = await Promise.all([
    Notification.aggregate([{ $match: { recipient: new mongoose.Types.ObjectId(recipient) } },
      { $group: { _id: null, total: { $sum: 1 }, unread: { $sum: { $cond: [{ $eq: ['$readAt', null] }, 1, 0] } }, changedAt: { $max: '$updatedAt' } } }]),
    NotificationDelivery.findOne({ recipient }).sort({ updatedAt: -1 }).select('_id updatedAt status attempts').lean(),
  ]);
  return JSON.stringify([counts[0] || null, delivery || null]);
}
export function closeSessionConnections(token: string) {
  const fingerprint = tokenFingerprint(token);
  clients.forEach(group => group.forEach(socket => {
    if (socketTokens.get(socket) === fingerprint) socket.close(1008, 'Session ended');
  }));
}
export function closeAccountConnections(userId: string) {
  clients.get(userId)?.forEach(socket => socket.close(1008, 'Credentials changed'));
}
function emitChange(recipient: string) {
  clients.get(recipient)?.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'notifications-changed' }));
  });
}
export async function publishNotificationChange(recipient: string) {
  if (!clients.has(recipient)) return; // Other processes observe the persisted database change.
  const revision = await notificationRevision(recipient);
  if (!clients.has(recipient)) return;
  revisions.set(recipient, revision);
  emitChange(recipient);
}

export function attachLiveNotifications(server: Server, options: { pollIntervalMs?: number } = {}) {
  const wss = new WebSocketServer({ server, path: '/api/notifications/live', maxPayload: 8192 });
  const alive = new WeakSet<WebSocket>();
  let polling = false;
  const relay = setInterval(async () => {
    if (polling) return;
    polling = true;
    try {
      for (const [recipient, group] of clients) {
        const [revision, user, revoked] = await Promise.all([
          notificationRevision(recipient), User.findById(recipient).select('sessionVersion').lean(),
          RevokedToken.find({ _id: { $in: [...group].map(socket => socketTokens.get(socket)) }, expiresAt: { $gt: new Date() } }).select('_id').lean(),
        ]);
        const ended = new Set(revoked.map(entry => entry._id));
        for (const socket of group) if (!user || ended.has(socketTokens.get(socket)!) || (socketVersions.get(socket) || 0) !== ((user as any).sessionVersion || 0)) socket.close(1008, 'Session ended');
        if (revisions.get(recipient) !== revision) { revisions.set(recipient, revision); emitChange(recipient); }
      }
    } catch { /* Stored records remain authoritative; reconnect/manual refresh is still available. */ }
    finally { polling = false; }
  }, options.pollIntervalMs || 1500);
  relay.unref();
  const heartbeat = setInterval(() => {
    wss.clients.forEach(socket => {
      if (!alive.has(socket)) return socket.terminate();
      alive.delete(socket); socket.ping();
    });
  }, 30000);
  heartbeat.unref();
  wss.on('close', () => { clearInterval(heartbeat); clearInterval(relay); });
  wss.on('connection', socket => {
    alive.add(socket);
    socket.on('pong', () => alive.add(socket));
    let recipient: string | undefined;
    let authenticating = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const deadline = setTimeout(() => socket.close(1008, 'Authentication required'), 5000);
    socket.on('message', async data => {
      if (recipient || authenticating) return;
      authenticating = true;
      try {
        const input = JSON.parse(data.toString());
        if (input.type !== 'authenticate' || typeof input.token !== 'string') throw new Error('Authentication required');
        const payload = verifyToken(input.token) as ReturnType<typeof verifyToken> & { exp: number };
        await assertSessionActive(input.token);
        const user = await User.findById(payload.userId).select('sessionVersion');
        if (!user || ((payload as any).sessionVersion || 0) !== (user.get('sessionVersion') || 0)) throw new Error('Account unavailable');
        if (socket.readyState !== WebSocket.OPEN) return;
        recipient = payload.userId;
        socketTokens.set(socket, tokenFingerprint(input.token));
        socketVersions.set(socket, (payload as any).sessionVersion || 0);
        if (!revisions.has(recipient)) revisions.set(recipient, await notificationRevision(recipient));
        if (socket.readyState !== WebSocket.OPEN) return;
        const group = clients.get(recipient) || new Set<WebSocket>();
        group.add(socket); clients.set(recipient, group);
        // Close the race where logout commits while this connection is being registered.
        await assertSessionActive(input.token);
        if (socket.readyState !== WebSocket.OPEN) return;
        clearTimeout(deadline);
        expiry = setTimeout(() => socket.close(1008, 'Session expired'), Math.max(0, payload.exp * 1000 - Date.now()));
        socket.send(JSON.stringify({ type: 'ready' }));
      } catch { socket.close(1008, 'Authentication failed'); }
    });
    socket.on('error', () => socket.close());
    socket.on('close', () => {
      clearTimeout(deadline); if (expiry) clearTimeout(expiry);
      if (recipient) { const group = clients.get(recipient); group?.delete(socket); if (!group?.size) { clients.delete(recipient); revisions.delete(recipient); } }
    });
  });
  return wss;
}
