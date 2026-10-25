import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex').slice(0,20);
export function makeBraveWebSearchAdapter({apiKey,fetchImpl=fetch,now=()=>new Date().toISOString()}={}) {
 if(typeof apiKey!=='string'||apiKey.length<20)return null;
 return {
  provider:'brave-search-api',
  async search({query,market='IT',limit=8}={}){
   if(!query||!market||!/^[A-Z]{2}$/.test(market))throw Error('Invalid search query');
   const url=new URL('https://api.search.brave.com/res/v1/web/search');
   url.searchParams.set('q',String(query).slice(0,200));
   url.searchParams.set('country',market);url.searchParams.set('count',String(Math.min(8,Math.max(1,limit))));
   const response=await fetchImpl(url.toString(),{headers:{
      'X-Subscription-Token':apiKey,'Accept':'application/json'
    },redirect:'manual',signal:AbortSignal.timeout(9500)});
   if(response.status!==200)throw Error('Search provider status '+response.status);
   const text=await response.text();if(text.length>250000)throw Error('Search response oversized');
   const json=JSON.parse(text),items=json?.web?.results;
   if(!Array.isArray(items))throw Error('Missing search results from provider');
   return items.slice(0,limit).filter(x=>x.url&&x.title).map((x,rank)=>({
     provider:'brave-search-api',providerResultId:'brave-'+hash(x.url+'|'+query),
     query,rank:rank+1,title:String(x.title).slice(0,240),
     description:String(x.description||'').slice(0,420),url:x.url,
     observedAt:now(),sourceAuthority:'SEARCH_INDEX_RESULT_UNVERIFIED_BRAND_IDENTITY'
   }));
  }
 };
}
/* Operator-provided, dated public search observations are replay fixtures,
 * NOT an automatic web search provider. Used solely for verification demos.
 */
export function makeSeededResearchAdapter({seeds,now=()=>new Date().toISOString()}={}){
 if(!Array.isArray(seeds))throw Error('Seed observations array required');
 return {provider:'manual-research-fixture',
  async search({query,limit=8}={}){
   return seeds.slice(0,limit).map((s,rank)=>({
      provider:'manual-research-fixture',
      providerResultId:'curated-'+hash(s.url),url:s.url,title:s.title,
      description:s.description||'',rank:rank+1,query,
      observedAt:now(),sourceAuthority:'OPERATOR_CURATED_SEARCH_REFERENCE_NOT_LIVE_SERP'
   }));
  }
 };
}
