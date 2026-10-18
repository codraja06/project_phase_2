const {chromium,mockApi,login}=require('./fixtures.cjs');
const {expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('fs');
const artifact = process.env.E2E_ARTIFACT_DIR || 'tests/artifacts';
fs.mkdirSync(artifact,{recursive:true});
const sizes=[[320,568],[320,640],[360,640],[360,800],[375,667],[375,812],[390,844],[393,852],[412,915],[430,932],[480,960],[540,960],[600,960],[768,1024],[800,1280],[820,1180],[1024,768],[1180,820],[1280,720],[1366,768],[1440,900],[1536,864],[1600,900],[1920,1080],[2560,1440],[3440,1440],[844,390]];
(async()=>{

 const browser=await chromium.launch({channel:'msedge'});const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const state=await mockApi(page);await login(page);
 const results=[];
 for(const [width,height] of sizes){await page.setViewportSize({width,height});await expect(page.getByText('Quick Issue Categories',{exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('[role="button"],input')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.right>innerWidth+1||r.left< -1)&&!e.closest('[aria-hidden="true"]')}).map(e=>({text:e.textContent?.slice(0,50),x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}))}));results.push({width,height,...layout});if([320,820,1440,2560].includes(width))await page.screenshot({path:`${artifact}/citizen-${width}.png`});}
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'All time',exact:true}).click();await expect(page.getByRole('button',{name:'Total Reports: 6',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'30 days',exact:true}).click();await expect(page.getByRole('button',{name:'Total Reports: 5',exact:true})).toBeVisible();
 await page.getByPlaceholder('Search your reports by issue, ID or location').fill('CIV-100101');await expect(page.getByRole('button',{name:'View incident CIV-100101',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'View incident CIV-100100',exact:true})).toHaveCount(0);
 await page.getByPlaceholder('Search your reports by issue, ID or location').fill('nothing-matches');await expect(page.getByText('No matching reports',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Clear search',exact:true}).click();
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 fs.writeFileSync(`${artifact}/dashboard-results.json`,JSON.stringify({results,errors,axe:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))},null,2));
 console.log(JSON.stringify({layouts:results.length,overflow:results.filter(r=>r.scroll>r.width||r.offenders.length),errors,axe:axe.violations.map(v=>({id:v.id,nodes:v.nodes.length}))},null,2));
 state.complaints=[];
 await page.getByRole('button',{name:'Open notifications',exact:true}).click();await page.getByRole('button',{name:'Dashboard',exact:true}).click();await expect(page.getByText('Your first report starts here')).toBeVisible();await page.screenshot({path:`${artifact}/citizen-empty.png`});
 state.fail=true;await page.getByRole('button',{name:'Open notifications',exact:true}).click();await page.getByRole('button',{name:'Dashboard',exact:true}).click();await expect(page.getByTestId('recent-incidents').getByText('Reports unavailable',{exact:true})).toBeVisible();state.fail=false;await page.getByTestId('recent-incidents').getByRole('button',{name:'Retry loading reports',exact:true}).click();await expect(page.getByText('Your first report starts here')).toBeVisible();
 console.log('Dashboard search, date ranges, empty and error recovery passed.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

