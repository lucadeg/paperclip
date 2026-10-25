import {createHash} from 'node:crypto';
import {assessContentClaims,buildStrategyBlueprint} from './strategy-engine.mjs';
import {assessCreativeDifferentiation} from './competitive-intelligence.mjs';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const patterns=[
 {id:'price_total',words:/\b(?:prezzo|caro|costoso|cost|afford|expensiv|shipping fee|spedizion)\w*/i,
   job:'Understand total price, VAT, shipping and true value'},
 {id:'coffee_foam',words:/\b(?:schium|montar|foam|froth|cappuccino|barista|latte art)\w*/i,
   job:'Check suitability and foam quality in actual coffee use'},
 {id:'taste_texture',words:/\b(?:sapore|gusto|taste|flavor|flavour|cremos|watery|annacquat|texture)\w*/i,
   job:'Understand texture and taste before purchase'},
 {id:'product_clarity',words:/\b(?:informazion|ingredient|comprendere|understand|instruction|how to|cosa contiene)\w*/i,
   job:'Find understandable product specifications and instructions'},
 {id:'access_availability',words:/\b(?:disponib|scort|availability|out of stock|reperib|dove trovare|delivery delay)\w*/i,
   job:'Check local availability and fulfilment'},
 {id:'trust_safety',words:/\b(?:fiducia|rischio|certificat|allerg|sicurezza|trust|safe|uncertain|recensioni)\w*/i,
   job:'Validate independent evidence, limitations and conditions'}
];
function cleanQuote(v) {
 return String(v??'').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[redacted-email]')
  .replace(/(?:\+\d{1,3}[-.\s]?)?(?:\d[-.\s]?){8,14}/g,'[redacted-number]')
  .replace(/\s+/g,' ').slice(0,750).trim();
}
export function collectVoiceOfCustomer({observations=[],target,now=Date.now()}={}) {
 if(!target?.need||!target?.market)throw Error('Target and market required');
 const valid=[],rejected=[],seen=new Set();
 for(const row of observations){
   const date=Date.parse(row?.observedAt||'');
   const type=row?.type;
   const permitted=type==='interview'?row?.consentForResearch===true:
     type==='support_ticket'?row?.operatorHasAccess===true:
     type==='public_review'?row?.publicReproductionPermitted===true:false;
   let urlOK=false;
   try{urlOK=new URL(row?.sourceUrl).protocol==='https:';}catch{}
   if(!permitted||!urlOK||!row?.sourceId||!row?.observationId||
      !row?.text||String(row.text).length<12||!Number.isFinite(date)||
      date>now+60000||now-date>365*86400000||seen.has(row.observationId)){
     rejected.push({observationId:row?.observationId??null,reason:'missing provenance/rights/source/date or duplicate'});continue;
   }
   seen.add(row.observationId);
   valid.push({sourceId:row.sourceId,observationId:row.observationId,
     kind:type,observedAt:row.observedAt,sourceUrl:row.sourceUrl,
     quotation:cleanQuote(row.text),personToken:row.consentfulAnonymousId||null});
 }
 const grouped=patterns.map(p=>{
   const matches=valid.filter(x=>p.words.test(x.quotation));
   const distinctSources=[...new Set(matches.map(x=>x.sourceId))];
   return {painId:p.id,targetJob:p.job,sourceCount:distinctSources.length,
     observedMentions:matches.length,evidenceIds:matches.map(x=>x.observationId),
     confidence:matches.length>=5&&distinctSources.length>=3?'DIRECTIONAL_QUALITATIVE_SIGNAL':'INSUFFICIENT_TO_INFER_PREVALENCE',
     observedInSource:matches.length>0};
 }).filter(x=>x.observedMentions>0);
 return {schema:'mvx-voice-of-customer/v1',
   status:valid.length?'QUALITATIVE_OBSERVATIONS':'NO_CUSTOMER_VOICE_EVIDENCE',
   targetNeedHypothesis:target.need,targetMarket:target.market,
   observations:valid,rejected,pains:grouped,
   limits:['Small/nonrandom sample: no market prevalence inference',
     'No sensitive trait inference or individualized exploitative targeting',
     'Product manufacturer marketing is not independent customer voice']};
}
function findProof(product,painId) {
 const descriptions=[product?.description||''].join(' ').toLowerCase();
 const related={
  coffee_foam:/foam|froth|schium|barista|montare/,
  taste_texture:/creamy|rich|taste|sapore|cremos/,
  price_total:/price|prezzo|€|eur/,
  product_clarity:/ingredient|specification|dettagl/,
  access_availability:/in.stock|available|disponib/,
  trust_safety:/certificat|safety|test|allerg/
 };
 return related[painId]?.test(descriptions)??false;
}
export function mapNeedsToSolutions({campaign,voice}={}) {
 if(campaign?.schema!=='mvx-campaign-playbook/v1'||voice?.schema!=='mvx-voice-of-customer/v1')
   throw Error('Campaign and customer evidence required');
 const product=campaign.products.at(-1);
 const hypotheses=voice.pains.length?voice.pains:
   [{painId:'target_job_hypothesis',targetJob:campaign.target.need,sourceCount:0,
     observedMentions:0,evidenceIds:[],confidence:'HYPOTHESIS_ONLY',observedInSource:false}];
 return hypotheses.map(p=>{
   const hasProof=findProof(product,p.painId);
   return {painId:p.painId,customerJob:p.targetJob,market:campaign.target.market,
     customerEvidenceIds:p.evidenceIds,customerEvidenceStatus:p.observedInSource?'SOURCE_OBSERVED_QUALITATIVE':'UNOBSERVED_HYPOTHESIS',
     candidateProduct:product.name,productSourceId:product.sourceId,
     productFactSupportsPotentialFit:hasProof,
     solution:hasProof?'Show source-supported product information and invite comparison':
       'Request product validation or propose neutral buyer guidance; no product-fit guarantee',
     fitVerdict:hasProof?'POTENTIAL_FIT_NEEDS_USER_TEST':'UNVERIFIED_GAP',
     validateWith:['consented target interviews','competitive alternatives','actual product demonstration','controlled conversion/complaint outcomes']};
 });
}
function makeFinding(domain,severity,owner,message,refs=[],remediation=''){
 return {id:'finding-'+sha([domain,message,refs]).slice(0,16),
   domain,severity,owner,message,evidenceRefs:refs,remediation,
   status:'OPEN_NEEDS_OWNER_REVIEW'};
}
export function critiqueFullCampaign({campaign,competitive,adObservations=[],voice,now=Date.now()}={}){
 if(campaign?.schema!=='mvx-campaign-playbook/v1')throw Error('Source-backed campaign required');
 const product=campaign.products.at(-1),findings=[],facts=campaign.sourceStatements||[];
 const evidence=campaign.evidence||[];
 if(!evidence.length||evidence.some(x=>!x.sha256||!x.url))
   findings.push(makeFinding('research','BLOCKER','evidence-provenance-auditor',
     'Campaign lacks attributable canonical source digest'));
 if(evidence.some(x=>!Number.isFinite(Date.parse(x.observedAt))||now-Date.parse(x.observedAt)>30*86400000))
   findings.push(makeFinding('research','MAJOR','evidence-provenance-auditor',
     'Public source evidence is missing or stale',evidence.map(x=>x.sourceId),'Reacquire product pages'));
 if(campaign.target.type==='OPERATOR_TEST_SCENARIO_NOT_OBSERVED_AUDIENCE')
   findings.push(makeFinding('audience','MAJOR','audience-voice-researcher',
     'Target pains and prevalence remain operator hypotheses, not verified customer needs',[],
     'Collect permissioned interviews and dated, nonrandom-source voice evidence'));
 if(product.pricingEvidence!=='STRUCTURED_SOURCE')
   findings.push(makeFinding('offer','MAJOR','offer-terms-auditor',
     'Price, shipping, VAT and offer economics are not verified for target market',[product.sourceId],
     'Reconcile authorized merchant offer, stock, all-in price and VAT'));
 if(!competitive||competitive.status==='BLOCKED_SEARCH_PROVIDER_NOT_CONNECTED')
   findings.push(makeFinding('competitors','MAJOR','competitor-discovery-analyst',
     'Independent competitor discovery feed is not connected',[],
     'Connect approved search provider and verify public competitor product pages'));
 else if(!competitive.competitors?.length)
   findings.push(makeFinding('competitors','MAJOR','competitor-discovery-analyst',
     'No validated competing product pages',[], 'Expand category/market search and verify sources'));
 const observed=adObservations.filter(x=>x?.creativeText&&x?.evidence?.observationRef&&x?.adId);
 if(!observed.length)
   findings.push(makeFinding('competitor-ads','MAJOR','ad-library-intelligence-analyst',
     'No authenticated observed competitor ads; public library search links are not observed creatives',[],
     'Connect Meta EU official API or cite manually reviewed official ad snapshot with current date'));
 const v=voice||collectVoiceOfCustomer({target:campaign.target});
 if(!v.observations.length)
   findings.push(makeFinding('audience','MAJOR','need-solution-fit-validator',
     'No evidenced customer complaints or interviews; proposed pains are only hypotheses',[],
     'Run consented qualitative research before inferring specific frustrations'));
 const solutions=mapNeedsToSolutions({campaign,voice:v});
 for(const p of solutions)if(!p.productFactSupportsPotentialFit)
   findings.push(makeFinding('product','MINOR','product-truth-auditor',
     'Product suitability for '+p.painId+' is not demonstrated by available product description',[p.productSourceId],
     'Collect product use-case evidence and document limits'));
 let postsReviewed=0;
 for(const post of campaign.posts) {
   postsReviewed++;
   const check=assessContentClaims(post,campaign);
   if(check.status==='BLOCKED')findings.push(makeFinding('communication','BLOCKER','communication-redteam',
     'Post '+post.id+' fails source-backed copy QA: '+check.issues.join('; '),post.sourceEvidenceIds,'Rewrite and run claim review'));
   const originality=assessCreativeDifferentiation(post.caption,observed);
   if(originality.status==='REWRITE_RECOMMENDED')
     findings.push(makeFinding('originality','MAJOR','creative-originality-critic',
       'Post '+post.id+' has high lexical overlap with an observed competitor ad',
       originality.comparisons.filter(x=>x.verdict==='REVISE_TO_AVOID_IMITATION').map(x=>x.adId),
       'Reframe around evidenced customer job and unique product proof'));
 }
 const strategy=buildStrategyBlueprint(campaign);
 for(const item of strategy.placements)if(!item.authorized){} // placement proposals remain gated
 findings.push(makeFinding('placement','MINOR','placement-ethics-auditor',
   'No verified placement contracts, usage rights and advertiser disclosure for the proposed venues',[],
   'Verify rights and disclosure before product placements'));
 const rank={BLOCKER:0,MAJOR:1,MINOR:2};
 findings.sort((a,b)=>rank[a.severity]-rank[b.severity]||a.id.localeCompare(b.id));
 return {schema:'mvx-marketing-redteam/v1',campaignId:campaign.id,
   generatedAt:new Date(now).toISOString(),postsReviewed,
   competitorCandidates:competitive?.competitors?.length||0,observedAdCount:observed.length,
   scorecard:{critical:findings.filter(x=>x.severity==='BLOCKER').length,
     major:findings.filter(x=>x.severity==='MAJOR').length,
     minor:findings.filter(x=>x.severity==='MINOR').length,
     auditedDomains:[...new Set(findings.map(x=>x.domain))]},
   findings,needsSolutionMatrix:solutions,
   releaseVerdict:findings.some(x=>x.severity==='BLOCKER')?'BLOCKED_NEEDS_FIX':
     'DRAFT_ONLY_REQUIRES_EVIDENCE_AND_APPROVAL',
   executionAuthorized:false,statisticalWinnerDeclared:false};
}
export function proposeDifferentiatedConcepts({campaign,redteam,observedAds=[]}={}){
 if(campaign?.schema!=='mvx-campaign-playbook/v1'||redteam?.schema!=='mvx-marketing-redteam/v1')
   throw Error('Campaign and independent critic report required');
 const product=campaign.products.at(-1);
 const angles=[
  {key:'customer-question',hook:'Quali informazioni ti aiutano davvero a scegliere?',
    next:'Confronta ciò che sai già con quello che resta da verificare',cta:'Salva i criteri di scelta'},
  {key:'transparent-limitations',hook:'Prima di acquistare: quali dettagli non conosci ancora?',
    next:'Spiega le caratteristiche dichiarate e le informazioni mancanti',cta:'Apri la scheda fonte'},
  {key:'real-use-case',hook:'Dal contesto quotidiano alle specifiche verificabili.',
    next:'Mostra un uso reale solo dopo aver verificato il prodotto',cta:'Richiedi la checklist gratuita con consenso'},
  {key:'alternative-comparison',hook:'Non basta un claim: prova a confrontare le opzioni.',
    next:'Confronta criteri neutri senza attribuire vantaggi non provati',cta:'Consulta la guida alle domande'}
 ];
 return angles.map(x=>{
   const copy=[x.hook,'Tema:',product.name+'.',x.next+'.',x.cta+'.'].join(' ');
   const diff=assessCreativeDifferentiation(copy,observedAds);
   return {id:'concept-'+sha([campaign.id,x.key]).slice(0,16),
     angle:x.key,copy,sourceId:product.sourceId,targetJob:campaign.target.need,
     innovationApproach:'original customer-job framing with source-bound product facts',
     differentiationReview:diff.status,productionStatus:diff.status==='REWRITE_RECOMMENDED'?
       'REDRAFT_REQUIRED':'DRAFT_NEEDS_FACT_CHECK_AND_EXPERIMENT',
     bestPerformingClaim:false,paidPlacementAllowed:false};
 });
}
