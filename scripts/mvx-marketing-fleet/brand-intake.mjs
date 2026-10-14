import { createHash } from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import {fetchPinnedHtml} from './pinned-https.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const decode = text => String(text ?? '').replace(/&(?:amp|quot|apos|lt|gt|nbsp|#39|#x27|#x2F);/gi, v => ({
  '&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&#39;':"'",'&#x27;':"'",'&#x2F;':'/'
})[v.toLowerCase()] ?? v).replace(/\s+/g,' ').trim();
const strip = value => decode(String(value ?? '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).slice(0,1800);
function privateIP(address) {
  if(net.isIP(address)===4) {
    const [a,b]=address.split('.').map(Number);
    return a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) ||
      (a===172&&b>=16&&b<=31) || (a===192&&b===168) || (a===100&&b>=64&&b<=127) || (a===192&&b===0);
  }
  if(net.isIP(address)===6) {
    const s=address.toLowerCase();
    if(s==='::1'||s==='::'||s.startsWith('fe80:')||s.startsWith('fc')||s.startsWith('fd')) return true;
    if(s.startsWith('::ffff:')) return privateIP(s.replace('::ffff:',''));
  }
  return false;
}
async function inspectUrl(raw,{allowedHosts,resolveHost=dns.lookup,permitTestHost=false}) {
  const u=new URL(raw);
  if(u.protocol!=='https:' || u.username || u.password || u.port || u.hash) throw new Error('HTTPS public URL only');
  if(!Array.isArray(allowedHosts)||!allowedHosts.includes(u.hostname)) throw new Error('Domain not operator-allowlisted');
  if(!permitTestHost) {
    if(net.isIP(u.hostname) || u.hostname==='localhost'||u.hostname.endsWith('.local')) throw new Error('Blocked IP/localhost');
    const addresses=await resolveHost(u.hostname,{all:true});
    if(!addresses.length || addresses.some(r=>privateIP(r.address))) throw new Error('Blocked internal address');
  }
  return u.toString();
}
function meta(doc,key) {
  for(const tag of doc.match(/<meta\b[^>]*>/gi) ?? []) {
    const m=tag.match(/(?:name|property)\s*=\s*(["'])(.*?)\1/i);
    if(m?.[2]?.toLowerCase()!==key.toLowerCase()) continue;
    const c=tag.match(/content\s*=\s*(["'])([\s\S]*?)\1/i);
    if(c) return decode(c[2]).slice(0,650);
  }
  return '';
}
function jsonLd(doc) {
  const result=[];
  for(const m of doc.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try {result.push(JSON.parse(m[1].replace(/<\//g,'<\\/')));} catch { /* untrusted public HTML */ }
  }
  function walk(x) {
    if(Array.isArray(x)) return x.flatMap(walk);
    if(!x || typeof x!=='object') return [];
    return [x,...(x['@graph']?walk(x['@graph']):[])];
  }
  return result.flatMap(walk);
}
export function extractPublicPage(html,{url,observedAt=new Date().toISOString()}={}) {
  if(typeof html!=='string'||html.length<100) throw new Error('No meaningful HTML');
  const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  const description=meta(html,'description')||meta(html,'og:description');
  const h1=strip((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');
  const headlines=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].slice(0,12).map(x=>strip(x[1])).filter(Boolean);
  const embedded=jsonLd(html);
  const entity=embedded.find(x=>String(x['@type']||'').toLowerCase().includes('product'))||null;
  const brand=typeof entity?.brand==='string'?entity.brand:entity?.brand?.name||'';
  const product=typeof entity?.name==='string'?entity.name:h1||title.split(/[|\-]/)[0].trim();
  const source={sourceId:'web-'+hash(url+'|'+hash(html)).slice(0,20),url,observedAt,
    sha256:hash(html),bytes:Buffer.byteLength(html),contentType:'text/html',rights:'reference only; do not copy external logos/images'};
  return {source,title,description,h1,headlines,structuredProduct:entity?{
    name:product,brand,description:strip(entity.description??'').slice(0,500),
    sku:typeof entity.sku==='string'?entity.sku:null,
    offers:entity.offers?{availability:entity.offers.availability??null,currency:entity.offers.priceCurrency??null,
      price:entity.offers.price??null}:null
  }:null,verifiedStatements:[title,description,h1,...headlines].filter(Boolean).map((value,n)=>({
    evidenceId:source.sourceId+':'+n,statement:value,sourceId:source.sourceId
  }))};
}
export async function acquirePublicBrand({urls,allowedHosts,fetchImpl=fetch,resolveHost=dns.lookup,permitTestHost=false,maxBytes=1100000}) {
  if(!Array.isArray(urls)||urls.length<1||urls.length>5) throw new Error('Provide 1-5 public page URLs');
  const docs=[];
  for(const raw of urls) {
    const endpoint=await inspectUrl(raw,{allowedHosts,resolveHost,permitTestHost});
    if(fetchImpl===fetch && !permitTestHost){
      const html=await fetchPinnedHtml(endpoint,{allowedHosts,resolveHost,maxBytes});
      docs.push(extractPublicPage(html,{url:endpoint}));
      continue;
    }
    const response=await fetchImpl(endpoint,{redirect:'manual',headers:{'Accept':'text/html','User-Agent':'MVX-GrowthOS-Brand-Research/1.0'},
      signal:AbortSignal.timeout(12000)});
    if(response.status>=300&&response.status<400) throw new Error('Redirect refused; re-allowlist destination manually');
    if(!response.ok) throw new Error('Remote HTTP '+response.status);
    if(!(response.headers.get('content-type')??'').toLowerCase().includes('text/html')) throw new Error('Expected HTML');
    const declared=Number(response.headers.get('content-length')||0);
    if(declared>maxBytes) throw new Error('Page too large');
    const reader=response.body?.getReader();
    if(!reader) throw new Error('Missing response body');
    let size=0,chunks=[];
    try {
      while(true){
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;
        if(size>maxBytes) throw new Error('Page too large while streaming');
        chunks.push(value);
      }
    } finally {reader.releaseLock();}
    const html=Buffer.concat(chunks).toString('utf8');
    docs.push(extractPublicPage(html,{url:endpoint}));
  }
  return {schema:'mvx-brand-capture/v1',status:'SOURCE_ACQUIRED',sources:docs.map(d=>d.source),pages:docs,
    confidence:'public website content only; not verified operator-owned brand kit or consumer audience',
    warnings:['Audience and brand persona require input or verified analytics','Images, marks and all copyrighted assets are references only']};
}
