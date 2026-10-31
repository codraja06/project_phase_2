import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { generateToken } from '../src/utils/jwt';

describe('Power BI analytics export', () => {
  let admin: any, officer: any, citizen: any;
  let adminToken: string, officerToken: string, citizenToken: string;
  const suffix = Date.now();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/civictrack_isolated_test');
    await mongoose.connect(env.MONGODB_URI);
    const make = (name: string, role: string, isAdmin = false) => User.create({ name, email: `powerbi-${name}-${suffix}@example.test`, password: 'SyntheticPassword123!', role, isAdmin });
    admin = await make('admin', 'authority', true); officer = await make('officer', 'authority'); citizen = await make('citizen', 'citizen');
    adminToken = generateToken({ userId: String(admin._id), role: 'authority' });
    officerToken = generateToken({ userId: String(officer._id), role: 'authority' });
    citizenToken = generateToken({ userId: String(citizen._id), role: 'citizen' });
    const base = { title: `PowerBI ${suffix}`, description: 'Synthetic testing only', imageUrl: 'https://example.test/photo.jpg', createdBy: citizen._id, latitude: 13.1, longitude: 80.2, address: 'private test address' };
    await Complaint.create({ ...base, category: '=danger', status: 'Resolved', assignedDepartment: 'Road Team', createdAt: new Date('2026-01-10T00:00:00Z'), resolvedAt: new Date('2026-01-11T00:00:00Z') });
    await Complaint.create({ ...base, category: 'garbage', status: 'Pending', assignedDepartment: 'Waste Team', createdAt: new Date('2026-02-10T00:00:00Z') });
  });
  afterAll(async () => { await Complaint.deleteMany({ createdBy: citizen._id }); await User.deleteMany({ _id: { $in: [admin._id, officer._id, citizen._id] } }); await mongoose.disconnect(); });
  it('restricts exports to signed-in administrators', async () => {
    expect((await request(app).get('/api/authority/analytics/export')).status).toBe(401);
    expect((await request(app).get('/api/authority/analytics/export').set(auth(citizenToken))).status).toBe(403);
    expect((await request(app).get('/api/authority/analytics/export').set(auth(officerToken))).status).toBe(403);
  });
  it('uses the same filters and produces a safe spreadsheet-ready CSV', async () => {
    const result = await request(app).get('/api/authority/analytics/export').query({ search: `PowerBI ${suffix}`, department: 'Road Team', from: '2026-01-01', to: '2026-01-31' }).set(auth(adminToken));
    expect(result.status).toBe(200); expect(result.body.data.rowCount).toBe(1);
    const csv = result.body.data.csv;
    expect(csv).toContain('complaint_id,category,status,department');
    expect(csv).toContain("\"'=danger\""); expect(csv).toContain('"24"');
    expect(csv).not.toContain('Waste Team'); expect(csv).not.toContain('private test address'); expect(csv).not.toContain('@example.test');
    const empty = await request(app).get('/api/authority/analytics/export').query({ search: `PowerBI ${suffix}`, from: '2025-01-01', to: '2025-01-31' }).set(auth(adminToken));
    expect(empty.status).toBe(200); expect(empty.body.data.rowCount).toBe(0); expect(empty.body.data.csv).toContain('complaint_id');
    expect((await request(app).get('/api/authority/analytics/export?from=2026-02-31').set(auth(adminToken))).status).toBe(400);
  });
});
