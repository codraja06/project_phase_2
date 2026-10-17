// Uses actual backend APIs and an explicitly isolated local database.
const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const mongoose = require('../../../backend/node_modules/mongoose');
const { User } = require('../../../backend/dist/models/User');
const { Complaint } = require('../../../backend/dist/models/Complaint');
const { Conversation } = require('../../../backend/dist/models/Conversation');
const fs = require('fs'), path = require('path');
const WEB = process.env.PHASE2_WEB_URL || 'http://localhost:8083';
const API = 'http://127.0.0.1:5052/api';
const artifact = path.join(__dirname, '../artifacts/redesign');
fs.mkdirSync(artifact, { recursive: true });
const widths = [320,375,430,768,1024,1280,1440,1920];
const results = [], errors = [], accessibility = [], checks = [], users = [];
let browser;
const password = 'IsolatedAdaptiveTest123!';
async function auth(page, user) {
  await page.goto(`${WEB}/${user.role === 'citizen' ? 'citizen-login' : 'authority-login'}`);
  await page.getByLabel(user.role === 'citizen' ? 'Email Address' : 'Department Official Email', { exact: true }).fill(user.email);
  await page.getByLabel(user.role === 'citizen' ? 'Password' : 'Officer Security Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: user.role === 'citizen' ? 'Sign In' : 'Authenticate as Officer', exact: true }).click();
  await page.getByText(user.role === 'citizen' ? 'Quick Issue Categories' : 'Operational Command Center', { exact: true }).filter({ visible: true }).last().waitFor();
}
async function layout(page, role, route, detail = false) {
  for (const width of widths) {
    const height = width === 320 ? 640 : width === 768 ? 1024 : 900;
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const metrics = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      font: getComputedStyle(document.querySelector('[dir="auto"]') || document.body).fontFamily }));
    const result = { role, route, width, height, ...metrics }; results.push(result);
    expect(metrics.documentWidth, JSON.stringify(result)).toBeLessThanOrEqual(width);
    expect(metrics.bodyWidth, JSON.stringify(result)).toBeLessThanOrEqual(width);
    if (role !== 'auth') {
      if (width >= 768) {
        await expect(page.getByTestId('workspace-sidebar').filter({ visible: true })).toBeVisible();
        await expect(page.getByTestId('primary-bottom-navigation').filter({ visible: true })).toHaveCount(0);
      } else if (!detail) {
        const bar = page.getByTestId('primary-bottom-navigation').filter({ visible: true });
        await expect(bar).toBeVisible(); expect(await bar.getByRole('button').count()).toBeLessThanOrEqual(5);
      }
    }
    if ([320,1440].includes(width) && /dashboard|report|assistance|analytics|login/.test(route)) {
      await page.screenshot({ path: path.join(artifact, `${role}-${route.replaceAll('/','-')}-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function axe(page, route) {
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).disableRules(['region']).analyze();
  accessibility.push({ route, violations: scan.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
}
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civictrack_phase2_e2e');
    const suffix = Date.now();
    for (const role of ['citizen','authority']) users.push(await User.create({ name: `Adaptive ${role}`, email: `adaptive-${role}-${suffix}@example.test`, password, phone: '9876543210', role }));
    const base = { imageUrl: 'http://127.0.0.1:5052/uploads/does-not-exist.png', description: 'Isolated local test report for navigation and analytics.', createdBy: users[0]._id, latitude: 13.08, longitude: 80.27, address: 'Confirmed test coordinates' };
    const reports = [];
    for (let i = 0; i < 3; i++) reports.push(await Complaint.create({ ...base, title: `Adaptive report ${i+1}`, category: ['pothole','garbage','water_leakage'][i], status: ['Pending','In Progress','Resolved'][i], createdAt: new Date(Date.now() - i * 86400000), resolvedAt: i === 2 ? new Date() : null }));
    browser = await chromium.launch({ channel: 'msedge' });
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const publicPage = await publicContext.newPage(); publicPage.on('pageerror', e => errors.push(e.message));
    for (const [route, name] of [['citizen-login','Email Address'],['citizen-register','Full Legal Name'],['authority-login','Department Official Email']]) {
      await publicPage.goto(`${WEB}/${route}`);
      await publicPage.getByLabel(name, { exact: true }).filter({ visible: true }).waitFor();
      await layout(publicPage, 'auth', route);
      await axe(publicPage, route);
    }
    await publicContext.close();
    for (const user of users) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await auth(page, user);
      const routes = user.role === 'citizen' ? [
        ['citizen/dashboard','Quick Issue Categories'],['citizen/report','Report Civic Hazard'],['citizen/history','My Complaints'],
        ['citizen/map','Your report map'],['citizen/alerts','Notifications'],['citizen/assistance','Civic Assistance'],['citizen/profile','Account Settings'],[`citizen/complaint/${reports[0]._id}`,'Incident Dossier'],
      ] : [
        ['authority/dashboard','Operational Command Center'],['authority/complaints','Incident Registry'],['authority/map','Incident Map'],
        ['authority/analytics','Municipal Analytics'],['authority/alerts','Notifications'],['authority/profile','Officer Dossier'],[`authority/complaint/${reports[0]._id}`,'Incident Dossier'],
      ];
      for (const [route, heading] of routes) {
        await page.setViewportSize({ width: 1440, height: 900 });
        const names = user.role === 'citizen' ? { dashboard: 'Dashboard', report: 'Report Issue', history: 'My Complaints', map: 'Map', alerts: 'Notifications', assistance: 'Civic Assistance', profile: 'Profile & Settings' } : { dashboard: 'Command Center', complaints: 'All Complaints', map: 'Incident Map', analytics: 'Operations Analytics', alerts: 'Alerts & Feed', profile: 'Profile & Settings' };
        const destination = route.split('/')[1];
        const sidebar = page.getByTestId('workspace-sidebar').filter({ visible: true });
        if (destination === 'complaint') {
          await sidebar.getByRole('button', { name: user.role === 'citizen' ? 'My Complaints' : 'All Complaints', exact: true }).click();
          await page.getByText(reports[0].complaintId, { exact: true }).filter({ visible: true }).first().click();
        } else await sidebar.getByRole('button', { name: names[destination], exact: true }).click();
        await page.getByText(heading, { exact: true }).filter({ visible: true }).last().waitFor({ timeout: 30000 });
        await layout(page, user.role, route, route.includes('/complaint/'));
        if (/assistance|analytics|profile|complaint\//.test(route)) { await page.setViewportSize({ width: 1440, height: 900 }); await axe(page, route); }
      }
      if (user.role === 'citizen') {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByTestId('workspace-sidebar').filter({ visible: true }).getByRole('button', { name: 'Civic Assistance', exact: true }).click();
        const input = page.getByLabel('Message to civic assistant', { exact: true });
        await input.fill('How do I report an issue?'); await page.getByRole('button', { name: 'Send message', exact: true }).click();
        await expect(page.getByText('AI assistance is currently unavailable. Showing the built-in civic guide; you can still report and track complaints.', { exact: true })).toBeVisible();
        await input.fill(`What is the status of ${reports[0].complaintId}?`); await page.getByRole('button', { name: 'Send message', exact: true }).click();
        await expect(page.getByText(/Current status: Pending/)).toBeVisible();
        await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Dashboard', exact: true }).click();
        await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Civic Assistance', exact: true }).click();
        await expect(page.getByText(/Current status: Pending/)).toBeVisible();
        checks.push('Real citizen chat history, labeled provider-unavailable fallback, and account-scoped complaint lookup');
      } else {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByTestId('workspace-sidebar').filter({ visible: true }).getByRole('button', { name: 'Operations Analytics', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Total complaints: 3', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Show trend data', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Hide trend data', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Pending: 1', exact: true }).click();
        await expect(page.getByText('Adaptive report 1', { exact: true }).filter({ visible: true })).toBeVisible();
        await page.setViewportSize({ width: 320, height: 640 });
        const menu = page.getByRole('button', { name: 'Open Menu', exact: true });
        await menu.focus(); await page.keyboard.press('Enter');
        await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toHaveCount(0);
        checks.push('Real analytics totals, trend data alternative and metric-to-filtered-complaint navigation');
        checks.push('Mobile navigation opens by keyboard and closes with Escape');
      }
      await context.close();
    }
    expect(errors).toEqual([]); expect(accessibility.flatMap(a => a.violations.map(v => `${a.route}: ${v.id}`))).toEqual([]); checks.push(`${results.length} route/viewport checks across all eight requested widths, plus landscape`);
  } finally {
    if (browser) await browser.close();
    if (users.length) {
      await Conversation.deleteMany({ userId: { $in: users.map(u => u._id) } });
      await Complaint.deleteMany({ createdBy: { $in: users.map(u => u._id) } }); await User.deleteMany({ _id: { $in: users.map(u => u._id) } });
    }
    await mongoose.disconnect();
    fs.writeFileSync(path.join(artifact, 'results.json'), JSON.stringify({ checks, results, errors, accessibility }, null, 2));
    console.log(JSON.stringify({ checks, layoutChecks: results.length, errors, accessibilityViolations: accessibility.map(a => ({ route: a.route, ids: a.violations.map(v => v.id) })) }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
