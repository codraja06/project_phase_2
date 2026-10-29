import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { DepartmentRule } from '../src/models/DepartmentRule';
import { Notification } from '../src/models/Notification';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { generateToken } from '../src/utils/jwt';
import * as storage from '../src/services/cloudinaryService';
import sharp from 'sharp';

jest.setTimeout(20000);

describe('Duplicate review, departments, repair evidence, notifications and operations', () => {
  let citizen: any, other: any, officer: any, admin: any;
  let citizenToken: string, otherToken: string, officerToken: string, adminToken: string;

  it('rejects role and department fields in a profile update', async () => {
    const response = await request(app).put('/api/auth/profile').set(authorized(officerToken))
      .send({ name: 'Officer', isAdmin: true, departmentId: 'unauthorized' });
    expect(response.status).toBe(400);
    expect((await User.findById(officer._id))?.isAdmin).toBe(false);
  });
  let original: any, nearby: any, submitted: any;
  const authorized = (token: string) => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
    const create = (name: string, role: string, isAdmin = false) => User.create({
      name, email: `features712-${name}@example.test`, phone: '9876543210', password: 'LocalTestOnly123!', role, isAdmin,
    });
    citizen = await create('citizen', 'citizen'); other = await create('other', 'citizen');
    officer = await create('officer', 'authority'); admin = await create('admin', 'authority', true);
    citizenToken = generateToken({ userId: String(citizen._id), role: 'citizen' });
    otherToken = generateToken({ userId: String(other._id), role: 'citizen' });
    officerToken = generateToken({ userId: String(officer._id), role: 'authority' });
    adminToken = generateToken({ userId: String(admin._id), role: 'authority' });
  });
  afterAll(async () => {
    const users = [citizen._id, other._id, officer._id, admin._id];
    await NotificationDelivery.deleteMany({ recipient: { $in: users } });
    await Notification.deleteMany({ recipient: { $in: users } });
    await Complaint.deleteMany({ createdBy: { $in: users } });
    await DepartmentRule.deleteMany({ category: 'features712_pothole' });
    await User.deleteMany({ _id: { $in: users } });
    await mongoose.disconnect();
  });
  const base = { title: 'features712 road concern', description: 'Observed road issue in the submitted photo.', category: 'features712_pothole',
    imageUrl: 'http://example.test/road.jpg', latitude: 12.91, longitude: 80.21, address: 'GPS coordinates recorded' };

  it('restricts mapping edits to administrators and routes new reports without changing status', async () => {
    expect((await request(app).put('/api/management/departments/features712_pothole').set(authorized(officerToken)).send({ department: 'Road Works' })).status).toBe(403);
    expect((await request(app).put('/api/management/departments/features712_pothole').set(authorized(adminToken)).send({ department: 'Road Works' })).status).toBe(200);
    const created = await request(app).post('/api/complaints').set(authorized(citizenToken)).send(base);
    expect(created.status).toBe(201);
    original = created.body.data;
    expect(original.assignedDepartment).toBe('Road Works'); expect(original.status).toBe('Pending');
    expect(original.statusHistory[0].status).toBe('Pending');
    expect((await request(app).get('/api/management/departments').set(authorized(citizenToken))).status).toBe(403);
    const notices = await request(app).get('/api/management/notifications').set(authorized(officerToken));
    expect(notices.body.data.notifications.some((n: any) => n.title.includes('complaint'))).toBe(true);
  });

  it('warns on nearby same-category reports without exposing other citizens and supports explicit authority confirmation', async () => {
    nearby = await Complaint.create({ ...base, title: 'features712 other citizen nearby', createdBy: other._id,
      latitude: 12.9102, longitude: 80.2102, statusHistory: [{ status: 'Pending', at: new Date() }] });
    const check = await request(app).post('/api/management/duplicates/check').set(authorized(citizenToken))
      .send({ category: base.category, latitude: 12.9101, longitude: 80.2101 });
    expect(check.status).toBe(200); expect(check.body.data.matches).toHaveLength(2);
    expect(check.body.data.matches.find((m: any) => m.disclosure === 'nearby').complaintId).toBeNull();
    expect((await request(app).post('/api/management/duplicates/check').set(authorized(officerToken)).send({ category: base.category, latitude: 12.91, longitude: 80.21 })).status).toBe(403);
    const candidates = await request(app).get(`/api/management/complaints/${nearby._id}/duplicates`).set(authorized(officerToken));
    expect(candidates.body.data.matches.some((m: any) => m.complaintId === original.complaintId)).toBe(true);
    expect((await request(app).patch(`/api/management/complaints/${nearby._id}/duplicate`).set(authorized(citizenToken)).send({ originalId: original._id, reason: 'Same incident and photo' })).status).toBe(403);
    const confirmed = await request(app).patch(`/api/management/complaints/${nearby._id}/duplicate`).set(authorized(officerToken))
      .send({ originalId: original._id, reason: 'Same location and confirmed physical issue.' });
    expect(confirmed.status).toBe(200); expect(String(confirmed.body.data.duplicateOf)).toBe(original._id);
    expect((await Complaint.findById(nearby._id))!.status).toBe('Pending');
    const privateCheck = await request(app).get(`/api/complaints/${nearby._id}`).set(authorized(citizenToken));
    expect(privateCheck.status).toBe(403);
  });

  it('requires review for submitted repair evidence and keeps status changes authorized', async () => {
    const report = await request(app).post('/api/complaints').set(authorized(citizenToken)).send({ ...base, latitude: 12.93, longitude: 80.23 });
    submitted = report.body.data;
    expect((await request(app).patch(`/api/management/complaints/${submitted._id}/department`).set(authorized(officerToken)).send({ department: 'Field Repairs', reason: 'Unauthorized reassignment attempt' })).status).toBe(403);
    expect((await request(app).patch(`/api/management/complaints/${submitted._id}/department`).set(authorized(adminToken))
      .send({ department: 'Field Repairs', reason: 'Field team reassigned work' })).body.data.assignedDepartment).toBe('Field Repairs');
    expect((await request(app).patch(`/api/authority/complaints/${submitted._id}/status`).set(authorized(officerToken)).send({ status: 'In Progress' })).status).toBe(200);
    const mocked = jest.spyOn(storage, 'uploadToCloudinary').mockResolvedValue('http://example.test/completed.png');
    const image = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#dddddd' } }).png().toBuffer();
    const uploaded = await request(app).post(`/api/management/complaints/${submitted._id}/completion`).set(authorized(officerToken))
      .attach('image', image, { filename: 'repair.png', contentType: 'image/png' });
    mocked.mockRestore();
    expect(uploaded.status).toBe(200); expect(uploaded.body.data.completionReview).toBe('pending');
    expect(uploaded.body.data.imageUrl).toBe(base.imageUrl);
    expect((await request(app).patch(`/api/authority/complaints/${submitted._id}/status`).set(authorized(officerToken)).send({ status: 'Resolved' })).status).toBe(409);
    expect((await request(app).patch(`/api/management/complaints/${submitted._id}/completion/review`).set(authorized(officerToken)).send({ decision: 'rejected', note: 'The repair photo does not show completed work.' })).body.data.completionReview).toBe('rejected');
    expect((await request(app).patch(`/api/authority/complaints/${submitted._id}/status`).set(authorized(officerToken)).send({ status: 'Resolved' })).status).toBe(409);
    // A new photo returns the evidence to pending review.
    const mockedAgain = jest.spyOn(storage, 'uploadToCloudinary').mockResolvedValue('http://example.test/completed-v2.png');
    expect((await request(app).post(`/api/management/complaints/${submitted._id}/completion`).set(authorized(officerToken)).attach('image', image, { filename: 'repair.png', contentType: 'image/png' })).status).toBe(200);
    mockedAgain.mockRestore();
    expect((await request(app).patch(`/api/management/complaints/${submitted._id}/completion/review`).set(authorized(officerToken)).send({ decision: 'accepted', note: 'Completed work visible.' })).body.data.completionReview).toBe('accepted');
    expect((await request(app).patch(`/api/authority/complaints/${submitted._id}/status`).set(authorized(citizenToken)).send({ status: 'Resolved' })).status).toBe(403);
    expect((await request(app).patch(`/api/authority/complaints/${submitted._id}/status`).set(authorized(officerToken)).send({ status: 'Resolved' })).status).toBe(200);
    const stored = await Complaint.findById(submitted._id);
    expect(stored!.statusHistory?.map(h => h.status)).toEqual(['Pending', 'In Progress', 'Resolved']);
    expect(stored!.completionImageUrl).toBe('http://example.test/completed-v2.png');
  });

  it('stores role-scoped event notifications and supports read state', async () => {
    const citizenList = await request(app).get('/api/management/notifications').set(authorized(citizenToken));
    expect(citizenList.status).toBe(200);
    expect(citizenList.body.data.notifications.some((n: any) => n.title === 'Complaint Resolved')).toBe(true);
    expect(citizenList.body.data.notifications.every((n: any) => n.recipient === String(citizen._id))).toBe(true);
    const unread = citizenList.body.data.notifications.find((n: any) => !n.readAt);
    const read = await request(app).patch(`/api/management/notifications/${unread._id}/read`).set(authorized(citizenToken));
    expect(read.body.data.readAt).toBeTruthy();
    expect((await request(app).patch(`/api/management/notifications/${unread._id}/read`).set(authorized(otherToken))).status).toBe(404);
    expect((await request(app).get('/api/management/notifications').set(authorized(otherToken))).body.data.notifications.every((n: any) => n.recipient === String(other._id))).toBe(true);
  });

  it('filters actual hotspot cells and calculates completed resolution metrics without inventing a service target', async () => {
    const hotspots = await request(app).get('/api/management/hotspots?category=features712_pothole&status=Resolved').set(authorized(officerToken));
    expect(hotspots.status).toBe(200);
    expect(hotspots.body.data.clusters.reduce((n: number, c: any) => n + c.count, 0)).toBe(1);
    expect(hotspots.body.data.clusters[0].records[0].complaintId).toBe(submitted.complaintId);
    expect((await request(app).get('/api/management/hotspots').set(authorized(citizenToken))).status).toBe(403);
    const analytics = await request(app).get('/api/authority/analytics?search=features712').set(authorized(officerToken));
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.summary.unresolved).toBe(2);
    expect(analytics.body.data.summary.resolved).toBe(1);
    expect(analytics.body.data.summary.averageResolutionHours).toBeGreaterThanOrEqual(0);
    expect(analytics.body.data.resolutionByDepartment.find((d: any) => d.department === 'Field Repairs').resolved).toBe(1);
    expect(analytics.body.data.resolutionTrends.reduce((n: number, day: any) => n + day.resolved, 0)).toBe(1);
    expect(analytics.body.data.resolutionTargetHours).toBeNull();
  });
});
