import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assessContentClaims} from './strategy-engine.mjs';
const catalogRoster=JSON.parse(readFileSync(new URL('./roster.json',import.meta.url),'utf8'));
const totalFleet=[...catalogRoster.executives.map(x=>({...x,classification:'executive-framework'})),
  ...catalogRoster.specialists.map(x=>({...x,classification:'marketing-specialist'}))];
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const AUDIT_AGENTS=[
 ['communication-redteam','Critica copy & tono'],
 ['brand-reputation-auditor','Brand consistency'],
 ['product-truth-auditor','Verità del prodotto'],
 ['offer-terms-auditor','Offerta e IVA'],
 ['creative-originality-critic','Originalità'],
 ['conversion-redteam','Conversione e CTA'],
 ['placement-ethics-auditor','Product placement'],
 ['evidence-provenance-auditor','Evidenze'],
 ['visual-composition-critic','Composizione'],
 ['visual-brand-guardian','Visual identity'],
 ['visual-accessibility-auditor','Accessibilità visuale'],
 ['product-visual-veracity-auditor','Fotografie prodotto'],
 ['platform-creative-spec-auditor','Formati e safe zone'],
 ['cross-modal-claim-auditor','Claim tra testo e media']
];
const ratio=(n,d)=>d?Math.round(n/d*1000)/10:null;
function onePost(post,findings,campaign){
 const acceptedEvidenceIds=new Set(campaign.sourceStatements.map(x=>x.evidenceId));
 const sourceLinked=Array.isArray(post.sourceEvidenceIds)&&post.sourceEvidenceIds.length>0&&
   post.sourceEvidenceIds.every(id=>acceptedEvidenceIds.has(id));
 const claimAudit=assessContentClaims(post,campaign);
 const media=Array.isArray(post.mediaAssets)?post.mediaAssets:[];
 const issues=findings.filter(x=>x.message?.includes(post.id));
 const checks=[
  ['Hook',Boolean(post.hook?.text),'TEXT'],['CTA',Boolean(post.cta?.copy),'TEXT'],
  ['Alt-text',Boolean(post.altText),'STRUCTURAL'],['Storyboard',(post.storyboard?.length||0)>=3,'STRUCTURAL'],
  ['Evidenze',sourceLinked,'SOURCE'],
  ['Claim/source QA',claimAudit.status==='DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED','SOURCE'],
  ['Media reali',media.length>0,'BINARY'],
  ['Licenze immagini',media.length?media.every(x=>x.licenseVerified):null,'RIGHTS'],
  ['Dimensioni verificate',media.length?media.every(x=>x.width>0&&x.height>0):null,'ASSET'],
  ['Safe area piattaforma',media.length?media.every(x=>x.safeAreaVerified):null,'VISUAL'],
  ['Analisi contrasto immagini',null,'VISION'],
  ['Verifica brand-kit visuale',null,'VISION'],
  ['Confronto immagine/prodotto',null,'VISION']
 ].map(([label,ok,kind])=>({label,kind,state:ok===null?'NOT_TESTED':ok?'PASS':'FAIL'}));
 const ruleStates={
  'communication-redteam':claimAudit.status==='DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED'?'RULE_PASS':'RULE_BLOCKED',
  'evidence-provenance-auditor':sourceLinked?'RULE_PASS':'RULE_BLOCKED',
  'conversion-redteam':post.cta?.copy?'CTA_PRESENT_VISUAL_PENDING':'RULE_BLOCKED',
  'visual-accessibility-auditor':post.altText?'ALT_PRESENT_VISUAL_PENDING':'RULE_BLOCKED'
 };
 const agents=AUDIT_AGENTS.map(([id,label])=>({id,label,
  status:issues.some(f=>f.owner===id&&f.severity==='BLOCKER')?'RULE_BLOCKED':ruleStates[id]||'PENDING_AGENT_EXECUTION',
  actualAgentRunId:null,source:'LOCAL_RULES_OR_PENDING',approved:false}));
 return {id:post.id,channel:post.channel,format:post.format,product:post.product,
  persona:post.persona,hook:post.hook,cta:post.cta,caption:post.caption,
  altText:post.altText,storyboard:post.storyboard||[],placement:post.placement,
  evidenceIds:post.sourceEvidenceIds||[],status:post.status,
  mediaStatus:media.length?'METADATA_ONLY':'NO_VISUAL_ASSET',
  checks,agents,issues,claimAudit,structuralPass:checks.slice(0,6).every(x=>x.state==='PASS')&&
    !issues.some(f=>f.severity==='BLOCKER'),providerPublished:false,
  kpis:{impressions:null,clicks:null,conversions:null,ctr:null,cvr:null,roas:null,
    spendNet:null,spendVat:null,spendGross:null}};
}
export function buildDashboard({campaign,redteam,competitive,categoryNeeds,voiceOfCustomer,
  adProviderStatus=[],adKitResearch=[],originalConcepts=[],companyId,tenantId,clientId,
  generatedAt=new Date().toISOString()}={}){
 if(campaign?.schema!=='mvx-campaign-playbook/v1'||redteam?.schema!=='mvx-marketing-redteam/v1'||
   campaign.id!==redteam.campaignId)throw Error('Verified campaign+critic identity required');
 if(!/^[a-z0-9_-]{3,80}$/i.test(companyId||'')||!/^[a-z0-9_-]{3,80}$/i.test(tenantId||'')||
    !/^[a-z0-9_-]{3,80}$/i.test(clientId||''))throw Error('Tenant/company/client scope required');
 const posts=campaign.posts.map(p=>onePost(p,redteam.findings||[],campaign));
 const findings=(redteam.findings||[]).map(f=>({
  id:f.id,domain:f.domain,severity:f.severity,owner:f.owner,
  message:f.message,remediation:f.remediation,evidenceRefs:f.evidenceRefs||[],status:f.status}));
 const count=severity=>findings.filter(f=>f.severity===severity).length;
 const competitors=(competitive?.competitors||[]).map(c=>({
  id:c.id,name:c.identity.name,domain:c.identity.domain,matchScore:c.relevance.score,
  relationship:c.relevance.classification,url:c.productEvidence.source.url,
  officialLibraries:c.adLibraryQueries,actualObservedAds:c.observedAds?.length||0,
  verifiedAdROAS:null}));
 const sourceAge=campaign.evidence.map(x=>(Date.parse(generatedAt)-Date.parse(x.observedAt))/3600000);
 return {
  schema:'mvx-marketing-dashboard/v1',generatedAt,companyId,tenantId,clientId,
  provenance:'UNSIGNED_LOCAL_RESEARCH_NOT_PRODUCTION_PERFORMANCE',
  campaign:{id:campaign.id,brand:campaign.brand.name,brandConfidence:campaign.brand.classification,
    market:campaign.target.market,persona:campaign.target.label,product:campaign.products.at(-1)?.name,
    objective:campaign.objective,approved:false,providerPublishing:false},
  kpis:{
   postDrafts:posts.length,platforms:new Set(posts.map(p=>p.channel)).size,
   evidenceBoundPosts:posts.filter(p=>p.evidenceIds.length>0).length,
   sourceCoverage:ratio(posts.filter(p=>p.evidenceIds.length>0).length,posts.length),
   structuralPass:posts.filter(p=>p.structuralPass).length,
   structuralPassRate:ratio(posts.filter(p=>p.structuralPass).length,posts.length),
   visualAssetsProvided:posts.filter(p=>p.mediaStatus!=='NO_VISUAL_ASSET').length,
   completedVisualAgentAudits:0,actualAgentExecutions:0,
   agentReviewRoles:AUDIT_AGENTS.length,
   criticalFindings:count('BLOCKER'),majorFindings:count('MAJOR'),minorFindings:count('MINOR'),
   competitorCandidates:competitors.length,
   observedCompetitorAds:competitors.reduce((n,c)=>n+c.actualObservedAds,0),
   needsHypotheses:categoryNeeds?.findings?.length||0,
   observedCustomerEvidence:voiceOfCustomer?.observations?.length||0,
   creativeProposals:originalConcepts.length,
   sourceAgeHours:sourceAge.length?Math.max(...sourceAge):null,
   impressions:null,reach:null,clicks:null,ctr:null,conversions:null,cvr:null,cpa:null,roas:null,
   customerAcquisitionCost:null,revenueNet:null,spendNet:null,vat:null,spendGross:null,incrementalProfit:null
  },
  evidence:campaign.evidence.map(x=>({sourceId:x.sourceId,url:x.url,observedAt:x.observedAt,
   sha256:x.sha256,bytes:x.bytes})),
  coverage:{analytics:'NOT_CONNECTED',providerReceipts:'NOT_CONNECTED',paidMedia:'NOT_CONNECTED',
    realAgentReviews:'NOT_ACTIVATED',visualAssets:'NOT_PROVIDED',
    customerPains:voiceOfCustomer?.observations?.length?'QUALITATIVE_ONLY':'HYPOTHESIS_ONLY',
    attribution:'NOT_CONNECTED'},
  posts,findings,competitors,
  adLibraries:adProviderStatus.map(x=>({advertiser:x.advertiser,status:x.status,count:x.count})),
  aggregator:adKitResearch.map(x=>({competitorId:x.competitorId,status:x.status,matched:x.selected?.length||0})),
  needs:(categoryNeeds?.findings||[]).map(x=>({id:x.needHypothesisId,description:x.hypothesis,
   observedCustomerPain:false,evidence:x.evidence,sourceCount:x.sourceCount})),
  customerPains:(voiceOfCustomer?.pains||[]).map(x=>({id:x.painId,job:x.targetJob,mentions:x.observedMentions,
   confidence:x.confidence,evidenceIds:x.evidenceIds})),
  concepts:originalConcepts.map(x=>({id:x.id,angle:x.angle,copy:x.copy,status:x.productionStatus,
   differentiation:x.differentiationReview,sourceId:x.sourceId})),
  agentRoles:AUDIT_AGENTS.map(([id,label])=>({id,label,runtime:'TEMPLATE_NOT_RUNNING'})),
  fleetRoles:totalFleet.map(x=>({id:x.id,title:x.title||x.name||x.id,
     classification:x.classification,manager:x.manager||null,
     runtime:'CATALOG_ONLY_NOT_DEPLOYED',actualRunCount:0,
     auditingAssignedToPosts:AUDIT_AGENTS.some(a=>a[0]===x.id)}))
 };
}
export function envelopeDashboard(snapshot){
 return {schema:'mvx-marketing-dashboard-envelope/v1',
   payloadSha256:digest(snapshot),snapshot,integrity:'LOCAL_SHA256_NOT_SIGNED_PROVIDER_EVIDENCE'};
}
export function verifyDashboardEnvelope(envelope,companyId){
 return envelope?.schema==='mvx-marketing-dashboard-envelope/v1'&&
   envelope.snapshot?.schema==='mvx-marketing-dashboard/v1'&&
   envelope.snapshot.companyId===companyId&&
   envelope.payloadSha256===digest(envelope.snapshot);
}
