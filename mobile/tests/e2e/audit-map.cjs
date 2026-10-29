// Actual map rendering plus controlled CDN outage; synthetic users in the isolated audit DB only.
const { chromium, expect } = require('@playwright/test');
const mongoose = require('../../../backend/node_modules/mongoose');
const { User } = require('../../../backend/dist/models/User');
const { Complaint } = require('../../../backend/dist/models/Complaint');
const { RevokedToken } = require('../../../backend/dist/models/RevokedToken');
const fs = require('fs'), path = require('path');
const WEB = process.env.PHASE2_WEB_URL || 'http://127.0.0.1:8083';
const artifact = path.resolve(__dirname,'../../../docs/audit-2026-10-25');
const results = { phase: process.env.AUDIT_PHASE || 'baseline', checks: [], errors: [] };
const users = [], password = 'IsolatedMapAudit2026!';
let browser;
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civictrack_phase2_e2e');
    const suffix = Date.now();
    const citizen = await User.create({name:'Map test citizen',email:`map-citizen-${suffix}@example.test`,password,role:'citizen'}); users.push(citizen);
    const officer = await User.create({name:'Map test officer',email:`map-officer-${suffix}@example.test`,password,role:'authority'}); users.push(officer);
    const report = await Complaint.create({title:'Map audit location',description:'Synthetic map audit record.',category:'pothole',imageUrl:'https://example.test/map.jpg',latitude:13.081,longitude:80.271,createdBy:citizen._id});
    await Complaint.create({title:'Map audit invalid location',description:'Synthetic invalid-coordinate legacy record.',category:'pothole',imageUrl:'https://example.test/map.jpg',latitude:95,longitude:200,createdBy:citizen._id});
    browser = await chromium.launch({channel:'msedge'});
    for (const offline of [false,true]) {
      const context = await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
      const page = await context.newPage();
      page.on('pageerror', error => results.errors.push({offline,message:error.message}));
      if (offline) await page.route('https://unpkg.com/**', route=>route.abort());
      await page.goto(`${WEB}/authority-login`);
      await page.getByLabel('Department Official Email',{exact:true}).fill(officer.email);
      await page.getByLabel('Officer Security Password',{exact:true}).fill(password);
      await page.getByRole('button',{name:'Authenticate as Officer',exact:true}).click();
      await expect(page.getByText('Command Center',{exact:true}).filter({visible:true}).last()).toBeVisible();
      await page.getByTestId('workspace-sidebar').getByRole('button',{name:'Incident Map',exact:true}).click();
      await page.getByRole('button',{name:'Potholes',exact:true}).click();
      const response = page.waitForResponse(r=>r.url().includes('/management/hotspots?') && r.url().includes('category=pothole'));
      await page.getByRole('button',{name:'Apply Filters',exact:true}).click();
      const map = (await (await response).json()).data;
      expect(map.clusters.flatMap(c=>c.records).some(r=>r._id===String(report._id))).toBe(true);
      expect(map.clusters.every(c=>Math.abs(c.latitude)<=90 && Math.abs(c.longitude)<=180)).toBe(true);
      if (!offline) {
        const markers = page.frameLocator('iframe[title="CivicTrack OpenStreetMap"]').locator('.leaflet-marker-icon');
        await expect.poll(()=>markers.count(),{timeout:15000}).toBe(map.clusters.length);
        const frame = page.frameLocator('iframe[title="CivicTrack OpenStreetMap"]');
        results.checks.push({name:'Actual Leaflet markers match filtered API clusters; invalid legacy GPS excluded',passed:true,markers:await markers.count(),loadedTiles:await frame.locator('.leaflet-tile-loaded').count()});
      } else {
        const fallback = page.getByText('OpenStreetMap preview unavailable',{exact:true});
        const visible = await fallback.isVisible().catch(()=>false) || await fallback.waitFor({state:'visible',timeout:14000}).then(()=>true).catch(()=>false);
        results.checks.push({name:'Blocked Leaflet CDN produces an actionable fallback',passed:visible});
      }
      await page.screenshot({path:path.join(artifact,`${results.phase}-map-${offline?'offline':'online'}.png`)});
      await context.close();
    }
  } finally {
    if(browser) await browser.close();
    const ids = users.map(user=>user._id);
    await RevokedToken.deleteMany({userId:{$in:ids}}); await Complaint.deleteMany({createdBy:{$in:ids}}); await User.deleteMany({_id:{$in:ids}}); await mongoose.disconnect();
    fs.mkdirSync(artifact,{recursive:true}); fs.writeFileSync(path.join(artifact,`${results.phase}-map.json`),JSON.stringify(results,null,2));
  }
  console.log(JSON.stringify(results,null,2));
  if(results.checks.some(check=>!check.passed)) process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
