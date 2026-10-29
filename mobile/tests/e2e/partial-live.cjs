// Actual API/MongoDB/browser coverage; restricted to the dedicated local test DB.
const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const mongoose = require('../../../backend/node_modules/mongoose');
const { User } = require('../../../backend/dist/models/User');
const { DepartmentRule } = require('../../../backend/dist/models/DepartmentRule');
const { AdministrationAudit } = require('../../../backend/dist/models/AdministrationAudit');
const { RevokedToken } = require('../../../backend/dist/models/RevokedToken');
const { configureProvisionalMunicipality } = require('../../../backend/dist/services/municipalSetupService');
const fs = require('fs'), path = require('path');
const WEB = process.env.PHASE2_WEB_URL || 'http://127.0.0.1:8083';
const API = 'http://127.0.0.1:5052/api';
const password = 'IsolatedPartialLive2026!', nextPassword = 'IsolatedPartialRotated2026!';
const checks = [], widths = [], accessibility = [], errors = [];
let officer, browser;
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civictrack_phase2_e2e');
    officer = await User.create({ name: 'Isolated routing officer', role: 'authority',
      email: `partial-officer-${Date.now()}@example.test`, phone: '9876543210', password });
    await configureProvisionalMunicipality({ apply: true, administratorId: String(officer._id) });
    expect(await DepartmentRule.countDocuments({ updatedBy: officer._id, verificationStatus: 'proposed' })).toBe(9);
    browser = await chromium.launch({ channel: 'msedge' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(`${WEB}/authority-login`);
    await page.getByLabel('Department Official Email', { exact: true }).fill(officer.email);
    await page.getByLabel('Officer Security Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Authenticate as Officer', exact: true }).click();
    await page.getByText('Command Center', { exact: true }).filter({ visible: true }).last().waitFor();
    await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Profile & Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Edit mapping for pothole', exact: true }).waitFor();
    expect(await page.getByRole('button', { name: /^Edit mapping for/ }).count()).toBe(9);
    await expect(page.getByText(/Proposed · official structure not verified/).first()).toBeVisible();
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 400 ? 667 : 900 });
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      widths.push({ width, scrollWidth }); expect(scrollWidth).toBeLessThanOrEqual(width);
      if (width === 320 || width === 1440) {
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).disableRules(['region']).analyze();
        accessibility.push({ width, violations: scan.violations.map(v => v.id) }); expect(scan.violations.map(v => v.id)).toEqual([]);
        await page.screenshot({ path: path.join(__dirname, `../artifacts/provisional-routing-${width}.png`), fullPage: true });
      }
    }
    checks.push('Nine actual proposed Avadi mappings render at 320/375/768/1440px with no overflow or WCAG A/AA violations');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Edit mapping for pothole', exact: true }).click();
    await expect(page.getByLabel('Department mapping name')).toHaveValue('Roads and Engineering Department');
    await page.getByLabel('Department mapping name').fill('Isolated Avadi Roads Team');
    const save = page.waitForResponse(r => r.url().endsWith('/management/departments/pothole') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save routing rule', exact: true }).click();
    expect((await save).status()).toBe(200);
    expect((await DepartmentRule.findOne({ category: 'pothole' })).verificationStatus).toBe('proposed');
    checks.push('Administrator edits stored routing through the real API while retaining provisional metadata');
    // Capture the current token only inside the test to check revocation; never log it.
    const loginResponse = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: officer.email, password, role: 'authority' }) });
    expect(loginResponse.status).toBe(200); const oldToken = (await loginResponse.json()).data.token;
    await page.getByText('Security Credentials', { exact: true }).click();
    await page.getByLabel('Current Officer Password', { exact: true }).fill(password);
    await page.getByLabel('New Security Password', { exact: true }).fill(nextPassword);
    const changed = page.waitForResponse(r => r.url().endsWith('/auth/change-password'));
    await page.getByRole('button', { name: 'Update Credentials', exact: true }).click();
    expect((await changed).status()).toBe(200);
    await page.getByRole('button', { name: 'Update Credentials', exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Edit mapping for pothole', exact: true }).click();
    await page.getByLabel('Department mapping name').fill('Isolated Avadi Roads Team After Rotation');
    const afterRotation = page.waitForResponse(r => r.url().endsWith('/management/departments/pothole') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save routing rule', exact: true }).click();
    expect((await afterRotation).status()).toBe(200);
    expect((await fetch(`${API}/management/departments`, { headers: { Authorization: `Bearer ${oldToken}` } })).status).toBe(401);
    await page.goto(`${WEB}/authority-login`);
    await page.getByRole('button', { name: 'Resume Officer Session', exact: true }).click();
    await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Profile & Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Edit mapping for pothole', exact: true }).waitFor();
    checks.push('Actual browser password change stores replacement session, resumes after reload, authorizes a subsequent mutation and rejects an older token');
    expect(errors).toEqual([]);
  } catch (e) { errors.push(e.stack || String(e)); process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    if (officer) {
      await DepartmentRule.deleteMany({ updatedBy: officer._id });
      await AdministrationAudit.deleteMany({ subject: officer._id });
      await RevokedToken.deleteMany({ userId: officer._id });
      await User.deleteOne({ _id: officer._id });
    }
    await mongoose.disconnect();
    fs.writeFileSync(path.join(__dirname, '../artifacts/partial-live-results.json'), JSON.stringify({ checks, widths, accessibility, errors }, null, 2));
    console.log(JSON.stringify({ checks, widths, accessibility, errors }, null, 2));
  }
})();
