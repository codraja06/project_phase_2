// Exercise the real generated native WebView HTML in Chromium; this is not a device-runtime test.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ts = require('typescript');
const {chromium,expect} = require('@playwright/test');
const source = fs.readFileSync(path.resolve(__dirname,'../../src/components/MapSurface.tsx'),'utf8');
const snippet = source.slice(source.indexOf('function safeJson'),source.indexOf('export function MapSurface'));
const compiled = ts.transpileModule(snippet + '\nmodule.exports = {generateLeafletHtml};',{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const sandbox = {module:{exports:{}}}; vm.runInNewContext(compiled,sandbox);
const {generateLeafletHtml} = sandbox.module.exports;
const phase = process.env.AUDIT_PHASE || 'baseline';
const artifact = path.resolve(__dirname,'../../../docs/audit-2026-10-25');
const results = {phase,scope:'Actual generated native HTML in Chromium; physical WebView untested',checks:[],errors:[]};
(async()=>{
  const browser = await chromium.launch({channel:'msedge'});
  try {
    const page = await browser.newPage();
    page.on('pageerror',error=>results.errors.push(error.message));
    await page.setContent(generateLeafletHtml({latitude:13,longitude:80,interactive:true,hasLocationSelector:false,pins:[{id:'audit-pin',latitude:13,longitude:80,title:'<img src=x onerror="window.__unsafe=true">',address:'<b>Citizen text</b>'}]}));
    await page.locator('.leaflet-marker-icon').first().click({timeout:15000});
    await expect(page.locator('.leaflet-popup-content')).toBeVisible();
    // Wait for any browser image error handler scheduled by malicious popup markup.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const unsafe = await page.evaluate(()=>window.__unsafe===true);
    const imageTags = await page.locator('.leaflet-popup-content img').count();
    results.checks.push({name:'Untrusted native map popup text stays inert',passed:!unsafe&&imageTags===0,executedMarkup:unsafe,insertedImageTags:imageTags});
    await page.close();
    const offline = await browser.newPage();
    await offline.route('https://unpkg.com/**',route=>route.abort());
    await offline.evaluate(()=>{window.__mapMessages=[]; window.ReactNativeWebView={postMessage:message=>window.__mapMessages.push(JSON.parse(message))};});
    await offline.setContent(generateLeafletHtml({latitude:13,longitude:80,interactive:true,hasLocationSelector:false}));
    const signaled = await offline.evaluate(()=>window.__mapMessages.some(message=>message.type==='map-error'));
    results.checks.push({name:'Native map script signals unavailable Leaflet through the bridge',passed:signaled});
    await offline.close();
  } finally {
    await browser.close(); fs.mkdirSync(artifact,{recursive:true}); fs.writeFileSync(path.join(artifact,`${phase}-native-map.json`),JSON.stringify(results,null,2));
  }
  console.log(JSON.stringify(results,null,2)); if(results.checks.some(check=>!check.passed))process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
