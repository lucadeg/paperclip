import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const root=path.resolve(process.cwd());
if(!/[/\\]\.hermes[/\\]paperclip$/i.test(root))throw Error('Only authorized .hermes/paperclip checkout');
const dest=path.join(root,'evidence','mvx-marketing-fleet','ui-browser-20261017');
await fs.mkdir(dest,{recursive:true});
const temp=path.join(dest,'tmp'),profile=path.join(dest,'browser-profile');
await fs.mkdir(temp,{recursive:true});
process.env.TEMP=temp;process.env.TMP=temp;process.env.TMPDIR=temp;
const report={schema:'mvx-ui-browser-smoke/v1',mode:'REAL_BROWSER_NO_DATA_MOCKS',startedAt:new Date().toISOString(),base:'http://127.0.0.1:5173',scenarios:[],browser:'',auth:'UNAUTHENTICATED_OR_UNKNOWN',productionReady:false};
let browser;
for(const opts of [{channel:'chrome'},{channel:'msedge'},{}]) {
 try{
  browser=await chromium.launchPersistentContext(profile,{headless:true,...opts,
    viewport:{width:1440,height:900},acceptDownloads:false,ignoreHTTPSErrors:false});
  report.browser=opts.channel||'bundled chromium';break;
 } catch(error) {
  report.scenarios.push({test:'launch '+(opts.channel||'chromium'),status:'BLOCKED_ENV',reason:String(error).slice(0,500)});
 }
}
if(!browser){
 await fs.writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));process.exit(2);
}
const page=browser.pages()[0]||await browser.newPage();
page.setDefaultTimeout(12000);
const consoleErrors=[],reqFailures=[],badOriginRequests=[];
page.on('pageerror',e=>consoleErrors.push(String(e)));
page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
page.on('requestfailed',r=>reqFailures.push({url:r.url(),error:r.failure()?.errorText}));
page.on('request',r=>{try{const u=new URL(r.url());if(['localhost','127.0.0.1'].includes(u.hostname)&&u.port==='8770')badOriginRequests.push(r.url())}catch{}});
const targets=[
 {id:'home',path:'/',expect:'loading or onboarding or authorized application'},
 {id:'marketing',path:'/marketing-intelligence',expect:'Marketing Intelligence / auth fallback'},
 {id:'planner',path:'/content-planner',expect:'Content Planner / auth fallback'},
 {id:'crm',path:'/crm-contacts',expect:'CRM / auth fallback'},
 {id:'council',path:'/council',expect:'Council / auth fallback'},
 {id:'skills',path:'/skill-tree',expect:'Skills / auth fallback'}
];
for(const [index,t] of targets.entries()){
 const start=Date.now(),scenario={test:t.id,path:t.path,status:'UNKNOWN',errors:[],network:[]};
 const a=consoleErrors.length,b=reqFailures.length;
 try{
  const response=await page.goto(report.base+t.path,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1700);
  scenario.httpStatus=response?.status()??null;
  scenario.title=await page.title();scenario.url=page.url();
  scenario.body=(await page.locator('body').innerText().catch(()=>'' )).slice(0,1500);
  scenario.buttons=await page.getByRole('button').count();
  scenario.links=await page.getByRole('link').count();
  scenario.tabs=await page.getByRole('tab').count();
  scenario.status=scenario.httpStatus>=400?'FAIL_HTTP':scenario.body.length<20?'FAIL_BLANK':'RENDERED_UNVERIFIED';
  scenario.elapsedMs=Date.now()-start;
  await page.screenshot({path:path.join(dest,String(index).padStart(2,'0')+'-'+t.id+'.png'),fullPage:false,timeout:20000});
 }catch(e){scenario.status='FAIL_BROWSER';scenario.error=String(e).slice(0,1000);}
 scenario.errors=consoleErrors.slice(a).slice(0,15);
 scenario.network=reqFailures.slice(b).slice(0,20);
 if(scenario.errors.some(e=>/Cannot read properties|Uncaught|Minified React error|Failed to fetch dynamically imported module/.test(e)))scenario.status='FAIL_RUNTIME';
 report.scenarios.push(scenario);
 console.log(t.id+': '+scenario.status+' '+(scenario.body||'').slice(0,85).replace(/\s+/g,' '));
}
report.badLegacyLocalhostRequests=badOriginRequests;
report.total={rendered:report.scenarios.filter(s=>s.status==='RENDERED_UNVERIFIED').length,
 fail:report.scenarios.filter(s=>s.status?.startsWith('FAIL')).length,
 launchBlockers:report.scenarios.filter(s=>s.status==='BLOCKED_ENV').length,
 legacyLocalhostRequests:badOriginRequests.length};
report.finishedAt=new Date().toISOString();
await fs.writeFile(path.join(dest,'report.json'),JSON.stringify(report,null,2)+'\n');
await browser.close();
console.log('SMOKE_REPORT='+path.join(dest,'report.json'));
console.log('SMOKE_TOTAL='+JSON.stringify(report.total));
if(report.total.fail>0||badOriginRequests.length>0)process.exitCode=1;