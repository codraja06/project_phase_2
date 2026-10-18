import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { Notification } from '../src/models/Notification';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { generateToken } from '../src/utils/jwt';
import * as delivery from '../src/services/contactDeliveryService';
import * as resolution from '../src/services/resolutionDeliveryService';

jest.setTimeout(30000);
describe('Resolution delivery, durable outbox, privacy and authorization', () => {
  let citizen: any, officer: any, other: any, citizenToken: string, officerToken: string;
  const users: any[] = [];
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const create = () => Complaint.create({ title: 'Resolution delivery test', description: 'Image observations recorded.', category: 'pothole', imageUrl: 'https://example.test/issue.jpg', latitude: 12.9, longitude: 80.2, address: '<script>untrusted</script>', status: 'In Progress', createdBy: citizen._id });
  const resolve = (id: any, token = officerToken) => request(app).patch(`/api/authority/complaints/${id}/status`).set(auth(token)).send({ status: 'Resolved' });
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI); await NotificationDelivery.init();
    for (const role of ['citizen', 'authority', 'citizen']) users.push(await User.create({ name: 'Delivery <Citizen>', email: `delivery-${users.length}@resolution-test.example`, phone: '+919876543210', password: 'DeliveryTest123!', role }));
    [citizen, officer, other] = users;
    citizenToken = generateToken({ userId: String(citizen._id), role: 'citizen' }); officerToken = generateToken({ userId: String(officer._id), role: 'authority' });
  });
  beforeEach(async () => {
    jest.spyOn(delivery, 'emailConfigured').mockReturnValue(true); jest.spyOn(delivery, 'smsConfigured').mockReturnValue(true);
    jest.spyOn(delivery, 'sendEmail').mockResolvedValue('mock-email-id'); jest.spyOn(delivery, 'sendSms').mockResolvedValue('mock-sms-id');
    await User.updateOne({ _id: citizen._id }, { $set: { emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), notificationPreferences: { email: true, sms: true, smsConsentedAt: new Date() } } });
  });
  afterEach(async () => {
    jest.restoreAllMocks(); await NotificationDelivery.deleteMany({ recipient: citizen._id });
    await Notification.deleteMany({ recipient: citizen._id }); await Complaint.deleteMany({ createdBy: citizen._id });
  });
  afterAll(async () => { await User.deleteMany({ _id: { $in: users.map(u => u._id) } }); await mongoose.disconnect(); });
  it('persists a genuine transition with one exact citizen notice and channel jobs; repeated saves and concurrent workers do not duplicate sends', async () => {
    const complaint = await create(), response = await resolve(complaint._id);
    expect(response.status).toBe(200); expect(response.body.data.resolvedAt).toBeTruthy();
    const notice = await Notification.findOne({ complaintId: complaint._id, recipient: citizen._id });
    expect(notice!.title).toBe('Complaint Resolved');
    expect(notice!.message).toBe(`Your complaint #${complaint.complaintId} has been resolved. Thank you for helping improve your community.`);
    expect(notice!.resolution!.category).toBe('pothole'); expect(notice!.resolution!.resolvedAt).toBeTruthy();
    expect(await NotificationDelivery.countDocuments({ complaintId: complaint._id, status: 'Pending' })).toBe(2);
    expect((await resolve(complaint._id)).status).toBe(200);
    await Promise.all([resolution.runDeliveryWorkerPass(), resolution.runDeliveryWorkerPass()]); await resolution.runDeliveryWorkerPass();
    expect(delivery.sendEmail).toHaveBeenCalledTimes(1); expect(delivery.sendSms).toHaveBeenCalledTimes(1);
    expect(await NotificationDelivery.countDocuments({ complaintId: complaint._id, status: 'Sent' })).toBe(2);
    expect(await Notification.countDocuments({ complaintId: complaint._id })).toBe(1);
    const list = await request(app).get('/api/management/notifications').set(auth(citizenToken));
    expect(list.body.data.notifications[0].deliveries.map((j: any) => j.status)).toEqual(['Sent', 'Sent']);
    expect(JSON.stringify(list.body)).not.toContain('mock-email-id');
  });
  it('enforces authority role, owner-only notification fetch/read, and leaves statuses unchanged on forbidden updates', async () => {
    const complaint = await create(); expect((await resolve(complaint._id, citizenToken)).status).toBe(403);
    expect((await request(app).patch(`/api/authority/complaints/${complaint._id}/status`).send({ status: 'Resolved' })).status).toBe(401);
    expect((await Complaint.findById(complaint._id))!.status).toBe('In Progress'); await resolve(complaint._id);
    const notice = await Notification.findOne({ complaintId: complaint._id });
    const token = generateToken({ userId: String(other._id), role: 'citizen' });
    const list = await request(app).get('/api/management/notifications').set(auth(token)); expect(list.body.data.notifications).toEqual([]);
    expect((await request(app).patch(`/api/management/notifications/${notice!._id}/read`).set(auth(token))).status).toBe(404);
    expect((await request(app).patch(`/api/management/notifications/${notice!._id}/read`).set(auth(citizenToken))).status).toBe(200);
  });
  it.each([
    ['unverified contacts', { emailVerifiedAt: null, phoneVerifiedAt: null }, 'email_unverified', 'phone_unverified'],
    ['SMS consent absent', { 'notificationPreferences.sms': false, 'notificationPreferences.smsConsentedAt': null }, null, 'sms_consent_absent'],
    ['email opted out', { 'notificationPreferences.email': false }, 'email_opted_out', null],
  ])('skips channels correctly: %s', async (_name, fields, emailReason, smsReason) => {
    await User.updateOne({ _id: citizen._id }, { $set: fields }); const complaint = await create(); await resolve(complaint._id); await resolution.runDeliveryWorkerPass();
    const email = await NotificationDelivery.findOne({ complaintId: complaint._id, channel: 'email' }), sms = await NotificationDelivery.findOne({ complaintId: complaint._id, channel: 'sms' });
    expect(email!.status).toBe(emailReason ? 'Skipped' : 'Sent'); expect(sms!.status).toBe(smsReason ? 'Skipped' : 'Sent');
    if (emailReason) { expect(email!.errorCode).toBe(emailReason); expect(delivery.sendEmail).not.toHaveBeenCalled(); }
    if (smsReason) { expect(sms!.errorCode).toBe(smsReason); expect(delivery.sendSms).not.toHaveBeenCalled(); }
  });
  it('records missing providers without fake delivery or undoing resolution', async () => {
    jest.mocked(delivery.emailConfigured).mockReturnValue(false); jest.mocked(delivery.smsConfigured).mockReturnValue(false);
    const complaint = await create(); expect((await resolve(complaint._id)).status).toBe(200); await resolution.runDeliveryWorkerPass();
    expect(await NotificationDelivery.countDocuments({ complaintId: complaint._id, status: 'Skipped', errorCode: 'provider_not_configured' })).toBe(2);
    expect(delivery.sendEmail).not.toHaveBeenCalled(); expect(delivery.sendSms).not.toHaveBeenCalled();
  });
  it('rechecks consent before a queued job is sent', async () => {
    const complaint = await create(); await resolve(complaint._id);
    await User.updateOne({ _id: citizen._id }, { $set: { 'notificationPreferences.sms': false } });
    await resolution.runDeliveryWorkerPass(); expect(delivery.sendSms).not.toHaveBeenCalled();
  });
  it('retries definite temporary rejection with backoff, retains status, then sends once', async () => {
    jest.mocked(delivery.sendEmail).mockRejectedValueOnce(new delivery.DeliveryError('provider_rejected', true));
    const complaint = await create(); await resolve(complaint._id); await resolution.runDeliveryWorkerPass();
    let job = await NotificationDelivery.findOne({ complaintId: complaint._id, channel: 'email' }); expect(job!.status).toBe('Retry Scheduled');
    expect(job!.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now()); expect((await Complaint.findById(complaint._id))!.status).toBe('Resolved');
    await resolution.runDeliveryWorkerPass(); expect(delivery.sendEmail).toHaveBeenCalledTimes(1);
    await NotificationDelivery.updateOne({ _id: job!._id }, { $set: { nextAttemptAt: new Date(0) } });
    await resolution.runDeliveryWorkerPass(); await resolution.runDeliveryWorkerPass();
    job = await NotificationDelivery.findById(job!._id); expect(job!.status).toBe('Sent'); expect(job!.attempts).toBe(2); expect(delivery.sendEmail).toHaveBeenCalledTimes(2);
  });
  it('does not blindly retry uncertain acceptance or abandoned leases', async () => {
    const complaint = await create(); await resolve(complaint._id);
    jest.mocked(delivery.sendEmail).mockRejectedValue(new delivery.DeliveryError('delivery_outcome_unknown', false, true));
    await NotificationDelivery.updateOne({ complaintId: complaint._id, channel: 'sms' }, { $set: { status: 'Processing', leaseUntil: new Date(0), claimedBy: 'stale-owner' } });
    await resolution.runDeliveryWorkerPass(); await resolution.runDeliveryWorkerPass();
    expect(await NotificationDelivery.countDocuments({ complaintId: complaint._id, status: 'Failed', errorCode: 'delivery_outcome_unknown_manual_review' })).toBe(2);
    expect(delivery.sendEmail).toHaveBeenCalledTimes(1); expect(delivery.sendSms).not.toHaveBeenCalled();
  });
  it('stops definite temporary failures after five attempts and does not retry permanent rejections', async () => {
    const complaint = await create(); await resolve(complaint._id);
    jest.mocked(delivery.sendEmail).mockRejectedValue(new delivery.DeliveryError('provider_rejected', true));
    jest.mocked(delivery.sendSms).mockRejectedValue(new delivery.DeliveryError('provider_rejected'));
    await NotificationDelivery.updateOne({ complaintId: complaint._id, channel: 'email' }, { $set: { attempts: 4 } });
    await resolution.runDeliveryWorkerPass(); await resolution.runDeliveryWorkerPass();
    const email = await NotificationDelivery.findOne({ complaintId: complaint._id, channel: 'email' });
    expect(email!.status).toBe('Failed'); expect(email!.attempts).toBe(5);
    expect(delivery.sendEmail).toHaveBeenCalledTimes(1); expect(delivery.sendSms).toHaveBeenCalledTimes(1);
    expect((await Complaint.findById(complaint._id))!.status).toBe('Resolved');
  });
  it('recovers the durable outbox when enqueue fails after the status commit', async () => {
    const complaint = await create(); const spy = jest.spyOn(resolution, 'queueResolutionNotifications').mockRejectedValueOnce(new Error('mock-storage-outage'));
    expect((await resolve(complaint._id)).status).toBe(200); spy.mockRestore();
    expect((await Complaint.findById(complaint._id))!.resolutionNoticePending).toBe(true);
    await resolution.runDeliveryWorkerPass(); await resolution.runDeliveryWorkerPass();
    expect((await Complaint.findById(complaint._id))!.resolutionNoticePending).toBe(false);
    expect(await Notification.countDocuments({ complaintId: complaint._id })).toBe(1); expect(delivery.sendEmail).toHaveBeenCalledTimes(1);
  });
  it('escapes untrusted HTML, includes factual fields, and provides a plain text fallback', async () => {
    const complaint = await create(); await resolve(complaint._id); await resolution.runDeliveryWorkerPass();
    const args = jest.mocked(delivery.sendEmail).mock.calls[0];
    expect(args[1]).toBe('Your CivicTrack complaint has been resolved'); expect(args[2]).toContain(complaint.complaintId); expect(args[2]).toContain('CivicTrack AI Team');
    expect(args[3]).not.toContain('<script>'); expect(args[3]).toContain('&lt;script&gt;'); expect(args[3]).toContain('Delivery &lt;Citizen&gt;');
  });
});
