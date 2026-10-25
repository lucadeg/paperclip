import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

const sha=v=>createHash('sha256').update(String(v)).digest('hex');
export function signInteraction(secret,rawBody,timestamp) {
  return 'sha256='+createHmac('sha256',secret).update(String(timestamp)+'.'+rawBody).digest('hex');
}
export function verifyInteraction(secret,rawBody,timestamp,signature,now=Date.now()) {
  if(typeof secret!=='string'||secret.length<20) return false;
  if(!/^\d+$/.test(String(timestamp)) || Math.abs(now-Number(timestamp))>300000) return false;
  if(typeof signature!=='string'||!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected=Buffer.from(signInteraction(secret,rawBody,timestamp));
  const actual=Buffer.from(signature);
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export class MemoryInteractionLedger {
  constructor(){this.items=new Map();this.pending=new Set();}
  get(id){return this.items.get(id);}
  claim(id){if(this.items.has(id)||this.pending.has(id))return false;this.pending.add(id);return true;}
  finish(id,value){this.pending.delete(id);this.items.set(id,value);}
  fail(id){this.pending.delete(id);}
}
export function makeInteractionEngine({secret,tenantId,companyId,asset,provider,authorize,ledger=new MemoryInteractionLedger(),
  now=()=>Date.now()}={}) {
  if(!secret||!tenantId||!companyId||!asset?.id||asset.status!=='APPROVED'||!asset.content)
    throw new Error('Approved lead magnet and tenant-scoped runtime configuration required');
  if(typeof authorize!=='function'||typeof provider?.sendPrivateMessage!=='function')
    throw new Error('Trusted policy authorization and provider adapter required');
  return {
    async handle({rawBody,headers}) {
      const timestamp=headers?.['x-mvx-timestamp'],sig=headers?.['x-mvx-signature'];
      if(typeof rawBody!=='string'||rawBody.length>16000 || !verifyInteraction(secret,rawBody,timestamp,sig,now()))
        return {status:'REJECTED',reason:'invalid signature, timestamp or payload'};
      let body;
      try{body=JSON.parse(rawBody);}catch{return {status:'REJECTED',reason:'invalid JSON'};}
      if(!body?.eventId||!body?.threadId||!body?.userId||
        body.tenantId!==tenantId||body.companyId!==companyId||
        !['comment','dm'].includes(body.channel))
        return {status:'REJECTED',reason:'event scope or schema invalid'};
      const found=ledger.get(body.eventId);if(found) return {...found,duplicate:true};
      if(!ledger.claim(body.eventId)) return {status:'IN_PROGRESS',eventId:body.eventId};
      try {
        const identityHash=sha(tenantId+':'+body.userId).slice(0,20);
        const common={eventId:body.eventId,assetId:asset.id,actorHash:identityHash};
        const text=String(body.text||'').trim();
        if(body.channel==='comment') {
          const result={...common,status:'REVIEW_PUBLIC_REPLY',
            draft:'Per la checklist gratuita, invia direttamente un messaggio con GUIDA: non inviamo DM da commenti pubblici.',
            reason:'Public comment alone is not consent to send private messages'};
          ledger.finish(body.eventId,result);return result;
        }
        const consent=body.consent??{};
        const explicitlyRequested=/(^|\s)GUIDA(\s|$)/i.test(text);
        if(!explicitlyRequested || consent.scope!=='single_free_guide' ||
          consent.channel!=='dm'||consent.assetId!==asset.id || !consent.grantedAt ||
          Number.isNaN(Date.parse(consent.grantedAt)) || Date.parse(consent.grantedAt)>now() ||
          now()-Date.parse(consent.grantedAt)>86400000) {
          const blocked={...common,status:'BLOCKED_NO_CONSENT',
            reason:'Specific recent consented request for this guide is required'};
          ledger.finish(body.eventId,blocked);return blocked;
        }
        const mandate={tenantId,companyId,assetId:asset.id,eventId:body.eventId,channel:'dm',
          requestedScope:'send_single_requested_free_guide',consent};
        if(await authorize(mandate)!==true) {
          const blocked={...common,status:'BLOCKED_POLICY',
            reason:'Tier 1 authorization or operator release not granted'};
          ledger.finish(body.eventId,blocked);return blocked;
        }
        const receipt=await provider.sendPrivateMessage({
          tenantId,companyId,threadId:body.threadId,userId:body.userId,
          idempotencyKey:sha(tenantId+':'+body.eventId+':'+asset.id),
          text:'Ecco la tua checklist richiesta:\n\n'+asset.content
        });
        if(typeof receipt?.providerMessageId!=='string'||!receipt.providerMessageId)
          throw new Error('Provider did not return a valid delivery receipt');
        const result={...common,status:'DELIVERED',providerReceipt:receipt.providerMessageId,
          provider:receipt.provider||'test-adapter',verifiedAt:new Date(now()).toISOString()};
        ledger.finish(body.eventId,result);return result;
      }catch(error){ledger.fail(body.eventId);
        return {status:'RETRYABLE_FAILURE',eventId:body.eventId,reason:'provider failure; idempotent retry required'};}
    },
    ledger
  };
}
