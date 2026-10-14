import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {extractPublicPage} from './brand-intake.mjs';
import {createCampaignPlan} from './campaign-factory.mjs';
import {makeBraveWebSearchAdapter,makeSeededResearchAdapter} from './search-provider.mjs';
import {buildCompetitorQueries,discoverCompetitors,adLibrarySearchLinks,normalizeObservedAds,
  inferCategoryNeedsFromCompetitorMessaging,assessCreativeDifferentiation} from './competitive-intelligence.mjs';
import {metaEuAdObservations,adLibraryProviderMatrix} from './official-ad-connectors.mjs';
import {collectVoiceOfCustomer,mapNeedsToSolutions,critiqueFullCampaign,
  proposeDifferentiatedConcepts} from './redteam-needs.mjs';
import {performCompetitiveAudit} from './run-competitive-audit.mjs';

const date=new Date().toISOString(),today=Date.now();
const oatly='https://www.oatly.com/products/oat-drink/oat-drink-barista-edition-1l';
const alpro='https://www.alpro.com/it/prodotti/bevande/barista-avena';
const minor='https://minorfigures.com/products/barista-oat';
const html=(title,h1,description)=>`<!DOCTYPE html><html><head><title>${title}</title><meta name="description" content="${description}"></head>
<body><h1>${h1}</h1><h2>Barista coffee</h2><main>This is a product description for coffee use.</main></body></html>`;
const liveMock={
  [alpro]:html('Barista Avena | Alpro','Barista Avena','Bevanda di avena schiumabile per caffè e cappuccino, gusto delicato'),
  [minor]:html('BARISTA OAT | MINOR FIGURES | Coffee Drink','BARISTA OAT','Barista oat drink for coffee with smooth foam and texture')
};
const page=extractPublicPage(html('Oatly Oat Drink Barista Edition | Oatly',
  'Oat Drink Barista Edition','Barista oat drink for coffee, creamy and foamable'),{url:oatly,observedAt:date});
const capture={schema:'mvx-brand-capture/v1',status:'SOURCE_ACQUIRED',pages:[page],sources:[page.source]};
const target={label:'adulti con routine caffè',need:'scegliere una bevanda avena adatta al caffè',
  market:'IT',language:'it'};
const campaign=createCampaignPlan({capture,target,channels:['instagram','facebook']});
const seeds=[
 {url:alpro,title:'Barista Avena | Alpro',description:'Bevanda di avena schiumabile'},
 {url:minor,title:'BARISTA OAT | MINOR FIGURES | Coffee Drink',description:'Barista oat for coffee'}];
const adapter=makeSeededResearchAdapter({seeds,now:()=>date});
async function discovery(){return discoverCompetitors({campaign,searchAdapter:adapter,now:()=>date,
  fetchPublicHtml:async url=>liveMock[url]??(()=>{throw Error('unknown URL')})()});}
const metaRaw={data:[{id:'123456789012345',page_name:'Alpro',page_id:'partner-page-id',
  ad_creative_bodies:['Caffè a casa? Prova un drink di avena schiumabile e cremoso.'],
  ad_snapshot_url:'https://www.facebook.com/ads/archive/render_ad/?id=123456789012345',
  ad_delivery_start_time:'2026-10-01',ad_delivery_stop_time:null}],paging:{next:'unfetched-page'}};
test('automatic competitor query generation derives source product and target job',()=>{
 const q=buildCompetitorQueries({campaign,market:'IT'});
 assert.ok(q.length>=3);assert.ok(q[0].includes('IT'));
 assert.ok(q.some(x=>/coffee|caffè|oat|drink/i.test(x)));
});
test('without permitted search provider competitor discovery is explicitly blocked',async()=>{
 const x=await discoverCompetitors({campaign});
 assert.equal(x.status,'BLOCKED_SEARCH_PROVIDER_NOT_CONNECTED');assert.equal(x.competitors.length,0);
});
test('source-cited search replay auto-verifies competitors from actual product HTML',async()=>{
 const x=await discovery();
 assert.equal(x.competitors.length,2);
 assert.equal(x.competitors[0].identity.name,'Alpro');
 assert.ok(x.competitors.some(c=>c.identity.name==='MINOR FIGURES'));
 assert.ok(x.competitors.every(c=>c.productEvidence.source.sha256&&c.discoveryEvidence.providerResultId));
 assert.ok(x.competitors.every(c=>c.advertisingPerformance==='UNKNOWN'));
 assert.equal(x.competitors[0].observedAdCount,0);
});
test('rejects tampered search observations, self URLs and nonpublic websites',async()=>{
 const provider={search:async({query})=>[
  {url:oatly,title:'Self site',provider:'faux',providerResultId:'r1',query,observedAt:date},
  {url:'http://localhost/admin',title:'Local',provider:'faux',providerResultId:'r2',query,observedAt:date},
  {url:'https://user:pass@example.org/a',title:'Credentials',provider:'faux',providerResultId:'r3',query,observedAt:date},
  {url:'https://malware.example.invalid',title:'Future',provider:'faux',providerResultId:'r4',query,observedAt:'2035-01-01'}]};
 const x=await discoverCompetitors({campaign,searchAdapter:provider});
 assert.equal(x.competitors.length,0);
});
test('search result deduplication prevents fake competitor multiplication',async()=>{
 const provider={search:async({query})=>[
  {url:alpro,title:'Alpro',provider:'source',providerResultId:'x',query,observedAt:date},
  {url:alpro,title:'Alpro again',provider:'source',providerResultId:'y',query,observedAt:date}]};
 const x=await discoverCompetitors({campaign,searchAdapter:provider,
  fetchPublicHtml:async()=>liveMock[alpro]});
 assert.equal(x.competitors.length,1);
});
test('category pains from rival messaging are explicitly hypotheses, not real customer reviews',async()=>{
 const x=inferCategoryNeedsFromCompetitorMessaging(await discovery());
 assert.equal(x.schema,'mvx-market-needs-hypotheses/v1');
 assert.ok(x.findings.some(n=>n.needHypothesisId==='foam_in_coffee'));
 assert.ok(x.findings.every(n=>n.independentlyObservedCustomerPain===false));
});
test('Meta, Google, TikTok official links do not masquerade as live ad observations',()=>{
 const urls=adLibrarySearchLinks('Alpro','IT');
 assert.equal(urls.length,3);assert.ok(urls.every(x=>x.status==='SEARCH_LINK_NOT_AN_OBSERVED_AD'));
 assert.ok(urls.find(x=>x.platform==='meta').url.includes('country=IT'));
 assert.equal(adLibraryProviderMatrix().length,3);
});
test('Meta EU official API requires credentials; never substitutes mocked ads',async()=>{
 const x=await metaEuAdObservations({advertiser:'Alpro'});
 assert.equal(x.status,'BLOCKED_AD_LIBRARY_CREDENTIALS');assert.equal(x.observations.length,0);
});
test('Meta EU permitted API response preserves ad identity, snapshots and source hash without leaking token',async()=>{
 let requested,options;
 const fakeToken='this-is-a-fake-token-with-no-valid-access';
 const x=await metaEuAdObservations({advertiser:'Alpro',accessToken:fakeToken,now:()=>date,
  fetchImpl:async (url,opts)=>{requested=url;options=opts;return new Response(JSON.stringify(metaRaw),
    {status:200,headers:{'content-type':'application/json'}});}});
 assert.equal(x.status,'OFFICIAL_API_OBSERVATIONS');
 assert.equal(x.observations.length,1);assert.equal(x.observations[0].adId,metaRaw.data[0].id);
 assert.equal(x.observations[0].creativeText,metaRaw.data[0].ad_creative_bodies[0]);
 assert.equal(x.hasUnfetchedMore,true);
 assert.equal(new URL(requested).hostname,'graph.facebook.com');
 assert.equal(new URL(requested).searchParams.get('access_token'),null);
 assert.equal(options.headers.Authorization,'Bearer '+fakeToken);
 assert.ok(!JSON.stringify(x).includes(fakeToken));
});
test('Meta API redirects or bad status fail closed',async()=>{
 const r=await metaEuAdObservations({advertiser:'Alpro',accessToken:'fake-token-1234567890123456',
  fetchImpl:async()=>new Response('no',{status:403})});
 assert.equal(r.status,'BLOCKED_AD_LIBRARY_PROVIDER');
 const x=await metaEuAdObservations({advertiser:'Alpro',accessToken:'fake-token-1234567890123456',
  fetchImpl:async()=>new Response('',{status:302,headers:{location:'http://127.0.0.1/'}})});
 assert.equal(x.status,'BLOCKED_AD_LIBRARY_REDIRECT');
});
test('observation registry rejects invented ad IDs, unsupported domain and missing snapshot digests',async()=>{
 const competitor=(await discovery()).competitors[0],sourceHash='d'.repeat(64);
 const base={platform:'meta',adId:'123',advertiser:'Alpro',
  creativeText:'Oat latte foam and creamy coffee',officialAdUrl:'https://www.facebook.com/ads/archive/render_ad/?id=123',
  observedAt:date,evidence:{observationRef:'meta:123',captureMode:'OFFICIAL_API',contentSha256:sourceHash}};
 const x=normalizeObservedAds({competitor,records:[base,base,{...base,adId:'456',officialAdUrl:'https://fake-ads.example/ad'},
   {...base,adId:'789',evidence:{...base.evidence,contentSha256:'false'}}]});
 assert.equal(x.accepted.length,1);assert.equal(x.rejected.length,3);
 assert.equal(x.accepted[0].actualRoas,null);assert.equal(x.accepted[0].performanceVerdict,'NOT_INFERABLE_FROM_LIBRARY_PRESENCE');
});
test('high lexical similarity to a real observed ad prompts rewriting rather than copycat marketing',()=>{
 const ad={adId:'123',platform:'meta',creativeText:'Foamable creamy oat coffee drink for your daily cappuccino'};
 const a=assessCreativeDifferentiation('Foamable creamy oat coffee drink for your daily cappuccino',[ad]);
 assert.equal(a.status,'REWRITE_RECOMMENDED');assert.equal(a.comparisons[0].adId,'123');
 const b=assessCreativeDifferentiation('A question about choosing your coffee routine',[ad]);
 assert.equal(b.status,'NO_HIGH_LEXICAL_COLLISION_DETECTED');
});
const interview=(id,text,overrides={})=>({type:'interview',consentForResearch:true,
  observationId:id,sourceId:'user-interview-'+id,sourceUrl:'https://research.example.org/consent/'+id,
  observedAt:date,text,...overrides});
test('customer voice rejects unsourced scraped reviews and consentless interviews',()=>{
 const v=collectVoiceOfCustomer({target,observations:[
  interview('i1','Non riesco a montare la schiuma nel cappuccino',{consentForResearch:false}),
  {type:'public_review',observationId:'pub1',sourceId:'reddit-not-approved',sourceUrl:'https://example.com/',
    text:'I think it tastes watery',observedAt:date,publicReproductionPermitted:false}
 ]});
 assert.equal(v.observations.length,0);assert.equal(v.rejected.length,2);
 assert.equal(v.status,'NO_CUSTOMER_VOICE_EVIDENCE');
});
test('authorized qualitative customer voice preserves provenance and redacts email',()=>{
 const v=collectVoiceOfCustomer({target,observations:[
  interview('i1','La schiuma del cappuccino non mi soddisfa, mail user@example.org'),
  interview('i2','Quanto costa spedire questo prodotto?'),
  interview('i3','La bevanda mi sembra troppo acquosa, sapore scarso')]});
 assert.equal(v.observations.length,3);
 assert.ok(v.pains.some(x=>x.painId==='coffee_foam'));
 assert.ok(v.observations[0].quotation.includes('[redacted-email]'));
 assert.ok(v.pains.every(x=>x.confidence==='INSUFFICIENT_TO_INFER_PREVALENCE'));
});
test('need-solution fit uses only source product attributes and marks unsupported pain gaps',()=>{
 const voice=collectVoiceOfCustomer({target,observations:[
  interview('i1','Non so se fa schiuma nel caffè'),
  interview('i2','Non so quanto costa consegna e spese di spedizione')]});
 const mapping=mapNeedsToSolutions({campaign,voice});
 assert.ok(mapping.some(x=>x.painId==='coffee_foam'&&x.fitVerdict==='POTENTIAL_FIT_NEEDS_USER_TEST'));
 assert.ok(mapping.some(x=>x.painId==='price_total'&&x.fitVerdict==='UNVERIFIED_GAP'));
 assert.ok(mapping.every(x=>x.validateWith.length>=3));
});
test('critic panel emits specialized offer, audience and ad-evidence findings',async()=>{
 const competitive=await discovery();
 const report=critiqueFullCampaign({campaign,competitive,now:today});
 assert.equal(report.postsReviewed,campaign.posts.length);
 assert.ok(report.findings.some(x=>x.owner==='offer-terms-auditor'));
 assert.ok(report.findings.some(x=>x.owner==='ad-library-intelligence-analyst'));
 assert.ok(report.findings.some(x=>x.owner==='audience-voice-researcher'));
 assert.equal(report.executionAuthorized,false);
 assert.equal(report.statisticalWinnerDeclared,false);
});
test('critic fail-closed on unsupported cures in a generated post',async()=>{
 const competitive=await discovery();
 const broken=structuredClone(campaign);
 broken.posts[0].caption='Guaranteed cancer cure + 99% DISCOUNT. Buy today!';
 const report=critiqueFullCampaign({campaign:broken,competitive});
 assert.equal(report.releaseVerdict,'BLOCKED_NEEDS_FIX');
 assert.ok(report.findings.some(x=>x.owner==='communication-redteam'&&x.severity==='BLOCKER'));
});
test('competitor ad copy collision triggers creative originality critic',async()=>{
 const competitive=await discovery(),competitor=competitive.competitors[0];
 const ads=normalizeObservedAds({competitor,records:[{
  platform:'meta',adId:'123',advertiser:'Alpro',creativeText:campaign.posts[0].caption,
  officialAdUrl:'https://www.facebook.com/ads/archive/render_ad/?id=123',observedAt:date,
  evidence:{observationRef:'meta-snapshot:123',captureMode:'OFFICIAL_API',contentSha256:'d'.repeat(64)}
 }]});
 const report=critiqueFullCampaign({campaign,competitive,adObservations:ads.accepted});
 assert.ok(report.findings.some(x=>x.owner==='creative-originality-critic'));
 assert.equal(report.observedAdCount,1);
});
test('differentiated concept factory keeps source references and no fake winning claims',async()=>{
 const redteam=critiqueFullCampaign({campaign,competitive:await discovery()});
 const concepts=proposeDifferentiatedConcepts({campaign,redteam});
 assert.equal(concepts.length,4);
 assert.ok(concepts.every(x=>x.sourceId===campaign.products.at(-1).sourceId));
 assert.ok(concepts.every(x=>x.paidPlacementAllowed===false&&!x.bestPerformingClaim));
});
test('Brave authorized query adapter accepts verified API JSON, no secret in outputs',async()=>{
 const a=makeBraveWebSearchAdapter({apiKey:'example-no-real-key-0123456789',
  fetchImpl:async()=>new Response(JSON.stringify({web:{results:[{url:alpro,title:'Alpro barista'}]}}),
    {status:200}),now:()=>date});
 const matches=await a.search({query:'oat drink coffee alternatives',market:'IT'});
 assert.equal(matches.length,1);assert.equal(matches[0].provider,'brave-search-api');
 assert.equal(makeBraveWebSearchAdapter({apiKey:''}),null);
 assert.ok(!JSON.stringify(matches).includes('example-no-real-key'));
});
test('end-to-end competitor audit with permitted public seeds has no invented ads or persona research',async()=>{
 const x=await performCompetitiveAudit({clientId:'example-demo',target},
  {acquireClient:async()=>({clientId:'example-demo',companyId:'c',tenantId:'t',campaign}),
    searchAdapter:adapter,metaAdApi:async()=>({status:'BLOCKED_AD_LIBRARY_CREDENTIALS',observations:[]})});
 assert.equal(x.competitive.competitors.length,2);
 assert.equal(x.observedAds.length,0);assert.equal(x.voiceOfCustomer.observations.length,0);
 assert.equal(x.technicalGates.approvedForPublications,false);
 assert.equal(x.originalConcepts.length,4);
 assert.ok(x.redteam.findings.length>=4);
});

import {searchAdKitCompetitor,validateAdKitCompetitorMatches,
  proposeCreativeEvidenceChecklist} from './adkit-competitor-adapter.mjs';
test('ad aggregator keyword matches unrelated advertiser are rejected by exact verified domain',async()=>{
 const competitor=(await discovery()).competitors[0];
 const irrelevant=[{_id:'ad-foo',advertiser:{name:'Unrelated',website:'https://other.example'},
   url:'https://app.adkit.so/advertisers/other/ads/ad-foo',platform:'meta',score:95,
   estimatedSpend:{min:100000,max:500000}}];
 const result=validateAdKitCompetitorMatches({competitor,ads:irrelevant});
 assert.equal(result.status,'NO_VERIFIED_MATCHES');
 assert.equal(result.selected.length,0);assert.equal(result.rejected.length,1);
});
test('matched ads in aggregator are research candidates not verified winning ads',async()=>{
 const competitor=(await discovery()).competitors[0];
 const result=validateAdKitCompetitorMatches({competitor,ads:[{
   _id:'adkit-creative-123',platform:'meta',
   url:'https://app.adkit.so/advertisers/foo/ads/adkit-creative-123',
   advertiser:{name:'Alpro',website:'https://www.alpro.com'},
   score:80,estimatedSpend:{min:3000,max:9000},startDate:'2026-10-01'
 }]});
 assert.equal(result.selected.length,1);
 assert.equal(result.selected[0].isWinningAd,false);
 assert.equal(result.selected[0].conversionPerformance,'NOT_VERIFIED');
 assert.equal(proposeCreativeEvidenceChecklist(result).length,1);
});
test('ad aggregator without connected source is explicitly blocked',async()=>{
 const competitor=(await discovery()).competitors[0];
 const out=await searchAdKitCompetitor({competitor});
 assert.equal(out.status,'BLOCKED_ADKIT_CONNECTOR_MISSING');
 assert.equal(out.selected.length,0);
});
test('ad aggregator runtime search returns only verified advertiser matches',async()=>{
 const competitor=(await discovery()).competitors[0];
 const result=await searchAdKitCompetitor({competitor,adKitAdapter:{
   searchAds:async()=>[
    {_id:'ad-alpro-1',platform:'meta',url:'https://app.adkit.so/ads/ad-alpro-1',
      advertiser:{name:'Alpro',website:'https://alpro.com'},score:77},
    {_id:'ad-other',platform:'meta',url:'https://app.adkit.so/ads/ad-other',
      advertiser:{name:'Another Brand',website:'https://other.example'},score:100}]
 }});
 assert.equal(result.selected.length,1);assert.equal(result.rejected.length,1);
});
