import http from 'http';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Complaint } from '../src/models/Complaint';
import { Conversation } from '../src/models/Conversation';
import { generateToken } from '../src/utils/jwt';
import { unavailableSeverity, calculatePriority } from '../src/services/triageService';

describe('Civic assistance and authority analytics', () => {
  let citizen: any, other: any, officer: any, token: string, otherToken: string, officerToken: string;
  let report: any, otherReport: any, provider: http.Server;
  let providerBody: any, providerAuthorization: string | undefined;
  const originalProvider = { url: env.CHAT_PROVIDER_URL, model: env.CHAT_PROVIDER_MODEL, key: env.CHAT_PROVIDER_API_KEY };
  beforeAll(async () => {
    await mongoose.connect(env.MONGODB_URI);
    await User.deleteMany({ email: /features456-.*@example.test/ });
    const create = (name: string, role: string) => User.create({ name, email: `features456-${name}@example.test`, phone: '9876543210', password: 'LocalTestOnly123!', role, isAdmin: role === 'authority' });
    citizen = await create('citizen', 'citizen'); other = await create('other', 'citizen'); officer = await create('officer', 'authority');
    token = generateToken({ userId: String(citizen._id), role: 'citizen' }); otherToken = generateToken({ userId: String(other._id), role: 'citizen' }); officerToken = generateToken({ userId: String(officer._id), role: 'authority' });
    const base = { title: 'features456 civic issue', description: 'Observed condition recorded by a citizen.', category: 'garbage', imageUrl: 'http://example.test/test.jpg', latitude: -33.9, longitude: 151.2 };
    report = await Complaint.create({ ...base, createdBy: citizen._id, severity: { ...unavailableSeverity(), level: 'Low', state: 'estimated' }, createdAt: new Date(Date.now() - 25 * 86400000) });
    otherReport = await Complaint.create({ ...base, title: 'features456 private record', createdBy: other._id, category: 'pothole', latitude: 10, longitude: 80, status: 'In Progress' });
    await Complaint.create({ ...base, createdBy: citizen._id, status: 'Resolved', createdAt: new Date(Date.now() - 3600000), resolvedAt: new Date() });
    provider = http.createServer((req, res) => {
      let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => {
        providerBody = JSON.parse(body); providerAuthorization = req.headers.authorization;
        const question = providerBody.messages.at(-1).content;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ choices: [{ message: { content: question === 'malformed provider test' ? 'invalid json' : JSON.stringify({ intent: 'report' }) } }] }));
      });
    });
    await new Promise<void>(resolve => provider.listen(0, '127.0.0.1', resolve));
    env.CHAT_PROVIDER_URL = ''; env.CHAT_PROVIDER_MODEL = ''; env.CHAT_PROVIDER_API_KEY = '';
  });
  afterAll(async () => {
    env.CHAT_PROVIDER_URL = originalProvider.url; env.CHAT_PROVIDER_MODEL = originalProvider.model; env.CHAT_PROVIDER_API_KEY = originalProvider.key;
    await new Promise<void>(resolve => provider.close(() => resolve()));
    const users = [citizen._id, other._id, officer._id];
    await Conversation.deleteMany({ userId: { $in: users } });
    await Complaint.deleteMany({ createdBy: { $in: users } }); await User.deleteMany({ _id: { $in: users } });
    await mongoose.disconnect();
  });

  it('requires authentication and keeps authority-only analytics separate from citizen assistance', async () => {
    expect((await request(app).get('/api/authority/analytics')).status).toBe(401);
    expect((await request(app).get('/api/authority/analytics').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    expect((await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${officerToken}`).send({ message: 'Help' })).status).toBe(403);
  });
  it('returns real aggregated counts, categories, geographic cells and current priority', async () => {
    const response = await request(app).get('/api/authority/analytics?search=features456').set('Authorization', `Bearer ${officerToken}`);
    expect(response.status).toBe(200); const data = response.body.data;
    expect(data.summary.total).toBe(3); expect(data.summary.pending).toBe(1); expect(data.summary.inProgress).toBe(1); expect(data.summary.resolved).toBe(1);
    expect(data.summary.highPriority).toBe(1); expect(data.categories.find((c: any) => c.category === 'garbage').count).toBe(2);
    expect(data.geography.reduce((sum: number, g: any) => sum + g.count, 0)).toBe(3);
    expect(data.trends.reduce((sum: number, t: any) => sum + t.count, 0)).toBe(3);
    expect(data.summary.averageResolutionHours).toBeCloseTo(1, 1);
    expect((await Complaint.findById(report._id))!.status).toBe('Pending');
  });
  it('supports date/category/status filters and validated pagination with policy-consistent ranking', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const response = await request(app).get(`/api/authority/analytics?search=features456&from=${date}&to=${date}&category=pothole&status=In%20Progress`).set('Authorization', `Bearer ${officerToken}`);
    expect(response.body.data.summary.total).toBe(1);
    expect((await request(app).get('/api/authority/analytics?from=2026-02-31').set('Authorization', `Bearer ${officerToken}`)).status).toBe(400);
    expect((await request(app).get('/api/authority/analytics?from=2026-10-20&to=2026-10-01').set('Authorization', `Bearer ${officerToken}`)).status).toBe(400);
    const list = await request(app).get('/api/authority/complaints?search=features456&sortBy=priority&page=1&limit=1').set('Authorization', `Bearer ${officerToken}`);
    expect(list.body.data.complaints).toHaveLength(1); expect(list.body.data.pagination.pages).toBe(3);
    expect(list.body.data.complaints[0]._id).toBe(String(report._id));
    expect(list.body.data.complaints[0].priorityScore).toBe(calculatePriority(report).priorityScore);
    const escaped = await request(app).get('/api/authority/analytics?search=%5B.*').set('Authorization', `Bearer ${officerToken}`);
    expect(escaped.body.data.summary.total).toBe(0);
  });
  it('persists clearly labeled provider fallback and scopes conversation history to the citizen', async () => {
    const sent = await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${token}`).send({ message: 'How do I report an issue?' });
    expect(sent.status).toBe(200); expect(sent.body.data.available).toBe(false); expect(sent.body.data.source).toBe('guide');
    expect(sent.body.data.conversation.messages[1].content).toContain('Open Report Issue');
    const history = await request(app).get('/api/chat/conversation').set('Authorization', `Bearer ${token}`);
    expect(history.body.data.messages).toHaveLength(2);
    const foreign = await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${otherToken}`).send({ message: 'Help', conversationId: sent.body.data.conversation._id });
    expect(foreign.status).toBe(404);
    const otherHistory = await request(app).get('/api/chat/conversation').set('Authorization', `Bearer ${otherToken}`);
    expect(otherHistory.body.data.messages).toEqual([]);
  });
  it('reads only the current citizen’s complaint facts and never changes complaint state', async () => {
    for (const [reference, expected] of [[report.complaintId, 'Current status: Pending'], [otherReport.complaintId, 'No complaint matching']]) {
      const response = await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${token}`).send({ message: `Resolve ${reference}` });
      expect(response.body.data.conversation.messages.at(-1).content).toContain(expected); expect(response.body.data.source).toBe('application');
    }
    expect((await Complaint.findById(report._id))!.status).toBe('Pending');
  });
  it('calls a configured provider securely and rejects malformed model output into the guide fallback', async () => {
    env.CHAT_PROVIDER_URL = `http://127.0.0.1:${(provider.address() as any).port}/chat`;
    env.CHAT_PROVIDER_MODEL = 'test-provider-model'; env.CHAT_PROVIDER_API_KEY = 'isolated-test-key';
    const response = await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${token}`).send({ message: 'Please help with a new report' });
    expect(response.status).toBe(200); expect(response.body.data.available).toBe(true); expect(response.body.data.source).toBe('provider-guided');
    expect(providerBody.model).toBe('test-provider-model'); expect(providerAuthorization).toBe('Bearer isolated-test-key');
    expect(JSON.stringify(response.body)).not.toContain('isolated-test-key');
    const malformed = await request(app).post('/api/chat/messages').set('Authorization', `Bearer ${token}`).send({ message: 'malformed provider test' });
    expect(malformed.body.data.available).toBe(false); expect(malformed.body.data.source).toBe('guide');
  });
});
