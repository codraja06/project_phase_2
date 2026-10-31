// Browser UI test using fixture APIs; server-side authorization/data use separate integration tests.
const { chromium, mockApi, login } = require('./fixtures.cjs');
const { expect } = require('@playwright/test');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await mockApi(page, 'authority', { isAdmin: true });
    let filter = '';
    await page.route('**/api/authority/analytics/export**', async route => {
      filter = new URL(route.request().url()).searchParams.get('category');
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { csv: '\uFEFFcomplaint_id,category\r\nCIV-100001,pothole\r\n', rowCount: 1 } }) });
    });
    await login(page, 'authority');
    await page.getByTestId('workspace-sidebar').getByRole('button', { name: 'Operations Analytics', exact: true }).click();
    await page.getByRole('button', { name: 'Analytics filters', exact: true }).click();
    await page.getByLabel('Analytics category').fill('pothole');
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Export for Power BI', exact: true })).toBeEnabled();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export for Power BI', exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^civictrack-powerbi-.*\.csv$/);
    expect(fs.readFileSync(await file.path(), 'utf8')).toContain('CIV-100001,pothole');
    expect(filter).toBe('pothole');
    await expect(page.getByText('1 reports prepared for Power BI. The export uses the applied filters.')).toBeVisible();
    console.log('PASS: browser download, applied category filter, and 320/768/1440 layouts (mocked API)');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
