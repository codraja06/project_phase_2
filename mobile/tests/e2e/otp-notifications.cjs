// Browser API fixtures only. Backend/Mongo/provider adapters have separate integration tests.
const { chromium, mockApi, login, user, complaints } = require('./fixtures.cjs');
const { expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs'), path = require('path');
const WEB = process.env.E2E_WEB_URL || 'http://localhost:8083';
const artifact = process.env.E2E_ARTIFACT_DIR || path.resolve(__dirname, '../artifacts/otp', String(Date.now()));
fs.mkdirSync(artifact, { recursive: true });
const checks = [], widths = [], accessibility = [], errors = [];
async function form(page) {
  await page.goto(`${WEB}/citizen-register`);
  await page.getByLabel('Full Legal Name', { exact: true }).fill('OTP Browser Citizen');
  await page.getByLabel('Email Address', { exact: true }).fill('otp-browser@example.test');
  await page.getByLabel('Phone Number', { exact: true }).fill('+919876543210');
  await page.getByLabel('Security Password', { exact: true }).fill('BrowserFixture123!');
  await page.getByLabel('Confirm Password', { exact: true }).fill('BrowserFixture123!');
  await page.getByRole('button', { name: 'Send verification code', exact: true }).click();
}
async function fixture(page, options = {}) {
  const state = await mockApi(page); const events = [];
  let emailVerified = false, completeAttempts = 0;
  await page.route('**/api/auth/signup/**', async route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop(); events.push(endpoint);
    const input = route.request().postDataJSON(); let status = 200, data, message = 'OK';
    if (endpoint === 'request-otp' || endpoint === 'resend-otp') {
      status = options.deliveryFailure ? 503 : 202;
      message = options.deliveryFailure ? 'Email verification is not configured. Ask the administrator to configure SMTP_HOST, SMTP_USER, SMTP_PASS and EMAIL_FROM.' : 'Verification requested';
      data = { challengeId: (endpoint === 'resend-otp' ? 'b' : 'a').repeat(64), expiresAt: new Date(Date.now() + (options.expired && endpoint !== 'resend-otp' ? -1000 : 300000)).toISOString(), resendAvailableAt: new Date(Date.now() + 60000).toISOString(), smsStatus: options.sms || 'not_configured', phoneVerificationRequired: !!options.requirePhone };
      if (options.legacyDevPayload) data.devOtp = '420731'; // Malformed old-server fixture; the UI must ignore it.
    } else if (endpoint === 'verify-otp') {
      if (options.networkFailure) return route.abort('failed');
      if (input.code !== (input.channel === 'sms' ? '731024' : '420731')) { status = 400; message = 'The code is invalid, expired, already used, or has too many attempts. Request a new code if needed.'; }
      else { if (input.channel === 'email') emailVerified = true; data = { emailVerified, phoneVerified: input.channel === 'sms' }; }
    } else if (endpoint === 'complete') {
      completeAttempts++;
      if (!emailVerified) { status = 400; message = 'Complete required verification'; }
      else if (options.retryCompletion && completeAttempts === 1) { status = 503; message = 'Registration temporarily unavailable. Please retry.'; }
      else data = { user: { ...user, emailVerifiedAt: new Date().toISOString() }, token: 'isolated-browser-fixture' };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data, message }) });
  });
  return { state, events };
}
(async () => {
 const browser = await chromium.launch({ channel: 'msedge' });
 try {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const state = await fixture(page); await form(page);
  await expect(page.getByRole('heading', { name: 'Verify your email', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend code in/ })).toBeDisabled();
  for (const [width, height] of [[320,568],[375,667],[768,1024],[1024,768],[1440,900],[1920,1080]]) {
    await page.setViewportSize({ width, height });
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth); widths.push({ width, height, scroll }); expect(scroll).toBeLessThanOrEqual(width);
    if ([320,1440].includes(width)) {
      await page.screenshot({ path: path.join(artifact, `verification-${width}.png`), fullPage: true });
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).disableRules(['region']).analyze();
      accessibility.push({ width, violations: scan.violations.map(v => v.id) }); expect(scan.violations.map(v => v.id)).toEqual([]);
    }
  }
  checks.push('OTP layout at six widths, cooldown disabled, two accessibility scans');
  await page.getByLabel('Email verification code', { exact: true }).fill('999999');
  await page.getByRole('button', { name: 'Verify and create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('invalid'); expect(state.events).not.toContain('complete');
  await page.getByLabel('Email verification code', { exact: true }).fill('420731');
  await page.getByLabel('Email verification code', { exact: true }).press('Enter');
  await expect(page.getByText('Quick Issue Categories', { exact: true }).last()).toBeVisible();
  expect(state.events.filter(e => e === 'complete')).toHaveLength(1); checks.push('Invalid OTP error then six-digit paste/keyboard submit completes existing dashboard navigation');
  await context.close();
  for (const [name, options] of [['expiry',{expired:true}],['setup',{deliveryFailure:true}],['network',{networkFailure:true}],['phone',{sms:'sent',requirePhone:true}],['smsFailure',{sms:'failed'}],['completionRetry',{retryCompletion:true}],['legacyDev',{legacyDevPayload:true}]]) {
    const c = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); const data = await fixture(p, options);
    await form(p);
    if (name === 'setup') { await expect(p.getByText(/Email verification is not configured/)).toBeVisible(); expect(data.events).toEqual(['request-otp']); }
    else if (name === 'expiry') {
      await expect(p.getByText('Code expired. Request a new code.',{exact:true})).toBeVisible(); await expect(p.getByRole('button', { name:'Verify and create account', exact:true })).toBeDisabled();
      await p.clock.install(); await p.clock.fastForward(61000);
      await p.getByRole('button',{name:'Resend verification code',exact:true}).click(); await expect(p.getByText(/Use the latest code/)).toBeVisible(); expect(data.events).toContain('resend-otp');
    } else {
      await expect(p.getByText('Development Mode',{exact:true})).toHaveCount(0);
      await expect(p.getByLabel('Email verification code',{exact:true})).toHaveValue('');
      if (name === 'smsFailure') await expect(p.getByText(/SMS delivery failed/)).toBeVisible();
      await p.getByLabel('Email verification code',{exact:true}).fill('420731');
      if (name === 'phone') await p.getByLabel('SMS verification code',{exact:true}).fill('731024');
      await p.getByRole('button',{name:'Verify and create account',exact:true}).click();
      if (name === 'completionRetry') {
        await expect(p.getByRole('alert')).toBeVisible(); await expect(p.getByText('Email verified',{exact:true})).toBeVisible();
        await expect(p.getByRole('button',{name:'Go to sign in',exact:true})).toBeVisible();
        await p.getByRole('button',{name:'Create account',exact:true}).click();
        expect(data.events.filter(event=>event==='verify-otp')).toHaveLength(1);
      }
      if (name === 'network') { await expect(p.getByRole('alert')).toBeVisible(); expect(data.events).not.toContain('complete'); }
      else await expect(p.getByText('Quick Issue Categories',{exact:true}).last()).toBeVisible();
    }
    checks.push(`${name} state uses the signup API and preserves account verification rules`); await c.close();
  }
  const c = await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'}), p = await c.newPage();
  p.on('pageerror',e=>errors.push(e.message)); const list = await mockApi(p);
  list.notifications.push({_id:'64f000000000000000000001',title:'Complaint Resolved',message:'Your complaint #CIV-100100 has been resolved. Thank you for helping improve your community.',complaintId:complaints[0]._id,createdAt:new Date().toISOString(),resolution:{category:'pothole',resolvedAt:new Date().toISOString()},deliveries:[{channel:'email',status:'Sent',attempts:1},{channel:'sms',status:'Skipped',errorCode:'sms_consent_absent',attempts:0}]});
  await login(p); await p.getByRole('button', { name: 'Notifications', exact: true }).first().click();
  await expect(p.getByText('View complaint details →',{exact:true})).toBeVisible(); await expect(p.getByText(/Email: Accepted by provider/)).toBeVisible(); await expect(p.getByText(/SMS consent is needed/)).toBeVisible();
  await p.screenshot({path:path.join(artifact,'resolution-notification-375.png'),fullPage:true});
  await p.getByRole('button',{name:'Complaint Resolved',exact:true}).click(); await expect(p.getByText('Incident Dossier',{exact:true})).toBeVisible(); expect(list.notifications[0].readAt).toBeTruthy(); checks.push('Resolution metadata and delivery states render, mark read and open correct complaint'); await c.close();
  expect(errors).toEqual([]);
 } finally {
   await browser.close(); fs.writeFileSync(path.join(artifact,'results.json'),JSON.stringify({checks,widths,accessibility,errors},null,2));
 }
 console.log(JSON.stringify({checks,widths:widths.length,accessibilityScans:accessibility.length,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
