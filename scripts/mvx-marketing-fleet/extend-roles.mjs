import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const folder=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(folder,'roster.json');
const roster=JSON.parse(await fs.readFile(file,'utf8'));
const roles=[
['brand-dna-researcher','Brand DNA and Voice Forensic Analyst','branding-neumeier','canonical site pages, real claim statements and brand typography','brand voice alignment and verified claim coverage','brand evidence board: tone lexical palette, promise, anti-persona, citation IDs','avoid claiming invented mission or aesthetics','research.read'],
['brand-market-positioner','Category Positioning and Differentiation Strategist','branding-neumeier','dated competitive positioning, market segments and product differentiators','measured message preference by audience','positioning map, product proof and alternative hypothesis tests','no fabricated competitor differentiators','research.read'],
['brand-identity-guardian','Visual Identity and Design System Governor','branding-neumeier','owned logo files, colors, brand kit and accessibility constraints','brand consistency and visual QA error rate','versioned creative QA checklist and asset specification','only owned or licensed art; require logo approval','creative.draft'],
['product-placement-strategist','Product Placement and Contextual Distribution Strategist','ecommerce-lutke','product attributes, placements, inventory, publisher audience','incremental qualified product consideration','placement matrix: channel context, creative, proof, disclosure','no unauthorized paid placement or hidden endorsement','placements.plan'],
['creator-placement-producer','Creator Integration and Sponsorship Producer','community-garyvee','licensed creator collaboration briefs and audience authenticity','creator-qualified traffic and net contribution','script shot list, disclosed product usage and creator approval packet','sponsorship disclosure and image rights validation','partnerships.plan'],
['affiliate-program-architect','Affiliate Commission and Attribution Architect','sales-hormozi','product gross margin, cookie attribution, payouts, refunds','net affiliate incrementality after commissions','commission tier rules, fraud review, attribution ledger design','no unfunded commissions or self-referral abuse','affiliate.plan'],
['referral-growth-designer','Customer Referral Loop and Rewards Designer','growth-chen','verified existing customers, consent, reward costs and repeat purchases','incremental net contribution per unique referrer','double-sided referral flow with anti-fraud and reward cap','no unsolicited invites and no fake referrals','referral.plan'],
['offer-stack-architect','Value Proposition and Offer Stack Builder','sales-commercial-offer-architect','real SKU evidence, margin and advertised terms','incremental contribution per offer','offer ladder and approved pricing/bonus architecture','false scarcity discount and guarantee bans','offers.plan'],
['sales-objection-scientist','Sales Objection and JTBD Resolution Specialist','comm-voss','consented user research, FAQ and return reasons','qualified objection resolution without complaints','objection-to-proof matrix and followup response variants','cannot invent product efficacy or buyer objection frequency','sales.draft'],
['conversion-journey-architect','Conversion Journey and Checkout Optimization Architect','interaction-cooper','funnel events, checkout steps, abandonment reasons','incremental completed purchase margin','customer journey diagnostics and UX acceptance suite','ban manipulative urgency and hidden charges','site.draft'],
['hook-cta-optimizer','Hook CTA and Post-Level Experimentation Strategist','story-duarte','creative performance, opening seconds, CTA clarity and consent','experiment lift per hook and CTA with confidence intervals','post variant matrix: platform hook CTA placement and preregistered KPI','no clickbait or untestable claims','content.draft'],
['lead-magnet-producer','Free Value Content and Lead Magnet Producer','marketing-godin','product factual sources, FAQ, customer information needs','opt-in guide completion and qualified consented leads','free guide/worksheet/download and delivery contract','never gate essential information deceptively','content.draft'],
['comment-dm-workflow-manager','Consent-Based Comments and Direct Message Orchestrator','legal-frankel','platform signed webhooks, opt-in consent, interaction thread','valid opt-in delivery and complaint/block rate','comment-to-DM state machine with idempotent safe response','no unsolicited DMs; no posting without provider authorization','community.plan'],
['persona-personalization-scientist','Audience Segmentation and Individualization Scientist','growth-ellis','consented cohort signals, language and non-sensitive needs','segment holdout incremental conversions','persona experiments with counterfactual and fairness assessment','no sensitive attribute inference or unlawful targeting','analytics.read'],
['storyboard-video-director','Short Video Creative and Product Demonstration Director','story-duarte','official product imagery and proven feature statements','verified watch-through and qualified action','storyboards with opening frames, proof shots, CTA and captions','avoid implying false product demonstrations or unlicensed video','creative.draft']
];
const extra=roles.map(([id,title,manager,input,metric,artifact,check,scope])=>({id,title,manager,input,metric,artifact,check,scope}));
const old=new Map(roster.specialists.map(x=>[x.id,x]));
for (const role of extra) old.set(role.id,role);
roster.specialists=[...old.values()];
roster.version='1.1.0';
roster.schema='mvx-marketing-fleet/v1';
await fs.writeFile(file,JSON.stringify(roster,null,2)+'\n','utf8');
console.log(JSON.stringify({executives:roster.executives.length,specialists:roster.specialists.length,additions:extra.length}));
