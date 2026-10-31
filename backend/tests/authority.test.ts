import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { generateToken } from '../src/utils/jwt';
import { env } from '../src/config/env';

jest.setTimeout(30000);

describe('Authority API Endpoints & Role Guard', () => {
  let citizenToken: string;
  let authorityToken: string;
  let complaintId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    }
  });

  beforeEach(async () => {
    await User.deleteMany({ email: /citizen.*@example\.com|officer.*@example\.com/ });
    await Complaint.deleteMany({ title: 'Garbage Dump' });

    const citizen = await User.create({
      name: 'Citizen User',
      email: 'citizen@example.com',
      phone: '1234567890',
      password: 'password123',
      role: 'citizen',
    });

    const authority = await User.create({
      name: 'Officer Authority',
      email: 'officer@example.com',
      phone: '0987654321',
      password: 'password123',
      role: 'authority', isAdmin: true,
    });

    citizenToken = generateToken({ userId: citizen._id.toString(), role: 'citizen' });
    authorityToken = generateToken({ userId: authority._id.toString(), role: 'authority' });

    const complaint = await Complaint.create({
      title: 'Garbage Dump',
      description: 'Garbage accumulated near market',
      category: 'garbage',
      imageUrl: 'http://example.com/garbage.jpg',
      latitude: 12.97,
      longitude: 77.59,
      address: 'Market Yard',
      createdBy: citizen._id,
      status: 'Pending',
    });
    complaintId = complaint._id.toString();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should deny citizen access to authority endpoints with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/authority/complaints')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow authority to list all complaints', async () => {
    const res = await request(app)
      .get('/api/authority/complaints')
      .set('Authorization', `Bearer ${authorityToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.complaints.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow status update from Pending -> In Progress', async () => {
    const res = await request(app)
      .patch(`/api/authority/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('In Progress');
  });

  it('should reject invalid status transition from Pending directly to Resolved', async () => {
    await Complaint.findByIdAndUpdate(complaintId, { status: 'Pending' });

    const res = await request(app)
      .patch(`/api/authority/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'Resolved' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should allow valid status transition In Progress -> Resolved and update resolvedAt', async () => {
    // First set to In Progress
    await request(app)
      .patch(`/api/authority/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'In Progress' });

    // Now set to Resolved
    const res = await request(app)
      .patch(`/api/authority/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${authorityToken}`)
      .send({ status: 'Resolved' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Resolved');
    expect(res.body.data.resolvedAt).toBeDefined();
  });

  it('should allow authority to delete an invalid complaint', async () => {
    const res = await request(app)
      .delete(`/api/authority/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${authorityToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await Complaint.findById(complaintId);
    expect(check).toBeNull();
  });
});
