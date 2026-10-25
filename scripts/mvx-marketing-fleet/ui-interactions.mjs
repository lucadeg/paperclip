import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(process.cwd());
if (!/[/\\]\.hermes[/\\]paperclip$/i.test(root)) throw Error("Outside authorized .hermes checkout");
const base = process.env.MVX_BROWSER_BASE || "http://127.0.0.1:3101";
const folder = path.join(root,"evidence","mvx-marketing-fleet","ui-interactions-"+new Date().toISOString().replace(/[:.]/g,"-"));
await fs.mkdir(folder,{recursive:true});
process.env.TEMP=folder;process.env.TMP=folder;process.env.TMPDIR=folder;
const browser=await chromium.launchPersistentContext(path.join(folder,"profile"),{channel:"chrome",headless:true,viewport:{width:1440,height:900},ignoreHTTPSErrors:false});
const page=browser.pages()[0]||await browser.newPage();
page.setDefaultTimeout(15000);
const results=[],httpErrors=[],jsErrors=[],wrongOrigins=[];
page.on("pageerror", e=>jsErrors.push(String(e)));
page.on("response", r=>{if(r.status()>=400)httpErrors.push({status:r.status(),url:r.url()})});
page.on("request", r=>{if(/localhost:8770/.test(r.url()))wrongOrigins.push(r.url())});
async function check(name,action){
 const start=Date.now();
 try{const detail=await action();results.push({name,status:"PASS",elapsedMs:Date.now()-start,detail:detail??null});console.log("PASS "+name);}
 catch(e){results.push({name,status:"FAIL",elapsedMs:Date.now()-start,error:String(e).slice(0,450)});console.log("FAIL "+name+" "+String(e).slice(0,150));}
}
const goto=async p=>{await page.goto(base+p,{waitUntil:"domcontentloaded",timeout:45000});await page.waitForTimeout(500);};
await check("Planner renders with current date and actual studio count", async()=>{
 await goto("/content-planner");const today=await page.getByRole("button",{name:/^Oggi \(/i}).innerText();
 const studio=await page.getByRole("button",{name:/Studio Creativo \(/i}).innerText();
 if(today.includes("17 Set"))throw Error("Stale 17 Sep label");
 if(!/Studio Creativo\s*\(0\)/.test(studio))throw Error("Zero-data studio claim inaccurate: "+studio);
 return {today,studio};
});
await check("Planner switches Calendar -> Pipeline -> Studio",async()=>{
 await page.getByRole("button",{name:/Pipeline Fasi/i}).first().click();
 await page.getByRole("button",{name:/Studio Creativo/i}).first().click();
 if(!(await page.getByText("Creative Studio — Archivio Master").count()))throw Error("Studio pane absent");
 await page.getByRole("button",{name:/Calendario Editoriale/i}).first().click();
});
await check("Planner previous/next month and today",async()=>{
 const heading=page.locator("h2").filter({has:page.locator("svg")}).first();
 const before=await heading.innerText();
 await page.getByRole("button",{name:"Mese successivo"}).click();
 const after=await heading.innerText();
 if(before===after)throw Error("Next month did not change heading");
 await page.getByRole("button",{name:/^Oggi \(/i}).click();
 return {before,after};
});
await check("CRM shows no invented leads and filter works",async()=>{
 await goto("/crm-contacts");
 const body=await page.locator("body").innerText();
 if(!body.includes("Seleziona un'azienda autorizzata"))throw Error("Unauthorized/empty state missing");
 await page.getByRole("button",{name:/In Trattativa/i}).first().click();
 if(!(await page.getByText(/Nessun lead trovato/i).count()))throw Error("Empty lead state absent");
 return "Unauthorized state truthful";
});
await check("Council labeled as catalog, not live agents",async()=>{
 await goto("/council");
 const body=await page.locator("body").innerText();
 if(!body.includes("catalogo, non sessione live"))throw Error("Misleading council status");
 const input=page.getByPlaceholder(/Cerca leader/i);await input.fill("Munger");
 if((await input.inputValue())!=="Munger")throw Error("Search input not functional");
 return "Catalog badge and search";
});
await check("Council dialogs: accessible name, keyboard focus and Escape",async()=>{
  await goto("/council");
  const details=page.getByRole("button",{name:/Dettagli & KPIs/i}).first();
  await details.click();
  const drawer=page.getByRole("dialog",{name:/Dettagli e KPI:/i});
  await drawer.waitFor({state:"visible"});
  if((await drawer.getAttribute("aria-modal"))!=="true")throw Error("Details must be modal");
  await page.keyboard.press("Tab");
  if(!(await page.evaluate(()=>Boolean(document.activeElement?.closest('[role="dialog"]')))))throw Error("Focus escaped details dialog");
  await page.keyboard.press("Escape");
  await drawer.waitFor({state:"hidden"});
  if(!(await details.evaluate(el=>el===document.activeElement)))throw Error("Details trigger focus not restored");
  const vetoTrigger=page.getByRole("button",{name:/Veto di Munger & Pre-Mortem/i});
  await vetoTrigger.click();
  const veto=page.getByRole("dialog",{name:/Charlie Munger Inversion/i});
  await veto.waitFor({state:"visible"});
  await veto.getByRole("button",{name:"Chiudi il veto di Munger"}).focus();
  await page.keyboard.press("Shift+Tab");
  if(!(await page.evaluate(()=>Boolean(document.activeElement?.closest('[role="dialog"]')))))throw Error("Veto focus escaped modal");
  await page.keyboard.press("Escape");
  await veto.waitFor({state:"hidden"});
  return "Both dialogs keyboard-accessible and trigger focus restored";
});
await check("Marketing company gate and no fabricated ROAS",async()=>{
 await goto("/marketing-intelligence");const body=await page.locator("body").innerText();
 if(!body.includes("Seleziona prima un'azienda autorizzata"))throw Error("Company gate absent");
 if(body.includes("mvx-ads-master-hq"))throw Error("Ghost tenant leaked into UI");
});
await check("Skills zero-data catalog, matrix control",async()=>{
 await goto("/skill-tree");
 const b=await page.locator("body").innerText();if(!b.includes("0 Competenze Sovrane"))throw Error("Fake skills count");
 await page.getByRole("button",{name:/Matrice ad Albero/i}).first().click();
});
for(const width of [360,390,768,1024,1440]){
 await check("Responsive planner viewport "+width,async()=>{
   await page.setViewportSize({width,height:820});
   await goto("/content-planner");
   const metrics=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.innerText.length}));
   await page.screenshot({path:path.join(folder,"planner-"+width+".png"),timeout:15000});
   if(metrics.body<60)throw Error("Blank page");
   if(metrics.scroll>width+2)throw Error(`Horizontal overflow: document ${metrics.scroll}px > viewport ${width}px`);
   return metrics;
 });
}
const tally={pass:results.filter(x=>x.status==="PASS").length,fail:results.filter(x=>x.status==="FAIL").length};
const releaseGates={
  browserInteractionsClean:tally.fail===0,
  javascriptErrorsAbsent:jsErrors.length===0,
  legacyApiOriginsAbsent:wrongOrigins.length===0,
  backendHttp5xxAbsent:!httpErrors.some(r=>r.status>=500),
  authenticatedTenantEndToEndVerified:false,
  providerPublicationReceiptsVerified:false,
  crossBrowserAccessibilityVerified:false,
};
const report={schema:"mvx-ui-interactions/v1",base,generatedAt:new Date().toISOString(),results,tally,
  httpErrors:httpErrors.slice(0,100),jsErrors:jsErrors.slice(0,50),legacyOriginRequests:wrongOrigins,
  releaseGates,productionReady:Object.values(releaseGates).every(Boolean)};
await fs.writeFile(path.join(folder,"report.json"),JSON.stringify(report,null,2)+"\n");
console.log("UI_INTERACTION_REPORT="+path.join(folder,"report.json"));
console.log("UI_INTERACTION_TALLY="+JSON.stringify(report.tally));
console.log("UI_RELEASE_GATES="+JSON.stringify(releaseGates));
await browser.close();
if(!report.productionReady)process.exitCode=1;