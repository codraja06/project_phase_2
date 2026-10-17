import request from 'supertest';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { generateToken } from '../src/utils/jwt';

describe('Google sign-in role and identity checks', () => {
  const originalClientId = env.GOOGLE_CLIENT_ID;
  let verifyToken: jest.SpyInstance;

  beforeAll(async () => {
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/civictrack_isolated_test');
    env.GOOGLE_CLIENT_ID = 'test-web-client.apps.googleusercontent.com';
    await mongoose.connect(env.MONGODB_URI);
    verifyToken = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
  });

  afterEach(async () => {
    verifyToken.mockReset();
    await User.deleteMany({ email: /@google-auth-test\.example$/ });
  });

  afterAll(async () => {
    verifyToken.mockRestore();
    env.GOOGLE_CLIENT_ID = originalClientId;
    await mongoose.disconnect();
  });

  const googleIdentity = (email: string, sub: string, nonce?: string) => ({
    email,
    email_verified: true,
    sub,
    name: 'Google Test User',
    nonce,
  });

  it('creates a citizen only after verifying a Google ID token and nonce', async () => {
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity('citizen@google-auth-test.example', 'google-citizen', 'nonce-123') });

    const response = await request(app).post('/api/auth/google').send({ token: 'signed-id-token', nonce: 'nonce-123', role: 'citizen' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('citizen');
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(await User.findOne({ email: 'citizen@google-auth-test.example' })).toMatchObject({ googleId: 'google-citizen' });
    expect(verifyToken).toHaveBeenCalledWith({ idToken: 'signed-id-token', audience: env.GOOGLE_CLIENT_ID });
  });

  it('rejects a mismatched nonce', async () => {
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity('citizen@google-auth-test.example', 'google-citizen', 'different-nonce') });

    const response = await request(app).post('/api/auth/google').send({ token: 'signed-id-token', nonce: 'nonce-123', role: 'citizen' });

    expect(response.status).toBe(401);
    expect(await User.findOne({ email: 'citizen@google-auth-test.example' })).toBeNull();
  });

  it('does not create an officer account from a Google response', async () => {
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity('officer@google-auth-test.example', 'google-officer') });

    const response = await request(app).post('/api/auth/google').send({ token: 'signed-id-token', role: 'authority' });

    expect(response.status).toBe(403);
    expect(await User.findOne({ email: 'officer@google-auth-test.example' })).toBeNull();
  });

  it('does not silently take over a password account with the same email', async () => {
    await User.create({ name: 'Password User', email: 'citizen@google-auth-test.example', password: 'test-password', role: 'citizen' });
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity('citizen@google-auth-test.example', 'google-citizen') });

    const response = await request(app).post('/api/auth/google').send({ token: 'signed-id-token', role: 'citizen' });

    expect(response.status).toBe(401);
    expect((await User.findOne({ email: 'citizen@google-auth-test.example' }))?.googleId).toBeFalsy();
  });

  it('signs in a prelinked officer without changing their role', async () => {
    await User.create({ name: 'Officer', email: 'officer@google-auth-test.example', googleId: 'google-officer', role: 'authority' });
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity('officer@google-auth-test.example', 'google-officer') });

    const response = await request(app).post('/api/auth/google').send({ token: 'signed-id-token', role: 'authority' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('authority');
  });

  it('links a Google identity only to the signed-in account with the same email', async () => {
    const officer = await User.create({ name: 'Officer', email: 'officer@google-auth-test.example', password: 'test-password', role: 'authority' });
    const session = generateToken({ userId: officer._id.toString(), role: 'authority' });
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity(officer.email, 'google-officer', 'link-nonce') });

    const link = await request(app).post('/api/auth/google/link').set('Authorization', `Bearer ${session}`).send({ token: 'signed-id-token', nonce: 'link-nonce' });
    expect(link.status).toBe(200);
    expect(link.body.data.googleId).toBe('google-officer');
    expect(link.body.data.role).toBe('authority');

    const login = await request(app).post('/api/auth/google').send({ token: 'signed-id-token', nonce: 'link-nonce', role: 'authority' });
    expect(login.status).toBe(200);
    expect(login.body.data.user._id).toBe(officer._id.toString());
  });

  it('refuses linking a different Google email or an unauthenticated request', async () => {
    const officer = await User.create({ name: 'Officer', email: 'officer@google-auth-test.example', password: 'test-password', role: 'authority' });
    const session = generateToken({ userId: officer._id.toString(), role: 'authority' });
    verifyToken.mockResolvedValue({ getPayload: () => googleIdentity('other@google-auth-test.example', 'other-google-user') });

    const unauthenticated = await request(app).post('/api/auth/google/link').send({ token: 'signed-id-token' });
    const differentEmail = await request(app).post('/api/auth/google/link').set('Authorization', `Bearer ${session}`).send({ token: 'signed-id-token' });

    expect(unauthenticated.status).toBe(401);
    expect(differentEmail.status).toBe(403);
    expect((await User.findById(officer._id))?.googleId).toBeFalsy();
  });
});
