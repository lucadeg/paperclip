import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {acquirePublicBrand} from './brand-intake.mjs';
import {createCampaignPlan} from './campaign-factory.mjs';
import {buildStrategyBlueprint,assessContentClaims} from './strategy-engine.mjs';
import {makeInteractionEngine,signInteraction} from './interaction-engine.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const site='https://www.oatly.com/products';
const page='https://www.oatly.com/products/oat-drink/oat-drink-barista-edition-1l';
const capture=await acquirePublicBrand({urls:[site,page],allowedHosts:['www.oatly.com']});
const target={label:'persone adulte che preparano bevande al caffè in casa (scenario di prova)',
  need:'valutare una bevanda all’avena per il caffè rispetto alle proprie esigenze',
  market:'IT',language:'it'};
const plan=createCampaignPlan({capture,target,channels:['instagram','facebook','tiktok','linkedin'],
  objective:'consented_guide_requests'});
const strategy=buildStrategyBlueprint(plan);
const contentQA=plan.posts.map(post=>({postId:post.id,...assessContentClaims(post,plan)}));
const mockSecret='synthetic-secret-only-for-e2e-demo';
const mockNow=Date.now();
const mockAsset={...plan.leadMagnet,status:'APPROVED'};
let simulatedSends=0;
const sandbox=makeInteractionEngine({secret:mockSecret,tenantId:'demo-tenant',companyId:'demo-company',
  asset:mockAsset,authorize:async()=>true,now:()=>mockNow,
  provider:{sendPrivateMessage:async()=>({providerMessageId:'sandbox-delivery-'+(++simulatedSends),provider:'local-test-double'})}});
const signed=payload=>{const rawBody=JSON.stringify(payload);
  return {rawBody,headers:{'x-mvx-timestamp':String(mockNow),'x-mvx-signature':signInteraction(mockSecret,rawBody,mockNow)}};
};
const comment={eventId:'synthetic-comment',tenantId:'demo-tenant',companyId:'demo-company',
  userId:'fake-user',threadId:'synthetic-thread',channel:'comment',text:'GUIDA'};
const dm={...comment,eventId:'synthetic-dm',channel:'dm',
  consent:{scope:'single_free_guide',channel:'dm',assetId:mockAsset.id,
    grantedAt:new Date(mockNow).toISOString()}};
const interactionResult={comment:await sandbox.handle(signed(comment)),
  dm:await sandbox.handle(signed(dm)),repeatDm:await sandbox.handle(signed(dm)),
  simulatedSends,fixture:true,liveProviderInteraction:false};
const run=new Date().toISOString().replace(/[:.]/g,'-');
const evidenceDir=path.join(root,'evidence','mvx-marketing-fleet',run);
await fs.mkdir(evidenceDir,{recursive:true});
const safe=async(name,obj)=>fs.writeFile(path.join(evidenceDir,name),JSON.stringify(obj,null,2)+'\n','utf8');
await safe('acquisition-evidence.json',capture);
await safe('campaign-drafts.json',plan);
await safe('strategy-blueprint.json',strategy);
await safe('claim-qa.json',contentQA);
await safe('simulated-interactions.json',interactionResult);
await fs.writeFile(path.join(evidenceDir,'free-checklist.md'),plan.leadMagnet.content,'utf8');
const summary={schema:'mvx-live-brand-test/v1',runAt:new Date().toISOString(),sources:capture.sources,
  sourceProducts:plan.products,brand:plan.brand,scenario:plan.target,posts:plan.posts.length,
  hooks:plan.posts.reduce((a,p)=>(a[p.hook.style]=(a[p.hook.style]||0)+1,a),{}),
  channels:[...new Set(plan.posts.map(p=>p.channel))],leadMagnetId:plan.leadMagnet.id,
  placement:plan.posts[0].placement,placementStrategies:strategy.placements.length,
  preregistrationPlans:strategy.experiments.length,allDraftClaimsPassed:contentQA.every(q=>q.status==='DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED'),
  interactionResult,affiliateStatus:plan.economics.affiliate.status,
  referralStatus:plan.economics.referral.status,approval:'NOT APPROVED - NO EXTERNAL PUBLICATION OR OUTREACH',
  sourceHash:createHash('sha256').update(JSON.stringify(capture.sources)).digest('hex'),
  resultDirectory:evidenceDir};
await safe('summary.json',summary);
console.log(JSON.stringify(summary,null,2));
