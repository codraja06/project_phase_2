const {chromium,mockApi}=require('./fixtures.cjs');
const {expect}=require('@playwright/test');
const fs=require('fs');
const artifact = process.env.E2E_ARTIFACT_DIR || 'tests/artifacts';
fs.mkdirSync(artifact,{recursive:true});
const sizes=[[320,568],[320,640],[360,640],[360,800],[375,667],[375,812],[390,844],[393,852],[412,915],[430,932],[480,960],[540,960],[600,960],[768,1024],[800,1280],[820,1180],[1024,768],[1180,820],[1280,720],[1366,768],[1440,900],[1536,864],[1600,900],[1920,1080],[2560,1440],[3440,1440],[844,390]];
(async()=>{
 const b=await chromium.launch({channel:'msedge'});const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const results=[],errors=[];p.on('pageerror',e=>errors.push(e.message));await mockApi(p);
 for(const [route,marker] of [['splash','Email Address'],['citizen-login','Email Address'],['citizen-register','Full Legal Name'],['authority-login','Department Official Email']]){
  await p.goto((process.env.E2E_WEB_URL||'http://localhost:8081')+'/'+route);await expect(p.getByText(marker,{exact:true}).filter({visible:true}).first()).toBeVisible({timeout:30000});
  for(const [width,height] of sizes){await p.setViewportSize({width,height});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const scroll=await p.evaluate(()=>document.documentElement.scrollWidth);results.push({route,width,height,scroll});if([320,1440].includes(width))await p.screenshot({path:`${artifact}/${route}-${width}.png`});}
 }
 const overflow=results.filter(r=>r.scroll>r.width);fs.writeFileSync(`${artifact}/auth-results.json`,JSON.stringify({results,overflow,errors},null,2));console.log(JSON.stringify({checks:results.length,overflow,errors},null,2));await b.close();if(overflow.length||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
