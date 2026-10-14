import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deliberate, evidenceErrors, selectReviewers } from './council-gate.mjs';
import { scoreABExperiment, estimateEuroContribution } from './experiment-economics.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(dir,'../..');
const base=path.join(repo,'packages/teams-catalog/catalog/optional/marketing/mvx-evidence-growth-council');
const r=JSON.parse(fs.readFileSync(path.join(dir,'roster.json'),'utf8'));
const now=new Date().toISOString(), old='2025-01-01T00:00:00Z';
const e={id:'ev-1',tenantId:'t-1',companyId:'c-1',sourceRef:'marketing-events/v42',subjectId:'campaign-1',version:42,
  sourceSystem:'mvx-growth-os',contentSha256:'a'.repeat(64),observedAt:now};
const vote=(agentId,position='SUPPORT',reason='Measured outcomes support this recommendation, subject to follow-up')=>
  ({agentId,position,reason,evidenceIds:['ev-1']});
const session=(overrides={})=>({sessionId:'s-1',issueId:'i-1',tenantId:'t-1',companyId:'c-1',action:'draft',
  domains:['marketing'],evidence:[e],votes:[vote('ceo-bezos'),vote('critic-munger')],...overrides});
const trusted={verifyWithTier1:async x=>x.id==='ev-1'};
const ab=(overrides={})=>({hypothesisId:'hyp1',registeredAt:'2026-01-01T00:00:00Z',startAt:'2026-01-02T00:00:00Z',
  plannedEndAt:'2026-01-15T00:00:00Z',analyzedAt:'2026-01-16T00:00:00Z',randomized:true,holdout:true,
  metric:'purchase conversion',guardrailMetrics:['refunds','complaints'],guardrailsBreached:false,
  minimumPerArm:100,variantAllocation:0.5,control:{n:2000,success:200},treatment:{n:2000,success:320},...overrides});
test('canonical roster has 27 executives and 30 specialist identities',()=>{
  assert.equal(r.executives.length,27);assert.equal(r.specialists.length,30);
  const ids=[...r.executives,...r.specialists].map(x=>x.id);
  assert.equal(new Set(ids).size,57);
  for(const a of [...r.executives,...r.specialists]) if(a.manager) assert.ok(ids.includes(a.manager));
});
test('27 council profile IDs exactly align with Sovereign Council UI',()=>{
  const raw=execFileSync('git',['-C',repo,'show','HEAD:ui/src/lib/sovereign-council-data.ts'],{encoding:'utf8'});
  const body=raw.split('export const SOVEREIGN_AGENTS: SovereignAgent[] = [')[1];
  assert.ok(body);
  const uiIDs=[...body.matchAll(/^\s+id: "([a-z-]+)",/gm)].map(m=>m[1]);
  assert.deepEqual([...new Set(uiIDs)].sort(),r.executives.map(x=>x.id).sort());
});
test('materialized package includes 57 docs, 30 initial tasks and 5 recurring routines',()=>{
  const agentFiles=fs.readdirSync(path.join(base,'agents'));
  assert.equal(agentFiles.length,57);
  const taskDirs=fs.readdirSync(path.join(base,'projects/marketing-evidence-program/tasks'));
  assert.equal(taskDirs.filter(x=>x.startsWith('initial-')).length,30);
  assert.equal(taskDirs.length,35);
  assert.equal(fs.readFileSync(path.join(base,'TEAM.md'),'utf8').includes('defaultInstall: false'),true);
});
test('reviewers chosen by domain instead of summoning all 27',()=>{
  const names=selectReviewers({action:'spend',domains:['growth','privacy']});
  assert.ok(names.length<10);assert.ok(names.includes('cfo-campbell'));assert.ok(names.includes('legal-frankel'));
});
test('cross tenant, stale, missing hash evidence blocked',()=>{
  assert.ok(evidenceErrors({...e,tenantId:'other'},session()).length);
  assert.ok(evidenceErrors({...e,observedAt:old},session()).length);
  assert.ok(evidenceErrors({...e,contentSha256:'notahash'},session()).length);
});
test('without real Tier 1 verification engine is fail-closed',async()=>{
  const x=await deliberate(session()); assert.equal(x.verdict,'BLOCKED');assert.equal(x.executionAuthorized,false);
});
test('verified independent reviewers can recommend a draft only',async()=>{
  const x=await deliberate(session(),trusted);
  assert.equal(x.verdict,'DRAFT_RECOMMENDED');assert.deepEqual(x.verifiedEvidence,['ev-1']);
  assert.match(x.contentSha256,/^[a-f0-9]{64}$/);
  assert.equal(x.executionAuthorized,false);
});
test('single veto blocks even if other reviewers support',async()=>{
  const x=await deliberate(session({votes:[vote('ceo-bezos'),vote('critic-munger','VETO','Unbounded adverse effects not mitigated by this experiment')]}),trusted);
  assert.equal(x.verdict,'VETO');assert.equal(x.vetoes.length,1);
});
test('spend is never executable and requires finance reviewer',async()=>{
  const x=await deliberate(session({action:'spend'}),trusted);
  assert.equal(x.verdict,'BLOCKED');assert.match(x.faults.join(' '),/finance/);
  const y=await deliberate(session({action:'spend',votes:[vote('ceo-bezos'),vote('critic-munger'),vote('cfo-campbell')]}),trusted);
  assert.equal(y.verdict,'BLOCKED');assert.equal(y.executionAuthorized,false);
});
test('votes cannot cite non-Tier1-verified evidence',async()=>{
  const x=await deliberate(session({votes:[vote('ceo-bezos'),vote('critic-munger','SUPPORT','Adequate evidence was collected but is unverified')]}),
    {verifyWithTier1:async()=>false});
  assert.equal(x.verdict,'BLOCKED');
});
test('valid fixed-horizon holdout can flag candidate with uncertainty',()=>{
  const x=scoreABExperiment(ab());
  assert.equal(x.verdict,'WINNER_CANDIDATE');assert.ok(x.pValue<0.05);
  assert.ok(x.ci95[0]>0);assert.equal(x.authorization,'NONE');
});
test('sample-ratio mismatch blocks inference',()=>{
  assert.equal(scoreABExperiment(ab({control:{n:200,success:20},treatment:{n:1800,success:300}})).verdict,'INVALID_SRM');
});
test('sequential peeking does not produce premature winner',()=>{
  const x=scoreABExperiment(ab({analyzedAt:'2026-01-10T00:00:00Z'}));
  assert.equal(x.verdict,'WAIT_END_OF_HORIZON');
});
test('required guardrail, sample size, preregistration and holdout',()=>{
  assert.equal(scoreABExperiment(ab({guardrailsBreached:undefined})).verdict,'GUARDRAIL_EVIDENCE_MISSING');
  assert.equal(scoreABExperiment(ab({control:{n:50,success:5}})).verdict,'UNDERPOWERED');
  assert.equal(scoreABExperiment(ab({randomized:false})).verdict,'INVALID');
  assert.equal(scoreABExperiment(ab({registeredAt:'2026-01-04T00:00:00Z'})).verdict,'INVALID');
});
test('VAT-aware euro contribution distinguishes net, gross and real cash need',()=>{
  const x=estimateEuroContribution({currency:'EUR',salesGross:1220,refundsGross:0,vatRate:0.22,cogsNet:400,
    mediaSpendNet:200,mediaVatRate:0.22,platformFeesNet:30,otherCostsNet:50});
  assert.equal(x.verdict,'ESTIMATE_REQUIRES_LEDGER_VERIFICATION');
  assert.ok(Math.abs(x.netSales-1000)<1e-9);assert.ok(Math.abs(x.mediaGross-244)<1e-9);
  assert.ok(Math.abs(x.netContribution-320)<1e-9);assert.equal(x.authorization,'NONE');
});
test('missing material cost fields returns invalid, never invented profit',()=>{
  assert.equal(estimateEuroContribution({currency:'EUR',salesGross:1220}).verdict,'INVALID');
});

test('compiled catalog hashes each file and lists 57 bounded markdown-only agents',async()=>{
  const {createHash}=await import('node:crypto');
  const manifest=JSON.parse(fs.readFileSync(path.join(repo,'packages/teams-catalog/generated/catalog.json'),'utf8'));
  const team=manifest.teams.find(x=>x.slug==='mvx-evidence-growth-council');
  assert.ok(team);assert.equal(team.counts.agents,57);
  assert.equal(team.counts.tasks,30);assert.equal(team.counts.routines,5);
  assert.equal(team.trustLevel,'markdown_only');assert.equal(team.defaultInstall,false);
  assert.equal(team.counts.externalSkillSources,0);
  for(const f of team.files) {
    const bytes=fs.readFileSync(path.join(base,f.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256.replace(/^sha256:/,''),f.path);
  }
});
