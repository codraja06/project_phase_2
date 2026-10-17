const {chromium,mockApi,login}=require('./fixtures.cjs');
const {expect}=require('@playwright/test');
const fs=require('fs');
const sizes=[[320,568],[320,640],[360,640],[360,800],[375,667],[375,812],[390,844],[393,852],[412,915],[430,932],[480,960],[540,960],[600,960],[768,1024],[800,1280],[820,1180],[1024,768],[1180,820],[1280,720],[1366,768],[1440,900],[1536,864],[1600,900],[1920,1080],[2560,1440],[3440,1440],[844,390]];
const routes={citizen:[['dashboard','Quick Issue Categories'],['report','Report Civic Hazard'],['history','My Complaints'],['alerts','Notifications'],['profile','Account Settings'],['complaint/64b000000000000000000000','Incident Dossier']],authority:[['dashboard','Command Center'],['complaints','Incident Registry'],['map','Incident Map'],['analytics','Municipal Analytics'],['alerts','Notifications'],['profile','Officer Dossier'],['complaint/64b000000000000000000000','Incident Dossier']]};
(async()=>{
 fs.mkdirSync('tests/artifacts',{recursive:true});const b=await chromium.launch({channel:'msedge'});const results=[],errors=[];
 for(const role of ['citizen','authority']) {
  const context=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push({role,error:e.message}));await mockApi(p,role);await login(p,role);
  for(const [route,heading] of routes[role]) {
   await p.setViewportSize({width:1440,height:900});
   const nav = role==='citizen' ? {dashboard:'Dashboard',report:'Report Issue',history:'My Complaints',alerts:'Notifications',profile:'Profile & Settings'} : {dashboard:'Command Center',complaints:'All Complaints',map:'Incident Map',analytics:'Operations Analytics',alerts:'Alerts & Feed',profile:'Profile & Settings'};
   if(route.startsWith('complaint/')) {
    if(role==='citizen') {await p.getByRole('button',{name:'Dashboard',exact:true}).click();await p.getByRole('button',{name:'View incident CIV-100100',exact:true}).click();}
    else {await p.getByRole('button',{name:'All Complaints',exact:true}).click();await p.getByText('CIV-100100',{exact:true}).filter({visible:true}).first().click();}
   } else await p.getByRole('button',{name:nav[route],exact:true}).click();
await expect(p.getByText(heading,{exact:heading!=='Issue'}).last()).toBeVisible({timeout:30000});
   for(const [width,height] of sizes) {
    await p.setViewportSize({width,height});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const layout=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));results.push({role,route,width,height,...layout});
    if([320,1440].includes(width))await p.screenshot({path:`tests/artifacts/${role}-${route.replaceAll('/','-')}-${width}.png`});
   }
  }
  await context.close();
 }
 const overflow=results.filter(r=>r.scroll>r.width||r.body>r.width);fs.writeFileSync('tests/artifacts/routes-results.json',JSON.stringify({results,errors,overflow},null,2));console.log(JSON.stringify({checks:results.length,errors,overflow},null,2));await b.close();if(errors.length||overflow.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
