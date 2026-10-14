import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {planClientWorkflow} from './run-client-workflow.mjs';
import {makeBraveWebSearchAdapter,makeSeededResearchAdapter} from './search-provider.mjs';
import {discoverCompetitors,inferCategoryNeedsFromCompetitorMessaging,normalizeObservedAds} from './competitive-intelligence.mjs';
import {metaEuAdObservations,adLibraryProviderMatrix} from './official-ad-connectors.mjs';
import {collectVoiceOfCustomer,critiqueFullCampaign,proposeDifferentiatedConcepts} from './redteam-needs.mjs';
import {buildDashboard} from './dashboard-model.mjs';
import {auditCrossWorkflow} from './cross-workflow-audit.mjs';
import {verifyEvidenceManifest,verifyDashboardFile} from './evidence-validator.mjs';
import {storeDashboardSnapshot} from './dashboard-store.mjs';
import {searchAdKitCompetitor,proposeCreativeEvidenceChecklist} from './adkit-competitor-adapter.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function checkLocal(file){
 const resolved=path.resolve(file),rel=path.relative(root,resolved);
 if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('Use only existing authorized .hermes checkout');
 return resolved;
}
const hash=buf=>createHash('sha256').update(buf).digest('hex');
export async function performCompetitiveAudit(config,{acquireClient=planClientWorkflow,searchAdapter,
  metaAdApi=metaEuAdObservations,adKitAdapter,voiceObservations=[]}={}){
 const client=await acquireClient(config);
 const campaign=client.campaign;
 const researchProvider=searchAdapter||makeBraveWebSearchAdapter({apiKey:process.env.BRAVE_SEARCH_API_KEY});
 const competitive=await discoverCompetitors({campaign,searchAdapter:researchProvider,market:config.target.market==='Italia'?'IT':config.target.market});
 const categoryNeeds=competitive.schema==='mvx-competitive-discovery/v1'?
   inferCategoryNeedsFromCompetitorMessaging(competitive):
   {status:'NO_COMPETITIVE_EVIDENCE',findings:[]};
 const adProviderStatus=[],verifiedAdObservations=[];
 for(const competitor of (competitive.competitors||[]).slice(0,5)){
   const response=await metaAdApi({advertiser:competitor.identity.name,country:'IT',
     accessToken:process.env.META_AD_LIBRARY_ACCESS_TOKEN});
   adProviderStatus.push({competitorId:competitor.id,advertiser:competitor.identity.name,
     platform:'meta',status:response.status,count:response.observations?.length||0});
   if(response.status==='OFFICIAL_API_OBSERVATIONS'){
     const checked=normalizeObservedAds({competitor,records:response.observations});
     verifiedAdObservations.push(...checked.accepted);
   }
 }
 const adKitResearch=[];
 for(const competitor of (competitive.competitors||[]).slice(0,5)) {
   const records=await searchAdKitCompetitor({competitor,adKitAdapter});
   adKitResearch.push({competitorId:competitor.id,...records,
      evidenceRequests:proposeCreativeEvidenceChecklist(records)});
 }
 const voice=collectVoiceOfCustomer({observations:voiceObservations,target:campaign.target});
 const redteam=critiqueFullCampaign({campaign,competitive,adObservations:verifiedAdObservations,voice});
 const proposed=proposeDifferentiatedConcepts({campaign,redteam,observedAds:verifiedAdObservations});
 const dashboard=buildDashboard({campaign,redteam,competitive,categoryNeeds,
    voiceOfCustomer:voice,adProviderStatus,adKitResearch,originalConcepts:proposed,
    clientId:client.clientId,tenantId:client.tenantId,companyId:client.companyId});
 const report={schema:'mvx-competitor-critic-client-run/v1',
   clientId:client.clientId,tenantId:client.tenantId,companyId:client.companyId,
   timestamp:new Date().toISOString(),clientWorkflowSummary:{
     brand:campaign.brand,products:campaign.products.map(x=>({name:x.name,sourceId:x.sourceId})),
     posts:campaign.posts.length,sourceCount:campaign.evidence.length},
   campaignId:campaign.id,competitive,categoryNeeds,adProviderStatus,
   providerCapabilities:adLibraryProviderMatrix(),
   observedAds:verifiedAdObservations,adKitResearch,voiceOfCustomer:voice,redteam,originalConcepts:proposed,
   dashboard,
   status:'RESEARCH_DRAFT_NOT_MARKETING_EXECUTION',
   technicalGates:{liveCompetitorPages:Boolean(competitive.competitors?.length),
     indexedCompetitorAds:verifiedAdObservations.length>0,measuredWinningAds:false,
     voiceOfCustomerCollected:voice.observations.length>0,signedTier1ResearchLedger:false,
     approvedForPublications:false}};
 report.crossWorkflowAcceptance=auditCrossWorkflow({client,competitiveRun:report});
 return report;
}
export async function writeAuditEvidence(report,{rootDirectory=path.join(root,'evidence','mvx-marketing-fleet','competitive')}={}){
 checkLocal(rootDirectory);
 if(!/^[a-z0-9_-]{3,80}$/i.test(report.clientId)||
    !/^[a-z0-9_-]{3,80}$/i.test(report.companyId)||
    !/^[a-z0-9_-]{3,80}$/i.test(report.tenantId))throw Error('unsafe company/tenant/client scope');
 const date=report.timestamp.replace(/[:.]/g,'-');
 const output=path.join(rootDirectory,report.companyId,report.clientId,date);checkLocal(output);
 await fs.mkdir(output,{recursive:true});
 const files=[
   ['competitor-candidates.json',report.competitive],
   ['category-needs-hypotheses.json',report.categoryNeeds],
   ['official-ad-provider-status.json',{statuses:report.adProviderStatus,providers:report.providerCapabilities}],
   ['observed-competitor-ads.json',report.observedAds],
   ['adkit-verified-advertiser-matches.json',report.adKitResearch],
   ['voice-of-customer.json',report.voiceOfCustomer],
   ['redteam-findings.json',report.redteam],
   ['cross-workflow-acceptance.json',report.crossWorkflowAcceptance],
   ['differentiated-ad-concepts.json',report.originalConcepts],
   ['client-audit.json',{clientId:report.clientId,campaignId:report.campaignId,
     technicalGates:report.technicalGates,clientWorkflowSummary:report.clientWorkflowSummary}]
 ];
 const inventory=[];
 for(const [name,body] of files){
   const bytes=Buffer.from(JSON.stringify(body,null,2)+'\n');
   await fs.writeFile(path.join(output,name),bytes);
   inventory.push({name,bytes:bytes.length,sha256:hash(bytes)});
 }
 const manifest={schema:'mvx-competitor-audit-files/v1',runAt:report.timestamp,
   clientId:report.clientId,companyId:report.companyId,tenantId:report.tenantId,
   inventory,authority:'read-only market research and draft insights'};
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {directory:output,files:inventory.length+1};
}
export async function persistValidatedAudit(report,{auditDirectory,saveSnapshot=storeDashboardSnapshot}={}) {
 const audit=report?.crossWorkflowAcceptance;
 if(audit?.schema!=='mvx-cross-workflow-acceptance/v1'||audit.statistics.blockers>0||
     audit.companyId!==report.companyId||audit.tenantId!==report.tenantId||
     audit.clientId!==report.clientId||audit.campaignId!==report.campaignId)
   throw Error('Cross-workflow integrity BLOCKED; no dashboard snapshot persisted');
 if(report.dashboard?.kpis?.roas!==null||report.dashboard?.campaign?.approved!==false||
    report.dashboard?.posts?.some(p=>p.providerPublished!==false))
   throw Error('Unofficial performance or provider mutation in draft dashboard');
 const artifact=await writeAuditEvidence(report,{rootDirectory:auditDirectory});
 const verified=await verifyEvidenceManifest(artifact.directory,{
   expectedCompanyId:report.companyId,expectedTenantId:report.tenantId,expectedClientId:report.clientId});
 if(verified.status!=='VERIFIED_LOCAL_INTEGRITY')
   throw Error('Audit files failed SHA-256 manifest reconciliation');
 const dashboardSaved=await saveSnapshot(report.dashboard);
 const check=await verifyDashboardFile(dashboardSaved.filename,{
   expectedCompanyId:report.companyId,expectedTenantId:report.tenantId,expectedClientId:report.clientId});
 if(check.status!=='VERIFIED_LOCAL_INTEGRITY')
   throw Error('Dashboard file failed independent SHA-256 verification');
 return {artifact,dashboardSaved,verifiedFiles:verified.passed.length,
   crossWorkflowVerdict:audit.verdict,releaseAuthorized:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const configPath=process.argv[2];if(!configPath)throw Error('Usage: run-competitive-audit.mjs <client-config> [source-seeds]');
 const config=JSON.parse(await fs.readFile(checkLocal(configPath),'utf8'));
 let searchAdapter;
 if(process.env.BRAVE_SEARCH_API_KEY) searchAdapter=makeBraveWebSearchAdapter({apiKey:process.env.BRAVE_SEARCH_API_KEY});
 else if(process.argv[3]) {
   const seeds=JSON.parse(await fs.readFile(checkLocal(process.argv[3]),'utf8'));
   searchAdapter=makeSeededResearchAdapter({seeds:seeds.seeds});
 }
 const report=await performCompetitiveAudit(config,{searchAdapter});
 const saved=await persistValidatedAudit(report);
 const location=saved.artifact;
 const dashboardStorage=saved.dashboardSaved;
 console.log(JSON.stringify({client:report.clientId,brand:report.clientWorkflowSummary.brand,
   competitors:report.competitive.competitors?.map(c=>({
     name:c.identity.name,domain:c.identity.domain,score:c.relevance.score,
     related:c.relevance.classification,adObservationCount:c.observedAdCount})),
   needsHypotheses:report.categoryNeeds.findings?.map(x=>x.needHypothesisId),
   adLibrary:report.adProviderStatus,
   aggregatorMatches:report.adKitResearch.map(x=>({competitorId:x.competitorId,status:x.status,selected:x.selected.length})),
   realAdvertiserAds:report.observedAds.length,
   voicedCustomerEvidenceCount:report.voiceOfCustomer.observations.length,
   critique:report.redteam.scorecard,
   creativeAlternatives:report.originalConcepts.length,
   release:report.redteam.releaseVerdict,
   crossWorkflowAcceptance:report.crossWorkflowAcceptance.statistics,
   persistenceVerdict:saved.crossWorkflowVerdict,verifiedFiles:saved.verifiedFiles,
   manifestDirectory:location.directory,
   dashboardSnapshot:dashboardStorage.filename, dashboardSha256:dashboardStorage.sha256},null,2));
}
