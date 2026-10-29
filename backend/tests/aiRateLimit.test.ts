import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { generateToken } from '../src/utils/jwt';

describe('AI image analysis rate limit', () => {
  it('limits repeated analysis requests per authenticated account', async () => {
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/civictrack_isolated_test');
    await mongoose.connect(env.MONGODB_URI);
    const user = await User.create({ name: 'Rate limit test', email: `ai-limit-${Date.now()}@example.test`, password: 'TestOnlyPassword123!', role: 'citizen' });
    const token = generateToken({ userId: String(user._id), role: 'citizen' });
    try {
      for (let i = 0; i < 20; i++) {
        expect((await request(app).post('/api/ai/detect').set('Authorization', `Bearer ${token}`)).status).toBe(400);
      }
      expect((await request(app).post('/api/ai/detect').set('Authorization', `Bearer ${token}`)).status).toBe(429);
    } finally {
      await User.deleteOne({ _id: user._id });
      await mongoose.disconnect();
    }
  });
});
