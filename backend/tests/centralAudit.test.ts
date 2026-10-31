import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { AuditEvent } from '../src/models/AuditEvent';
import { relayAuditEvents } from '../src/services/auditRelay';
import { generateToken } from '../src/utils/jwt';

describe('Durable central audit', () => {
  let citizen: any, admin: any, token: string, adminToken: string, report: string;
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
    const suffix = Date.now();
    citizen = await User.create({ name: 'Audit citizen', email: `audit-${suffix}@example.test`, role: 'citizen' });
    admin = await User.create({ name: 'Audit admin', email: `audit-admin-${suffix}@example.test`, role: 'authority', isAdmin: true });
    token = generateToken({ userId: String(citizen._id), role: 'citizen' });
    adminToken = generateToken({ userId: String(admin._id), role: 'authority' });
  });
  afterAll(async () => {
    await AuditEvent.deleteMany({ actor: { $in: [citizen._id, admin._id] } });
    await Complaint.deleteMany({ createdBy: citizen._id }); await User.deleteMany({ _id: { $in: [citizen._id, admin._id] } }); await mongoose.disconnect();
  });
  it('persists submission event atomically without exposing the outbox', async () => {
    const response = await request(app).post('/api/complaints').auth(token, { type: 'bearer' }).send({ title: 'Audit test', description: 'Observed synthetic condition.', category: 'pothole', imageUrl: 'https://example.test/image.png', latitude: 13, longitude: 80 });
    expect(response.status).toBe(201); report = response.body.data._id;
    expect(response.body.data.auditPending).toBeUndefined();
    const stored: any = await Complaint.findById(report).select('+auditPending');
    expect(stored.auditPending).toHaveLength(1);
    expect(stored.auditPending[0].action).toBe('complaint-submitted');
  });
  it('recovers from central-store failure and never duplicates an event', async () => {
    const fail = jest.spyOn(AuditEvent, 'updateOne').mockRejectedValueOnce(new Error('Synthetic storage outage'));
    await expect(relayAuditEvents()).rejects.toThrow(); fail.mockRestore();
    expect((await Complaint.findById(report).select('+auditPending') as any).auditPending).toHaveLength(1);
    await relayAuditEvents(); await relayAuditEvents();
    expect(await AuditEvent.countDocuments({ entityId: report })).toBe(1);
    expect((await Complaint.findById(report).select('+auditPending') as any).auditPending).toHaveLength(0);
  });
  it('captures status changes, excludes secret input, and restricts viewing', async () => {
    const updated = await request(app).patch(`/api/authority/complaints/${report}/status`).auth(adminToken, { type: 'bearer' }).send({ status: 'In Progress', password: 'NeverLogThisSecret' });
    expect(updated.status).toBe(200); await relayAuditEvents();
    const list = await request(app).get(`/api/admin/audit?complaint=${report}&limit=1`).auth(adminToken, { type: 'bearer' });
    expect(list.status).toBe(200); expect(list.body.data.total).toBe(2); expect(list.body.data.records).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain('NeverLogThisSecret');
    expect(list.body.data.records[0].before.status).toBe('Pending');
    expect(list.body.data.records[0].after.status).toBe('In Progress');
    expect((await request(app).get('/api/admin/audit').auth(token, { type: 'bearer' })).status).toBe(403);
    expect((await request(app).get('/api/admin/audit')).status).toBe(401);
  });
});
