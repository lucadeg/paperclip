import {createHmac,timingSafeEqual} from 'node:crypto';

const text=x=>String(x??'');
function token(secret,payload){return createHmac('sha256',secret).update(payload).digest('hex').slice(0,32);}
const validAmount=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function validatePartnerProgram(program){
  const errors=[];
  if(!program?.merchantApproved||!program.programId||!program.tenantId||!program.companyId)
    errors.push('merchant authority and tenant-bound program mandatory');
  if(!program?.currency||program.currency!=='EUR') errors.push('only explicit EUR program supported');
  if(!program?.privacyReviewed||!program?.termsApproved) errors.push('legal/privacy and terms review pending');
  if(!program?.landingBase) errors.push('merchant-owned landing origin required');
  else {
    try{const url=new URL(program.landingBase);
      if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||
        url.pathname!=='/'|| !program.allowedLandingHosts?.includes(url.hostname))
        errors.push('landing must be authorized HTTPS merchant root');
    }catch{errors.push('invalid landing origin');}
  }
  if(!validAmount(program.commissionRate)||program.commissionRate>0.3)
    errors.push('bounded commission rate 0-0.30 mandatory');
  if(!Number.isInteger(program.attributionDays)||program.attributionDays<1||program.attributionDays>90)
    errors.push('attribution days must be 1-90');
  if(!validAmount(program.maximumCommissionNet))
    errors.push('gross commission liability ceiling required');
  return errors;
}
export function issueAffiliateLink(program,{affiliateId,productPath,secret,affiliateApproved}={}){
  const errors=validatePartnerProgram(program);
  if(!affiliateApproved||!affiliateId||!/^[a-z0-9_-]{4,70}$/i.test(affiliateId)) errors.push('verified affiliate enrollment required');
  if(typeof secret!=='string'||secret.length<24) errors.push('server-side HMAC secret required');
  if(typeof productPath!=='string'||!/^\/[a-z0-9/_-]*$/i.test(productPath)||productPath.includes('//'))
    errors.push('safe product path required');
  if(errors.length)return {status:'BLOCKED',errors};
  const url=new URL(productPath,program.landingBase);
  const signature=token(secret,[program.tenantId,program.programId,affiliateId,productPath].join('|'));
  url.searchParams.set('mvx_ref',affiliateId);
  url.searchParams.set('mvx_program',program.programId);
  url.searchParams.set('mvx_sig',signature);
  return {status:'LINK_READY_NOT_PUBLISHED',url:url.toString(),programId:program.programId,
    affiliateId,trackingDisclaimer:'Affiliate disclosure, attribution permission and campaign approval required'};
}
export function verifyAffiliateLink(program,{affiliateId,productPath,signature,secret}={}) {
  if(validatePartnerProgram(program).length||typeof signature!=='string'||!/^[a-f0-9]{32}$/i.test(signature)||
    typeof secret!=='string'||secret.length<24)return false;
  const expected=token(secret,[program.tenantId,program.programId,affiliateId,productPath].join('|'));
  return timingSafeEqual(Buffer.from(expected),Buffer.from(signature));
}
export async function proposeCommission(program,order,attribution,{verifyWithTier1}={}){
  const errors=validatePartnerProgram(program);
  if(!order||order.tenantId!==program.tenantId||order.companyId!==program.companyId)
    errors.push('cross tenant/order scope mismatch');
  if(!order?.signedProviderProof||!order?.settled||!order?.orderId)
    errors.push('settled signed-order proof required');
  if(!order?.currency||order.currency!=='EUR') errors.push('order currency not EUR');
  if(!validAmount(order?.salesGross)||!validAmount(order?.refundsGross)||
    !validAmount(order?.vatRate)||order.vatRate>1||order.refundsGross>order.salesGross)
    errors.push('invalid gross sales/refunds/VAT');
  if(!attribution?.consentRecorded||!attribution?.affiliateId||!attribution?.occurredAt||
    !attribution?.signedAttributionProof) errors.push('verified consentful signed attribution required');
  if(order?.buyerHash&&attribution?.referrerHash===order?.buyerHash)
    errors.push('self-referral not payable');
  if(attribution?.duplicate||attribution?.fraudRiskHigh||order?.chargeback)
    errors.push('fraud/duplicate/chargeback hold');
  if(order?.settledAt&&attribution?.occurredAt&&
    (Date.parse(attribution.occurredAt)>Date.parse(order.settledAt) ||
    Date.parse(order.settledAt)-Date.parse(attribution.occurredAt)>program.attributionDays*86400000))
    errors.push('invalid attribution window');
  if(typeof verifyWithTier1!=='function') errors.push('trusted Tier 1 finance and attribution verification unavailable');
  if(errors.length)return {status:'BLOCKED',errors};
  let proof=false;
  try{proof=await verifyWithTier1({program,order,attribution})===true;}catch{proof=false;}
  if(!proof)return {status:'BLOCKED',errors:['Tier 1 order/attribution evidence not verified']};
  const netOrder=(order.salesGross-order.refundsGross)/(1+order.vatRate);
  const commissionNet=Math.min(netOrder*program.commissionRate,program.maximumCommissionNet);
  return {status:'PAYABLE_PROPOSAL_ONLY',orderId:order.orderId,affiliateId:attribution.affiliateId,
    orderRevenueNet:netOrder,proposedCommissionNet:commissionNet,
    commissionVat: 'REQUIRES_TAX_STATUS',cashPayoutGross:null,
    warnings:['Finance must reconcile per-affiliate cumulative cap, withholding, IVA treatment and reversals',
      'Unique orderId enforceable only in durable Tier 1 ledger'],approvedForPayout:false};
}
export function designReferralContract({merchantApproved,legalReviewed,rewardGross,capGross,consentFlow,referrerEligibility}={}){
  const errors=[];
  if(!merchantApproved||!legalReviewed) errors.push('merchant and legal approval mandatory');
  if(!validAmount(rewardGross)||!validAmount(capGross)||rewardGross>capGross)
    errors.push('bounded funded gross reward required');
  if(consentFlow!=='explicit_opt_in') errors.push('no automatic unsolicited invites');
  if(referrerEligibility!=='verified_existing_customer') errors.push('proof of prior customer relationship required');
  return errors.length?{status:'BLOCKED',errors}:{status:'DRAFT_CONTRACT_REQUIRES_LEDGER',
    rewardGross,capGross,currency:'EUR',antiFraud:['signed referral codes','no self-referral','single new customer',
      'no chargebacks','refund clawback','per-user cumulative cap'],
    externalPayoutAuthorized:false};
}
