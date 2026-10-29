import request from 'supertest';
import mongoose from 'mongoose';
import { createServer, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { Notification } from '../src/models/Notification';
import { RevokedToken } from '../src/models/RevokedToken';
import { attachLiveNotifications } from '../src/services/liveNotifications';
import { usableSigningSecret } from '../src/utils/secretPolicy';

describe('2026-10-25 audit regressions: evidence and logout', () => {
  const users: mongoose.Types.ObjectId[] = [];
  const suffix = Date.now();
  let sequence = 0, server: Server, wss: WebSocketServer, socketUrl: string;
  const password = 'IsolatedAudit2026!';
  const header = (token: string) => ({ Authorization: `Bearer ${token}` });
  async function account() {
    const user = await User.create({ name: 'Audit test citizen', email: `audit-check-${suffix}-${sequence++}@example.test`, password, role: 'citizen' });
    users.push(user._id);
    const login = await request(app).post('/api/auth/login').send({email:user.email,password});
    expect(login.status).toBe(200);
    return { user, token: login.body.data.token as string };
  }
  beforeAll(async () => {
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/civictrack_isolated_test');
    await mongoose.connect(env.MONGODB_URI);
    server = createServer(app); wss = attachLiveNotifications(server);
    await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
    socketUrl = `ws://127.0.0.1:${(server.address() as any).port}/api/notifications/live`;
  });
  afterAll(async () => {
    wss.clients.forEach(socket => socket.terminate());
    await new Promise<void>(resolve => wss.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    await Notification.deleteMany({recipient:{$in:users}});
    await RevokedToken.deleteMany({userId:{$in:users}});
    await Complaint.deleteMany({createdBy:{$in:users}});
    await User.deleteMany({_id:{$in:users}});
    await mongoose.disconnect();
  });
  it('discards client-supplied detection flags, confidence and boxes on a manual report', async () => {
    const { user, token } = await account();
    const res = await request(app).post('/api/complaints').set(header(token)).send({title:'Audit manual report',description:'A citizen-approved observation.',category:'pothole',imageUrl:'https://example.test/photo.jpg',latitude:13,longitude:80,
      aiDetected:true,aiClass:'fabricated',aiConfidence:.99,boundingBoxes:[{category:'fabricated',confidence:.99,bbox:{x1:1,y1:1,x2:100,y2:100},model:'fabricated'}]});
    expect(res.status).toBe(201);
    const stored = await Complaint.findOne({createdBy:user._id});
    expect(stored!.aiDetected).toBe(false); expect(stored!.aiClass).toBe('');
    expect(stored!.aiConfidence).toBe(0); expect(stored!.boundingBoxes).toHaveLength(0);
    expect(stored!.description).toBe('A citizen-approved observation.');
    expect(stored!.severity!.level).toBeNull();
  });
  it('rejects missing, short and placeholder production signing keys', () => {
    expect(usableSigningSecret(undefined)).toBe(false);
    expect(usableSigningSecret('short')).toBe(false);
    expect(usableSigningSecret('change_me_to_a_very_long_secret_for_production')).toBe(false);
    expect(usableSigningSecret('your_' + 'placeholder'.repeat(5))).toBe(false);
    expect(usableSigningSecret('89c5e41a'.repeat(8))).toBe(true);
  });
  it('rejects password changes beyond bcrypt’s 72 UTF-8 byte boundary', async () => {
    const { token } = await account();
    const res = await request(app).put('/api/auth/change-password').set(header(token)).send({oldPassword:password,newPassword:'é'.repeat(37)});
    expect(res.status).toBe(400);
  });
  it('issues distinct credentials for independent logins, even in the same second', async () => {
    const { user, token } = await account();
    const second = await request(app).post('/api/auth/login').send({email:user.email,password});
    expect(second.status).toBe(200); expect(second.body.data.token === token).toBe(false);
  });
  it('revokes only the logged-out token and allows a fresh login', async () => {
    const { user, token } = await account();
    const other = await request(app).post('/api/auth/login').send({email:user.email,password});
    expect((await request(app).post('/api/auth/logout').set(header(token))).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set(header(token))).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(header(other.body.data.token))).status).toBe(200);
    const fresh = await request(app).post('/api/auth/login').send({email:user.email,password});
    expect((await request(app).get('/api/auth/me').set(header(fresh.body.data.token))).status).toBe(200);
  });
  it('closes an authenticated live connection on logout and refuses revoked socket credentials', async () => {
    const { token } = await account();
    const socket = new WebSocket(socketUrl);
    await new Promise<void>((resolve,reject) => { socket.once('open',()=>socket.send(JSON.stringify({type:'authenticate',token}))); socket.once('message',()=>resolve()); socket.once('error',reject); });
    const closed = new Promise<number>(resolve => socket.once('close',resolve));
    try {
      expect((await request(app).post('/api/auth/logout').set(header(token))).status).toBe(200);
      // Bound the regression: the old implementation leaves an authenticated socket open.
      const code = await Promise.race([closed, new Promise<number>(resolve=>{const timer=setTimeout(()=>resolve(0),1000); timer.unref();})]);
      expect(code).toBe(1008);
    } finally { socket.terminate(); }
    const replay = new WebSocket(socketUrl);
    replay.on('open',()=>replay.send(JSON.stringify({type:'authenticate',token})));
    replay.on('message',()=>replay.close(1000));
    expect(await new Promise<number>(resolve=>replay.on('close',resolve))).toBe(1008);
  });
});
