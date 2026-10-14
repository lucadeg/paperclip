import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(dir, '../..');
const team = path.join(repository, 'packages/teams-catalog/catalog/optional/marketing/mvx-evidence-growth-council');
const roster = JSON.parse(await fs.readFile(path.join(dir,'roster.json'),'utf8'));
const isCheck = process.argv.includes('--check');
const all = [...roster.executives, ...roster.specialists];
const ids = new Set(all.map(a=>a.id));
if (roster.executives.length!==27 || roster.specialists.length!==45 || ids.size!==72) throw Error('Expected 27 unique executives and 45 unique specialists');
for (const a of all) if (a.manager && !ids.has(a.manager)) throw Error('Unknown supervisor '+a.id+' -> '+a.manager);
for (const a of all) {
  const ancestors = new Set([a.id]); let node=a;
  while(node.manager) { if (ancestors.has(node.manager)) throw Error('Cyclic reporting chain '+a.id); ancestors.add(node.manager); node=all.find(x=>x.id===node.manager); }
}
function fm(fields) {
  const rows=['---'];
  for (const [k,v] of Object.entries(fields)) {
    if (Array.isArray(v)) {rows.push(k+':'); for (const x of v) rows.push('  - '+JSON.stringify(x));}
    else rows.push(k+': '+(v===null?'null':typeof v==='boolean'?String(v):JSON.stringify(v)));
  }
  return rows.join('\n')+'\n---\n\n';
}
const files = new Map();
function add(p,content){ files.set(p,content.endsWith('\n')?content:content+'\n'); }
const root='agents/ceo-bezos/AGENTS.md';
add('TEAM.md',fm({
 name:'MVX Evidence-Governed Growth Council',
 description:'27 executive decision-lens workers plus 30 accountable marketing specialists; evidence-first tasks, safe drafts, independent challenge and consent-first provider operations.',
 schema:'agentcompanies/v1', slug:'mvx-evidence-growth-council',category:'marketing',
 key:'paperclipai/optional/marketing/mvx-evidence-growth-council',
 manager:root,
 includes:[...all.filter(x=>x.id!=='ceo-bezos').map(x=>'agents/'+x.id+'/AGENTS.md'),'projects/marketing-evidence-program/PROJECT.md'],
 defaultInstall:false,
 recommendedForCompanyTypes:['agency','ecommerce','saas','startup'],
 tags:['mvx','tier2','council','marketing','evidence','experiments','consent'],
 requiredSkills:['paperclipai/bundled/paperclip-operations/task-planning','paperclipai/bundled/paperclip-operations/issue-triage']
})+
'# MVX Marketing Evidence-Governed Council\n\n'+
'**Template only; not a claim of live employment or human endorsement.** This team imports 57 executable Paperclip agent identities (27 executive decision frameworks and 30 marketing task owners). Each becomes runnable only after installation into a company with configured adapters and budgets. Model descriptions do not impersonate the real people referenced by the existing Sovereign Council UI.\n\n'+
'All campaign, CRM, creative, provider, spend and conversion truth remains in MVX Growth OS (Tier 1). Paperclip (Tier 2) owns issue delegation, company identity, approvals, budget limits and audit. No independent shadow database.\n\n'+
'## Non-negotiable operating protocol\n\n'+
'1. Resolve tenant and company ID and valid authority before retrieving or sharing data. Default deny missing grants.\n'+
'2. Link each assertion to a dated, tenant-bound Tier 1 evidence record with source and version. Reject fabricated telemetry.\n'+
'3. Preregister baseline, hypothesis, primary KPI, guardrails, sample sizes, experiment horizon and decision rule before testing.\n'+
'4. Specialists may analyze and prepare drafts using approved read scopes. Any publication, outreach, provider mutation or media spend requires Tier 1 scoped action API, explicit policy approval, budget reservation and receipt.\n'+
'5. Council members deliberate only on domain-relevant tickets; critic-munger documents downside and independent challenge. Preserve disagreements and do not override legal/security or hard budget vetoes.\n'+
'6. Evidence gaps produce blocked issues, not optimistic conclusions. Reconcile cost net of fees, VAT, refunds and discounts.\n'+
'7. Paperclip tasks and recurring routines do not independently guarantee runtime activation: company install, adapter credentials, scoped provider connectors and heartbeat schedules are mandatory.\n');
for(const a of roster.executives) {
 const leadership = a.id==='ceo-bezos';
 const body=fm({name:a.title,slug:a.id,title:a.title,role:leadership?'ceo':'manager',reportsTo:a.manager,skills:['task-planning','issue-triage']})+
 '# '+a.title+'\n\n'+
 'This is a **synthetic executive decision framework**, not the actual person whose methods inform the pre-existing Sovereign Council profile '+a.id+'. Do not claim real-person endorsement, participation or live oversight.\n\n'+
 '## Mandate\n'+(leadership?'Triage board objectives; convene only relevant reviewers; authorize **recommendations**, never bypass approval gates.':'Review delegated decisions in this discipline, delegate evidence collection, and return evidence-linked recommendations.')+'\n\n'+
 '## Mandatory business KPI\n'+a.kpi+' — measured from authoritative Tier 1/2 events, not estimated UI targets.\n\n'+
 '## Mandatory objection / veto trigger\n'+a.veto+'. If triggered, return VETO or REVISE with a testable remediation ticket.\n\n'+
 '## Decision record\n- company_id, tenant_id, issue_id, actor_agent_id, evidence IDs and dataset versions\n- hypothesis, baseline, measurement window, uncertainty, resource/budget impact\n- favorable and contrary facts, alternative options and expected failure modes\n- vote: SUPPORT / REVISE / VETO / ABSTAIN; separate legally binding policy denial from heuristic advice\n- timestamp and requested next responsible owner\n\n'+
 '## Paperclip execution contract\nOn every heartbeat: claim the assigned issue atomically; inspect issue/company budgets and caller authority; validate evidence freshness; delegate bounded subissues with explicit owners; post a reasoned decision comment; update issue state. Pause on missing data. Never make external provider mutations on behalf of reviewers.\n';
 add('agents/'+a.id+'/AGENTS.md',body);
}
for(const a of roster.specialists) {
 const body=fm({name:a.title,slug:a.id,title:a.title,role:'specialist',reportsTo:a.manager,skills:['issue-triage','task-planning']})+
 '# '+a.title+'\n\nYou are an **operational marketing specialist**. Do work on real assigned Paperclip issues, not a conversational persona. You have no implied authority to connect accounts, spend, email customers or publish.\n\n'+
 '## Job-to-be-done\nInput: '+a.input+'.\n\nDeliverable: '+a.artifact+'. Include repeatable methodology, machine-readable outcomes where supported, dataset IDs/versions, reproducible query/export, actual measured numerators/denominators, dated observations, blind spots and handoff.\n\n'+
 '## Primary KPI\n'+a.metric+'. Always report unit, source, data freshness and uncertainty; no synthetic lift.\n\n'+
 '## Acceptance test\n'+a.check+'. Record PASS/FAIL/INCONCLUSIVE with source-linked evidence and issue/revision/experiment IDs. Prefer preregistered control groups and guardrail metrics.\n\n'+
 '## Authorized capability (maximum request, not an entitlement)\n'+a.scope+'. Use only granted per-tenant Tier 1 tools; do not call providers directly or use raw API keys. Only propose mutating actions in draft and require approval for release.\n\n'+
 '## Every heartbeat\n1. Atomically claim assigned issue; check supervisor, tenant, company, budget and permission.\n2. Obtain a dated Tier 1 evidence packet; if absent mark BLOCKED and list exact needed sources.\n3. Execute a concrete analysis or draft this run, attaching artifact and validation evidence; do not stop at a generic plan.\n4. Compare baseline vs variant with valid denominators and fees/VAT/refunds where material; report effect size and uncertainty.\n5. Escalate risk and confounders to '+a.manager+'; independent legal/privacy review for PII or consent, finance for budget, critic for unsupported causal claims.\n6. Leave durable Paperclip issue comments and explicit next-step owner. Never claim an action succeeded without provider receipt.\n\n'+
 '## Fail-closed safety\nNo unverifiable metrics, invented testimonials or identities, unsolicited messaging, unconsented tracking, secret leakage, or unauthorized spend/publication. Mark outside-data claims as hypotheses.\n';
 add('agents/'+a.id+'/AGENTS.md',body);
}
add('projects/marketing-evidence-program/PROJECT.md',fm({name:'MVX Marketing Evidence Program',slug:'marketing-evidence-program',description:'30 specialist marketing missions, cross-functional evidence gates, recurring council and verification routines.',owner:'ceo-bezos'})+
 '# Operating targets\n\nProduce evidence-linked growth decisions through the Tier 1 Growth OS API and Paperclip issue ledger; do not duplicate marketing provider or CRM truth. Each issue must carry accountable owner, baseline, hypothesis, budget, authority, measured result and acceptance test.\n\n**Launch:** operator imports this optional team, assigns bounded model adapters and monthly budgets, connects Tier 1 with read-only consent-scoped tools and enables explicit task heartbeats. Importing templates is not proof that the 57 agents have executed.\n');
for(const a of roster.specialists) {
 add('projects/marketing-evidence-program/tasks/initial-'+a.id+'/TASK.md',
  fm({name:'Evidence baseline: '+a.title,slug:'initial-'+a.id,assignee:a.id,project:'marketing-evidence-program',recurring:false})+
  'Establish a real tenant-scoped, read-only baseline for **'+a.title+'**. Required data: '+a.input+'.\n\n'+
  'Produce '+a.artifact+' and test '+a.check+'.\n\n'+
  'If not connected, leave a precise BLOCKED report of missing permissions, source IDs and required configuration; do not create metrics. No side effects.\n');
}
const routines=[
 ['daily-marketing-facts','Daily Marketing Data QA','marketing-data-engineer','Reconcile yesterday source freshness, event schema, duplicates, missing events and tenant scoping; open incidents for source failures.'],
 ['daily-spend-reconciliation','Daily Paid Spend Reconciliation','marketing-spend-pacing','Match approved limits, actual verified provider spend, reservations, currency, IVA and fees; escalate overspend before recommending any increase.'],
 ['weekly-experiment-board','Weekly Experiment Review','marketing-experiment-owner','Review preregistered hypotheses, holdouts, primary/guardrail metrics, sample ratios and completed experiment verdicts; route unsupported claims to independent critic.'],
 ['weekly-council-challenge','Weekly Council Critical Review','critic-munger','Convene only relevant evidence reviewers; issue an independent pre-mortem; preserve vetoes and disagreement; require signed human approval for risky execution.'],
 ['weekly-campaign-safety','Weekly Consent and Brand Safety','legal-frankel','Check privacy, unsubscribe, consent, rights, advertising-policy and financial-claim evidence; stop high-risk provider side effects.']
];
for(const [slug,name,assignee,instruction] of routines){
 add('projects/marketing-evidence-program/tasks/'+slug+'/TASK.md',fm({name,slug,assignee,project:'marketing-evidence-program',recurring:true})+instruction+'\n\nNever claim this routine ran unless a real Paperclip run and evidence receipt exists. Schedule is operator-configured and not enabled just by catalog installation.\n');
}
let drift=0;
for (const [relative,content] of files) {
 const output=path.join(team,relative);
 if(isCheck){try{if(await fs.readFile(output,'utf8')!==content){drift++;console.error('DRIFT '+relative)}}catch{drift++;console.error('MISSING '+relative)}}
 else {await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,content,'utf8');}
}
console.log(JSON.stringify({team,executives:27,specialists:roster.specialists.length,routines:routines.length,initialTasks:roster.specialists.length,files:files.size,drift,mode:isCheck?'check':'write'}));
if(drift)process.exitCode=1;
