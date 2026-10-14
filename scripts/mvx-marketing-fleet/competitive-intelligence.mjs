import {createHash} from 'node:crypto';
import {fetchPinnedHtml} from './pinned-https.mjs';
import {extractPublicPage} from './brand-intake.mjs';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const stop=new Set('the and for with from by in of to it a an is are all a al per con senza e il la lo dei da di uno una sua our your home product products'.split(' '));
const synonyms=new Map([['caffè','coffee'],['avena','oat'],['schiuma','foam'],['schiumabile','foam'],['cremoso','creamy'],['cremosità','creamy'],['barista','coffee'],['latte','milk'],['vegan','plant'],['vegetale','plant']]);
const tokens=s=>[...new Set(String(s??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(t=>t.length>=3&&!stop.has(t)).map(t=>synonyms.get(t)||t))];
function textMatch(a,b) {const aa=new Set(tokens(a)),bb=new Set(tokens(b)),joint=[...aa].filter(x=>bb.has(x));return {overlap:joint,score:joint.length/Math.max(2,Math.min(aa.size,bb.size))};}
function validHttpUrl(input) {try {const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.port&&!u.hostname.endsWith('.local')&&u.hostname.includes('.');}catch{return false;}}
function safeSource(s,now=Date.now()) {
 if(!s||!validHttpUrl(s.url)||typeof s.title!=='string'||!s.title.trim()||
    !s.providerResultId||!s.query||!s.provider||!Number.isFinite(Date.parse(s.observedAt))||
    Date.parse(s.observedAt)>now+60000 || now-Date.parse(s.observedAt)>90*86400000) return false;
 return true;
}
export function buildCompetitorQueries({campaign,market='IT',max=4}={}) {
 if(campaign?.schema!=='mvx-campaign-playbook/v1')throw new Error('Source-bound campaign required');
 const product=campaign.products.at(-1)?.name;
 const personaNeed=campaign.target?.need;
 if(!product||!personaNeed)throw new Error('Product and consumer job required');
 const category=tokens(product).slice(0,5).join(' ');
 const need=tokens(personaNeed).slice(0,4).join(' ');
 return [...new Set([
  category+' competitor brands '+market,
  category+' alternatives '+need+' '+market,
  'buy '+category+' similar products '+market,
  category+' plant based coffee brands '+market
 ])].slice(0,Math.min(max,5));
}
function domainOf(raw){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}}
function scoreRelevance(campaign,page,result){
 const anchor=[campaign.products.at(-1)?.name,campaign.target.need,campaign.products.at(-1)?.description].join(' ');
 const document=[page.title,page.description,page.h1,...page.headlines].join(' ');
 const t=textMatch(anchor,document);
 const headlineMatch=textMatch(campaign.products.at(-1)?.name,page.h1);
 const score=Math.min(1,0.6*t.score+0.4*headlineMatch.score);
 return {score:Number(score.toFixed(3)),sharedTerms:[...new Set([...t.overlap,...headlineMatch.overlap])].slice(0,12),
   classification:score>=0.26?'POTENTIAL_DIRECT_OR_CATEGORY_COMPETITOR':'ALTERNATIVE_OR_UNVERIFIED',
   resultRank:result.rank??null};
}
/* SearchAdapter contract: search({query,market,limit}) returns date-stamped
 * source results with title, URL, provider, result ID, query, observedAt.
 * Requires a licensed search feed or authenticated operator research provider;
 * no hidden Google/Meta scraping or manufactured search hits.
 */
export async function discoverCompetitors({campaign,searchAdapter,fetchPublicHtml=fetchPinnedHtml,market='IT',limit=6,now=()=>new Date().toISOString()}={}) {
 if(campaign?.schema!=='mvx-campaign-playbook/v1')throw Error('Source campaign required');
 if(typeof searchAdapter?.search!=='function') return {status:'BLOCKED_SEARCH_PROVIDER_NOT_CONNECTED',competitors:[],
    queries:buildCompetitorQueries({campaign,market}),failures:['Connect a permitted provider for actual discovery']};
 const queries=buildCompetitorQueries({campaign,market});
 const seen=new Set(campaign.evidence.map(x=>domainOf(x.url)));
 const results=[],failures=[];
 for(const query of queries){
   let batch;
   try {batch=await searchAdapter.search({query,market,limit:Math.min(limit,8)});}
   catch(e){failures.push({query,reason:'search provider unavailable'});continue;}
   if(!Array.isArray(batch)){failures.push({query,reason:'search provider did not supply observations'});continue;}
   for(const row of batch.slice(0,12)){
     if(!safeSource(row,Date.parse(now())))continue;
     const domain=domainOf(row.url);
     if(seen.has(domain))continue;
     seen.add(domain);
     results.push({...row,domain});
     if(results.length>=limit)break;
   }
   if(results.length>=limit) break;
 }
 const competitors=[];
 for(const hit of results){
   try {
     const html=await fetchPublicHtml(hit.url,{allowedHosts:[new URL(hit.url).hostname],maxBytes:1100000});
     const doc=extractPublicPage(html,{url:hit.url,observedAt:now()});
     const relevance=scoreRelevance(campaign,doc,hit);
     competitors.push({id:'cmp-'+digest([hit.domain,hit.url]).slice(0,18),
       identity:{name:doc.structuredProduct?.brand||(doc.title.includes('|')?(doc.title.split('|').length>2?doc.title.split('|')[1].trim():doc.title.split('|').at(-1).trim()):hit.domain),
         domain:hit.domain,product:doc.structuredProduct?.name||doc.h1||doc.title,
         namingConfidence:doc.structuredProduct?.brand?'STRUCTURED_PAGE':'HEURISTIC'},
       relevance,competitiveRelationship:'HYPOTHESIS_NOT_VERIFIED_MARKET_SHARE',
       discoveryEvidence:{provider:hit.provider,providerResultId:hit.providerResultId,
         query:hit.query,title:hit.title,url:hit.url,observedAt:hit.observedAt},
       productEvidence:{source:doc.source,title:doc.title,description:doc.description,
         h1:doc.h1,claims:doc.verifiedStatements.slice(0,8)},
       adLibraryQueries:adLibrarySearchLinks(doc.structuredProduct?.brand||hit.title.split('|').at(-1)||hit.domain,market),
       observedAds:[],observedAdCount:0,advertisingPerformance:'UNKNOWN'});
   }catch {failures.push({url:hit.url,reason:'public competitor product page unavailable or unsafe'});}
 }
 competitors.sort((a,b)=>b.relevance.score-a.relevance.score || a.identity.domain.localeCompare(b.identity.domain));
 return {schema:'mvx-competitive-discovery/v1',
   status:competitors.length?'CANDIDATES_VERIFIED_PUBLIC_PAGES':'NO_VERIFIED_COMPETITOR_PAGES',
   generatedAt:now(),market,queries,competitors,failures,
   limitations:['Matching product language is not verified market share','No ads are observed solely by opening library search links',
     'No competitor creative is proven to convert without verified campaign performance']};
}
export function adLibrarySearchLinks(label,market='IT') {
 const q=String(label).slice(0,100).trim();
 if(!q)throw Error('Advertiser name required');
 const country=/^[A-Z]{2}$/.test(market)?market:'IT';
 const meta=new URL('https://www.facebook.com/ads/library/');
 meta.search=new URLSearchParams({active_status:'active',ad_type:'all',country,q,search_type:'keyword_unordered'}).toString();
 return [
  {platform:'meta',url:meta.toString(),status:'SEARCH_LINK_NOT_AN_OBSERVED_AD',access:'public UI; official API authorization required for programmatic EU retrieval'},
  {platform:'google',url:'https://adstransparency.google.com/',status:'SEARCH_LINK_NOT_AN_OBSERVED_AD',access:'search advertiser/site in official UI; no public bulk API assumed'},
  {platform:'tiktok',url:'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en',status:'SEARCH_LINK_NOT_AN_OBSERVED_AD',access:'curated Top Ads are not all ads and may require login'}
 ];
}
export function normalizeObservedAds({records,competitor,now=Date.now()}={}) {
 if(!competitor?.id||!Array.isArray(records))throw Error('Competitor and observation list required');
 const accepted=[],rejected=[],seen=new Set();
 for(const raw of records){
   const p=String(raw?.platform||'').toLowerCase();
   const observedAt=Date.parse(raw?.observedAt||'');
   const address=raw?.officialAdUrl;
   const sourceHost=validHttpUrl(address)?new URL(address).hostname.toLowerCase():'';
   const officialAllowed= p==='meta'?/(^|\.)(facebook|meta)\.com$/.test(sourceHost):
      p==='google'?sourceHost==='adstransparency.google.com':
      p==='tiktok'?sourceHost==='ads.tiktok.com':false;
   const evidence=raw?.evidence??{};
   if(!officialAllowed||!raw?.adId||!raw?.advertiser||
      !String(raw.advertiser).trim() ||!Number.isFinite(observedAt)||
      observedAt>now+60000 || now-observedAt>365*86400000||
      typeof evidence?.contentSha256!=='string'||!/^[a-f0-9]{64}$/i.test(evidence.contentSha256)||
      !evidence.observationRef||!['OFFICIAL_API','HUMAN_VERIFIED_SNAPSHOT'].includes(evidence.captureMode)||
      typeof raw?.creativeText!=='string' || !raw.creativeText.trim()){
     rejected.push({adId:raw?.adId||null,reason:'Invalid official URL, creative body, provenance or observation date'});continue;
   }
   const key=p+':'+raw.adId;if(seen.has(key)){rejected.push({adId:raw.adId,reason:'duplicate ID'});continue;}
   seen.add(key);
   accepted.push({platform:p,adId:String(raw.adId),advertiser:String(raw.advertiser),
      creativeText:String(raw.creativeText).slice(0,4000),officialAdUrl:address,
      observedAt:raw.observedAt,evidence,
      matchToCompetitor:'UNVERIFIED_ADVERTISER_IDENTITY',
      actualCtr:null,actualCvr:null,actualRoas:null,performanceVerdict:'NOT_INFERABLE_FROM_LIBRARY_PRESENCE'});
 }
 return {schema:'mvx-ad-observations/v1',competitorId:competitor.id,accepted,rejected};
}
export function assessCreativeDifferentiation(candidate,observations){
 if(typeof candidate!=='string'||!Array.isArray(observations))throw Error('Creative and observed ads required');
 const comparisons=observations.map(a=>{
   const p=textMatch(candidate,a.creativeText);
   return {adId:a.adId,platform:a.platform,overlap:p.score,sharedThemes:p.overlap,
     verdict:p.score>=0.6?'REVISE_TO_AVOID_IMITATION':p.score>=0.35?'DIFFERENTIATION_REVIEW':'LOW_LEXICAL_OVERLAP'};
 }).sort((a,b)=>b.overlap-a.overlap);
 return {status:comparisons.some(x=>x.verdict==='REVISE_TO_AVOID_IMITATION')?'REWRITE_RECOMMENDED':'NO_HIGH_LEXICAL_COLLISION_DETECTED',
   comparisons,limitations:'Lexical check is not trademark, image, rights or semantic originality clearance; review required'};
}

export function inferCategoryNeedsFromCompetitorMessaging(competitive){
 if(competitive?.schema!=='mvx-competitive-discovery/v1') throw Error('Verified competitor research required');
 const patterns=[
 {id:'foam_in_coffee',expression:/foam|froth|schium|barista|monta/i,
  hypothesis:'Some buyers may care about foam and suitability for coffee'},
 {id:'taste_creamy',expression:/creamy|cremos|gusto|taste|flavour|mouth.feel/i,
  hypothesis:'Texture and taste may drive choice'},
 {id:'ingredients',expression:/ingredient|gluten.free|lattosio|vegan|vegetal/i,
  hypothesis:'Understanding ingredients, preferences and suitability may matter'},
 {id:'value_price',expression:/price|prezzo|subscription|discount|sconto|spedizione/i,
  hypothesis:'Total cost and repeat purchase terms may matter'},
 {id:'availability_format',expression:/size|pack|1l|500ml|litre|delivery/i,
  hypothesis:'Package size and fulfilment suitability may matter'}];
 const findings=[];
 for(const p of patterns){
   const matches=(competitive.competitors||[]).flatMap(c=>{
     const e=c.productEvidence;
     const match=[e.description,e.h1,...(e.claims||[]).map(x=>x.statement)].join(' ');
     return p.expression.test(match)?[{competitorId:c.id,sourceId:e.source.sourceId,sourceUrl:e.source.url}]:[];
   });
   if(matches.length)findings.push({needHypothesisId:p.id,hypothesis:p.hypothesis,sourceContext:'COMPETITOR_MARKETING_ONLY',
     independentlyObservedCustomerPain:false,sourceCount:matches.length,
     evidence:matches,researchNextStep:'Interview target, verify priority and product fit'});
 }
 return {schema:'mvx-market-needs-hypotheses/v1',findings,
  warning:'Competitor marketing statements do not constitute actual customer pain or causal proof'};
}
