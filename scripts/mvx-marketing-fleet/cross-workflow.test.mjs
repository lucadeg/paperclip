import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {extractPublicPage} from './brand-intake.mjs';
import {planClientWorkflow,writeWorkflowEvidence} from './run-client-workflow.mjs';
import {performCompetitiveAudit,writeAuditEvidence} from './run-competitive-audit.mjs';
import {auditCrossWorkflow} from './cross-workflow-audit.mjs';
import {verifyEvidenceManifest,verifyDashboardFile} from './evidence-validator.mjs';
import {envelopeDashboard} from './dashboard-model.mjs';
import {MemoryInteractionLedger,makeInteractionEngine,signInteraction} from './interaction-engine.mjs';
import {scoreABExperiment,estimateEuroContribution} from './experiment-economics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const now=new Date().toISOString(),nowMs=Date.parse(now);
const url='https://brand.example.com/product';
const html=`<html><head><title>Barista Oat | Test Brand</title><meta name="description" content="Oat drink for home coffee"></head>
<body><h1>Barista Oat</h1><h2>Everyday coffee</h2></body></html>`;
const source=extractPublicPage(html,{url,observedAt:now});
const capture={schema:'mvx-brand-capture/v1',status:'SOURCE_ACQUIRED',pages:[source],sources:[source.source]};
const config={clientId:'test-client',tenantId:'test-tenant',companyId:'test-company',
 mode:'research_draft_only',urls:[url],allowedHosts:['brand.example.com'],
 target:{label:'Adulti che preparano caffè',need:'esaminare la qualità della bevanda',
  market:'IT',language:'it'},channels:['instagram','facebook','tiktok','linkedin']};
let reference;
async function workflow(){
 if(!reference) {
   const client=await planClientWorkflow(config,{acquire:async()=>capture,now:()=>now});
   const run=await performCompetitiveAudit(config,{acquireClient:async()=>client});
   reference={client,run,report:auditCrossWorkflow({client,competitiveRun:run,now})};
 }
 return reference;
}
const testRoot=path.join(root,'evidence','mvx-marketing-fleet','cross-workflow-tests-'+randomUUID());
test('end-to-end: source->brand->24 content->experiments->critics->91-role KPI dashboard passes all critical invariants',async()=>{
 const {client,run,report}=await workflow();
 assert.equal(client.campaign.posts.length,24);
 assert.equal(client.strategy.experiments.length,12);
 assert.equal(run.dashboard.posts.length,24);
 assert.equal(run.dashboard.fleetRoles.length,91);
 assert.equal(run.dashboard.kpis.roas,null);
 assert.equal(report.statistics.blockers,0,JSON.stringify(report.blockers));
 assert.equal(report.verdict.startsWith('DRAFT'),true);
 assert.equal(report.statistics.passed,report.statistics.total);
 assert.ok(report.statistics.total>=17);
});
const mutations=[
 ['cross tenant',{path:'run.tenantId',value:'wrong-tenant'},'identity.tenant'],
 ['cross company',{path:'run.companyId',value:'another-company'},'identity.company'],
 ['cross client',{path:'run.clientId',value:'wrong-client'},'identity.client'],
 ['campaign mismatch',{path:'run.campaignId',value:'camp-wrong'},'identity.campaign'],
 ['source hash overwritten',{path:'run.dashboard.evidence.0.sha256',value:'0'.repeat(64)},'sources.dashboard-bindings'],
 ['content copy modified',{path:'run.dashboard.posts.0.caption',value:'Copy swapped by unauthorized actor'},'posts.dashboard.reconciliation'],
 ['creative source ID unknown',{path:'client.campaign.posts.0.sourceEvidenceIds.0',value:'phantom-source'},'posts.evidence'],
 ['creative ID repeated',{path:'client.campaign.posts.1.id',value:'CLONE'},'posts.dashboard.reconciliation'],
 ['artificial ROAS',{path:'run.dashboard.kpis.roas',value:33.3},'metrics.not_fabricated'],
 ['invented clicks',{path:'run.dashboard.kpis.clicks',value:40000},'metrics.not_fabricated'],
 ['invented spend',{path:'run.dashboard.posts.0.kpis.spendNet',value:1},'metrics.not_fabricated'],
 ['fabricated vision run',{path:'run.dashboard.posts.0.agents.0.actualAgentRunId',value:'fake'},'agent_runs.not_fabricated'],
 ['falsified agent approval',{path:'run.dashboard.posts.0.agents.0.approved',value:true},'agent_runs.not_fabricated'],
 ['faked publication',{path:'run.dashboard.posts.0.providerPublished',value:true},'posts.dashboard.reconciliation'],
 ['fake customer approval',{path:'run.dashboard.campaign.approved',value:true},'release.not_approved'],
 ['stolen post draft status',{path:'client.campaign.posts.0.status',value:'PUBLISHED'},'posts.identity'],
 ['fake competitor ad',{path:'run.observedAds.0',value:{adId:'fake'}},'ads.disclosure'],
 ['invalid experiment arm',{path:'client.strategy.experiments.0.controlId',value:'post-missing'},'experiments.paired'],
 ['dropped critic finding',{path:'run.dashboard.findings',value:[]},'critics.counts']
];
function change(obj,pathText,value){
 const parts=pathText.split('.');let x=obj;
 for(let i=0;i<parts.length-1;i++){
   if(x[parts[i]]===undefined)x[parts[i]]= /^\d+$/.test(parts[i+1])?[]:{};
   x=x[parts[i]];
 }
 x[parts.at(-1)]=value;
}
for(const [name,mutation,rule] of mutations){
 test('transversal negative gate: '+name,async()=>{
  const {client,run}=await workflow();
  const context={client:structuredClone(client),run:structuredClone(run)};
  change(context,mutation.path,mutation.value);
  const audit=auditCrossWorkflow({client:context.client,competitiveRun:context.run,now});
  assert.equal(audit.verdict,'BLOCKED',name+': '+JSON.stringify(audit.blockers));
  assert.ok(audit.blockers.some(x=>x.id===rule),name+': '+JSON.stringify(audit.blockers));
 });
}
test('evidence file ledger round-trip: valid client and critic manifests 1:1',async()=>{
 const {client,run}=await workflow();
 try{
  const workflowManifest=await writeWorkflowEvidence(client,{baseDir:path.join(testRoot,'clients')});
  const criticManifest=await writeAuditEvidence(run,{rootDirectory:path.join(testRoot,'critic')});
  const w=await verifyEvidenceManifest(workflowManifest.directory,{
    expectedCompanyId:'test-company',expectedTenantId:'test-tenant',expectedClientId:'test-client'});
  const c=await verifyEvidenceManifest(criticManifest.directory,{
    expectedCompanyId:'test-company',expectedTenantId:'test-tenant',expectedClientId:'test-client'});
  assert.equal(w.status,'VERIFIED_LOCAL_INTEGRITY',JSON.stringify(w.failures));
  assert.equal(c.status,'VERIFIED_LOCAL_INTEGRITY',JSON.stringify(c.failures));
  assert.ok(w.passed.length>=6);assert.ok(c.passed.length>=10);
  assert.ok(workflowManifest.directory.includes('test-company'));
  assert.ok(criticManifest.directory.includes('test-company'));
 }finally{await fs.rm(testRoot,{recursive:true,force:true});}
});
test('evidence file corruption, missing files, symlinks and wrong tenant are detected',async()=>{
 const {client,run}=await workflow();
 try{
  const m=await writeAuditEvidence(run,{rootDirectory:path.join(testRoot,'critic')});
  assert.equal((await verifyEvidenceManifest(m.directory,{expectedTenantId:'elsewhere'})).status,'BLOCKED');
  const edit=path.join(m.directory,'redteam-findings.json');
  await fs.appendFile(edit,'{"tampered":true}');
  const bad=await verifyEvidenceManifest(m.directory,{expectedCompanyId:'test-company'});
  assert.equal(bad.status,'BLOCKED');assert.ok(bad.failures.some(x=>x.includes('redteam-findings')));
  await fs.rm(path.join(m.directory,'observed-competitor-ads.json'));
  const bad2=await verifyEvidenceManifest(m.directory,{expectedCompanyId:'test-company'});
  assert.ok(bad2.failures.some(x=>x.includes('observed-competitor-ads')));
 }finally{await fs.rm(testRoot,{recursive:true,force:true});}
});
test('snapshot file proof rejects altered company, tenant, client, and digest',async()=>{
 const {run}=await workflow(),dir=path.join(testRoot,'snapshots');
 try{
  await fs.mkdir(dir,{recursive:true});
  const file=path.join(dir,'snapshot.json');
  const envelope=envelopeDashboard(structuredClone(run.dashboard));
  await fs.writeFile(file,JSON.stringify(envelope));
  const verified=await verifyDashboardFile(file,{
    expectedCompanyId:'test-company',expectedTenantId:'test-tenant',expectedClientId:'test-client'});
  assert.equal(verified.status,'VERIFIED_LOCAL_INTEGRITY');
  assert.equal((await verifyDashboardFile(file,{expectedCompanyId:'other-company',
    expectedTenantId:'test-tenant',expectedClientId:'test-client'})).status,'BLOCKED');
  envelope.snapshot.kpis.roas=99;
  await fs.writeFile(file,JSON.stringify(envelope));
  assert.equal((await verifyDashboardFile(file,{expectedCompanyId:'test-company',
    expectedTenantId:'test-tenant',expectedClientId:'test-client'})).status,'BLOCKED');
 }finally{await fs.rm(testRoot,{recursive:true,force:true});}
});
test('cross tenant same clientId stores in two separate scoped directories',async()=>{
 const {client}=await workflow(),two={...client,companyId:'another-company',tenantId:'another-tenant'};
 try{
  const a=await writeWorkflowEvidence(client,{baseDir:path.join(testRoot,'clients')});
  const b=await writeWorkflowEvidence(two,{baseDir:path.join(testRoot,'clients')});
  assert.notEqual(a.directory,b.directory);
  assert.ok(b.directory.includes('another-company'));
  assert.equal((await verifyEvidenceManifest(a.directory,{expectedCompanyId:'another-company'})).status,'BLOCKED');
 }finally{await fs.rm(testRoot,{recursive:true,force:true});}
});
test('statistical gates: conversion A/B with stale premature horizon cannot become winner',()=>{
 const a={hypothesisId:'h1',registeredAt:'2026-01-01',startAt:'2026-01-02',
  plannedEndAt:'2026-02-02',analyzedAt:'2026-01-04',randomized:true,holdout:true,metric:'qualified_action',
  guardrailMetrics:['complaints'],guardrailsBreached:false,minimumPerArm:200,variantAllocation:0.5,
  control:{n:1000,success:100},treatment:{n:1000,success:400}};
 assert.equal(scoreABExperiment(a).verdict,'WAIT_END_OF_HORIZON');
});
test('finance integrity: VAT and refunds never allow false profit without cost fields',()=>{
 const p={currency:'EUR',salesGross:122,refundsGross:22,vatRate:0.22,cogsNet:40,
  mediaSpendNet:20,mediaVatRate:0.22,platformFeesNet:5,otherCostsNet:10};
 const result=estimateEuroContribution(p);
 assert.equal(result.verdict,'ESTIMATE_REQUIRES_LEDGER_VERIFICATION');
 assert.ok(result.netContribution>0);
 assert.equal(result.mediaGross,24.4);
 assert.equal(estimateEuroContribution({...p,platformFeesNet:undefined}).verdict,'INVALID');
});
test('DM replay concurrency: 100 simultaneous identical signed opt-ins produce at most one delivery',async()=>{
 const secret='strong-synthetic-secret-test-2026';let deliveries=0;
 const event={eventId:'e-concurrent',tenantId:'test-tenant',companyId:'test-company',
   threadId:'thread-x',userId:'u',channel:'dm',text:'GUIDA',
   consent:{scope:'single_free_guide',channel:'dm',assetId:'guide-draft-approved',
    grantedAt:now}};
 const rawBody=JSON.stringify(event);
 const signed={rawBody,headers:{'x-mvx-timestamp':String(nowMs),
   'x-mvx-signature':signInteraction(secret,rawBody,nowMs)}};
 const engine=makeInteractionEngine({secret,tenantId:'test-tenant',companyId:'test-company',
   now:()=>nowMs,asset:{id:'guide-draft-approved',status:'APPROVED',content:'test guide'},
   authorize:async()=>true,
   provider:{sendPrivateMessage:async()=>{deliveries++;await new Promise(r=>setTimeout(r,3));
     return {provider:'mock',providerMessageId:'receipt-'+deliveries};}}});
 const results=await Promise.all(Array.from({length:100},()=>engine.handle(signed)));
 assert.equal(deliveries,1);
 assert.equal(results.filter(x=>x.status==='DELIVERED').length,1);
 assert.equal(results.filter(x=>x.status==='IN_PROGRESS').length,99);
 assert.equal((await engine.handle(signed)).duplicate,true);
});

import {persistValidatedAudit} from './run-competitive-audit.mjs';
test('persisted end-to-end report is independently reverified before being accepted',async()=>{
 const {run}=await workflow(),folder=path.join(testRoot,'verified-snapshot');
 try{
  const result=await persistValidatedAudit(run,{
    auditDirectory:path.join(testRoot,'critics'),
    saveSnapshot:async(snapshot)=>{
      await fs.mkdir(folder,{recursive:true});
      const filename=path.join(folder,'snapshot.json');
      await fs.writeFile(filename,JSON.stringify(envelopeDashboard(snapshot))+'\n');
      return {filename};
    }});
  assert.equal(result.verifiedFiles,10);
  assert.equal(result.releaseAuthorized,false);
  assert.equal(result.crossWorkflowVerdict,'DRAFT_INTEGRITY_PASSED_NOT_PUBLISHED');
  assert.ok(result.artifact.directory.includes('test-company'));
 }finally{await fs.rm(testRoot,{recursive:true,force:true});}
});
test('tampered cross-workflow release verdict prevents any filesystem writes',async()=>{
 const {run}=await workflow(),bad=structuredClone(run);
 bad.crossWorkflowAcceptance.statistics.blockers=1;
 let called=false;
 await assert.rejects(()=>persistValidatedAudit(bad,{
  auditDirectory:path.join(testRoot,'refuse'),
  saveSnapshot:async()=>{called=true;throw Error('should not reach snapshot');}
 }),/BLOCKED/);
 assert.equal(called,false);
 assert.equal(await fs.access(path.join(testRoot,'refuse')).then(()=>true,()=>false),false);
});
