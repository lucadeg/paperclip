import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const allowed=/^[a-z0-9_-]{3,80}$/i;
const isValidHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
export function auditCrossWorkflow({client,competitiveRun,now=new Date().toISOString()}={}) {
 const blockers=[],warnings=[],checks=[];
 const add=(id,pass,severity,reason,refs=[])=>{
   checks.push({id,pass,severity,reason,refs});
   if(!pass)(severity==='BLOCKER'?blockers:warnings).push({id,reason,refs});
 };
 const campaign=client?.campaign,plan=client?.strategy,dash=competitiveRun?.dashboard;
 const redteam=competitiveRun?.redteam;
 const same=(x,y)=>x!==undefined&&x===y;
 add('identity.tenant',allowed.test(client?.tenantId||'')&&same(client?.tenantId,dash?.tenantId)&&
    same(client?.tenantId,competitiveRun?.tenantId),'BLOCKER','Cross-tenant mismatch');
 add('identity.company',allowed.test(client?.companyId||'')&&same(client?.companyId,dash?.companyId)&&
    same(client?.companyId,competitiveRun?.companyId),'BLOCKER','Cross-company mismatch');
 add('identity.client',allowed.test(client?.clientId||'')&&same(client?.clientId,dash?.clientId)&&
    same(client?.clientId,competitiveRun?.clientId),'BLOCKER','Cross-client mismatch');
 add('identity.campaign',campaign?.id&&same(campaign.id,dash?.campaign?.id)&&
    same(campaign.id,redteam?.campaignId)&&same(campaign.id,competitiveRun?.campaignId)&&
    same(campaign.id,plan?.campaignId),'BLOCKER','Campaign/source/critic/strategy not bound to same ID');
 const sources=campaign?.evidence||[],sourceIds=new Set(sources.map(x=>x.sourceId));
 const statements=campaign?.sourceStatements||[];
 const statementIds=new Set(statements.map(x=>x.evidenceId));
 add('sources.present',sources.length>0&&sources.every(x=>x.sourceId&&isValidHash(x.sha256)&&
   /^https:\/\//.test(x.url)&&Number.isFinite(Date.parse(x.observedAt))),'BLOCKER','Missing raw source evidence SHA256/URL/time');
 add('sources.claim-bindings',statements.length>0&&
    statements.every(s=>statementIds.has(s.evidenceId)&&sourceIds.has(s.sourceId)),
    'BLOCKER','Statement references missing raw source');
 add('sources.dashboard-bindings',dash?.evidence?.length===sources.length&&
    dash.evidence.every(s=>sourceIds.has(s.sourceId)&&isValidHash(s.sha256)&&
      sources.some(o=>o.sourceId===s.sourceId&&o.sha256===s.sha256)),'BLOCKER',
    'Dashboard source list disagrees with campaign raw capture');
 const ageHours=sources.map(s=>(Date.parse(now)-Date.parse(s.observedAt))/3600000);
 add('sources.age',ageHours.every(n=>Number.isFinite(n)&&n>=-0.25&&n<=24*30),
   'WARNING','Source capture older than 30 days, future-dated or invalid');
 const posts=campaign?.posts||[],snapshotPosts=dash?.posts||[],postIds=posts.map(x=>x.id);
 add('posts.unique',posts.length>0&&new Set(postIds).size===posts.length,'BLOCKER','Missing or duplicate creative IDs');
 add('posts.identity',posts.every(p=>p.campaignId===campaign.id&&p.status==='DRAFT_REQUIRES_OWNER_APPROVAL'),
   'BLOCKER','Post belongs to another campaign or marked externally published');
 add('posts.evidence',posts.every(p=>Array.isArray(p.sourceEvidenceIds)&&p.sourceEvidenceIds.length>0&&
   p.sourceEvidenceIds.every(id=>statementIds.has(id))),'BLOCKER','Post has missing/untrusted statement IDs');
 add('posts.dashboard.reconciliation',snapshotPosts.length===posts.length&&
   snapshotPosts.every(p=>postIds.includes(p.id)&&p.providerPublished===false&&
     posts.some(raw=>raw.id===p.id&&raw.caption===p.caption&&raw.hook.text===p.hook.text&&
       raw.cta.copy===p.cta.copy)),'BLOCKER','Dashboard post count, copy or publication status changed');
 add('posts.qa',snapshotPosts.every(p=>p.structuralPass&&p.claimAudit?.status==='DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED'),
   'WARNING','Post copy/source QA gate failed');
 const metricKeys=['ctr','cvr','roas','impressions','clicks','conversions','cpa','spendNet','spendGross',
   'revenueNet','incrementalProfit'];
 add('metrics.not_fabricated',metricKeys.every(k=>dash?.kpis?.[k]===null)&&
    snapshotPosts.every(p=>Object.values(p.kpis||{}).every(v=>v===null)),'BLOCKER',
    'Unsigned research snapshot contains purported advertising financial performance');
 add('assets.not_fabricated',snapshotPosts.every(p=>p.mediaStatus==='NO_VISUAL_ASSET'||
    (p.mediaStatus==='METADATA_ONLY'&&p.checks.some(x=>x.label==='Analisi contrasto immagini'&&x.state==='NOT_TESTED'))),
   'BLOCKER','Visual assets or pixel/semantic checks have been declared without signed evidence');
 add('agent_runs.not_fabricated',dash?.kpis?.actualAgentExecutions===0&&
    snapshotPosts.every(p=>p.agents.every(a=>a.actualAgentRunId===null&&a.approved===false)),
   'BLOCKER','Inferred real agent activity without a trusted run receipt');
 const exp=plan?.experiments||[];
 const strategyPosts=new Set(postIds);
 add('experiments.paired',exp.every(x=>strategyPosts.has(x.controlId)&&strategyPosts.has(x.variantId)&&
   x.controlId!==x.variantId&&x.state==='NOT_STARTED'&&x.measuredEffect===null),
   'BLOCKER','A/B hypothesis has missing arms or invented measurement');
 const findings=redteam?.findings||[];
 add('critics.counts',findings.length===(dash?.findings?.length??-1)&&
    findings.every(f=>dash.findings.some(x=>x.id===f.id&&x.severity===f.severity&&x.owner===f.owner)),
   'BLOCKER','Red-team findings were omitted/modified in dashboard');
 add('competitors.provenance',(competitiveRun?.competitive?.competitors||[]).every(c=>
   isValidHash(c.productEvidence?.source?.sha256)&&
   /^https:\/\//.test(c.productEvidence?.source?.url)),
   'BLOCKER','Competitor lacks independently acquired page hash');
 add('ads.disclosure',Boolean(competitiveRun)&&
   ((competitiveRun.observedAds||[]).length===0 || competitiveRun.observedAds.every(ad=>
     ad.evidence?.observationRef&&isValidHash(ad.evidence.contentSha256))),
   'BLOCKER','Competitor ad observation without evidence');
 add('release.not_approved',client?.productionReady===false&&dash?.campaign?.approved===false&&
   dash?.campaign?.providerPublishing===false&&competitiveRun?.technicalGates?.approvedForPublications===false,
   'BLOCKER','Draft research was marked approved/executable without official release');
 const stats={total:checks.length,passed:checks.filter(x=>x.pass).length,
    blockers:blockers.length,warnings:warnings.length,
    posts:posts.length,sources:sources.length,experiments:exp.length,
    competitorCandidates:competitiveRun?.competitive?.competitors?.length||0,
    observedAds:competitiveRun?.observedAds?.length||0,
    agentTemplateCount:dash?.fleetRoles?.length||0};
 return {schema:'mvx-cross-workflow-acceptance/v1',runAt:now,
   companyId:client?.companyId||null,tenantId:client?.tenantId||null,
   clientId:client?.clientId||null,campaignId:campaign?.id||null,
   verdict:blockers.length?'BLOCKED':warnings.length?'DRAFT_WITH_WARNINGS':'DRAFT_INTEGRITY_PASSED_NOT_PUBLISHED',
   productionPermission:'NONE',statistics:stats,blockers,warnings,checks,
   traceHash:sha({clientId:client?.clientId,postIds,checks}),
   boundaries:['Only local cross-artifact invariants tested',
    'Real provider integration needs authenticated server-to-server evidence',
    'Structural PASS does not mean semantic/visual quality PASS']};
}
