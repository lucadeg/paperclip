import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(process.cwd());
if (!/[/\\]\.hermes[/\\]paperclip$/i.test(root)) throw Error("Authorized .hermes checkout only");
const base = process.env.MVX_BROWSER_BASE || "http://127.0.0.1:3102";
const dest = path.join(root, "evidence", "mvx-marketing-fleet",
  "ui-aria-audit-" + new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(dest, {recursive:true});
process.env.TEMP=dest;
process.env.TMP=dest;
process.env.TMPDIR=dest;
const routes = ["/content-planner","/crm-contacts","/council","/marketing-intelligence","/skill-tree"];
const browser = await chromium.launchPersistentContext(path.join(dest, "profile"), {
  channel:"chrome",headless:true,viewport:{width:1440,height:900}
});
const page=browser.pages()[0]||await browser.newPage();
const results=[];
try {
  for(const route of routes) {
    const record={route,rendered:false,controls:0,missingNames:[],missingImageAlt:[],error:null};
    try {
      await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:45000});
      await page.waitForTimeout(700);
      const details=await page.evaluate(()=>{
        const visible=(element)=>{
          const style=getComputedStyle(element);
          return element.getClientRects().length>0 && style.visibility!=="hidden" && style.display!=="none";
        };
        const name=(element)=>{
          const aria=element.getAttribute("aria-label");
          if(aria?.trim())return aria.trim();
          const labelledby=element.getAttribute("aria-labelledby");
          if(labelledby) {
            const labels=labelledby.split(/\s+/).map(id=>document.getElementById(id)?.textContent?.trim()||"").join(" ").trim();
            if(labels)return labels;
          }
          if(["INPUT","SELECT","TEXTAREA"].includes(element.tagName)){
            const labels=element.labels;
            if(labels && [...labels].some(label=>label.textContent?.trim()))return "associated label";
          }
          if(element.getAttribute("title")?.trim())return element.getAttribute("title").trim();
          if(element.textContent?.trim())return element.textContent.trim();
          const image=element.querySelector("img[alt]");
          if(image?.getAttribute("alt")?.trim())return image.getAttribute("alt").trim();
          return "";
        };
        const nodes=[...document.querySelectorAll("button,[role=button],a[href],input:not([type=hidden]),select,textarea")].filter(visible);
        const missingNames=nodes.filter(element=>!name(element)).map(element=>({
          tag:element.tagName.toLowerCase(),html:element.outerHTML.slice(0,320),
          context:(element.parentElement?.textContent||"").trim().slice(0,90)
        }));
        const missingImageAlt=[...document.querySelectorAll("img:not([alt])")].filter(visible)
          .map(el=>({src:el.getAttribute("src"),html:el.outerHTML.slice(0,220)}));
        return {controls:nodes.length,missingNames,missingImageAlt,bodyLength:document.body.innerText.length};
      });
      record.rendered=details.bodyLength>100;
      record.controls=details.controls;
      record.missingNames=details.missingNames.slice(0,80);
      record.missingImageAlt=details.missingImageAlt.slice(0,40);
    } catch(error){record.error=String(error).slice(0,700);}
    console.log("ARIA "+route+" controls="+record.controls+
      " missingNames="+record.missingNames.length+" missingAlt="+record.missingImageAlt.length+
      " rendered="+record.rendered);
    results.push(record);
  }
} finally {await browser.close();}
const report={schema:"mvx-ui-aria-audit/v1",generatedAt:new Date().toISOString(),base,
  disclaimer:"DOM name-candidate inspection only; not axe or WCAG certification",
  results,totalUnlabeled:results.reduce((n,r)=>n+r.missingNames.length,0),
  totalMissingAlt:results.reduce((n,r)=>n+r.missingImageAlt.length,0)};
await fs.writeFile(path.join(dest,"report.json"),JSON.stringify(report,null,2)+"\n");
console.log("ARIA_AUDIT_REPORT="+path.join(dest,"report.json"));
console.log("ARIA_AUDIT_TALLY="+JSON.stringify({unlabeled:report.totalUnlabeled,alt:report.totalMissingAlt}));
if(results.some(r=>!r.rendered || r.error) || report.totalUnlabeled || report.totalMissingAlt)process.exitCode=1;
