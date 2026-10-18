// Opt-in: real Expo UI, Express routes, password/JWT and MongoDB; mocked external senders only.
// Requires Expo web on E2E_WEB_URL. Uses its own ephemeral HTTP port and dedicated database.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/civictrack_otp_browser_test';
process.env.JWT_SECRET = 'isolated-otp-browser-signing-key-not-for-production';
process.env.OTP_HASH_SECRET = process.env.JWT_SECRET;
process.env.OTP_REQUIRE_PHONE = 'false';
const { chromium, expect } = require('@playwright/test');
const mongoose = require('../../../backend/node_modules/mongoose');
const { createServer } = require('http'), { createHmac } = require('crypto');
const app = require('../../../backend/dist/app').default;
const { User } = require('../../../backend/dist/models/User');
const { Complaint } = require('../../../backend/dist/models/Complaint');
const { Notification } = require('../../../backend/dist/models/Notification');
const { NotificationDelivery } = require('../../../backend/dist/models/NotificationDelivery');
const { SignupChallenge, SignupThrottle } = require('../../../backend/dist/models/SignupChallenge');
const { generateToken } = require('../../../backend/dist/utils/jwt');
const provider = require('../../../backend/dist/services/contactDeliveryService');
const { runDeliveryWorkerPass } = require('../../../backend/dist/services/resolutionDeliveryService');
const fs = require('fs'), path = require('path');
const WEB = process.env.E2E_WEB_URL || 'http://localhost:8083';
const artifact = path.resolve(__dirname, '../artifacts/otp-live', String(Date.now()));
fs.mkdirSync(artifact, { recursive: true });
const checks = [], errors = [], users = [], email = `otp-live-${Date.now()}@example.test`, password = 'IsolatedBrowser123!';
let browser, server, emailCode, resolutionSends = 0;
provider.emailConfigured = () => true;
provider.smsConfigured = () => false;
provider.sendEmail = async (to, subject, text) => {
  if (subject === 'Your CivicTrack verification code') emailCode = text.match(/code is (\d{6})/)[1];
  else { expect(to).toBe(email); expect(subject).toBe('Your CivicTrack complaint has been resolved'); resolutionSends++; }
  return 'isolated-mocked-provider-id';
};
provider.sendSms = async () => { throw new Error('Unconfigured SMS must never be called'); };
(async () => {
 try {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), SignupChallenge.init(), SignupThrottle.init(), NotificationDelivery.init()]);
  server = createServer(app); await new Promise(done => server.listen(0, '127.0.0.1', done));
  const API = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'msedge' }); const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  // Forward to actual Express, never fabricate API responses in this suite.
  await page.route('**/api/**', async route => {
    const original = new URL(route.request().url());
    const response = await route.fetch({ url: `${API}${original.pathname}${original.search}` }); await route.fulfill({ response });
  });
  await page.goto(`${WEB}/citizen-register`);
  for (const [label, value] of [['Full Legal Name','OTP Live Citizen'],['Email Address',email],['Phone Number','+919876543211'],['Security Password',password],['Confirm Password',password]]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Send verification code',exact:true}).click(); await expect(page.getByRole('heading',{name:'Verify your email',exact:true})).toBeVisible();
  expect(await User.exists({email})).toBeNull(); expect(emailCode).toMatch(/^\d{6}$/); checks.push('Actual signup API sends a mocked-provider OTP and creates no user before verification');
  await page.getByLabel('Email verification code',{exact:true}).fill(emailCode);
  await page.getByRole('button',{name:'Verify and create account',exact:true}).click(); await expect(page.getByText('Quick Issue Categories',{exact:true}).last()).toBeVisible();
  const citizen = await User.findOne({email}); users.push(citizen); expect(citizen.emailVerifiedAt).toBeTruthy(); expect(citizen.phoneVerifiedAt).toBeNull(); expect(await citizen.comparePassword(password)).toBe(true);
  expect(await SignupChallenge.countDocuments({email})).toBe(0); checks.push('Browser verifies actual stored challenge, completes registration once and enters authenticated dashboard');
  page.on('dialog', d => d.accept());
  await page.getByRole('button',{name:'Profile',exact:true}).click();
  await page.getByText('Notification Preferences',{exact:true}).click();
  await page.getByLabel('Consent to SMS resolution notifications',{exact:true}).click();
  await page.getByRole('button',{name:'Save Preferences',exact:true}).click();
  await expect.poll(async () => !!(await User.findById(citizen._id)).notificationPreferences.smsConsentedAt).toBe(true);
  expect((await User.findById(citizen._id)).phoneVerifiedAt).toBeNull();
  checks.push('Actual profile preference API stores explicit SMS consent without falsely verifying the phone');
  const officer = await User.create({name:'OTP Live Officer',email:`officer-${email}`,password,role:'authority'}); users.push(officer);
  const complaint = await Complaint.create({title:'OTP notification browser report',description:'A report in the isolated verification database.',category:'pothole',imageUrl:'https://example.test/test-evidence.jpg',latitude:12.9,longitude:80.2,address:'Recorded test coordinates',createdBy:citizen._id,status:'In Progress'});
  const token = generateToken({userId:String(officer._id),role:'authority'});
  const update = () => fetch(`${API}/api/authority/complaints/${complaint._id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({status:'Resolved'})});
  expect((await update()).status).toBe(200); await runDeliveryWorkerPass(); expect((await update()).status).toBe(200); await runDeliveryWorkerPass();
  expect(resolutionSends).toBe(1); expect(await Notification.countDocuments({complaintId:complaint._id})).toBe(1);
  expect((await NotificationDelivery.findOne({complaintId:complaint._id,channel:'email'})).status).toBe('Sent');
  expect((await NotificationDelivery.findOne({complaintId:complaint._id,channel:'sms'})).status).toBe('Skipped');
  checks.push('Actual authorized resolution creates one owned in-app event and one email acceptance; repeated status save sends nothing');
  await page.getByRole('button',{name:'Alerts',exact:true}).click();
  await expect(page.getByText('View complaint details →',{exact:true})).toBeVisible(); await expect(page.getByText(/Accepted by provider/)).toBeVisible();
  await page.screenshot({path:path.join(artifact,'notification-375.png'),fullPage:true});
  await page.getByRole('button',{name:'Complaint Resolved',exact:true}).click(); await expect(page.getByText('Incident Dossier',{exact:true})).toBeVisible();
  expect((await Notification.findOne({complaintId:complaint._id})).readAt).toBeTruthy(); checks.push('Real notification API displays category/date/delivery state, marks read and opens its actual complaint');
  expect(errors).toEqual([]); await context.close();
 } finally {
  if(browser) await browser.close(); if(server) await new Promise(done=>server.close(done));
  if(mongoose.connection.readyState === 1) {
    const ids=users.map(u=>u._id); const pendingUser=await User.findOne({email}); if(pendingUser) ids.push(pendingUser._id);
    await NotificationDelivery.deleteMany({recipient:{$in:ids}}); await Notification.deleteMany({recipient:{$in:ids}}); await Complaint.deleteMany({createdBy:{$in:ids}}); await User.deleteMany({_id:{$in:ids}}); await SignupChallenge.deleteMany({email});
    await SignupThrottle.deleteOne({_id:createHmac('sha256',process.env.OTP_HASH_SECRET).update(`email:${email}`).digest('hex')}); await mongoose.disconnect();
  }
  fs.writeFileSync(path.join(artifact,'results.json'),JSON.stringify({checks,errors,externalDelivery:'Mocked only; no real emails or SMS'},null,2));
 }
 console.log(JSON.stringify({checks,errors,externalDelivery:'Mocked only; no real emails or SMS'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
