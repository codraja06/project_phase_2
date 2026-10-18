import request from 'supertest';
import mongoose from 'mongoose';
import { createHmac } from 'crypto';
import app from '../src/app';
import { env } from '../src/config/env';
import { SignupChallenge, SignupThrottle } from '../src/models/SignupChallenge';
import { User } from '../src/models/User';
import * as delivery from '../src/services/contactDeliveryService';

jest.setTimeout(30000);
describe('OTP registration with actual API and isolated MongoDB, mocked delivery', () => {
  const emailCodes = new Map<string, string>(), smsCodes = new Map<string, string>();
  const contacts: string[] = [], ids: string[] = []; let sequence = 0;
  const secret = env.OTP_HASH_SECRET || env.JWT_SECRET;
  const key = (s: string) => createHmac('sha256', secret).update(s).digest('hex');
  const input = () => { sequence++; const email = `otp-${sequence}@signup-test.example`; contacts.push(email); return { name: 'OTP Citizen', email, phone: `+919001${String(sequence).padStart(6, '0')}`, password: 'Registration123!' }; };
  async function issue(data = input()) {
    const response = await request(app).post('/api/auth/signup/request-otp').send(data);
    expect(response.status).toBe(202); ids.push(response.body.data.challengeId);
    return { data, id: response.body.data.challengeId, response };
  }
  const verify = (id: string, code: string, channel = 'email') => request(app).post('/api/auth/signup/verify-otp').send({ challengeId: id, code, channel });
  const complete = (id: string) => request(app).post('/api/auth/signup/complete').send({ challengeId: id });
  beforeAll(async () => { await mongoose.connect(env.MONGODB_URI); await Promise.all([User.init(), SignupChallenge.init(), SignupThrottle.init()]); });
  beforeEach(() => {
    jest.spyOn(delivery, 'emailConfigured').mockReturnValue(true);
    jest.spyOn(delivery, 'smsConfigured').mockReturnValue(false);
    jest.spyOn(delivery, 'sendEmail').mockImplementation(async (to, _subject, text) => { emailCodes.set(to, text.match(/code is (\d{6})/)![1]); return 'mock-provider-id'; });
    jest.spyOn(delivery, 'sendSms').mockImplementation(async (to, text) => { smsCodes.set(to, text.match(/code is (\d{6})/)![1]); return 'mock-sms-id'; });
  });
  afterEach(() => { env.OTP_REQUIRE_PHONE = false; jest.restoreAllMocks(); });
  afterAll(async () => {
    await User.deleteMany({ email: { $in: contacts } });
    await SignupChallenge.deleteMany({ email: { $in: contacts } });
    await SignupThrottle.deleteMany({ _id: { $in: contacts.map(e => key(`email:${e}`)) } });
    await SignupThrottle.deleteMany({ _id: { $in: Array.from(smsCodes.keys()).map(p => key(`phone:${p.replace(/\D/g, '')}`)) } });
    await mongoose.disconnect();
  });
  it('registers only after a valid OTP, keeps hashes private, returns login token and preserves password sign-in', async () => {
    const { data, id, response } = await issue();
    expect(await User.exists({ email: data.email })).toBeNull();
    const stored = await SignupChallenge.findById(id).select('+emailCodeHash +passwordHash');
    expect(stored!.emailCodeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored!.emailCodeHash).not.toBe(emailCodes.get(data.email));
    expect(stored!.passwordHash).not.toBe(data.password);
    expect(JSON.stringify(response.body)).not.toContain(emailCodes.get(data.email));
    expect(response.body.data.devOtp).toBeUndefined();
    expect(new Date(response.body.data.expiresAt).getTime() - stored!.createdAt!.getTime()).toBeCloseTo(300000, -2);
    expect((await verify(id, emailCodes.get(data.email)!)).status).toBe(200);
    expect((await SignupChallenge.findById(id).select('+emailCodeHash'))!.emailCodeHash).toBeUndefined();
    const result = await complete(id);
    expect(result.status).toBe(201); expect(result.body.data.user.emailVerifiedAt).toBeTruthy();
    expect(result.body.data.user.phoneVerifiedAt).toBeNull(); expect(result.body.data.user.password).toBeUndefined();
    expect(result.body.data.user.role).toBe('citizen'); expect(result.body.data.token).toBeTruthy();
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${result.body.data.token}`)).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: data.email, password: data.password })).status).toBe(200);
    expect((await complete(id)).status).toBe(400);
  });
  it('rejects invalid codes and blocks all attempts after five guesses', async () => {
    const { data, id } = await issue(), correct = emailCodes.get(data.email)!;
    const wrong = correct === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 5; attempt++) expect((await verify(id, wrong)).status).toBe(400);
    expect((await verify(id, correct)).status).toBe(400);
    expect((await SignupChallenge.findById(id))!.emailAttempts).toBe(5);
    expect((await complete(id)).status).toBe(400);
  });
  it('rejects expired codes even before MongoDB TTL cleanup, and expires verified sessions', async () => {
    const { data, id } = await issue();
    await SignupChallenge.updateOne({ _id: id }, { $set: { otpExpiresAt: new Date(Date.now() - 1000) } });
    expect((await verify(id, emailCodes.get(data.email)!)).status).toBe(400);
    await SignupChallenge.updateOne({ _id: id }, { $set: { emailVerifiedAt: new Date(), expiresAt: new Date(Date.now() - 1000) } });
    expect((await complete(id)).status).toBe(400);
  });
  it('consumes successful OTPs atomically and prevents replay', async () => {
    const { data, id } = await issue();
    const results = await Promise.all([verify(id, emailCodes.get(data.email)!), verify(id, emailCodes.get(data.email)!)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 400]);
  });
  it('enforces cooldown and hourly limit and invalidates the previous challenge on resend', async () => {
    const { data, id } = await issue(), oldCode = emailCodes.get(data.email)!;
    expect((await request(app).post('/api/auth/signup/resend-otp').send({ challengeId: id })).status).toBe(429);
    await SignupThrottle.updateOne({ _id: key(`email:${data.email}`) }, { $set: { nextRequestAt: new Date(0) } });
    const resent = await request(app).post('/api/auth/signup/resend-otp').send({ challengeId: id });
    expect(resent.status).toBe(202); const newId = resent.body.data.challengeId; ids.push(newId);
    expect(newId).not.toBe(id); expect((await verify(id, oldCode)).status).toBe(400);
    await SignupThrottle.updateOne({ _id: key(`email:${data.email}`) }, { $set: { nextRequestAt: new Date(0), requestCount: env.OTP_HOURLY_LIMIT } });
    expect((await request(app).post('/api/auth/signup/resend-otp').send({ challengeId: newId })).status).toBe(429);
    expect((await verify(newId, emailCodes.get(data.email)!)).status).toBe(200);
    await SignupThrottle.updateOne({ _id: key(`email:${data.email}`) }, { $set: { windowStartedAt: new Date(Date.now() - 3600001) } });
    const freshWindow = await request(app).post('/api/auth/signup/resend-otp').send({ challengeId: newId });
    expect(freshWindow.status).toBe(202);
    expect((await SignupThrottle.findById(key(`email:${data.email}`)))!.requestCount).toBe(1);
  });
  it('allows only one simultaneous issuer for a contact', async () => {
    const data = input();
    const results = await Promise.all([request(app).post('/api/auth/signup/request-otp').send(data), request(app).post('/api/auth/signup/request-otp').send(data)]);
    expect(results.map(r => r.status).sort()).toEqual([202, 429]);
    expect(await SignupChallenge.countDocuments({ email: data.email })).toBe(1);
  });
  it('does not reveal existing accounts on OTP request and prevents duplicate email or legacy formatted phone registration after verification', async () => {
    const data = input(); await User.create({ ...data, phone: data.phone.replace('+91', '+91 ') });
    const existing = await issue(data); expect((await verify(existing.id, emailCodes.get(data.email)!)).status).toBe(200);
    expect((await complete(existing.id)).status).toBe(400);
    const other = input(); other.phone = data.phone;
    const duplicatePhone = await issue(other); await verify(duplicatePhone.id, emailCodes.get(other.email)!);
    expect((await complete(duplicatePhone.id)).status).toBe(400);
    expect(await User.countDocuments({ email: data.email })).toBe(1);
  });
  it('rejects bypasses and malformed inputs without creating a user or disclosing hashes', async () => {
    const { id } = await issue(); expect((await complete(id)).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...input(), emailVerifiedAt: new Date(), role: 'authority' })).status).toBe(400);
    expect((await request(app).post('/api/auth/signup/request-otp').send({ ...input(), phone: 'letters' })).status).toBe(400);
    expect((await verify(id, '123')).status).toBe(400);
  });
  it('returns a clear setup error and never claims success if SMTP is missing or sending fails', async () => {
    jest.mocked(delivery.emailConfigured).mockReturnValue(false);
    let result = await request(app).post('/api/auth/signup/request-otp').send(input());
    expect(result.status).toBe(503); expect(result.body.message).toContain('not configured'); expect(delivery.sendEmail).not.toHaveBeenCalled();
    jest.mocked(delivery.emailConfigured).mockReturnValue(true);
    jest.mocked(delivery.sendEmail).mockRejectedValue(new Error('raw-provider-secret-must-not-escape'));
    const data = input(); result = await request(app).post('/api/auth/signup/request-otp').send(data);
    expect(result.status).toBe(503); expect(JSON.stringify(result.body)).not.toContain('raw-provider-secret');
    expect(await SignupChallenge.countDocuments({ email: data.email })).toBe(0);
    expect(await User.exists({ email: data.email })).toBeNull();
  });
  it('verifies email and phone independently and enforces required phone verification', async () => {
    env.OTP_REQUIRE_PHONE = true; jest.mocked(delivery.smsConfigured).mockReturnValue(true);
    const { data, id } = await issue(); await verify(id, emailCodes.get(data.email)!);
    expect((await complete(id)).status).toBe(400);
    const result = await verify(id, smsCodes.get(data.phone)!, 'sms');
    expect(result.status).toBe(200); expect(result.body.data.phoneVerified).toBe(true);
    expect((await verify(id, smsCodes.get(data.phone)!, 'sms')).status).toBe(400);
    const created = await complete(id); expect(created.status).toBe(201); expect(created.body.data.user.phoneVerifiedAt).toBeTruthy();
    const token = created.body.data.token;
    const consent = await request(app).put('/api/auth/notification-preferences').set('Authorization', `Bearer ${token}`).send({ email: true, sms: true });
    expect(consent.status).toBe(200); expect(consent.body.data.notificationPreferences.smsConsentedAt).toBeTruthy();
    const changed = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ name: data.name, phone: '+919887654321' });
    expect(changed.status).toBe(200); expect(changed.body.data.phoneVerifiedAt).toBeNull();
    expect(changed.body.data.notificationPreferences.sms).toBe(false);
  });
  it('handles optional SMS failure honestly and blocks missing required provider setup', async () => {
    jest.mocked(delivery.smsConfigured).mockReturnValue(true); jest.mocked(delivery.sendSms).mockRejectedValue(new delivery.DeliveryError('provider_rejected'));
    const { data, id, response } = await issue(); expect(response.body.data.smsStatus).toBe('failed');
    await verify(id, emailCodes.get(data.email)!); const created = await complete(id);
    expect(created.status).toBe(201); expect(created.body.data.user.phoneVerifiedAt).toBeNull();
    env.OTP_REQUIRE_PHONE = true; jest.mocked(delivery.smsConfigured).mockReturnValue(false);
    expect((await request(app).post('/api/auth/signup/request-otp').send(input())).status).toBe(503);
  });
  it('does not complete required-phone registration when SMS delivery fails', async () => {
    env.OTP_REQUIRE_PHONE = true; jest.mocked(delivery.smsConfigured).mockReturnValue(true);
    jest.mocked(delivery.sendSms).mockRejectedValue(new delivery.DeliveryError('provider_rejected'));
    const { data, id, response } = await issue(); expect(response.body.data.smsStatus).toBe('failed');
    await verify(id, emailCodes.get(data.email)!); expect((await complete(id)).status).toBe(400);
    expect(await User.exists({ email: data.email })).toBeNull();
  });
  it('never exposes a development code or pretends to send when development mode is enabled', async () => {
    const previousMode = env.NODE_ENV, previousFlag = process.env.ALLOW_DEV_OTP;
    env.NODE_ENV = 'development'; process.env.ALLOW_DEV_OTP = 'true';
    jest.mocked(delivery.emailConfigured).mockReturnValue(false);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const data = input(); const result = await request(app).post('/api/auth/signup/request-otp').send(data);
      expect(result.status).toBe(503); expect(result.body.data).toBeUndefined();
      expect(log).not.toHaveBeenCalled(); expect(delivery.sendEmail).not.toHaveBeenCalled();
      expect(await SignupChallenge.exists({ email: data.email })).toBeNull();
    } finally { env.NODE_ENV = previousMode; if (previousFlag === undefined) delete process.env.ALLOW_DEV_OTP; else process.env.ALLOW_DEV_OTP = previousFlag; log.mockRestore(); error.mockRestore(); }
  });
  it('rejects legacy sessions that were marked sent without provider acceptance', async () => {
    const { data, id } = await issue();
    await SignupChallenge.updateOne({ _id: id }, { $unset: { emailProviderId: 1 } });
    expect((await verify(id, emailCodes.get(data.email)!)).status).toBe(400);
    await SignupChallenge.updateOne({ _id: id }, { $set: { emailVerifiedAt: new Date() } });
    expect((await complete(id)).status).toBe(400);
    expect(await User.exists({ email: data.email })).toBeNull();
  });
  it('preserves a verified session after a transient account-save failure so completion can retry without another OTP', async () => {
    const { data, id } = await issue(); await verify(id, emailCodes.get(data.email)!);
    const save = jest.spyOn(User.prototype, 'save').mockRejectedValueOnce(new Error('mock database outage'));
    expect((await complete(id)).status).toBe(500); save.mockRestore();
    const pending = await SignupChallenge.findById(id).select('+completionClaim');
    expect(pending!.emailVerifiedAt).toBeTruthy(); expect(pending!.completionClaim).toBeUndefined();
    expect((await complete(id)).status).toBe(201); expect(await User.countDocuments({ email: data.email })).toBe(1);
  });
  it('does not consume verification on duplicate details and serializes concurrent completion attempts', async () => {
    const duplicate = input(); await User.create(duplicate); const first = await issue(duplicate);
    await verify(first.id, emailCodes.get(duplicate.email)!);
    for (let i = 0; i < 2; i++) expect((await complete(first.id)).body.message).toContain('Registration cannot complete with these details');
    expect((await SignupChallenge.findById(first.id))!.emailVerifiedAt).toBeTruthy();
    const { data, id } = await issue(); await verify(id, emailCodes.get(data.email)!);
    const results = await Promise.all([complete(id), complete(id)]);
    expect(results.filter(r => r.status === 201)).toHaveLength(1); expect(results.some(r => [400,409].includes(r.status))).toBe(true);
    expect(await User.countDocuments({ email: data.email })).toBe(1);
  });
});
