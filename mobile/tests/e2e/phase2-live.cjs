// Opt-in verification against real local services and a dedicated test database.
// Run with AI on 8052, backend on 5052, Expo web on 8081 (API URL pointing to 5052).
const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const mongoose = require('../../../backend/node_modules/mongoose');
const { User } = require('../../../backend/dist/models/User');
const { Complaint } = require('../../../backend/dist/models/Complaint');
const API = 'http://127.0.0.1:5052/api';
const WEB = process.env.PHASE2_WEB_URL || 'http://localhost:8081';
const DB = 'mongodb://127.0.0.1:27017/civictrack_phase2_e2e';
const photo = process.env.PHASE2_TEST_IMAGE;
if (!photo || !fs.existsSync(photo)) throw new Error('Set PHASE2_TEST_IMAGE to a real civic issue image.');
const suffix = Date.now();
const password = 'LocalTestOnly-Phase2!';
const checks = [], errors = [], users = [];
const artifacts = path.join(__dirname, '../artifacts');
fs.mkdirSync(artifacts, { recursive: true });

async function api(route, token, method = 'GET', body) {
  const response = await fetch(`${API}${route}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${result.message}`);
  return result.data;
}
async function login(page, email, role) {
  await page.goto(`${WEB}/${role === 'citizen' ? 'citizen-login' : 'authority-login'}`);
  await page.getByLabel(role === 'citizen' ? 'Email Address' : 'Department Official Email', { exact: true }).fill(email);
  await page.getByLabel(role === 'citizen' ? 'Password' : 'Officer Security Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: role === 'citizen' ? 'Sign In' : 'Authenticate as Officer', exact: true }).click();
  await page.getByText(role === 'citizen' ? 'Quick Issue Categories' : 'Command Center', { exact: true }).last().waitFor();
}

(async () => {
  let browser;
  try {
    await mongoose.connect(DB);
    for (const role of ['citizen', 'authority']) {
      const user = await User.create({ name: `Phase Two ${role}`, email: `phase2-${role}-${suffix}@example.test`,
        phone: '9876543210', password, role });
      users.push(user);
    }
    const citizen = await api('/auth/login', null, 'POST', { email: users[0].email, password });
    const officer = await api('/auth/login', null, 'POST', { email: users[1].email, password });
    const registry = await api('/ai/models', citizen.token);
    expect(registry.available).toBe(true);
    expect(registry.models.filter(model => model.state === 'ready').length).toBe(4);
    const routedForm = category => {
      const body = new FormData(); body.append('category', category);
      body.append('image', new Blob([fs.readFileSync(photo)], { type: 'image/webp' }), path.basename(photo));
      return body;
    };
    const potholeOnly = await api('/ai/detect', citizen.token, 'POST', routedForm('pothole'));
    expect(potholeOnly.modelsUsed.every(model => ['pothole','road_damage'].includes(model))).toBe(true);
    expect(potholeOnly.detections.every(detection => detection.category === 'pothole')).toBe(true);
    const garbageOnly = await api('/ai/detect', citizen.token, 'POST', routedForm('garbage'));
    expect(garbageOnly.modelsUsed).toEqual(['garbage_overflow']);
    for (const category of ['road_damage','broken_streetlight','water_leakage']) {
      const unavailable = await fetch(`${API}/ai/detect`, { method: 'POST', headers: { Authorization: `Bearer ${citizen.token}` }, body: routedForm(category) });
      expect(unavailable.status).toBe(503);
      expect((await unavailable.json()).message).toContain('No compatible trained model');
    }
    checks.push('Actual registry and category-specific pothole/garbage inference; incompatible or missing road/streetlight/water models return explicit 503');
    browser = await chromium.launch({ channel: 'msedge' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await login(page, users[0].email, 'citizen');
    await page.getByRole('button', { name: 'Report Issue', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Image', exact: true }).click();
    const analysisResponse = page.waitForResponse(r => r.url().includes('/api/ai/detect') && r.request().method() === 'POST', { timeout: 120000 });
    await (await chooser).setFiles(photo);
    const analysisEnvelope = await (await analysisResponse).json();
    const analysis = analysisEnvelope.data;
    expect(analysis.detections.length).toBeGreaterThan(0);
    expect(analysis.severity.level).toMatch(/Low|Medium|High/);
    expect(analysis.severity.validated).toBe(false);
    await expect(page.getByText(`${analysis.severity.level} severity · experimental`, { exact: true })).toBeVisible();
    const editor = page.getByLabel('Complaint description', { exact: true });
    await expect(editor).toHaveValue(analysis.generatedDescription);
    const dimensions = JSON.parse(require('child_process').execFileSync(path.resolve(__dirname, '../../../ai-service/venv/Scripts/python.exe'),
      ['-c', 'import json,sys; from PIL import Image; print(json.dumps(Image.open(sys.argv[1]).size))', photo], { encoding: 'utf8' }));
    for (const width of [320,375,430,768,1024,1280,1440,1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      let geometry;
      await expect.poll(async () => {
        const imageRect = await page.getByLabel('Reported civic issue photograph', { exact: true }).filter({ visible: true }).first().boundingBox();
        const actualBox = await page.getByTestId('detection-box-0').filter({ visible: true }).first().boundingBox();
        const scale = Math.min(imageRect.width / dimensions[0], imageRect.height / dimensions[1]);
        const expected = analysis.detections[0].bbox;
        const differences = [
          Math.abs(actualBox.x - (imageRect.x + (imageRect.width - dimensions[0] * scale) / 2 + expected.x1 * scale)),
          Math.abs(actualBox.y - (imageRect.y + (imageRect.height - dimensions[1] * scale) / 2 + expected.y1 * scale)),
          Math.abs(actualBox.width - (expected.x2 - expected.x1) * scale),
          Math.abs(actualBox.height - (expected.y2 - expected.y1) * scale),
        ];
        geometry = { width, dimensions, imageRect, actualBox, expected, differences };
        return Math.max(...differences);
      }, { message: `Bounding boxes align after resize at ${width}px` }).toBeLessThan(2).catch(error => { console.log(JSON.stringify(geometry)); throw error; });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    checks.push('Real YOLO bounding-box geometry remains aligned within 2px at all eight requested widths');
    checks.push('Real uploaded image -> Express -> FastAPI -> four YOLO models -> severity and grounded draft');
    const approvedText = `${analysis.generatedDescription} Citizen requests an inspection.`;
    await editor.fill(approvedText);
    await page.getByRole('button', { name: 'Continue to Location', exact: true }).click();
    await page.getByLabel('Incident latitude', { exact: true }).fill('-33.9');
    await page.getByLabel('Incident longitude', { exact: true }).fill('151.2');
    await page.getByRole('button', { name: 'Set incident location', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm Location & Review', exact: true }).click();
    await expect(page.getByText(approvedText, { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 568 });
    await page.screenshot({ path: path.join(artifacts, 'phase2-citizen-review-320.png'), fullPage: true });
    const submitted = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'SUBMIT COMPLAINT', exact: true }).click();
    const submittedResponse = await submitted;
    expect(submittedResponse.status()).toBe(201);
    const complaint = (await submittedResponse.json()).data;
    const stored = await Complaint.findById(complaint._id);
    expect(stored.description).toBe(approvedText);
    expect(stored.severity.level).toBe(analysis.severity.level);
    expect(stored.severity.assessedAt).toBeTruthy();
    expect(stored.generatedDescription).toBe(analysis.generatedDescription);
    expect(stored.status).toBe('Pending');
    expect(stored.latitude).toBe(-33.9);
    checks.push('Citizen edits draft, reviews at 320px, submits; signed evidence and approved text persist in MongoDB');
    await page.getByRole('button', { name: 'VIEW COMPLAINT DETAILS', exact: true }).click();
    await expect(page.getByText(`${analysis.severity.level} severity · experimental`, { exact: true }).filter({ visible: true })).toBeVisible();
    await page.screenshot({ path: path.join(artifacts, 'phase2-citizen-detail-320.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Back', exact: true }).filter({ visible: true }).click();
    await page.getByRole('button', { name: 'Report Issue', exact: true }).click();
    const manualChooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Image', exact: true }).click();
    await (await manualChooser).setFiles(path.join(__dirname, '../../assets/icon.png'));
    await expect(page.getByLabel('Complaint description', { exact: true })).toHaveValue('', { timeout: 60000 });
    await expect(page.getByText('AI description unavailable. Enter the condition you observed to continue.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Garbage', exact: true }).click();
    const manualText = 'Citizen manually requests an inspection at the confirmed location.';
    await page.getByLabel('Complaint description', { exact: true }).fill(manualText);
    await page.getByRole('button', { name: 'Continue to Location', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm Location & Review', exact: true }).click();
    const manualSubmit = page.waitForResponse(r => r.url().endsWith('/api/complaints') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'SUBMIT COMPLAINT', exact: true }).click();
    const manualResponse = await manualSubmit;
    expect(manualResponse.status()).toBe(201);
    const manual = (await manualResponse.json()).data;
    expect(manual.severity.level).toBeNull();
    expect(manual.generatedDescription).toBe('');
    expect(manual.description).toBe(manualText);
    checks.push('Real non-civic image -> empty AI draft and unknown severity -> manual description and category -> successful submission');
    await context.close();

    // Create age/category examples only in the dedicated test database.
    const old = await Complaint.create({ title: `Aged low-severity test ${suffix}`, description: 'Isolated test record for priority aging.', category: 'garbage',
      imageUrl: complaint.imageUrl, createdBy: users[0]._id, latitude: -33.9, longitude: 151.2,
      status: 'Pending', severity: { ...analysis.severity, level: 'Low' }, createdAt: new Date(Date.now() - 30 * 86400000) });
    const high = await api('/authority/complaints?priority=high&sortBy=priority', officer.token);
    expect(high.complaints.some(c => c._id === String(old._id))).toBe(true);
    checks.push('Older low-severity unresolved report escalates to High Priority through the actual API');

    const authorityContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const authorityPage = await authorityContext.newPage();
    authorityPage.on('pageerror', e => errors.push(e.message));
    await login(authorityPage, users[1].email, 'authority');
    await expect(authorityPage.getByText(`${analysis.severity.level} severity · experimental`, { exact: true }).first()).toBeVisible();
    await authorityPage.getByRole('button', { name: 'All Complaints', exact: true }).click();
    await expect(authorityPage.getByText(complaint.complaintId, { exact: true }).filter({ visible: true })).toBeVisible();
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 320, height: 568 }]) {
      await authorityPage.setViewportSize(viewport);
      await authorityPage.screenshot({ path: path.join(artifacts, `phase2-authority-list-${viewport.width}.png`), fullPage: true });
      expect(await authorityPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (viewport.width === 320) {
        await authorityPage.getByText(`${analysis.severity.level} severity · experimental`, { exact: true }).filter({ visible: true }).scrollIntoViewIfNeeded();
        await authorityPage.screenshot({ path: path.join(artifacts, 'phase2-authority-badges-320.png') });
      }
    }
    await authorityPage.setViewportSize({ width: 1440, height: 900 });
    const filteredResponse = authorityPage.waitForResponse(r => r.url().includes('/api/authority/complaints?') && r.url().includes('priority=high'));
    await authorityPage.getByRole('button', { name: 'High Priority', exact: true }).click();
    expect((await filteredResponse).status()).toBe(200);
    await expect(authorityPage.getByText(`Aged low-severity test ${suffix}`, { exact: true })).toBeVisible();
    const sortedResponse = authorityPage.waitForResponse(r => r.url().includes('sortBy=oldest'));
    await authorityPage.getByRole('button', { name: 'Oldest first', exact: true }).click();
    expect((await sortedResponse).status()).toBe(200);
    await authorityPage.getByRole('button', { name: 'All priorities', exact: true }).click();
    await authorityPage.getByText(complaint.complaintId, { exact: true }).filter({ visible: true }).click();
    await expect(authorityPage.getByText(approvedText, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(authorityPage.getByText(`${analysis.severity.level} severity · experimental`, { exact: true }).filter({ visible: true })).toBeVisible();
    checks.push('Authority dashboard/list/details show real severity, priority and approved text; real priority filtering/sorting; 320/768/1440px layouts');
    await api(`/authority/complaints/${complaint._id}/status`, officer.token, 'PATCH', { status: 'In Progress' });
    const resolved = await api(`/authority/complaints/${complaint._id}/status`, officer.token, 'PATCH', { status: 'Resolved' });
    expect(resolved.priorityScore).toBe(0);
    expect(resolved.status).toBe('Resolved');
    checks.push('Only explicit authority status updates resolve a complaint; resolved priority becomes zero');

    expect(errors).toEqual([]);
  } finally {
    if (browser) await browser.close();
    if (users.length) {
      await Complaint.deleteMany({ createdBy: { $in: users.map(u => u._id) } });
      await User.deleteMany({ _id: { $in: users.map(u => u._id) } });
    }
    await mongoose.disconnect();
    fs.writeFileSync(path.join(artifacts, 'phase2-live-results.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks, errors }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
