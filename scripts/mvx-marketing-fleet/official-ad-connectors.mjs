import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export async function metaEuAdObservations({advertiser,country='IT',accessToken,apiVersion='v24.0',
  fetchImpl=fetch,now=()=>new Date().toISOString()}={}) {
 if(!advertiser||!/^[A-Z]{2}$/.test(country))return {status:'INVALID_QUERY',observations:[],errors:['Advertiser and ISO region required']};
 if(typeof accessToken!=='string'||accessToken.length<20)
   return {status:'BLOCKED_AD_LIBRARY_CREDENTIALS',observations:[],errors:['Meta Ad Library EU API access must be configured']};
 if(!/^v\d{1,2}\.\d{1,2}$/.test(apiVersion))throw Error('Invalid API version');
 const url=new URL('https://graph.facebook.com/'+apiVersion+'/ads_archive');
 url.searchParams.set('search_terms',String(advertiser).slice(0,100));
 url.searchParams.set('ad_type','ALL');
 url.searchParams.set('ad_reached_countries',JSON.stringify([country]));
 url.searchParams.set('ad_active_status','ACTIVE');
 url.searchParams.set('fields','id,page_name,page_id,ad_creative_bodies,ad_snapshot_url,ad_delivery_start_time,ad_delivery_stop_time');
 url.searchParams.set('limit','20');
 let response;
 try {
   response=await fetchImpl(url.toString(),{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},
     redirect:'manual',signal:AbortSignal.timeout(10000)});
 } catch{return {status:'BLOCKED_AD_LIBRARY_UNAVAILABLE',observations:[],errors:['Authorized Meta API unreachable']}};
 if(response.status>=300&&response.status<400)return {status:'BLOCKED_AD_LIBRARY_REDIRECT',observations:[],errors:['Redirect forbidden']};
 if(!response.ok)return {status:'BLOCKED_AD_LIBRARY_PROVIDER',observations:[],
   errors:['Meta API returned status '+response.status+' (permissions, region or rate limit)']};
 let raw;
 try {raw=await response.text();if(raw.length>240000)throw Error('Oversized response');}
 catch{return {status:'BLOCKED_AD_LIBRARY_RESPONSE',observations:[],errors:['Oversized/unreadable API response']}};
 let body;
 try{body=JSON.parse(raw)}catch{return {status:'BLOCKED_AD_LIBRARY_RESPONSE',observations:[],errors:['Invalid provider response']}};
 if(!Array.isArray(body.data))return {status:'BLOCKED_AD_LIBRARY_RESPONSE',observations:[],errors:['No observations array']};
 const obtainedAt=now(),responseDigest=hash(raw);
 const observations=body.data.slice(0,20).filter(a=>
    a?.id && a.page_name && Array.isArray(a.ad_creative_bodies)&&a.ad_creative_bodies.some(Boolean)&&
    typeof a.ad_snapshot_url==='string'&&
    /^https:\/\/(www\.)?facebook\.com\//i.test(a.ad_snapshot_url)&&
    validDate(a.ad_delivery_start_time)
 ).map(a=>({
   platform:'meta',adId:String(a.id),advertiser:String(a.page_name),
   creativeText:a.ad_creative_bodies.join(' ').slice(0,4000),
   officialAdUrl:a.ad_snapshot_url,observedAt:obtainedAt,
   sourceDeliveryStartAt:a.ad_delivery_start_time,sourceDeliveryStopAt:a.ad_delivery_stop_time??null,
   evidence:{observationRef:'meta-api:'+a.id,captureMode:'OFFICIAL_API',
     contentSha256:responseDigest,provider:'Meta Ad Library EU',
     requestScope:{country,advertiser,ad_type:'ALL',active_status:'ACTIVE'}}}));
 return {status:'OFFICIAL_API_OBSERVATIONS',observations,errors:[],
   warnings:['API observations do not include verified ROAS/CTR/sales lift',
     'Not every advert is included/visible; limits and access depend on jurisdiction and permissions',
     'Advertiser text match must be independently reconciled with brand identity'],
   providerPageCount:1,hasUnfetchedMore:Boolean(body.paging?.next),
   rawProviderHash:responseDigest};
}
export function adLibraryProviderMatrix() {
 return [
 {platform:'meta',interface:'Meta Ad Library EU API',mode:'AUTHENTICATED_API',
   support:'all ad types delivered to EU/UK within supported period subject to permissions',
   readiness:'REQUIRES_META_AUTH_AND_PROVIDER_POLICY'},
 {platform:'google',interface:'Ads Transparency Center',mode:'PUBLIC_UI',
   support:'advertiser search and public ad transparency; no unsanctioned scraping',
   readiness:'MANUAL_CAPTURE_OR_LICENSED_PROVIDER_REQUIRED'},
 {platform:'tiktok',interface:'Creative Center Top Ads',mode:'CURATED_PUBLIC_UI',
   support:'authorized curated ads only, not full universe',
   readiness:'AUTHORIZED_ACCESS_OR_MANUAL_VERIFIED_OBSERVATIONS_REQUIRED'}
 ];
}
