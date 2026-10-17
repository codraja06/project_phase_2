import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';

const clients = new Map<string, Set<WebSocket>>();
export function publishNotificationChange(recipient: string) {
  clients.get(recipient)?.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'notifications-changed' }));
  });
}

export function attachLiveNotifications(server: Server) {
  const wss = new WebSocketServer({ server, path: '/api/notifications/live', maxPayload: 8192 });
  const alive = new WeakSet<WebSocket>();
  const heartbeat = setInterval(() => {
    wss.clients.forEach(socket => {
      if (!alive.has(socket)) return socket.terminate();
      alive.delete(socket); socket.ping();
    });
  }, 30000);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));
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
        if (!await User.exists({ _id: payload.userId })) throw new Error('Account unavailable');
        if (socket.readyState !== WebSocket.OPEN) return;
        recipient = payload.userId;
        const group = clients.get(recipient) || new Set<WebSocket>();
        group.add(socket); clients.set(recipient, group);
        clearTimeout(deadline);
        expiry = setTimeout(() => socket.close(1008, 'Session expired'), Math.max(0, payload.exp * 1000 - Date.now()));
        socket.send(JSON.stringify({ type: 'ready' }));
      } catch { socket.close(1008, 'Authentication failed'); }
    });
    socket.on('error', () => socket.close());
    socket.on('close', () => {
      clearTimeout(deadline); if (expiry) clearTimeout(expiry);
      if (recipient) { const group = clients.get(recipient); group?.delete(socket); if (!group?.size) clients.delete(recipient); }
    });
  });
  return wss;
}
