// Render only a synthetic template locally. This script never calls an email provider.
const { chromium, expect } = require('@playwright/test');
const { verificationEmailTemplate } = require('../../../backend/dist/services/verificationEmailTemplate');
const fs = require('fs'), path = require('path');
const artifact = path.resolve(__dirname, '../artifacts/verification-email', String(Date.now()));
fs.mkdirSync(artifact, { recursive: true });
const email = verificationEmailTemplate('004291', 5); // Test fixture, never a real account code.
fs.writeFileSync(path.join(artifact, 'preview.html'), `<!-- Synthetic test preview. No email sent. -->\n${email.html}`);
const checks = [];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const colorScheme of ['light', 'dark']) {
      for (const width of [320, 600]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme });
        await page.setContent(email.html);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        const code = page.getByText('004291', { exact: true });
        await expect(code).toBeVisible();
        const bounds = await code.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        // Copyable as one contiguous string, with spacing provided solely by CSS.
        expect(await code.textContent()).toBe('004291');
        const cardBackground = await page.locator('.email-card').evaluate(el => getComputedStyle(el).backgroundColor);
        expect(cardBackground).toBe(colorScheme === 'dark' ? 'rgb(36, 36, 39)' : 'rgb(255, 255, 255)');
        await page.screenshot({ path: path.join(artifact, `${colorScheme}-${width}.png`), fullPage: true });
        checks.push({ colorScheme, width, horizontalOverflow: false, contiguousCode: true });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(artifact, 'results.json'), JSON.stringify({ checks, delivery: 'No real email sent; synthetic browser preview only' }, null, 2));
  }
  console.log(JSON.stringify({ artifact, checks, delivery: 'No real email sent; synthetic browser preview only' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
