import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractPublicPage} from './brand-intake.mjs';
import {createCampaignPlan} from './campaign-factory.mjs';
import {collectVoiceOfCustomer,critiqueFullCampaign,proposeDifferentiatedConcepts} from './redteam-needs.mjs';
import {buildDashboard,envelopeDashboard,verifyDashboardEnvelope,AUDIT_AGENTS} from './dashboard-model.mjs';
import {isSafeDashboardId,readMarketingDashboard,validateMarketingSnapshotEnvelope} from '../../server/src/routes/mvx-marketing-dashboard.ts';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const dt='2026-10-14T12:00:00Z';
const productPage='https://example.org/product/oat-barista';
const fakeHtml='<html><head><title>Oat Barista | Example</title><meta name="description" content="Barista oat drink for daily coffee"></head><body><h1>Barista Oat Drink</h1><h2>Great for coffee</h2></body></html>';
const source=extractPublicPage(fakeHtml,{url:productPage,observedAt:dt});
const capture={schema:'mvx-brand-capture/v1',status:'SOURCE_ACQUIRED',pages:[source],sources:[source.source]};
const target={label:'adulti che bevono caffè a casa',need:'scegliere una bevanda idonea al caffè',market:'IT',language:'it'};
function example(){
 const campaign=createCampaignPlan({capture,target,channels:['instagram','facebook','tiktok','linkedin']});
 const competitive={schema:'mvx-competitive-discovery/v1',
  status:'CANDIDATES_VERIFIED_PUBLIC_PAGES',competitors:[],
  limitations:['no real ads']};
 const voice=collectVoiceOfCustomer({target});
 const redteam=critiqueFullCampaign({campaign,competitive,voice,now:Date.parse(dt)});
 const concepts=proposeDifferentiatedConcepts({campaign,redteam});
 return buildDashboard({campaign,competitive,voiceOfCustomer:voice,redteam,
  originalConcepts:concepts,
  clientId:'demo-client',companyId:'company-demo-123',tenantId:'tenant-123',
  generatedAt:dt});
}
test('dashboard aggregates campaign source, criticisms, posts and verified unknown business KPIs',()=>{
 const s=example();
 assert.equal(s.schema,'mvx-marketing-dashboard/v1');
 assert.equal(s.posts.length,24);assert.equal(s.kpis.postDrafts,24);
 assert.equal(s.kpis.sourceCoverage,100);
 assert.equal(s.kpis.visualAssetsProvided,0);
 assert.equal(s.kpis.completedVisualAgentAudits,0);
 assert.equal(s.kpis.actualAgentExecutions,0);
 assert.equal(s.kpis.roas,null);
 assert.equal(s.kpis.incrementalProfit,null);
 assert.ok(s.findings.length>=2);
 assert.equal(s.campaign.approved,false);
});
test('all 91 fleet templates appear and per-post 14 independent audit lenses show no fake runs',()=>{
 const s=example();
 assert.equal(s.fleetRoles.length,91);
 assert.equal(s.agentRoles.length,14);
 assert.equal(AUDIT_AGENTS.length,14);
 assert.ok(s.fleetRoles.some(x=>x.id==='visual-composition-critic'));
 assert.ok(s.posts.every(x=>x.agents.length===14));
 assert.ok(s.posts.every(x=>x.agents.every(a=>a.actualAgentRunId===null&&!a.approved)));
 assert.ok(s.posts.some(x=>x.agents.some(a=>a.status==='PENDING_AGENT_EXECUTION')));
 assert.ok(s.posts.every(x=>x.checks.some(c=>c.label==='Analisi contrasto immagini'&&c.state==='NOT_TESTED')));
});
test('per-post structural warnings distinguish text presence vs observed images',()=>{
 const s=example(),p=s.posts[0];
 assert.equal(p.mediaStatus,'NO_VISUAL_ASSET');
 assert.equal(p.checks.find(x=>x.label==='Licenze immagini').state,'NOT_TESTED');
 assert.equal(p.checks.find(x=>x.label==='Evidenze').state,'PASS');
 assert.equal(p.agents.find(x=>x.id==='visual-accessibility-auditor').status,
   'ALT_PRESENT_VISUAL_PENDING');
});
test('source mismatch or missing tenant company is denied',()=>{
 const s=example();
 const incorrect={...s,companyId:''};
 assert.equal(verifyDashboardEnvelope(envelopeDashboard(s),'company-demo-123'),true);
 assert.equal(verifyDashboardEnvelope(envelopeDashboard(s),'another-company'),false);
 assert.equal(validateMarketingSnapshotEnvelope(envelopeDashboard(incorrect),'company-demo-123'),false);
 assert.throws(()=>buildDashboard({companyId:'company-demo-123'}),/identity/);
});
test('snapshot digest fails on tampered metrics, source, ROI and company scope',()=>{
 const good=envelopeDashboard(example());
 assert.equal(validateMarketingSnapshotEnvelope(good,'company-demo-123'),true);
 const tamper=structuredClone(good);
 tamper.snapshot.kpis.roas=999999;
 assert.equal(validateMarketingSnapshotEnvelope(tamper,'company-demo-123'),false);
 const tenant=structuredClone(good);
 tenant.snapshot.companyId='foreign-company';
 assert.equal(validateMarketingSnapshotEnvelope(tenant,'company-demo-123'),false);
});
test('company reader never traverses path or accepts unsafe query IDs',async()=>{
 for(const bad of ['..','../private','C:\\Windows\\Secrets','a/b','']){
  assert.equal(isSafeDashboardId(bad),false);
  await assert.rejects(()=>readMarketingDashboard(bad),/Invalid dashboard/);
 }
 await assert.rejects(()=>readMarketingDashboard('company-demo-123',{clientId:'../../etc'}),/Invalid dashboard/);
});
test('read-only company backend lists verified snapshots, history and rejects tampering',async()=>{
 const evidence=path.join(root,'evidence','mvx-marketing-fleet','test-company-dashboard');
 const company='company-demo-123',client='demo-client',run='2026-10-14T12-00-00-000Z';
 const folder=path.join(evidence,company,client,run);
 await fs.mkdir(folder,{recursive:true});
 const payload=envelopeDashboard(example());
 try{
  await fs.writeFile(path.join(folder,'snapshot.json'),JSON.stringify(payload,null,2));
  const good=await readMarketingDashboard(company,{root:evidence});
  assert.equal(good.status,'LOCAL_EVIDENCE_SNAPSHOTS');
  assert.equal(good.snapshots.length,1);
  assert.equal(good.history.length,1);
  assert.equal(good.availableClients[0],client);
  const different=await readMarketingDashboard('foreign-company',{root:evidence});
  assert.equal(different.snapshots.length,0);
  const mismatched=await readMarketingDashboard(company,{root:evidence,clientId:'another-client'});
  assert.equal(mismatched.snapshots.length,0);
  payload.snapshot.kpis.roas=100000;
  await fs.writeFile(path.join(folder,'snapshot.json'),JSON.stringify(payload));
  const bad=await readMarketingDashboard(company,{root:evidence});
  assert.equal(bad.snapshots.length,0);
 }finally{await fs.rm(evidence,{recursive:true,force:true});}
});
test('source code wires authenticated endpoint, multi-layout route and navigable sidebar',async()=>{
 const route=await fs.readFile(path.join(root,'server/src/routes/dashboard.ts'),'utf8');
 const app=await fs.readFile(path.join(root,'ui/src/App.tsx'),'utf8');
 const sidebar=await fs.readFile(path.join(root,'ui/src/components/Sidebar.tsx'),'utf8');
 assert.match(route,/assertCompanyAccess\(req, id\)/);
 assert.match(route,/mvx-marketing\/dashboard/);
 assert.ok((app.match(/path="marketing-intelligence"/g)||[]).length>=3);
 assert.match(sidebar,/\/marketing-intelligence/);
});

import {inspectCreativeImage,requestVisionReview} from './visual-audit-engine.mjs';
const tinyPng=Buffer.from(
 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9VNuO/MAAAAASUVORK5CYII=','base64');
test('real PNG bytes yield exact dimensions and source hash, but no semantic visual assertion',()=>{
 const image=inspectCreativeImage({bytes:tinyPng,post:{id:'post1',channel:'instagram',format:'carousel'},
   assetId:'asset-png1',sourceUrl:'https://brand.example.org/assets/creative.png'});
 assert.equal(image.width,1);assert.equal(image.height,1);
 assert.match(image.sha256,/^[a-f0-9]{64}$/);
 assert.equal(image.resolutionStatus,'LOW_RESOLUTION_REVIEW_REQUIRED');
 assert.equal(image.semanticVisualAuditStatus,'NOT_RUN');
 assert.equal(image.contrastWCAG,null);
 assert.equal(image.licenseStatus,'RIGHTS_NOT_VERIFIED');
});
test('actual binary parser rejects corrupted or unsupported images',()=>{
 assert.throws(()=>inspectCreativeImage({bytes:Buffer.from('not an image')}),/Invalid|Only/);
 const malformed=Buffer.alloc(80);
 Buffer.from('89504e470d0a1a0a','hex').copy(malformed,0);
 assert.throws(()=>inspectCreativeImage({bytes:malformed}),/Corrupted/);
});
test('vision gateway blocks no adapter, no rights approval and asset hash mismatch',async()=>{
 const record=inspectCreativeImage({bytes:tinyPng,post:{id:'p1',channel:'instagram',format:'carousel'},
   assetId:'a1',sourceUrl:'https://brand.example.org/photo.png'});
 const post={id:'p1'};
 assert.equal((await requestVisionReview({record,post})).status,'BLOCKED_MISSING_RUNTIME_OR_APPROVAL');
 assert.equal((await requestVisionReview({record,post,approval:true,verifyWithTier1:async()=>false,
   analyzeVision:async()=>({})})).status,'BLOCKED_UNVERIFIED_PRODUCT_ASSET');
 assert.equal((await requestVisionReview({record,post,approval:true,verifyWithTier1:async()=>true,
   analyzeVision:async()=>({receiptId:'demo',assetSha256:'wrong',postId:'p1',findings:[],verdict:'PASS'})})).status,'BLOCKED_INVALID_VISION_RECEIPT');
});
test('source-verified vision adapter returns audit receipt without authorizing publication',async()=>{
 const record=inspectCreativeImage({bytes:tinyPng,post:{id:'p2',channel:'instagram',format:'carousel'},
   assetId:'a2',sourceUrl:'https://brand.example.org/photo2.png',licenseReceipt:'proof'});
 const run=await requestVisionReview({record,post:{id:'p2'},approval:true,
   verifyWithTier1:async proof=>proof.assetSha256===record.sha256,
   analyzeVision:async input=>({receiptId:'sandbox-test-vision1',assetSha256:input.asset.sha256,
     postId:input.post.id,findings:[{type:'unreadable-text',confidence:'model-only'}],verdict:'REVIEW'})});
 assert.equal(run.status,'VISION_REVIEW_OBSERVED_NOT_AUTOPUBLISHED');
 assert.equal(run.publicationAllowed,false);
 assert.equal(run.verdict,'REVIEW');
});

import {resolveMarketingDashboardQuery} from '../../server/src/routes/mvx-marketing-dashboard.ts';
test('HTTP controller enforces company authorization before file I/O',async()=>{
 let reads=0,authorizations=0;
 const reader=async()=>{reads++;return {snapshots:[{companyId:'real-company'}]}};
 const auth=(id:string)=>{authorizations++;if(id!=='real-company')throw Error('401/403');};
 await assert.rejects(()=>resolveMarketingDashboardQuery('foreign-company',undefined,auth,reader as never),/401\/403/);
 assert.equal(reads,0);
 assert.equal(authorizations,1);
 const allowed=await resolveMarketingDashboardQuery('real-company',undefined,auth,reader as never);
 assert.equal(allowed.status,200);assert.equal(allowed.cacheControl,'private, no-store');
 assert.equal(reads,1);
});
test('HTTP controller rejects malformed company/client IDs without touching reader',async()=>{
 let calls=0;
 const reader=async()=>{calls++;return {snapshots:[]}};
 const auth=()=>{};
 for(const [companyId,clientId] of [['c1','../../../etc'],['c1',['array']],['../escape',null]]){
  const result=await resolveMarketingDashboardQuery(companyId,clientId,auth,reader as never);
  assert.equal(result.status,400);
  assert.equal(result.cacheControl,'private, no-store');
 }
 assert.equal(calls,0);
});
test('HTTP controller forwards exact company scope and optional client filter',async()=>{
 let observed:any;
 const reader=async(companyId:string,params:any)=>{observed={companyId,params};return {status:'GOOD'}};
 await resolveMarketingDashboardQuery('company-12','client-16',()=>{},reader as never);
 assert.deepEqual(observed,{companyId:'company-12',params:{clientId:'client-16'}});
});

test('untrusted local author cannot inject fake real performance even by recomputing SHA256',()=>{
 const raw=example();
 raw.kpis.roas=120 as never;
 const fake=envelopeDashboard(raw);
 assert.equal(validateMarketingSnapshotEnvelope(fake,'company-demo-123'),false);
});
test('untrusted local author cannot forge completed vision/agent review or publication by recomputing hash',()=>{
 const base=example();
 const invalid=[
  (x:any)=>x.posts[0].agents[0].actualAgentRunId='fabricated-agent-run',
  (x:any)=>x.posts[0].providerPublished=true,
  (x:any)=>x.campaign.approved=true,
  (x:any)=>x.posts[0].kpis.spendGross=700,
  (x:any)=>x.kpis.actualAgentExecutions=99,
 ];
 for(const mutator of invalid){
  const modified=structuredClone(base);
  mutator(modified);
  const report=envelopeDashboard(modified);
  assert.equal(validateMarketingSnapshotEnvelope(report,'company-demo-123'),false);
 }
});
test('untrusted local author cannot inject javascript URLs into source or competitor navigations',()=>{
 const source=example();
 source.evidence[0].url='javascript:alert(1)';
 assert.equal(validateMarketingSnapshotEnvelope(envelopeDashboard(source),'company-demo-123'),false);
 const competitor=example();
 competitor.competitors.push({id:'c',name:'hacked',domain:'evil',matchScore:0,
  relationship:'unverified',url:'javascript:alert(1)',actualObservedAds:0,
  verifiedAdROAS:null,officialLibraries:[]});
 assert.equal(validateMarketingSnapshotEnvelope(envelopeDashboard(competitor),'company-demo-123'),false);
});
