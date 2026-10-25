import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const file=path.join(path.dirname(fileURLToPath(import.meta.url)),'roster.json');
const r=JSON.parse(await fs.readFile(file,'utf8'));
const records=[
['visual-composition-critic','Visual Composition and Creative Hierarchy Critic','story-duarte','approved rendered imagery, focus order, human view and native platform crop','visual QA defects by evidence class','layout, focal point and crop challenge with screenshot proof','no visual success claim without inspecting actual licensed raster','creative.review'],
['visual-brand-guardian','Visual Brand Consistency Reviewer','branding-neumeier','verified logo, palette, typography, owned brand kit and rendered asset','brand kit conformant creatives','brand colors and logo placement exception register','block source-less logo similarity or unlicensed trademark reproduction','brand.review'],
['visual-accessibility-auditor','Visual Accessibility and Readability Auditor','interaction-cooper','raster pixels, alt text, contrast measurement, screen size and platform UI','verified WCAG checks per delivered asset','contrast, text legibility, caption and accessibility audit','no accessibility PASS solely from alt text presence','creative.review'],
['product-visual-veracity-auditor','Product Photo and Demonstration Truthfulness Auditor','product-norman','owned SKU images, generated visuals, original references and provenance','detected hallucinated or misleading product features','SKU-to-media authenticity and context limitations report','ban fabricated unlicensed product views and fake before/after','product.review'],
['platform-creative-spec-auditor','Platform Creative Specs and Safe Zone Validator','legal-frankel','platform current creative specs, aspect ratio, actual crop and overlays','valid placement specifications and text safe-area coverage','ad format/crop/safe-zone acceptance evidence','no safe-zone approval without measured pixel coordinates','placements.review'],
['cross-modal-claim-auditor','Cross-Modal Creative Claim Consistency Critic','ai-karpathy','ad caption, media frame captions, soundtrack transcript and landing text','text-visual factual contradictions and unresolved evidence','cross-modal claim matrix linked to brand/product source','cannot assert consistent imagery when pixels are unavailable','analytics.review']
];
const current=new Map(r.specialists.map(x=>[x.id,x]));
for(const [id,title,manager,input,metric,artifact,check,scope] of records)
 current.set(id,{id,title,manager,input,metric,artifact,check,scope});
r.specialists=[...current.values()];r.version='1.3.0';
await fs.writeFile(file,JSON.stringify(r,null,2)+'\n','utf8');
console.log(JSON.stringify({executives:r.executives.length,specialists:r.specialists.length,total:r.executives.length+r.specialists.length}));
