import {createHash} from 'node:crypto';
import {scoreABExperiment} from './experiment-economics.mjs';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,16);
const objectionTypes=[
 ['fit','È compatibile con le mie esigenze?','Chiarire per chi è pensato il prodotto senza promettere risultati'],
 ['usage','Come si usa nel contesto reale?','Proporre una dimostrazione verificabile e descrivere limiti'],
 ['price','Il prezzo complessivo è giustificato?','Mostrare costi completi solo dopo prezzo e IVA verificati'],
 ['trust','Posso fidarmi del prodotto e del venditore?','Mostrare dati ufficiali, resi, sicurezza, recensioni autentiche']
];
export function buildStrategyBlueprint(plan) {
  if(plan?.schema!=='mvx-campaign-playbook/v1'||!plan.posts?.length) throw Error('Valid campaign factory output mandatory');
  const p=plan.products.at(-1),target=plan.target,sourceIds=p.sourceId?[p.sourceId]:[];
  const contexts=[
    ['owned-product-page','Product detail page','Feature callout + decision FAQ','Product-page qualified conversion'],
    ['owned-editorial','Brand educational article','Comparison checklist without false superiority','Consentful guide completions'],
    ['creator-video','Creator product demonstration','Licensed real usage in context with disclosure','Measured attributable qualified visits'],
    ['independent-coffee-shop','Hospitality demonstration or sampling','Separate signed placement agreement and availability','Incremental trial'],
    ['retail-display','Merchant shelf and category display','Verified inventory, shelf rights and local pricing','Sales lift with geo holdout'],
    ['newsletter','Permissioned newsletter sponsorship','Verified partner list, disclosure and opt-out','Incremental margin after sponsor cost'],
    ['social-carousel','Native consumer education carousel','Audience job-to-be-done, image rights and sources','Qualified engagements'],
    ['search-landing','Search intent landing page','Query relevance, accessibility and accurate offer','Paid-to-landing conversion']
  ];
  const placements=contexts.map(([id,channel,execution,metric])=>({id,channel,product:p.name,
    execution,metric,confidence:'UNTESTED_CONTEXT_HYPOTHESIS',sourceIds,
    required:['channel ownership or licensed contract','inventory/cost evidence','claim source',
      'appropriate advertising disclosure','preregistered measurement'],
    authorized:false}));
  const objections=objectionTypes.map(([id,question,strategy])=>({id,question,strategy,
    inputEvidenceRequired:['real customer voice/call logs','actual product and seller facts'],
    evidenceStatus:'RESEARCH_REQUIRED',readyToClaim:false}));
  const offerLadder=[
    {stage:'awareness',offer:'Free, ungated educational post',cta:'Save/share voluntarily',financialCommitment:'none'},
    {stage:'consideration',offer:'Free checklist on user request',cta:'Request guide through explicit opt-in DM',financialCommitment:'content cost budget'},
    {stage:'product-evaluation',offer:'Verified product detail and FAQ',cta:'View the source product page',financialCommitment:'none'},
    {stage:'conversion',offer:'Real product listing with total price and terms',cta:'See merchant checkout after confirmation',financialCommitment:'verified merchant sales economics'},
    {stage:'loyalty',offer:'Only permissioned education and referral benefits after launch',cta:'Opt in through customer-controlled preferences',
      financialCommitment:'approved net contribution/cap'}
  ];
  const kpis={primary:'incremental consented guide completion followed by qualified product action',
    attribution:'holdout-first; tagged source is not causal evidence',
    costBasis:['mediaSpendNet','mediaVatRate','fees','refunds','creator licensing','affiliate commissions'],
    safety:['unsubscribes','complaints','false claims','fraud','gross margin']};
  const experiments=[];
  const groups=Map.groupBy(plan.posts,x=>x.channel+'|'+x.hook.style);
  for(const [group,posts] of groups){
    const a=posts.find(x=>x.cta.kind==='save'),b=posts.find(x=>x.cta.kind==='opt_in');
    if(!a||!b) continue;
    experiments.push({id:'ab-'+sha({campaign:plan.id,group}),channel:a.channel,hookStyle:a.hook.style,
      controlId:a.id,variantId:b.id,primaryMetric:'qualified_post_action',
      hypotheses:['Different CTA outcome may affect audience intent','No variant is presumed a winner'],
      guardrailMetrics:['negative_feedback','consent_complaints','cost_per_qualified_action'],
      requiredDesign:['random assignment or defensible matched geo holdout','preregistered audience and metric',
        'plannedEndAt before exposure','minimum sample and SRM check'],
      measuredEffect:null,state:'NOT_STARTED'});
  }
  return {schema:'mvx-growth-strategy/v1',campaignId:plan.id,brand:plan.brand.name,
    target:target.label,positioningPlan:{
      frame:'JTBD + evidence-based differentiation',customerJob:target.need,
      proposedCategory:'Confirm actual competitive alternatives using dated market data',
      messageArchitecture:{who:target.label,why:target.need,what:p.name,
        proof:'Only source-linked product assertions',tone:plan.proposedPositioning.voice},
      noLogoOrIdentityReuseWithoutPermission:true},
    salesStrategy:{method:'value demonstration -> objections -> decision -> measured loyalty',
      offerLadder,objections,checkoutGates:['total tax/IVA pricing','payment compliance',
        'refund/return policy','verified availability','accessible UX']},
    placements,experiments,kpis,
    affiliateStrategy:plan.economics.affiliate,referralStrategy:plan.economics.referral,
    leadMagnetJourney:{publicComment:'manual-review public response pointing to voluntary DM',
      optedInDM:'deliver free checklist once with source and provider receipt',
      unsubscribedOrUnconsented:'deny messaging and remove from sending queue',
      affiliate:'only merchant-approved enrolled partners and signed attribution',
      referral:'only verified existing customers with consent and anti-fraud rules'},
    actionStatus:'RESEARCH_AND_DRAFT_ONLY'};
}
export function assessContentClaims(post,plan) {
  if(!post?.caption||!plan?.sourceStatements) return {status:'BLOCKED',issues:['content/evidence missing']};
  const issues=[];
  const txt=post.caption.toLowerCase();
  const realText=plan.sourceStatements.map(s=>s.statement.toLowerCase()).join(' ');
  if(/(?:\b(?:free shipping|spedizione gratuita|50% off|sconto del|guaranted?|guaranteed|certified|certificato|best-selling|migliore di tutti|numero uno)\b)/i.test(txt)&&
    !/verificabile/.test(txt)) issues.push('potential price/superiority/certification claim requires individually verified source');
  if(/\b(?:€\s?\d+|\d+[,.]\d{2}\s?€)\b/.test(txt) && !plan.products.some(p=>p.pricingEvidence==='STRUCTURED_SOURCE'))
    issues.push('explicit euro price without source');
  if(!post.sourceEvidenceIds?.length) issues.push('missing provenance references');
  if(post.sourceEvidenceIds.some(id=>!plan.sourceStatements.some(s=>s.evidenceId===id)))
    issues.push('unknown source claim reference');
  if(/\b(?:miracle|miracolo|cura|treats disease|cancer cure)\b/i.test(txt))
    issues.push('regulated or prohibited efficacy claim');
  if(!post.cta?.copy||!post.hook?.text) issues.push('hook and CTA missing');
  return {status:issues.length?'BLOCKED':'DRAFT_QA_PASSED_NOT_PUBLICATION_AUTHORIZED',
    issues,reviewRequired:true,measuredBrandAlignment:null,
    verifiedSourceWordCorpusBytes:Buffer.byteLength(realText)};
}
export async function evaluateLivePostTest({plan,experimentId,measurements,verifyMeasurement}) {
  const strategy=buildStrategyBlueprint(plan),def=strategy.experiments.find(x=>x.id===experimentId);
  if(!def) return {status:'BLOCKED',reason:'Unknown campaign-specific experiment'};
  if(measurements?.controlId!==def.controlId || measurements?.variantId!==def.variantId)
    return {status:'BLOCKED',reason:'Measurement arm identity does not match campaign experiment'};
  if(typeof verifyMeasurement!=='function') return {status:'BLOCKED',reason:'Trusted analytics evidence verifier not configured'};
  if(!measurements?.sourceEvidenceId || await verifyMeasurement(measurements.sourceEvidenceId,plan.id)!==true)
    return {status:'BLOCKED',reason:'Unverified real provider measurement'};
  const result=scoreABExperiment(measurements.experiment);
  return {status:result.verdict==='WINNER_CANDIDATE'?'RECOMMEND_VARIANT_DRAFT':'DO_NOT_OPTIMIZE',
    result,controlId:def.controlId,variantId:def.variantId,
    providerMutationAuthorized:false,notes:'Variant promotion requires separate Tier 1 approval and release'};
}
