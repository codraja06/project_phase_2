import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { env } from '../src/config/env';
import { generateToken } from '../src/utils/jwt';
import { calculatePriority, signEvidence, unavailableSeverity, withPriority } from '../src/services/triageService';

const highSeverity = { ...unavailableSeverity(), level: 'High' as const, state: 'estimated' as const };
const now = new Date('2026-10-17T12:00:00Z');

describe('Priority policy', () => {
  it('attends to high severity immediately and increases attention for old unresolved reports', () => {
    expect(calculatePriority({ severity: highSeverity, category: 'pothole', status: 'Pending' }, now).priority).toBe('high');
    const recent = { severity: { ...highSeverity, level: 'Low' as const }, category: 'garbage', status: 'Pending', createdAt: now };
    expect(calculatePriority(recent, now).priority).toBe('low');
    expect(calculatePriority({ ...recent, createdAt: new Date('2026-09-01') }, now).priority).toBe('high');
    expect(calculatePriority({ ...recent, status: 'Resolved' }, now).priorityScore).toBe(0);
  });

  it('does not change status, dates or evidence on legacy documents', () => {
    const old = { category: 'other', status: 'In Progress', createdAt: new Date('2026-09-01'), priority: 'urgent' };
    const result = withPriority(old, now);
    expect(result.status).toBe('In Progress');
    expect(result.severity.level).toBeNull();
    expect(result.priorityMetadata.reviewRequired).toBe(true);
    expect(old.priority).toBe('urgent');
  });
});

describe('Phase 2 API persistence and authorization', () => {
  let citizenId: string, citizenToken: string, officerToken: string;
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
    await User.deleteMany({ email: /phase2-.*@example.test/ });
    const citizen = await User.create({ name: 'Phase 2 Citizen', email: 'phase2-citizen@example.test', phone: '1234567890', password: 'Password123!', role: 'citizen' });
    const officer = await User.create({ name: 'Phase 2 Officer', email: 'phase2-officer@example.test', phone: '1234567890', password: 'Password123!', role: 'authority' });
    citizenId = String(citizen._id);
    citizenToken = generateToken({ userId: citizenId, role: 'citizen' });
    officerToken = generateToken({ userId: String(officer._id), role: 'authority' });
  });
  afterAll(async () => {
    await Complaint.deleteMany({ createdBy: citizenId });
    await User.deleteMany({ email: /phase2-.*@example.test/ });
    await mongoose.disconnect();
  });
  const input = () => ({ title: 'Phase 2 report', description: 'Citizen reviewed and edited the description.', category: 'pothole',
    imageUrl: 'http://example.test/image.jpg', latitude: -33.9, longitude: 151.2, priority: 'low', severity: { level: 'Low' } });
  const evidence = () => ({ imageHash: 'image-content-hash', severity: highSeverity, generatedDescription: 'The image detection suggests pothole.',
    detections: [{ category: 'pothole', confidence: .9, bbox: { x1: 0, y1: 0, x2: 100, y2: 100 }, model: 'test' }] });

  it('stores verified analysis and final citizen text, calculates priority, and retains authority status control', async () => {
    const analysisToken = signEvidence(evidence(), 'analysis', citizenId);
    const uploadToken = signEvidence({ imageHash: evidence().imageHash, imageUrl: input().imageUrl }, 'upload', citizenId);
    const created = await request(app).post('/api/complaints').set('Authorization', `Bearer ${citizenToken}`).send({ ...input(), analysisToken, uploadToken });
    expect(created.status).toBe(201);
    const data = created.body.data;
    expect(data.severity.level).toBe('High');
    expect(data.priority).toBe('high');
    expect(data.status).toBe('Pending');
    expect(data.description).toBe(input().description);
    expect(data.generatedDescription).toBe(evidence().generatedDescription);
    const stored = await Complaint.findById(data._id);
    expect(stored?.severity?.level).toBe('High');
    expect(stored?.boundingBoxes[0].category).toBe('pothole');
    const mine = await request(app).get(`/api/complaints/${data._id}`).set('Authorization', `Bearer ${citizenToken}`);
    expect(mine.body.data.severity.level).toBe('High');
    const denied = await request(app).patch(`/api/authority/complaints/${data._id}/status`).set('Authorization', `Bearer ${citizenToken}`).send({ status: 'Resolved' });
    expect(denied.status).toBe(403);
    const list = await request(app).get('/api/authority/complaints?priority=high&sortBy=priority').set('Authorization', `Bearer ${officerToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.complaints.some((c: any) => c._id === data._id)).toBe(true);
    expect(list.body.data.complaints.every((c: any) => c.priority === 'high')).toBe(true);
    const invalid = await request(app).get('/api/authority/complaints?priority=urgent').set('Authorization', `Bearer ${officerToken}`);
    expect(invalid.status).toBe(400);
  });

  it('rejects mismatched images, wrong users and forged evidence', async () => {
    const analysisToken = signEvidence(evidence(), 'analysis', citizenId);
    for (const uploadToken of [signEvidence({ imageHash: 'different', imageUrl: input().imageUrl }, 'upload', citizenId),
      signEvidence({ imageHash: evidence().imageHash, imageUrl: input().imageUrl }, 'upload', 'different-user'), 'forged']) {
      const response = await request(app).post('/api/complaints').set('Authorization', `Bearer ${citizenToken}`).send({ ...input(), analysisToken, uploadToken });
      expect(response.status).toBe(400);
    }
  });

  it('allows manual submission and refuses client-invented severity or priority', async () => {
    const response = await request(app).post('/api/complaints').set('Authorization', `Bearer ${citizenToken}`).send({ ...input(), priority: 'urgent', severity: highSeverity });
    expect(response.status).toBe(201);
    expect(response.body.data.severity.level).toBeNull();
    expect(response.body.data.priority).toBe('medium');
    expect(response.body.data.description).toBe(input().description);
  });
});
