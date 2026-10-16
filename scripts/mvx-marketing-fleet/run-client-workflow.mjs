import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquirePublicBrand} from './brand-intake.mjs';
import {createCampaignPlan} from './campaign-factory.mjs';
import {buildStrategyBlueprint,assessContentClaims} from './strategy-engine.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const digest=buf=>createHash('sha256').update(buf).digest('hex');
function assertSubpath(folder,target) {
  const relative=path.relative(folder,path.resolve(target));
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw Error('Operational path must remain in existing .hermes checkout');
}
function assertClientConfig(config){
  if(!config?.clientId||!/^[a-z0-9_-]{3,50}$/i.test(config.clientId)) throw Error('Safe clientId required');
  if(!/^[a-z0-9_-]{3,80}$/i.test(config.tenantId||'')||
    !/^[a-z0-9_-]{3,80}$/i.test(config.companyId||'')) throw Error('Safe tenant and company ID required');
  if(!Array.isArray(config.urls)||config.urls.length>5||!config.urls.length) throw Error('1-5 allowed site pages required');
  if(!Array.isArray(config.allowedHosts)||!config.allowedHosts.length) throw Error('Explicit read-only website allowlist required');
  if(!config.target?.market||!config.target?.label||!config.target?.need||!config.target?.language)
    throw Error('Operator-defined market/persona/need/language required');
  if(config.mode!=='research_draft_only') throw Error('Externally mutating mode is not supported by this runner');
}
export async function planClientWorkflow(config,{acquire=acquirePublicBrand,now=()=>new Date().toISOString()}={}) {
  assertClientConfig(config);
  const capture=await acquire({urls:config.urls,allowedHosts:config.allowedHosts});
  const campaign=createCampaignPlan({capture,target:config.target,
    channels:config.channels??['instagram','facebook','tiktok','linkedin'],objective:config.objective??'consented_guide_requests',
    operatorBrand:config.operatorVerifiedBrandName||undefined});
  const strategy=buildStrategyBlueprint(campaign);
  const checks=campaign.posts.map(post=>({id:post.id,...assessContentClaims(post,campaign)}));
  const blockers=[
    ...checks.filter(x=>x.status==='BLOCKED').map(x=>'Content source/claims gate: '+x.id),
    'Brand ownership, rights to creative assets and product licensing are not attested',
    'Audience analytics and historical post-level performance not connected',
    'Provider authorization/publishing and channel API receipts not connected',
    'CRM webhook subscription, consent policy and durable outbox not configured',
    'Affiliate/referral terms and payout ledgers not approved'
  ];
  const result={schema:'mvx-client-marketing-workflow/v1',
    tenantId:config.tenantId,companyId:config.companyId,clientId:config.clientId,
    observedAt:now(),mode:'research_draft_only',
    evidence: capture, campaign,strategy,contentChecks:checks,
    readiness:{brandSource:'PUBLIC_LIVE_CAPTURE',
      customerTarget:'OPERATOR_INPUT_HYPOTHESIS',copy:'DRAFT_QA_ONLY',
      contentPublication:'NOT_AUTHORIZED',messaging:'NOT_AUTHORIZED',
      affiliates:'PROPOSAL',referrals:'PROPOSAL',measurement:'EXPERIMENTS_NOT_STARTED'},
    blockers,productionReady:false};
  return result;
}
export async function writeWorkflowEvidence(result,{baseDir=path.join(root,'evidence','mvx-marketing-fleet','clients')}={}) {
  assertSubpath(root,baseDir);
  const id=result.clientId;
  if(!/^[a-z0-9_-]{3,80}$/i.test(id)||
     !/^[a-z0-9_-]{3,80}$/i.test(result.companyId||'')||
     !/^[a-z0-9_-]{3,80}$/i.test(result.tenantId||'')) throw Error('Invalid company/tenant/client scope');
  const runId=new Date(result.observedAt).toISOString().replace(/[:.]/g,'-');
  const directory=path.join(baseDir,result.companyId,id,runId);
  assertSubpath(root,directory);
  await fs.mkdir(directory,{recursive:true});
  const documents=[
    ['capture.json',result.evidence],['campaign.json',result.campaign],
    ['strategies.json',result.strategy],['content-qa.json',result.contentChecks],
    ['workflow-status.json',{clientId:result.clientId,companyId:result.companyId,
      tenantId:result.tenantId,mode:result.mode,readiness:result.readiness,blockers:result.blockers,
      productionReady:result.productionReady}]
  ];
  const manifest=[];
  for(const [name,data] of documents){
    const bytes=Buffer.from(JSON.stringify(data,null,2)+'\n');
    await fs.writeFile(path.join(directory,name),bytes);
    manifest.push({name,size:bytes.length,sha256:digest(bytes)});
  }
  const guide=Buffer.from(result.campaign.leadMagnet.content);
  await fs.writeFile(path.join(directory,'free-guide.md'),guide);
  manifest.push({name:'free-guide.md',size:guide.length,sha256:digest(guide)});
  const evidenceManifest={schema:'mvx-workflow-files/v1',
    createdAt:result.observedAt,clientId:id,companyId:result.companyId,tenantId:result.tenantId,
    directory,files:manifest,
    executionState:'PUBLIC_READ_ONLY_BRAND_CAPTURE_AND_DRAFTS_ONLY'};
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(evidenceManifest,null,2)+'\n');
  return evidenceManifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!process.argv[2]) throw Error('Usage: node run-client-workflow.mjs <.hermes/path/to/approved-client-input.json>');
  const configPath=path.resolve(process.argv[2]);assertSubpath(root,configPath);
  const config=JSON.parse(await fs.readFile(configPath,'utf8'));
  const result=await planClientWorkflow(config);
  const manifest=await writeWorkflowEvidence(result);
  console.log(JSON.stringify({client:result.clientId,brand:result.campaign.brand,
    products:result.campaign.products.length,posts:result.campaign.posts.length,
    placements:result.strategy.placements.length,experimentDrafts:result.strategy.experiments.length,
    contentQAPassed:result.contentChecks.filter(x=>x.status==='DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED').length,
    readiness:result.readiness,manifestDirectory:manifest.directory},null,2));
}
