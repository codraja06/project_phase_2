// Uses only a dedicated local database and synthetic records.
const { chromium, expect } = require('@playwright/test');
const mongoose = require('../../../backend/node_modules/mongoose');
const { User } = require('../../../backend/dist/models/User');
const { Complaint } = require('../../../backend/dist/models/Complaint');
const fs = require('fs');
let browser, admin, citizen;
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civictrack_phase2_e2e');
    const unique = Date.now(), password = 'PowerBiLocalTest2026!';
    const make = (role, isAdmin) => User.create({ name: `Export test ${role}`, email: `powerbi-${role}-${unique}@example.test`, password, role, isAdmin });
    admin = await make('authority', true); citizen = await make('citizen', false);
    const category = `powerbi_test_${unique}`;
    const report = await Complaint.create({ title: 'Synthetic export report', description: 'Synthetic issue for local export verification.', category, imageUrl: 'https://example.test/image.png', latitude: 13.1, longitude: 80.2, address: 'Synthetic address', createdBy: citizen._id });
    browser = await chromium.launch({ channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await page.goto('http://127.0.0.1:8083/authority-login');
    await page.getByLabel('Department Official Email', { exact: true }).fill(admin.email);
    await page.getByLabel('Officer Security Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Authenticate as Officer', exact: true }).click();
    await page.getByText('Command Center', { exact: true }).last().waitFor();
    await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Operations Analytics', exact: true }).click();
    await page.getByRole('button', { name: 'All time', exact: true }).click();
    await page.getByLabel('Analytics category').fill(category);
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Export for Power BI', exact: true })).toBeEnabled();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export for Power BI', exact: true }).click();
    const csv = fs.readFileSync(await (await download).path(), 'utf8');
    expect(csv).toContain(report.complaintId); expect(csv).toContain(category);
    expect(csv).not.toContain('Synthetic address'); expect(csv).not.toContain(citizen.email);
    expect(csv.trim().split(/\r?\n/).length).toBe(2);
    console.log('PASS: real browser login, applied filter, Express API, MongoDB record and downloaded CSV');
  } finally {
    if (browser) await browser.close();
    if (citizen) { await Complaint.deleteMany({ createdBy: citizen._id }); await User.deleteOne({ _id: citizen._id }); }
    if (admin) await User.deleteOne({ _id: admin._id });
    await mongoose.disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
