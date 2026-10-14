import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {acquirePublicBrand,extractPublicPage} from './brand-intake.mjs';
import {createCampaignPlan} from './campaign-factory.mjs';
import {makeInteractionEngine,signInteraction,verifyInteraction,MemoryInteractionLedger} from './interaction-engine.mjs';

const now='2026-10-14T09:00:00.000Z',nowMs=Date.parse(now);
const html=`<!doctype html><html><head><title>Demo Brand - Coffee Products | Demo</title>
<meta name="description" content="A coffee-friendly oat drink, designed for making a warm beverage at home.">
</head><body><main><h1>Barista Oat Drink</h1>
<h2>Everyday coffee routine</h2><p>Product details for customers.</p></main>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Barista Oat Drink","brand":{"name":"Demo Brand"},"description":"A coffee-friendly oat drink","offers":{"price":"4.20","priceCurrency":"EUR"}}</script>
</body></html>`;
const url='https://example.org/products/barista';
const target={label:'adulti interessati al caffè domestico',need:'capire se il prodotto è adatto alla propria routine',market:'IT',language:'it'};
const capture=()=>({schema:'mvx-brand-capture/v1',status:'SOURCE_ACQUIRED',pages:[extractPublicPage(html,{url,observedAt:now})],
  sources:[extractPublicPage(html,{url,observedAt:now}).source]});
const secret='unittest-secret-for-signed-event-2026';
const asset={id:'guide-1',status:'APPROVED',content:'# Guide\nVerified guide for requested user.'};
function engine({authorize=async()=>true,provider,ledger}={}){
  return makeInteractionEngine({tenantId:'t',companyId:'c',secret,asset,authorize,provider:provider||{
    sendPrivateMessage:async()=>({providerMessageId:'sim-1',provider:'local-mock'})
  },ledger,now:()=>nowMs});
}
function event(ch='dm',extras={}){
  return {eventId:'ev-1',threadId:'thread-1',userId:'user-1',tenantId:'t',companyId:'c',
    channel:ch,text:'GUIDA',consent:{scope:'single_free_guide',channel:'dm',assetId:'guide-1',grantedAt:now},...extras};
}
function signed(payload,ts=nowMs){
  const rawBody=JSON.stringify(payload);
  return {rawBody,headers:{'x-mvx-timestamp':String(ts),'x-mvx-signature':signInteraction(secret,rawBody,ts)}};
}
const asResponse=(page)=>new Response(page,{status:200,headers:{'content-type':'text/html'}});
test('extracts brand and product claims from page and actual SHA digest',()=>{
  const p=extractPublicPage(html,{url,observedAt:now});
  assert.equal(p.h1,'Barista Oat Drink');assert.equal(p.structuredProduct.name,'Barista Oat Drink');
  assert.equal(p.structuredProduct.brand,'Demo Brand');assert.equal(p.structuredProduct.offers.price,'4.20');
  assert.match(p.source.sha256,/^[0-9a-f]{64}$/);assert.ok(p.verifiedStatements.every(x=>x.sourceId===p.source.sourceId));
});
test('URL allowlist prevents unknown domain and HTTP/local SSRF',async()=>{
  const fetchImpl=async()=>asResponse(html);
  for (const candidate of ['https://private.invalid/page','http://example.org/product','https://localhost/admin']){
    await assert.rejects(()=>acquirePublicBrand({urls:[candidate],allowedHosts:['example.org'],
      fetchImpl,resolveHost:async()=>[{address:'93.184.215.14'}]}));
  }
});
test('DNS pinning rejects private / loopback targets even with operator allowlist',async()=>{
  await assert.rejects(()=>acquirePublicBrand({urls:[url],allowedHosts:['example.org'],fetchImpl:async()=>asResponse(html),
    resolveHost:async()=>[{address:'127.0.0.1'}]}));
  await assert.rejects(()=>acquirePublicBrand({urls:[url],allowedHosts:['example.org'],fetchImpl:async()=>asResponse(html),
    resolveHost:async()=>[{address:'192.168.0.5'}]}));
});
test('redirect bypass denied and non-HTML media refused',async()=>{
  await assert.rejects(()=>acquirePublicBrand({urls:[url],allowedHosts:['example.org'],
    resolveHost:async()=>[{address:'93.184.215.14'}],
    fetchImpl:async()=>new Response('',{status:302,headers:{location:'http://localhost'}})}));
  await assert.rejects(()=>acquirePublicBrand({urls:[url],allowedHosts:['example.org'],
    resolveHost:async()=>[{address:'93.184.215.14'}],
    fetchImpl:async()=>new Response('binary',{status:200,headers:{'content-type':'application/pdf'}})}));
});
test('bounded streaming denies large pages regardless of header',async()=>{
  await assert.rejects(()=>acquirePublicBrand({urls:[url],allowedHosts:['example.org'],maxBytes:200,
    resolveHost:async()=>[{address:'93.184.215.14'}],fetchImpl:async()=>asResponse(html)}),/too large/i);
});
test('real HTML fetch adapter produces tenant-independent provenance evidence',async()=>{
  const x=await acquirePublicBrand({urls:[url],allowedHosts:['example.org'],
    resolveHost:async()=>[{address:'93.184.215.14'}],fetchImpl:async()=>asResponse(html)});
  assert.equal(x.sources.length,1);assert.equal(x.status,'SOURCE_ACQUIRED');assert.equal(x.pages[0].structuredProduct.brand,'Demo Brand');
});
test('campaign source binding, brand positioning and price evidence remain explicit',()=>{
  const p=createCampaignPlan({capture:capture(),target,channels:['instagram','tiktok']});
  assert.equal(p.brand.name,'Demo Brand');assert.equal(p.brand.classification,'PUBLIC_STRUCTURED_METADATA');
  assert.equal(p.products[0].price,'4.20');assert.equal(p.posts.length,12);
  assert.equal(p.proposedPositioning.confidence,'HYPOTHESIS_PENDING_RESEARCH');
  assert.ok(p.posts.every(x=>x.sourceEvidenceIds.length>0&&x.status==='DRAFT_REQUIRES_OWNER_APPROVAL'));
  assert.ok(p.posts.every(x=>x.optimization.measuredUplift===null));
});
test('platform-specific caption lengths, hooks/CTAs and shot lists materialize',()=>{
  const p=createCampaignPlan({capture:capture(),target,channels:['instagram','facebook','tiktok','linkedin']});
  assert.equal(p.posts.length,24);
  const byPlatform=Object.groupBy(p.posts,x=>x.channel);
  for(const [key,posts] of Object.entries(byPlatform)) {
    assert.equal(posts.length,6); assert.equal(new Set(posts.map(x=>x.hook.style)).size,3);
    assert.equal(new Set(posts.map(x=>x.cta.kind)).size,2);
    assert.ok(posts.every(x=>x.storyboard.length===4&&x.placement.disclosure));
  }
  assert.match(p.leadMagnet.content,/Checklist gratuita/);
  assert.match(p.leadMagnet.content,/example.org/);
});
test('audience identity cannot be inferred without explicit operator scenario',()=>{
  assert.throws(()=>createCampaignPlan({capture:capture()}),/explicit/);
});
test('affiliate and referral terms are never invented without merchant authority',()=>{
  const p=createCampaignPlan({capture:capture(),target});
  assert.equal(p.economics.affiliate.commissionPercentage,null);
  assert.equal(p.economics.referral.rewardGross,null);
  assert.equal(p.economics.affiliate.merchantApproval,false);
  assert.equal(p.productionReady,false);
});
test('signed interaction resists malformed signatures and stale timestamps',()=>{
  const data=JSON.stringify(event());
  assert.equal(verifyInteraction(secret,data,nowMs,signInteraction(secret,data,nowMs),nowMs),true);
  assert.equal(verifyInteraction(secret,data,nowMs,'sha256='+('a'.repeat(64)),nowMs),false);
  assert.equal(verifyInteraction(secret,data,nowMs-600000,signInteraction(secret,data,nowMs-600000),nowMs),false);
});
test('public comment is review draft, never triggers a private message',async()=>{
  let calls=0;const x=engine({provider:{sendPrivateMessage:async()=>{calls++;return {providerMessageId:'x'}}}});
  const result=await x.handle(signed(event('comment')));
  assert.equal(result.status,'REVIEW_PUBLIC_REPLY');assert.equal(calls,0);
});
test('DM with no explicit opt-in never sends',async()=>{
  let count=0;const x=engine({provider:{sendPrivateMessage:async()=>{count++;return {providerMessageId:'x'}}}});
  assert.equal((await x.handle(signed(event('dm',{consent:null})))).status,'BLOCKED_NO_CONSENT');
  assert.equal(count,0);
});
test('cross tenant replay and payload tampering denied before outbound provider',async()=>{
  const x=engine();
  assert.equal((await x.handle(signed(event('dm',{tenantId:'foreign'})))).status,'REJECTED');
  const fake=signed(event());fake.rawBody=fake.rawBody.replace('GUIDA','SPAM');
  assert.equal((await x.handle(fake)).status,'REJECTED');
});
test('authorization denied blocks the provider even on valid consent',async()=>{
  const x=engine({authorize:async()=>false});
  assert.equal((await x.handle(signed(event()))).status,'BLOCKED_POLICY');
});
test('approved opt-in delivers exactly once with receipt and no recipient PII in journal',async()=>{
  let n=0,request;
  const x=engine({provider:{sendPrivateMessage:async p=>{n++;request=p;return {providerMessageId:'mock-17',provider:'test'}}}});
  const a=await x.handle(signed(event())),b=await x.handle(signed(event()));
  assert.equal(a.status,'DELIVERED');assert.equal(b.duplicate,true);assert.equal(n,1);
  assert.ok(request.idempotencyKey&&request.text.includes('Guide'));
  assert.ok(!JSON.stringify(a).includes('user-1'));assert.equal(a.providerReceipt,'mock-17');
});
test('provider failure produces retryable status instead of false success',async()=>{
  let tries=0;const x=engine({provider:{sendPrivateMessage:async()=>{tries++;if(tries===1)throw new Error('503');return {providerMessageId:'r2'}}}});
  assert.equal((await x.handle(signed(event()))).status,'RETRYABLE_FAILURE');
  assert.equal((await x.handle(signed(event()))).status,'DELIVERED');
});
test('local HTTP mock exercises actual request/response delivery path',async()=>{
  let received=0;
  const server=createServer(async(req,res)=>{
    if(req.method!=='POST'||req.url!=='/mock-messaging'){res.writeHead(404).end();return;}
    const chunks=[];for await (const c of req)chunks.push(c);
    const incoming=JSON.parse(Buffer.concat(chunks).toString());
    if(!incoming.idempotencyKey||!incoming.threadId){res.writeHead(422).end();return;}
    received++;res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({providerMessageId:'http-mock-'+received,provider:'local-http-test'}));
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  try {
    const u='http://127.0.0.1:'+server.address().port+'/mock-messaging';
    const gateway=engine({provider:{sendPrivateMessage:async body=>{
      const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok) throw Error('mock failure');return r.json();
    }}});
    assert.equal((await gateway.handle(signed(event()))).status,'DELIVERED');
    assert.equal(received,1);
  }finally{await new Promise(done=>server.close(done));}
});
test('incomplete asset approval and missing policy adapter fail closed',()=>{
  assert.throws(()=>makeInteractionEngine({secret,tenantId:'t',companyId:'c',asset:{...asset,status:'DRAFT'},provider:{sendPrivateMessage:async()=>{}},
    authorize:async()=>true}),/Approved lead magnet/);
  assert.throws(()=>makeInteractionEngine({secret,tenantId:'t',companyId:'c',asset,provider:{sendPrivateMessage:async()=>{}}}),/Trusted policy/);
});

// Expanded branding, product placement, sales conversion and attribution workflows.
import {buildStrategyBlueprint,assessContentClaims,evaluateLivePostTest} from './strategy-engine.mjs';
import {validatePartnerProgram,issueAffiliateLink,verifyAffiliateLink,proposeCommission,designReferralContract} from './partner-growth.mjs';
const plan=()=>createCampaignPlan({capture:capture(),target,channels:['instagram','facebook','tiktok','linkedin']});
const partner={
  merchantApproved:true,programId:'affiliate-v1',tenantId:'t',companyId:'c',currency:'EUR',
  privacyReviewed:true,termsApproved:true,landingBase:'https://merchant.example.org/',
  allowedLandingHosts:['merchant.example.org'],commissionRate:0.1,
  attributionDays:14,maximumCommissionNet:40
};
const affiliateSecret='partner-server-only-secret-not-public-test';
const validOrder={orderId:'order1',tenantId:'t',companyId:'c',signedProviderProof:true,settled:true,
  currency:'EUR',salesGross:122,refundsGross:0,vatRate:0.22,settledAt:'2026-10-14T09:00:00Z',
  buyerHash:'buyer-different',chargeback:false};
const attribution={consentRecorded:true,affiliateId:'partner_100',occurredAt:'2026-10-10T09:00:00Z',
  signedAttributionProof:true,referrerHash:'another-person',duplicate:false,fraudRiskHigh:false};
test('branding positioning specifies unproven differentiators and owner restrictions',()=>{
  const s=buildStrategyBlueprint(plan());
  assert.match(s.positioningPlan.frame,/JTBD/);
  assert.equal(s.positioningPlan.noLogoOrIdentityReuseWithoutPermission,true);
  assert.equal(s.actionStatus,'RESEARCH_AND_DRAFT_ONLY');
});
test('placement planner creates eight channel-specific accountable hypotheses',()=>{
  const s=buildStrategyBlueprint(plan());
  assert.equal(s.placements.length,8);
  assert.ok(s.placements.every(x=>x.authorized===false&&x.required.includes('appropriate advertising disclosure')));
  assert.ok(s.placements.some(x=>x.id==='creator-video'));
  assert.ok(s.placements.some(x=>x.id==='retail-display'));
});
test('offer ladder, objection matrix and conversion gates cover whole customer journey',()=>{
  const s=buildStrategyBlueprint(plan());
  assert.equal(s.salesStrategy.offerLadder.length,5);
  assert.equal(s.salesStrategy.objections.length,4);
  assert.ok(s.salesStrategy.objections.every(x=>x.evidenceStatus==='RESEARCH_REQUIRED'));
  assert.ok(s.salesStrategy.checkoutGates.includes('total tax/IVA pricing'));
});
test('each post receives experiment id, control variant and guardrails',()=>{
  const p=plan(),s=buildStrategyBlueprint(p);
  assert.equal(s.experiments.length,12);
  assert.ok(s.experiments.every(x=>x.state==='NOT_STARTED' && !x.measuredEffect));
  assert.ok(s.experiments.every(x=>x.guardrailMetrics.includes('consent_complaints')));
  assert.ok(s.experiments.every(x=>p.posts.some(post=>post.id===x.controlId)&&p.posts.some(post=>post.id===x.variantId)));
});
test('source-linked copy QA passes draft but not authorizes live publishing',()=>{
  const p=plan(),result=assessContentClaims(p.posts[0],p);
  assert.equal(result.status,'DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED');
  assert.equal(result.reviewRequired,true);assert.equal(result.measuredBrandAlignment,null);
});
test('missing source, unsupported discount, regulated cure claims blocked',()=>{
  const p=plan();
  const bad={...p.posts[0],caption:'50% off, guaranteed cancer cure, migliore di tutti'};
  assert.equal(assessContentClaims(bad,p).status,'BLOCKED');
  assert.equal(assessContentClaims({...p.posts[0],sourceEvidenceIds:['fake-id']},p).status,'BLOCKED');
});
test('post optimization requires real provider analytics evidence, not a statistical fig leaf',async()=>{
  const p=plan(),s=buildStrategyBlueprint(p);
  const experimentId=s.experiments[0].id;
  const measured={sourceEvidenceId:'external-proof',controlId:s.experiments[0].controlId,
    variantId:s.experiments[0].variantId,experiment:{
      hypothesisId:'registered-campaign-ab',registeredAt:'2026-01-01T00:00:00Z',
      startAt:'2026-01-02T00:00:00Z',plannedEndAt:'2026-01-15T00:00:00Z',
      analyzedAt:'2026-01-16T00:00:00Z',randomized:true,holdout:true,metric:'qualified_post_action',
      guardrailMetrics:['consent_complaints'],guardrailsBreached:false,minimumPerArm:100,variantAllocation:0.5,
      control:{n:2000,success:140},treatment:{n:2000,success:270}}};
  assert.equal((await evaluateLivePostTest({plan:p,experimentId,measurements:measured})).status,'BLOCKED');
  assert.equal((await evaluateLivePostTest({plan:p,experimentId,measurements:measured,
    verifyMeasurement:async()=>false})).status,'BLOCKED');
  const result=await evaluateLivePostTest({plan:p,experimentId,measurements:measured,
    verifyMeasurement:async()=>true});
  assert.equal(result.status,'RECOMMEND_VARIANT_DRAFT');
  assert.equal(result.providerMutationAuthorized,false);
});
test('affiliate program requires authority, privacy approval and bounded economics',()=>{
  assert.equal(validatePartnerProgram(partner).length,0);
  assert.ok(validatePartnerProgram({...partner,merchantApproved:false}).length>0);
  assert.ok(validatePartnerProgram({...partner,landingBase:'http://localhost/'}).length>0);
  assert.ok(validatePartnerProgram({...partner,commissionRate:0.8}).length>0);
});
test('affiliate signed link is scoped to real merchant domain and tamper resistant',()=>{
  const link=issueAffiliateLink(partner,{affiliateId:'partner_100',productPath:'/shop/barista',
    secret:affiliateSecret,affiliateApproved:true});
  assert.equal(link.status,'LINK_READY_NOT_PUBLISHED');
  const u=new URL(link.url);
  assert.equal(u.hostname,'merchant.example.org');
  assert.equal(verifyAffiliateLink(partner,{affiliateId:'partner_100',
    productPath:'/shop/barista',signature:u.searchParams.get('mvx_sig'),secret:affiliateSecret}),true);
  assert.equal(verifyAffiliateLink(partner,{affiliateId:'partner_101',
    productPath:'/shop/barista',signature:u.searchParams.get('mvx_sig'),secret:affiliateSecret}),false);
  assert.equal(issueAffiliateLink(partner,{affiliateId:'partner_100',productPath:'//evil.example',
    secret:affiliateSecret,affiliateApproved:true}).status,'BLOCKED');
});
const approvedSource={verifyWithTier1:async({order,attribution})=>Boolean(order.signedProviderProof && attribution.signedAttributionProof)};
test('settled 122 EUR sale with 22% illustrative VAT yields 100 net; 10% commission candidate',async()=>{
  const x=await proposeCommission(partner,validOrder,attribution,approvedSource);
  assert.equal(x.status,'PAYABLE_PROPOSAL_ONLY');
  assert.equal(x.orderRevenueNet,100);assert.equal(x.proposedCommissionNet,10);
  assert.equal(x.cashPayoutGross,null);assert.equal(x.approvedForPayout,false);
  assert.equal((await proposeCommission(partner,validOrder,attribution)).status,'BLOCKED');
});
test('no fake settled sales, cross tenant, self-referral or fraudulent payout',async()=>{
  assert.equal((await proposeCommission(partner,{...validOrder,settled:false},attribution,approvedSource)).status,'BLOCKED');
  assert.equal((await proposeCommission(partner,{...validOrder,tenantId:'other'},attribution,approvedSource)).status,'BLOCKED');
  assert.equal((await proposeCommission(partner,{...validOrder,buyerHash:'same'},{...attribution,referrerHash:'same'},approvedSource)).status,'BLOCKED');
  assert.equal((await proposeCommission(partner,validOrder,{...attribution,duplicate:true},approvedSource)).status,'BLOCKED');
  assert.equal((await proposeCommission(partner,validOrder,{...attribution,consentRecorded:false},approvedSource)).status,'BLOCKED');
  assert.equal((await proposeCommission(partner,validOrder,attribution,{verifyWithTier1:async()=>false})).status,'BLOCKED');
});
test('refund and attribution-window limits reduce or block affiliate liability',async()=>{
  assert.equal((await proposeCommission(partner,{...validOrder,refundsGross:61},attribution,approvedSource)).proposedCommissionNet,5);
  assert.equal((await proposeCommission(partner,validOrder,{...attribution,occurredAt:'2026-01-01T00:00:00Z'},approvedSource)).status,'BLOCKED');
});
test('referral scheme draft needs existing customer, explicit opt-in, merchant budget and anti fraud',()=>{
  const request={merchantApproved:true,legalReviewed:true,rewardGross:5,capGross:50,
    consentFlow:'explicit_opt_in',referrerEligibility:'verified_existing_customer'};
  const r=designReferralContract(request);
  assert.equal(r.status,'DRAFT_CONTRACT_REQUIRES_LEDGER');
  assert.equal(r.externalPayoutAuthorized,false);
  assert.equal(designReferralContract({...request,consentFlow:'auto_send_all_contacts'}).status,'BLOCKED');
  assert.equal(designReferralContract({...request,rewardGross:500}).status,'BLOCKED');
});

import {planClientWorkflow} from './run-client-workflow.mjs';
test('generic client runner executes capture to campaign to 24 post QA and strategy in one invocation',async()=>{
  const config={clientId:'demo-brand',tenantId:'sandbox',companyId:'sandbox-company',mode:'research_draft_only',
    urls:[url],allowedHosts:['example.org'],target,channels:['instagram','facebook','tiktok','linkedin']};
  const flow=await planClientWorkflow(config,{acquire:async()=>capture(),now:()=>now});
  assert.equal(flow.schema,'mvx-client-marketing-workflow/v1');
  assert.equal(flow.campaign.posts.length,24);
  assert.equal(flow.contentChecks.length,24);
  assert.equal(flow.strategy.experiments.length,12);
  assert.equal(flow.productionReady,false);
  assert.equal(flow.readiness.messaging,'NOT_AUTHORIZED');
});
test('generic runner rejects unapproved mutating mode and absent target definition',async()=>{
  const config={clientId:'demo-brand',tenantId:'t',companyId:'c',mode:'publish',urls:[url],
    allowedHosts:['example.org'],target};
  await assert.rejects(()=>planClientWorkflow(config,{acquire:async()=>capture()}),/Externally mutating mode/);
  await assert.rejects(()=>planClientWorkflow({...config,mode:'research_draft_only',target:null},
    {acquire:async()=>capture()}),/Operator-defined/);
});
