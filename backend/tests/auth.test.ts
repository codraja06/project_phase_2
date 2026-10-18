import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User';
import { env } from '../src/config/env';

jest.setTimeout(30000);

describe('Auth API Endpoints', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    }
  });

  afterEach(async () => {
    await User.deleteMany({ email: /test.*@example\.com|john@example\.com|jane@example\.com/ });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('rejects direct registration without a verified challenge', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'John Citizen',
      email: 'john@example.com',
      phone: '1234567890',
      password: 'password123',
      role: 'citizen',
    });

    expect(res.status).toBe(400);
    expect(await User.exists({ email: 'john@example.com' })).toBeNull();
  });

  it('should login an existing user and return token', async () => {
    await User.create({
      name: 'Jane Citizen',
      email: 'jane@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'citizen',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await User.create({
      name: 'Jane Citizen',
      email: 'jane@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'citizen',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
