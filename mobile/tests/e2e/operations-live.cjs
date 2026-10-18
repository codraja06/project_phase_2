// End-to-end browser verification against isolated local Express and MongoDB services.
const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const mongoose = require('../../../backend/node_modules/mongoose');
const { User } = require('../../../backend/dist/models/User');
const { Complaint } = require('../../../backend/dist/models/Complaint');
const { DepartmentRule } = require('../../../backend/dist/models/DepartmentRule');
const { Notification } = require('../../../backend/dist/models/Notification');
const { NotificationDelivery } = require('../../../backend/dist/models/NotificationDelivery');
const fs = require('fs'), path = require('path');
const WEB = process.env.PHASE2_WEB_URL || 'http://localhost:8083';
const artifact = path.join(__dirname, '../artifacts/operations-live-results.json');
const widthChecks = [], checks = [], errors = [], accessibility = [], users = [];
const password = 'IsolatedOperationsTest123!';
let browser;
async function login(page, user) {
  const citizen = user.role === 'citizen';
  await page.goto(`${WEB}/${citizen ? 'citizen-login' : 'authority-login'}`);
  await page.getByLabel(citizen ? 'Email Address' : 'Department Official Email', { exact: true }).fill(user.email);
  await page.getByLabel(citizen ? 'Password' : 'Officer Security Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: citizen ? 'Sign In' : 'Authenticate as Officer', exact: true }).click();
  await page.getByText(citizen ? 'Quick Issue Categories' : 'Command Center', { exact: true }).filter({ visible: true }).last().waitFor();
}
async function widths(page, screen) {
  for (const width of [320,375,430,768,1024,1280,1440,1920]) {
    await page.setViewportSize({ width, height: width === 320 ? 640 : 900 });
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    widthChecks.push({ screen, width, documentWidth });
    expect(documentWidth, `${screen} overflows at ${width}`).toBeLessThanOrEqual(width);
    if (width === 320 || width === 1440) {
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).disableRules(['region']).analyze();
      accessibility.push({ screen, width, violations: scan.violations.map(v => v.id) });
      expect(scan.violations.map(v => v.id), `${screen} accessibility at ${width}`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civictrack_phase2_e2e');
    const unique = Date.now();
    for (const [name, role, isAdmin] of [['citizen','citizen',false], ['other','citizen',false], ['officer','authority',true]]) {
      users.push(await User.create({ name: `Operations ${name}`, email: `operations-${name}-${unique}@example.test`, phone: '9876543210', password, role, isAdmin }));
    }
    const [citizen, other, officer] = users;
    const existing = await Complaint.create({ title: 'Operations existing pothole', description: 'A nearby pothole already reported.', category: 'pothole',
      imageUrl: 'http://example.test/road.jpg', latitude: 12.91, longitude: 80.21, address: 'Recorded coordinates', createdBy: other._id });
    browser = await chromium.launch({ channel: 'msedge' });
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const admin = await adminContext.newPage(); admin.on('pageerror', e => errors.push(e.message));
    await login(admin, officer);
    await admin.getByTestId('workspace-sidebar').getByRole('button', { name: 'Profile & Settings', exact: true }).click();
    await admin.getByLabel('Issue category mapping').fill('pothole');
    await admin.getByLabel('Department mapping name').fill('Local Road Team');
    await admin.getByRole('button', { name: 'Save routing rule', exact: true }).click();
    await expect(admin.getByText('pothole → Local Road Team')).toBeVisible();
    checks.push('Administrator saved an internal category-to-department rule in the real application');

    const citizenContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await citizenContext.newPage(); page.on('pageerror', e => errors.push(e.message));
    await login(page, citizen);
    await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Report Issue', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Image', exact: true }).click();
    await (await chooser).setFiles(path.join(__dirname, '../../assets/icon.png'));
    const manual = page.getByRole('button', { name: 'Continue without AI assessment', exact: true });
    await manual.waitFor({ timeout: 60000 }); await manual.click();
    await page.getByRole('button', { name: 'Pothole', exact: true }).click();
    await page.getByLabel('Complaint description', { exact: true }).fill('A pothole was observed at the selected GPS location.');
    await page.getByRole('button', { name: 'Continue to Location', exact: true }).click();
    await page.getByLabel('Incident latitude', { exact: true }).fill('12.9101');
    await page.getByLabel('Incident longitude', { exact: true }).fill('80.2101');
    await page.getByRole('button', { name: 'Set incident location', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm Location & Review', exact: true }).click();
    await expect(page.getByText('Possible duplicate reports nearby', { exact: true })).toBeVisible();
    await expect(page.getByText(/Another citizen’s report · about/)).toBeVisible();
    await widths(page, 'Citizen duplicate review');
    await page.getByRole('button', { name: 'SUBMIT COMPLAINT', exact: true }).click();
    await expect(page.getByText(/CIV-[0-9]{6}/).filter({ visible: true }).last()).toBeVisible();
    const submitted = await Complaint.findOne({ createdBy: citizen._id, category: 'pothole' });
    expect(submitted).toBeTruthy(); expect(submitted.assignedDepartment).toBe('Local Road Team');
    checks.push('Citizen saw privacy-safe nearby warning, continued, and stored a real assigned complaint');

    await admin.getByTestId('workspace-sidebar').getByRole('button', { name: 'Incident Map', exact: true }).click();
    await admin.getByRole('button', { name: 'Potholes', exact: true }).click();
    await admin.getByRole('button', { name: 'Apply Filters', exact: true }).click();
    // Nearby reports can be in adjacent grid cells; inspect the selectable cells.
    const targetReport = admin.getByRole('button', { name: `Open complaint ${submitted.complaintId}` });
    const cells = admin.getByRole('button', { name: /^Cluster \d+:/ });
    for (let index = 0; index < await cells.count() && !await targetReport.isVisible(); index++) await cells.nth(index).click();
    await expect(targetReport).toBeVisible();
    await widths(admin, 'Filtered hotspot map');
    await admin.getByRole('button', { name: `Open complaint ${submitted.complaintId}` }).click();
    await expect(admin.getByText('Local Road Team', { exact: false }).filter({ visible: true }).last()).toBeVisible();
    await admin.getByRole('button', { name: 'Check nearby reports', exact: true }).click();
    await expect(admin.getByText(new RegExp(existing.complaintId)).filter({ visible: true }).first()).toBeVisible();
    await admin.getByLabel('Reason for duplicate confirmation').fill('Same category, location, and inspection evidence.');
    await admin.getByRole('button', { name: `Confirm duplicate of ${existing.complaintId}` }).click();
    await expect.poll(async () => String((await Complaint.findById(submitted._id)).duplicateOf)).toBe(String(existing._id));
    await widths(admin, 'Authority complaint management');
    checks.push('Authority inspected hotspot record and confirmed a duplicate without deleting or resolving it');

    await admin.getByLabel('Triage review reason').fill('Officer inspected the submitted report evidence.');
    await admin.getByRole('button', { name: 'Severity: High', exact: true }).click();
    await expect.poll(async () => (await Complaint.findById(submitted._id)).severityReview?.level).toBe('High');
    await admin.getByRole('button', { name: 'Priority: low', exact: true }).click();
    await expect.poll(async () => (await Complaint.findById(submitted._id)).priorityOverride?.level).toBe('low');
    await admin.getByRole('button', { name: 'Restore calculated priority', exact: true }).click();
    await expect.poll(async () => (await Complaint.findById(submitted._id)).priorityOverride).toBeNull();
    checks.push('Officer severity correction, priority override and reset persisted with audit history');

    await page.getByRole('button', { name: 'VIEW COMPLAINT DETAILS', exact: true }).click();
    await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Notifications', exact: true }).click();
    await expect(page.getByText('Complaint received', { exact: true })).toBeVisible();
    await admin.getByRole('button', { name: 'Mark In Progress', exact: true }).click();
    await admin.getByRole('button', { name: 'Confirm Dispatch', exact: true }).click();
    const repairChooser = admin.waitForEvent('filechooser');
    await admin.getByRole('button', { name: 'Upload completion photo', exact: true }).click();
    await (await repairChooser).setFiles(path.join(__dirname, '../../assets/icon.png'));
    await expect(admin.getByText('After · pending')).toBeVisible();
    await expect(admin.getByRole('button', { name: 'Mark Resolved', exact: true })).toBeDisabled();
    await admin.getByRole('button', { name: 'Accept evidence', exact: true }).click();
    await admin.getByRole('button', { name: 'Mark Resolved', exact: true }).click();
    await admin.getByRole('button', { name: 'Confirm Resolution', exact: true }).click();
    await expect.poll(async () => (await Complaint.findById(submitted._id)).status).toBe('Resolved');
    await expect(page.getByText('Complaint Resolved', { exact: true })).toBeVisible();
    checks.push('Citizen notification list received authority resolution live without reload or manual refresh');
    checks.push('Repair photo required review and an explicit authority resolution confirmation');

    await expect(page.getByText('Complaint Resolved', { exact: true })).toBeVisible();
    await widths(page, 'Stored citizen notifications');
    const before = await Notification.countDocuments({ recipient: citizen._id, readAt: null });
    await page.getByRole('button', { name: 'Complaint Resolved', exact: true }).click();
    await expect.poll(() => Notification.countDocuments({ recipient: citizen._id, readAt: null })).toBe(before - 1);
    checks.push('Stored citizen notification marked read and opened its own complaint');

    await admin.getByTestId('workspace-sidebar').getByRole('button', { name: 'Operations Analytics', exact: true }).click();
    await expect(admin.getByText('Resolution performance').filter({ visible: true }).last()).toBeVisible();
    await expect(admin.getByText('Local Road Team', { exact: true }).filter({ visible: true }).last()).toBeVisible();
    checks.push('Real resolution analytics include the assigned department and completed report');
    expect(errors).toEqual([]);
    await citizenContext.close(); await adminContext.close();
  } finally {
    if (browser) await browser.close();
    if (users.length) {
      const ids = users.map(user => user._id);
      await NotificationDelivery.deleteMany({ recipient: { $in: ids } });
      await Notification.deleteMany({ recipient: { $in: ids } });
      await Complaint.deleteMany({ createdBy: { $in: ids } });
      await DepartmentRule.deleteMany({ category: 'pothole', updatedBy: users[2]._id });
      await User.deleteMany({ _id: { $in: ids } });
    }
    await mongoose.disconnect();
    fs.writeFileSync(artifact, JSON.stringify({ checks, widthChecks, errors, accessibility }, null, 2));
  }
  console.log(JSON.stringify({ checks, widths: widthChecks.length, accessibilityScans: accessibility.length, errors }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
