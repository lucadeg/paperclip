import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const domainOf=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}catch{return null;}};
function validCreativeText(value){return typeof value==='string'&&value.trim().length>=20;}
/* Authorized read-only aggregator adapter contract. Its 'score' and estimated
 * spend are platform/provider estimates, never measured conversion outcomes.
 * Exact domain attribution prevents full-text search false matches.
 */
export function validateAdKitCompetitorMatches({competitor,ads=[],verifiedAt=new Date().toISOString()}={}){
 if(!competitor?.identity?.domain||!Array.isArray(ads))throw Error('Verified competitor and ads array mandatory');
 const selected=[],rejected=[];
 const domain=competitor.identity.domain.replace(/^www\./,'').toLowerCase();
 for(const item of ads){
  const adDomain=domainOf(item?.advertiser?.website);
  if(!adDomain||adDomain!==domain){
   rejected.push({libraryAdId:item?._id||null,reason:'Advertiser domain does not match verified competitor'});
   continue;
  }
  if(!item?._id||!['meta','google','linkedin'].includes(item.platform)||
    domainOf(item.url)!=='app.adkit.so'){
   rejected.push({libraryAdId:item?._id||null,reason:'Invalid AdKit ad identity/source/platform'});
   continue;
  }
  selected.push({id:'adkit-'+hash(item._id).slice(0,20),
   libraryAdId:item._id,advertiser:item.advertiser?.name||domain,
   verifiedAdvertiserDomain:domain,competitorId:competitor.id,
   platform:item.platform,libraryUrl:item.url,
   providerScore:Number.isFinite(item.score)?item.score:null,
   estimatedSpendRange:item.estimatedSpend||null,
   timing:{start:item.startDate||null,end:item.endDate||null},
   observedAt:verifiedAt,sourceProvider:'AdKit Library',
   contentEvidenceStatus:'REQUIRES_INDIVIDUAL_CREATIVE_GET_AND_SOURCE_REFERENCE',
   conversionPerformance:'NOT_VERIFIED',isWinningAd:false,
   permission:'read-only competitor research'});
 }
 return {status:selected.length?'MATCHED_LIBRARY_ADS_NEED_CREATIVE_PROVENANCE':'NO_VERIFIED_MATCHES',
  competitorId:competitor.id,selected,rejected,
  limitations:['Full-text search may return ads from unrelated advertisers',
   'Aggregator performance scores and estimated spend are not controlled ROI',
   'Ad creative and observed official advertiser need independent verification']};
}
export async function searchAdKitCompetitor({competitor,adKitAdapter,limit=12}={}){
 if(typeof adKitAdapter?.searchAds!=='function')return {status:'BLOCKED_ADKIT_CONNECTOR_MISSING',
  selected:[],rejected:[]};
 let raw;
 try{raw=await adKitAdapter.searchAds({query:competitor.identity.name,limit});}
 catch{return {status:'BLOCKED_ADKIT_UNAVAILABLE',selected:[],rejected:[]};}
 if(!Array.isArray(raw))return {status:'BLOCKED_INVALID_LIBRARY_RESPONSE',selected:[],rejected:[]};
 return validateAdKitCompetitorMatches({competitor,ads:raw.slice(0,Math.min(limit,20))});
}
export function proposeCreativeEvidenceChecklist(records){
 return (records?.selected||[]).map(x=>({libraryAdId:x.libraryAdId,
  action:'fetch full ad via connected library get or manually verify official library',
  required:['dated advertiser identity','creative body and/or authorized media reference',
   'official ad source or reputable aggregator provenance','marketing/legal/IP review',
   'experiment validation before winner claims'],
  performanceProven:false}));
}
