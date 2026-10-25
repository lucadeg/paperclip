import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTier1CompanyResource, Tier1ReadError } from "../../server/src/routes/mvx-tier1-read.ts";
const company = "50ea2b72-8cc2-4cbb-946b-1b8d77949b4f";
const other = "22ea2b72-8cc2-4cbb-946b-1b8d77949b4f";
const env = { MVX_TIER1_API_ORIGIN: "https://tier1.mvx.example/",
  MVX_TIER1_SERVICE_TOKEN: "synthetic-test-secret-0123456789", NODE_ENV: "production" };
const ok = (items: unknown[]=[]) => new Response(JSON.stringify({companyId:company,contacts:items}),
  {status:200,headers:{"Content-Type":"application/json"}});
test("Tier 1 is unavailable without credentials: no demo content", async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{env:{}}),
   (x:unknown)=>x instanceof Tier1ReadError && x.status===503);
});
test("reject non-UUID company ID before any network I/O",async()=>{
 let calls=0;
 await assert.rejects(readTier1CompanyResource("mvx-ads-master-hq","crm/contacts",{env,
  fetcher:(async()=>{calls++;return ok();}) as typeof fetch}),/INVALID_COMPANY_UUID/);
 assert.equal(calls,0);
});
test("reject insecure upstream origin in production",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{
  env:{...env,MVX_TIER1_API_ORIGIN:"http://127.0.0.1:8770"}}),/INVALID_TIER1_API_ORIGIN/);
});
test("scope URL, auth, and company ownership verified",async()=>{
 const records=[{first_name:"Test",last_name:"Lead",email:"test@example.org"}];
 let called=0;
 const report=await readTier1CompanyResource(company,"crm/contacts",{env,fetcher:
  (async(input,init)=>{
   called++;
   const url=new URL(String(input));
   assert.equal(url.origin,"https://tier1.mvx.example");
   assert.equal(url.pathname,"/api/crm/contacts");
   assert.equal(url.searchParams.get("companyId"),company);
   assert.equal(new Headers(init?.headers).get("X-MVX-Company-Id"),company);
   assert.match(new Headers(init?.headers).get("Authorization")||"",/^Bearer /);
   return ok(records);
  }) as typeof fetch});
 assert.equal(called,1);
 assert.equal(report.items.length,1);
 assert.equal(report.companyId,company);
 assert.equal(report.authority,"TIER1_AUTHENTICATED_READ_UNRECONCILED");
});
test("cross-tenant upstream response is rejected",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{env,
  fetcher:(async()=>new Response(JSON.stringify({companyId:other,contacts:[]}))) as typeof fetch}),
  /TIER1_COMPANY_SCOPE_OR_SCHEMA_MISMATCH/);
});
test("legacy arrays without company attestation rejected",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"content/phrases",{env,
  fetcher:(async()=>new Response(JSON.stringify([{id:"f1"}]))) as typeof fetch}),
  /TIER1_INVALID_SHAPE/);
});
test("wrong resource data is rejected",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"content/calendar",{env,
  fetcher:(async()=>ok([])) as typeof fetch}),/TIER1_COMPANY_SCOPE_OR_SCHEMA_MISMATCH/);
});
test("upstream unauthorized response cannot be shown as empty CRM",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{env,
  fetcher:(async()=>new Response("{}",{status:403})) as typeof fetch}),
  /TIER1_SERVICE_AUTHORIZATION_FAILED/);
});
test("provider connection errors fail closed",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{env,
  fetcher:(async()=>{throw Error("network down");}) as typeof fetch}),
  /TIER1_CONNECTION_FAILED/);
});
test("too many contacts are rejected, not silently truncated",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{env,
  fetcher:(async()=>ok(Array.from({length:1001},()=>({id:"x"})))) as typeof fetch}),
  /TIER1_COMPANY_SCOPE_OR_SCHEMA_MISMATCH/);
});
test("production rejects literal-IP and local HTTPS upstream targets before network I/O", async () => {
 let calls = 0;
 for (const origin of [
  "https://127.0.0.1/", "https://169.254.169.254/", "https://[::1]/",
  "https://tier1.local/", "https://metadata.google.internal/", "https://localhost/",
 ]) {
  await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{
   env:{...env,MVX_TIER1_API_ORIGIN:origin},
   fetcher:(async()=>{calls++;return ok();}) as typeof fetch,
  }),/INVALID_TIER1_API_ORIGIN/,origin);
 }
 assert.equal(calls,0);
});
test("local HTTP is limited to explicitly configured development origins",async()=>{
 let calls=0;
 const report=await readTier1CompanyResource(company,"crm/contacts",{
  env:{...env,NODE_ENV:"development",MVX_TIER1_API_ORIGIN:"http://127.0.0.1:3100/"},
  fetcher:(async()=>{calls++;return ok();}) as typeof fetch,
 });
 assert.equal(calls,1);
 assert.equal(report.companyId,company);
});
test("nested company ownership cannot contradict verified envelope",async()=>{
 for (const row of [{companyId:other,id:"leak"}, {company_id:other,id:"leak"}]) {
  await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{
   env,fetcher:(async()=>ok([row])) as typeof fetch,
  }),/TIER1_COMPANY_SCOPE_OR_SCHEMA_MISMATCH/);
 }
 const valid=await readTier1CompanyResource(company,"crm/contacts",{
  env,fetcher:(async()=>ok([{companyId:company,id:"valid"}])) as typeof fetch,
 });
 assert.equal(valid.items.length,1);
});
test("oversized announced payload rejected before body consumption",async()=>{
 const upstream = new Response(new ReadableStream({
  start(controller){controller.enqueue(new Uint8Array([123,125]));controller.close();}
 }),{headers:{"Content-Length":"3000000"}});
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{
  env,fetcher:(async()=>upstream) as typeof fetch,
 }),/TIER1_PAYLOAD_TOO_LARGE/);
});
test("untrusted streamed payload is limited to 2 MB before full materialization",async()=>{
 let canceled=false;
 const stream=new ReadableStream<Uint8Array>({
  start(controller){
   controller.enqueue(new Uint8Array(1_200_000));
   controller.enqueue(new Uint8Array(1_200_000));
   controller.enqueue(new Uint8Array(1_200_000));
  },
  cancel(){canceled=true;},
 });
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{
  env,fetcher:(async()=>new Response(stream)) as typeof fetch,
 }),/TIER1_PAYLOAD_TOO_LARGE/);
 assert.equal(canceled,true,"stream must be canceled after overflow");
});
test("malformed UTF-8 in Tier 1 JSON response fails closed",async()=>{
 await assert.rejects(readTier1CompanyResource(company,"crm/contacts",{
  env,fetcher:(async()=>new Response(new Uint8Array([123,34,255,34,125]))) as typeof fetch,
 }),/TIER1_RESPONSE_READ_FAILED/);
});

test("UI never hardcodes fake company, fake metrics, or local CRM/editor URLs",async()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
 const read=async(file:string)=>fs.readFile(path.join(root,file),"utf8");
 const ctx=await read("ui/src/context/CompanyContext.tsx");
 assert.doesNotMatch(ctx,/mvx-ads-master-hq/);
 const crm=await read("ui/src/pages/CrmContacts.tsx");
 const planner=await read("ui/src/pages/ContentPlanner.tsx");
 assert.doesNotMatch(crm,/http:\/\/localhost:8770/);
 assert.doesNotMatch(planner,/http:\/\/localhost:8770/);
 assert.doesNotMatch(planner,/INITIAL_CONTENT_ITEMS/);
 assert.doesNotMatch(planner,/metrics_views\s*\|\|\s*25000/);
 assert.doesNotMatch(planner,/ev\.views_count\s*\|\|\s*15000/);
 assert.match(planner,/new Date\(\)/);
 assert.doesNotMatch(planner,/Oggi \(17 Set\)/);
 assert.doesNotMatch(planner,/creativePhrases\.length\s*\|\|\s*408/);
 assert.match(planner,/Studio Creativo \(\{creativePhrases\.length\}\)/);
 assert.doesNotMatch(planner,/Commenta con la tua opinione|#business #growth|Gancio di conversione ottimizzato/);
 assert.match(planner,/Riprova sincronizzazione/);
 assert.match(planner,/selectedCompanyId, retryKey/);
 assert.doesNotMatch(planner,/bg-emerald-400 animate-pulse/);
 assert.match(planner,/aria-label="Cerca contenuti editoriali"/);
 assert.match(crm,/aria-label="Cerca contatti CRM"/);
 const council=await read("ui/src/pages/SovereignCouncil.tsx");
 assert.match(council,/aria-label="Cerca profili e modelli del consiglio"/);
 assert.match(council,/role="dialog"/);
 assert.match(council,/event.key === "Escape"/);
});
