import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { generateToken } from '../src/utils/jwt';

describe('Department authorization across UI APIs', () => {
  let user: any, own: any, other: any, token: string;
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
    user = await User.create({ name: 'Scoped officer', email: `scope-${Date.now()}@example.test`, role: 'authority', department: 'Scope Roads' });
    token = generateToken({ userId: String(user._id), role: 'authority' });
    const base = { title: 'Scope test', description: 'Synthetic evidence for scope regression.', category: 'pothole', imageUrl: 'https://example.test/image.png', latitude: 13, longitude: 80, createdBy: user._id };
    own = await Complaint.create({ ...base, assignedDepartment: 'Scope Roads' });
    other = await Complaint.create({ ...base, assignedDepartment: 'Scope Water' });
  });
  afterAll(async () => { await Complaint.deleteMany({ createdBy: user._id }); await User.deleteOne({ _id: user._id }); await mongoose.disconnect(); });
  it('scopes list totals and rejects forged department filters', async () => {
    const result = await request(app).get('/api/authority/complaints').auth(token, { type: 'bearer' });
    expect(result.status).toBe(200); expect(result.body.data.stats.total).toBe(1);
    expect(result.body.data.complaints.map((c: any) => c._id)).toEqual([String(own._id)]);
    const forged = await request(app).get('/api/authority/complaints?department=Scope%20Water').auth(token, { type: 'bearer' });
    expect(forged.body.data.complaints).toEqual([]);
  });
  it('protects both detail routes, status, verification and secondary decisions', async () => {
    for (const prefix of ['/api/authority/complaints/', '/api/complaints/']) expect((await request(app).get(prefix + other._id).auth(token, { type: 'bearer' })).status).toBe(404);
    for (const suffix of ['status', 'verify']) expect((await request(app).patch(`/api/authority/complaints/${other._id}/${suffix}`).auth(token, { type: 'bearer' }).send({ status: 'In Progress' })).status).toBe(404);
    expect((await request(app).patch(`/api/management/complaints/${other._id}/triage`).auth(token, { type: 'bearer' }).send({ kind: 'severity', level: 'High', reason: 'Synthetic review reason' })).status).toBe(404);
    expect((await Complaint.findById(other._id))!.status).toBe('Pending');
  });
  it('scopes analytics and hotspot records', async () => {
    const analytics = await request(app).get('/api/authority/analytics').auth(token, { type: 'bearer' });
    expect(analytics.body.data.summary.total).toBe(1);
    const map = await request(app).get('/api/management/hotspots').auth(token, { type: 'bearer' });
    expect(map.body.data.clusters.flatMap((c: any) => c.records.map((r: any) => r._id))).toEqual([String(own._id)]);
  });
  it('denies unassigned officers without changing their account', async () => {
    await User.updateOne({ _id: user._id }, { $unset: { department: '' } });
    expect((await request(app).get('/api/authority/complaints').auth(token, { type: 'bearer' })).status).toBe(403);
  });
});
