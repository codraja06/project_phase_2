import request from 'supertest';
import mongoose from 'mongoose';
import { createServer, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { Notification } from '../src/models/Notification';
import { DepartmentRule } from '../src/models/DepartmentRule';
import { AdministrationAudit } from '../src/models/AdministrationAudit';
import { generateToken } from '../src/utils/jwt';
import { runNotificationOutboxPass } from '../src/services/notificationOutboxService';
import { attachLiveNotifications } from '../src/services/liveNotifications';
import { configureProvisionalMunicipality, proposedAvadiMappings } from '../src/services/municipalSetupService';
import { MongoRateLimitStore } from '../src/services/mongoRateLimitStore';
import { fork } from 'child_process';
import path from 'path';

jest.setTimeout(25000);
describe('Partial completion: durable events, shared delivery, sessions and provisional setup', () => {
  let citizen: any, officer: any, token: string, officerToken: string;
  let server: Server, wss: WebSocketServer;
  const suffix = Date.now(), password = 'PartialTestOnly2026!';
  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });
  const body = { title: 'Partial completion report', description: 'Observed condition recorded for an isolated test.', category: 'partial_test', assignedDepartment: 'Partial test department',
    latitude: 13.1, longitude: 80.2, imageUrl: 'https://example.test/report.jpg' };
  beforeAll(async () => {
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/civictrack_isolated_test');
    await mongoose.connect(env.MONGODB_URI); await Notification.init();
    citizen = await User.create({name:'Partial test citizen',email:`partial-citizen-${suffix}@example.test`,password,role:'citizen'});
    officer = await User.create({name:'Partial test officer',email:`partial-officer-${suffix}@example.test`,password,role:'authority',department:'Partial test department'});
    token = generateToken({userId:String(citizen._id),role:'citizen'});
    officerToken = generateToken({userId:String(officer._id),role:'authority'});
    server = createServer(app); wss = attachLiveNotifications(server,{pollIntervalMs:100});
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  });
  afterAll(async () => {
    jest.restoreAllMocks(); wss.clients.forEach(socket=>socket.terminate());
    await new Promise<void>(resolve=>wss.close(()=>resolve())); await new Promise<void>(resolve=>server.close(()=>resolve()));
    await Notification.deleteMany({recipient:{$in:[citizen._id,officer._id]}});
    await Complaint.deleteMany({createdBy:citizen._id});
    await DepartmentRule.deleteMany({updatedBy:officer._id});
    await AdministrationAudit.deleteMany({subject:officer._id});
    await User.deleteMany({_id:{$in:[citizen._id,officer._id]}}); await mongoose.disconnect();
  });
  it('commits a receipt intent with the complaint and recovers failed notification writes exactly once', async () => {
    const failed = jest.spyOn(Notification,'updateOne').mockRejectedValueOnce(new Error('Isolated write outage'));
    const response = await request(app).post('/api/complaints').set(auth(token)).send(body); failed.mockRestore();
    expect(response.status).toBe(201);
    expect(response.body.data.notificationOutbox).toBeUndefined();
    const stored = await Complaint.findById(response.body.data._id).select('+notificationOutbox +notificationOutboxPending');
    expect(stored!.notificationOutboxPending).toBe(true);
    expect(stored!.notificationOutbox!.some(event=>!event.deliveredAt)).toBe(true);
    await Promise.all([runNotificationOutboxPass(),runNotificationOutboxPass()]);
    const receipt = await Notification.findOne({recipient:citizen._id,complaintId:stored!._id,title:'Complaint received'});
    expect(receipt).toBeTruthy();
    await Notification.updateOne({_id:receipt!._id},{$set:{readAt:new Date()}});
    await runNotificationOutboxPass();
    expect(await Notification.countDocuments({recipient:citizen._id,complaintId:stored!._id,title:'Complaint received'})).toBe(1);
    expect((await Notification.findById(receipt!._id))!.readAt).toBeTruthy();
    expect((await Complaint.findById(stored!._id).select('+notificationOutboxPending'))!.notificationOutboxPending).toBe(false);
  });
  it('keeps non-resolution status and reassignment events recoverable after a delivery-write outage', async () => {
    const report = await Complaint.create({...body,createdBy:citizen._id});
    let failed = jest.spyOn(Notification,'updateOne').mockRejectedValueOnce(new Error('Isolated outage'));
    const update = await request(app).patch(`/api/authority/complaints/${report._id}/status`).set(auth(officerToken)).send({status:'In Progress'}); failed.mockRestore();
    expect(update.status).toBe(200); expect(update.body.data.status).toBe('In Progress');
    await runNotificationOutboxPass();
    expect(await Notification.countDocuments({complaintId:report._id,title:'Complaint In Progress'})).toBe(1);
    failed = jest.spyOn(Notification,'updateOne').mockRejectedValueOnce(new Error('Isolated outage'));
    await User.updateOne({_id:officer._id},{$set:{isAdmin:true}});
    const assignment = await request(app).patch(`/api/management/complaints/${report._id}/department`).set(auth(officerToken)).send({department:'Isolated field team',reason:'Test field assignment after review'}); failed.mockRestore();
    await User.updateOne({_id:officer._id},{$set:{isAdmin:false}});
    expect(assignment.status).toBe(200); await runNotificationOutboxPass();
    const stored = await Complaint.findById(report._id).select('+notificationOutbox');
    expect(stored!.status).toBe('In Progress'); expect(stored!.notificationOutbox).toHaveLength(2);
    expect(stored!.notificationOutbox!.every(event=>!!event.deliveredAt)).toBe(true);
  });
  it('relays a database write that did not call the process-local publisher to an authenticated socket', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${(server.address() as any).port}/api/notifications/live`);
    await new Promise<void>((resolve,reject)=>{socket.on('open',()=>socket.send(JSON.stringify({type:'authenticate',token})));socket.once('message',()=>resolve());socket.once('error',reject);});
    const changed = new Promise<string>(resolve=>socket.once('message',data=>resolve(JSON.parse(data.toString()).type)));
    await Notification.create({recipient:citizen._id,complaintId:new mongoose.Types.ObjectId(),eventKey:`external-${suffix}`,title:'Database source',message:'A durable external-process-style change.'});
    expect(await changed).toBe('notifications-changed'); socket.close();
  });
  it('ends old sessions on password change while returning a usable replacement token', async () => {
    const response = await request(app).put('/api/auth/change-password').set(auth(token)).send({oldPassword:password,newPassword:'ReplacedPartial2026!'});
    expect(response.status).toBe(200);
    expect((await request(app).get('/api/auth/me').set(auth(token))).status).toBe(401);
    const fresh = response.body.data.token;
    expect((await request(app).get('/api/auth/me').set(auth(fresh))).status).toBe(200);
    token = fresh;
    const signedIn = await request(app).post('/api/auth/login').send({email:citizen.email,password:'ReplacedPartial2026!'});
    expect(signedIn.status).toBe(200); expect((await request(app).get('/api/auth/me').set(auth(signedIn.body.data.token))).status).toBe(200);
  });
  it('uses shared atomic Mongo counters and resets the bucket after expiry', async () => {
    const a = new MongoRateLimitStore(`partial-${suffix}`), b = new MongoRateLimitStore(`partial-${suffix}`);
    a.init({windowMs:1000} as any); b.init({windowMs:1000} as any);
    const first = await a.increment('synthetic-client'); const second = await b.increment('synthetic-client');
    expect(first.totalHits).toBe(1); expect(second.totalHits).toBe(2);
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,first.resetTime.getTime()-Date.now())+30));
    expect((await b.increment('synthetic-client')).totalHits).toBe(1);
    await b.resetKey('synthetic-client');
  });
  it('relays actual mutations and logout invalidation to a separate Node API process', async () => {
    const child = fork(path.join(__dirname,'helpers/live-node.cjs'),[],{env:{...process.env,JWT_SECRET:env.JWT_SECRET,MONGODB_URI:env.MONGODB_URI},stdio:['ignore','ignore','ignore','ipc']});
    let socket: WebSocket | undefined;
    try {
      const port = await new Promise<number>((resolve,reject)=>{
        child.once('message',(message:any)=>message.port?resolve(message.port):reject(new Error('Child API startup failed')));
        child.once('error',reject);child.once('exit',code=>{if(code)reject(new Error('Child API startup failed'));});
      });
      socket = new WebSocket(`ws://127.0.0.1:${port}/api/notifications/live`);
      await new Promise<void>((resolve,reject)=>{socket!.once('open',()=>socket!.send(JSON.stringify({type:'authenticate',token})));socket!.once('message',()=>resolve());socket!.once('error',reject);});
      const changed = new Promise<string>(resolve=>socket!.once('message',data=>resolve(JSON.parse(data.toString()).type)));
      const report = await request(app).post('/api/complaints').set(auth(token)).send({...body,title:'Cross-process durable event'});
      expect(report.status).toBe(201);expect(await changed).toBe('notifications-changed');
      const closed = new Promise<number>(resolve=>socket!.once('close',resolve));
      expect((await request(app).post('/api/auth/logout').set(auth(token))).status).toBe(200);
      expect(await closed).toBe(1008);
      const replay = await fetch(`http://127.0.0.1:${port}/api/auth/me`,{headers:auth(token)});
      expect(replay.status).toBe(401);
      const login = await request(app).post('/api/auth/login').send({email:citizen.email,password:'ReplacedPartial2026!'});
      expect(login.status).toBe(200);token=login.body.data.token;
    } finally {
      socket?.terminate();
      if(child.exitCode === null) {
        const stopped = new Promise<void>(resolve=>child.once('exit',()=>resolve()));
        if(child.connected)child.send('stop');else child.kill();
        await stopped;
      }
    }
  });
  it('rejects corrupt data with a valid image prefix before any external storage call', async () => {
    const invalid = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('not a decodable PNG')]);
    const response = await request(app).post('/api/uploads/image').set(auth(token)).attach('image',invalid,{filename:'invalid.png',contentType:'image/png'});
    expect(response.status).toBe(400);
  });
  it('preserves operator mappings, labels proposed Avadi rules and never rewrites existing complaint assignments', async () => {
    const record = await Complaint.create({...body,createdBy:citizen._id,assignedDepartment:'Original legacy assignment'});
    const preview = await configureProvisionalMunicipality({apply:false,administratorId:String(officer._id)});
    expect(preview.mode).toBe('preview'); expect((await User.findById(officer._id))!.isAdmin).toBe(false);
    // Own only these keys in the isolated test database; never alter application routing data.
    const keys = Object.keys(proposedAvadiMappings);
    await DepartmentRule.deleteMany({category:{$in:keys}});
    const setup = await configureProvisionalMunicipality({apply:true,administratorId:String(officer._id)});
    expect(setup.createdMappings).toBe(keys.length);
    expect((await DepartmentRule.findOne({category:'pothole'}))!.verificationStatus).toBe('proposed');
    await DepartmentRule.updateOne({category:'pothole'},{$set:{department:'Operator-approved test team'}});
    const repeated = await configureProvisionalMunicipality({apply:true,administratorId:String(officer._id)});
    expect(repeated.createdMappings).toBe(0); expect((await DepartmentRule.findOne({category:'pothole'}))!.department).toBe('Operator-approved test team');
    expect((await Complaint.findById(record._id))!.assignedDepartment).toBe('Original legacy assignment');
    expect(await AdministrationAudit.countDocuments({subject:officer._id})).toBe(1);
  });
  it('requires a source for verified routing and preserves verification when only enabling/disabling a rule', async () => {
    const endpoint='/api/management/departments/partial_verification';
    const invalid=await request(app).put(endpoint).set(auth(officerToken)).send({department:'Synthetic test team',verificationStatus:'verified'});
    expect(invalid.status).toBe(400);
    const verified=await request(app).put(endpoint).set(auth(officerToken)).send({department:'Synthetic test team',verificationStatus:'verified',sourceNote:'Isolated verification test note, not a municipal source'});
    expect(verified.status).toBe(200);
    const toggled=await request(app).put(endpoint).set(auth(officerToken)).send({department:'Synthetic test team',enabled:false});
    expect(toggled.body.data.verificationStatus).toBe('verified');
    const changed=await request(app).put(endpoint).set(auth(officerToken)).send({department:'Another synthetic team'});
    expect(changed.body.data.verificationStatus).toBe('proposed');
  });
  it('enforces configured browser origins while allowing native clients without an Origin header', async () => {
    const previous=env.CORS_ORIGINS;env.CORS_ORIGINS=['https://allowed.example.test'];
    try {
      expect((await request(app).get('/api/health').set('Origin','https://allowed.example.test')).status).toBe(200);
      expect((await request(app).get('/api/health').set('Origin','https://untrusted.example.test')).status).toBe(403);
      expect((await request(app).get('/api/health')).status).toBe(200);
    } finally {env.CORS_ORIGINS=previous;}
  });
});
