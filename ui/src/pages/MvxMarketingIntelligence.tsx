import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, CircleHelp,
  ClipboardCheck, Eye, FileSearch, Filter, Layers3, MessageSquareWarning, MousePointerClick,
  Radar, RefreshCw, Search, ShieldAlert, ShieldCheck, Sparkles, Target, Users, Video, X,
} from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { api } from "../api/client";

type Severity = "BLOCKER" | "MAJOR" | "MINOR";
type AgentStatus = "RULE_BLOCKED" | "RULE_PASS" | "PENDING_AGENT_EXECUTION" | "CTA_PRESENT_VISUAL_PENDING" | "ALT_PRESENT_VISUAL_PENDING";
interface Finding { id:string; domain:string; severity:Severity; owner:string; message:string; remediation:string; evidenceRefs:string[]; status:string; }
interface AgentReview { id:string; label:string; status:AgentStatus; actualAgentRunId:string|null; approved:boolean; source:string; }
interface AuditCheck { label:string; kind:string; state:string; }
interface Post { id:string; channel:string; format:string; product:string; persona:string;
  hook:{style:string;text:string}; cta:{kind:string;copy:string}; caption:string; altText:string;
  storyboard:Array<{scene:number;seconds:string;brief:string}>; evidenceIds:string[];status:string;
  mediaStatus:string; structuralPass:boolean; issues:Finding[]; checks:AuditCheck[]; agents:AgentReview[];
  providerPublished:boolean; kpis:Record<string,number|null>;
}
interface Competitor { id:string;name:string;domain:string;matchScore:number;relationship:string;url:string;
  actualObservedAds:number;verifiedAdROAS:number|null;officialLibraries:Array<{platform:string;url:string;status:string}>; }
interface Needs { id:string;description:string;observedCustomerPain:boolean;sourceCount:number; }
interface Concept { id:string;angle:string;copy:string;status:string;differentiation:string;sourceId:string; }
interface Snapshot {
 schema:string;generatedAt:string;companyId:string;tenantId:string;clientId:string;provenance:string;
 campaign:{id:string;brand:string;market:string;persona:string;product:string;objective:string;approved:boolean;providerPublishing:boolean};
 kpis:Record<string,number|null>;coverage:Record<string,string>;
 evidence:Array<{sourceId:string;url:string;observedAt:string;sha256:string;bytes:number}>;
 posts:Post[];findings:Finding[];competitors:Competitor[];adLibraries:Array<{advertiser:string;status:string;count:number}>;
 aggregator:Array<{competitorId:string;status:string;matched:number}>;needs:Needs[];
 customerPains:Array<{id:string;job:string;mentions:number;confidence:string}>;concepts:Concept[];
 agentRoles:Array<{id:string;label:string;runtime:string}>;
 fleetRoles:Array<{id:string;title:string;classification:string;manager:string|null;runtime:string;actualRunCount:number;auditingAssignedToPosts:boolean}>;
}
interface Response { schema:string;companyId:string;status:string;snapshots:Snapshot[];
 history:Array<{clientId:string;runAt:string;drafts:number;major:number;sourceCoverage:number;realROAS:number|null}>;
 availableClients:string[];sourcePolicy:string; }
type View = "overview"|"content"|"agents"|"competitors"|"needs"|"evidence";
const nav:Array<{key:View;label:string;icon:typeof BarChart3}>= [
 {key:"overview",label:"Executive & KPI",icon:BarChart3},
 {key:"content",label:"Visual Content QA",icon:Eye},
 {key:"agents",label:"Agent Review Board",icon:Users},
 {key:"competitors",label:"Competitor Ads",icon:Radar},
 {key:"needs",label:"Customer Needs",icon:Target},
 {key:"evidence",label:"Evidenze & audit",icon:FileSearch}
];
const value=(n:number|null|undefined,suffix="")=>n===null||n===undefined?"N/D":n.toLocaleString("it-IT",{maximumFractionDigits:1})+suffix;
function KPI({name,n,suffix,caption,tone="normal"}:{name:string;n:number|null|undefined;suffix?:string;caption?:string;tone?:string}) {
 return <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{name}</p>
  <div className="mt-2 flex items-end gap-2"><strong className={"text-3xl tabular-nums font-semibold "+(tone==="risk"?"text-amber-600 dark:text-amber-400":"text-foreground")}>{value(n,suffix)}</strong>
  {n===null||n===undefined?<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">Non misurato</span>:null}</div>
  {caption?<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{caption}</p>:null}
 </div>;
}
function MiniBars({items,max=10}:{items:Array<{label:string;count:number}>;max?:number}) {
 const top=items.slice(0,max),highest=Math.max(1,...top.map(x=>x.count));
 return <div className="space-y-2.5">{top.length?top.map(x=><div key={x.label} className="grid grid-cols-[minmax(90px,160px)_1fr_35px] items-center gap-3 text-xs">
  <span className="truncate text-muted-foreground" title={x.label}>{x.label}</span>
  <div className="h-2 rounded-full bg-muted" role="meter" aria-valuenow={x.count} aria-valuemin={0} aria-valuemax={highest} aria-label={x.label}>
   <div className="h-2 rounded-full bg-sky-500" style={{width:`${x.count/highest*100}%`}} />
  </div><b className="text-right tabular-nums">{x.count}</b>
 </div>):<p className="text-sm text-muted-foreground">Nessuna misura disponibile.</p>}</div>;
}
function SeverityTag({severity}:{severity:Severity}){
 return <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold "+
  (severity==="BLOCKER"?"bg-rose-500/15 text-rose-600 dark:text-rose-400":
    severity==="MAJOR"?"bg-amber-500/15 text-amber-700 dark:text-amber-400":
    "bg-sky-500/15 text-sky-700 dark:text-sky-400")}>{severity}</span>;
}
function Status({state}:{state:string}){
 const bad=/BLOCKED|FAIL|NOT_EXECUTED|PENDING|NEEDS|NOT_TESTED|NOT_CONNECTED|NO_VISUAL|NOT_PROVIDED|NO_DATA|LOCAL_EVIDENCE|CATALOG|NOT_RUN|HYPOTHESIS|DRAFT|REVIEW_REQUIRED|NOT_AVAILABLE/.test(state);
 return <span className={"inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold "+
  (bad?"border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300":
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>{state.replaceAll("_"," ")}</span>;
}
function PostInspect({post,onClose}:{post:Post;onClose:()=>void}){
 const failed=post.checks.filter(x=>x.state==="FAIL").length;
 return <section className="sticky top-4 space-y-4 rounded-2xl border border-sky-500/30 bg-card p-4 shadow-lg" aria-label="Ispezione creatività">
 <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Creative Audit</p>
  <h3 className="text-lg font-semibold">{post.product}</h3><p className="text-xs text-muted-foreground">{post.id} • {post.channel} / {post.format}</p></div>
  <button type="button" className="rounded p-1 hover:bg-muted" onClick={onClose} aria-label="Chiudi dettaglio"><X className="h-4 w-4"/></button></div>
 <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
  <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[11px] text-muted-foreground"><span>ANTEPRIMA TESTUALE</span><span>Non è un'immagine renderizzata</span></div>
  <div className="mx-auto max-w-sm space-y-3 px-5 py-6">
   <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-background/60 flex flex-col items-center justify-center gap-2 px-5 text-center">
    <Video className="h-7 w-7 text-muted-foreground"/><strong className="text-sm">Asset visuale non acquisito</strong>
    <p className="text-xs text-muted-foreground">Storyboard e metadati disponibili. Nessuna valutazione pixel o multimodale attestata.</p></div>
   <p className="text-base font-bold leading-snug">{post.hook.text}</p>
   <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80 max-h-52 overflow-auto">{post.caption}</p>
   <div className="rounded-lg bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300">CTA · {post.cta.copy}</div>
  </div></div>
 <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-muted p-2"><b className="block">Source IDs</b>{post.evidenceIds.length}</div>
 <div className="rounded-lg bg-muted p-2"><b className="block">Controlli FAIL</b>{failed}</div></div>
 <div><h4 className="mb-2 text-sm font-semibold">Storyboard & safe zone</h4>
 <ol className="space-y-2">{post.storyboard.map(x=><li className="flex gap-3 rounded-lg border border-border px-3 py-2 text-xs" key={x.scene}>
  <span className="min-w-12 font-bold text-sky-600">{x.seconds}s</span><span>{x.brief}</span></li>)}</ol></div>
 <div><h4 className="mb-2 text-sm font-semibold">Checks visuali e strutturali</h4>
 <div className="grid gap-1">{post.checks.map(check=><div key={check.label} className="flex items-center justify-between gap-2 border-b border-border/50 py-1.5 text-xs">
  <span>{check.label}</span><Status state={check.state}/></div>)}</div></div>
 <div><h4 className="mb-2 text-sm font-semibold">Esiti dei 14 revisori</h4><div className="space-y-1">{post.agents.map(a=><div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-[11px]">
  <span className="truncate" title={a.id}>{a.label}</span><Status state={a.status}/></div>)}</div></div>
 <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
  <ShieldAlert className="mb-1 inline h-4 w-4"/> I controlli rule-based non sostituiscono agenti multimodali, revisione umana o approvazione dell'inserzionista.</div>
 </section>;
}
function Overview({snap,history}:{snap:Snapshot;history:Response["history"]}){
 const k=snap.kpis;
 const byPlatform=Object.entries(snap.posts.reduce<Record<string,number>>((m,p)=>(m[p.channel]=(m[p.channel]||0)+1,m),{}))
  .map(([label,count])=>({label,count}));
 const byDomain=Object.entries(snap.findings.reduce<Record<string,number>>((m,p)=>(m[p.domain]=(m[p.domain]||0)+1,m),{}))
  .map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count);
 const recent=history.filter(x=>x.clientId===snap.clientId).slice(-8);
 return <div className="space-y-5">
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <KPI name="Post in bozza" n={k.postDrafts} caption="Generati; non pubblicati"/>
 <KPI name="QA strutturale" n={k.structuralPassRate} suffix="%" caption="Non equivale ad audit visuale"/>
 <KPI name="Fonti collegate" n={k.sourceCoverage} suffix="%" caption="Copertura per post"/>
 <KPI name="Criticità maggiori" n={k.majorFindings} tone="risk" caption="Correzioni / verifiche aperte"/>
 <KPI name="Criticità bloccanti" n={k.criticalFindings} tone="risk"/>
 <KPI name="Competitor identificati" n={k.competitorCandidates} caption="Candidati da fonti pubbliche"/>
 <KPI name="Ads verificati competitor" n={k.observedCompetitorAds} caption="Non equivale a winning ads"/>
 <KPI name="Audit visuali completati" n={k.completedVisualAgentAudits} caption="Nessuna valutazione multimodale"/>
 </div>
 <div className="grid gap-4 lg:grid-cols-2">
  <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-4 font-semibold">Distribuzione dei contenuti</h3><MiniBars items={byPlatform}/></div>
  <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-4 font-semibold">Rilievi per ambito</h3><MiniBars items={byDomain}/></div>
 </div>
 <div className="rounded-xl border border-border bg-card p-5">
 <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Misurazione commerciale reale</h3><Status state="NOT_CONNECTED"/></div>
 <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
 <KPI name="Impressions" n={k.impressions}/><KPI name="CTR" n={k.ctr} suffix="%"/><KPI name="Conversioni" n={k.conversions}/>
 <KPI name="ROAS" n={k.roas}/><KPI name="Spesa + IVA" n={k.spendGross} suffix=" €"/><KPI name="Profitto incrementale" n={k.incrementalProfit} suffix=" €"/>
 </div><p className="mt-3 text-xs text-muted-foreground">Valori lasciati N/D finché non arrivano eventi e costi effettivamente riconciliati dai provider Tier 1.</p></div>
 <div className="grid gap-4 lg:grid-cols-2">
 <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-3 font-semibold">Indicatori integrità dati</h3>
  <dl className="space-y-2">{Object.entries(snap.coverage).map(([name,state])=><div key={name} className="flex justify-between gap-2 border-b border-border/50 py-1 text-xs">
   <dt>{name.replaceAll("_"," ")}</dt><dd><Status state={state}/></dd></div>)}</dl></div>
 <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-3 font-semibold">Storico run – audit (non KPI vendite)</h3>
  <MiniBars items={recent.map(x=>({label:new Date(x.runAt).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}),count:x.major||0}))}/>
  <p className="mt-3 text-xs text-muted-foreground">I trend sulle criticità dipendono dai run archiviati; le metriche economiche non si ricavano dai report di ricerca.</p></div></div></div>;
}
function ContentView({snap}:{snap:Snapshot}){
 const [channel,setChannel]=useState("all"),[search,setSearch]=useState(""),[picked,setPicked]=useState<string|null>(null);
 const channels=[...new Set(snap.posts.map(p=>p.channel))];
 const filtered=snap.posts.filter(p=>(channel==="all"||channel===p.channel)&&
  [p.hook?.text,p.product,p.id,p.caption].join(" ").toLowerCase().includes(search.toLowerCase()));
 const post=filtered.find(p=>p.id===picked)||null;
 return <div className="space-y-4">
 <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
 <label className="flex min-w-44 flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2"><Search className="h-4 w-4 text-muted-foreground"/>
 <input aria-label="Cerca post" className="w-full bg-transparent text-sm outline-none" placeholder="Hook, prodotto o ID…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 <label className="flex items-center gap-2 text-xs"><Filter className="h-4 w-4"/><select aria-label="Filtra canale" className="rounded-md border border-border bg-background px-3 py-2" value={channel} onChange={e=>{setChannel(e.target.value);setPicked(null);}}>
 <option value="all">Tutti i canali</option>{channels.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
 <span className="text-xs text-muted-foreground">{filtered.length} contenuti</span></div>
 <div className={"grid gap-4 "+(post?"xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]":"")}>
 <div className="grid content-start gap-3 md:grid-cols-2">{filtered.map(p=><button type="button" key={p.id}
  onClick={()=>setPicked(p.id)} aria-pressed={post?.id===p.id}
  className={"rounded-xl border bg-card p-4 text-left transition hover:border-sky-500/60 hover:shadow-md "+
   (post?.id===p.id?"border-sky-500 ring-1 ring-sky-500":"border-border")}>
  <div className="flex items-center justify-between gap-2 text-[11px]"><span className="font-bold uppercase tracking-wider text-sky-600">{p.channel} · {p.format}</span>
   <Status state={p.mediaStatus}/></div>
  <p className="mt-3 line-clamp-2 text-sm font-semibold">{p.hook.text}</p>
  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{p.caption}</p>
  <div className="mt-4 flex justify-between gap-2 border-t border-border pt-3 text-xs">
   <span>{p.evidenceIds.length} fonti · {p.checks.filter(x=>x.state==="PASS").length}/{p.checks.length} check PASS</span>
   <span className={p.structuralPass?"text-emerald-600":"text-amber-700"}>{p.structuralPass?"Struttura OK":"Da revisionare"}</span></div>
 </button>)}
 {filtered.length===0?<p className="col-span-2 p-8 text-center text-muted-foreground">Nessun post corrisponde ai filtri.</p>:null}</div>
 {post?<PostInspect key={post.id} post={post} onClose={()=>setPicked(null)}/>:null}</div></div>;
}
function AgentsView({snap}:{snap:Snapshot}) {
 const [search,setSearch]=useState("");
 const rows=snap.agentRoles.filter(a=>[a.label,a.id].join(" ").toLowerCase().includes(search.toLowerCase()));
 const currentReviews=snap.posts.flatMap(p=>p.agents.map(a=>({postId:p.id,...a})));
 return <section className="space-y-4">
 <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm">
 <ShieldAlert className="mr-2 inline h-4 w-4"/> I 14 revisori rappresentano i controlli assegnabili a ciascun contenuto. Solo i check deterministici sono eseguiti; nessuna review multimodale/agentica è attestata finché manca un runId verificato.
 </div>
 <div className="flex items-center justify-between"><h3 className="font-semibold">Matrice Agent × Contenuto</h3>
 <input aria-label="Cerca agente" value={search} onChange={e=>setSearch(e.target.value)}
 className="rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Filtra specialista…"/></div>
 <div className="rounded-xl border border-border bg-card p-4"><p className="font-semibold">Fleet completo</p>
 <p className="mt-1 text-xs text-muted-foreground">{snap.fleetRoles?.length||0} profili in catalogo; nessuna esecuzione reale certificata. Tutti gli agenti sono visibili, mentre i 14 specialisti pertinenti producono la matrice di review specifica per contenuto.</p>
 <div className="mt-3 max-h-60 overflow-auto"><div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">{(snap.fleetRoles||[]).filter(a=>[a.id,a.title].join(' ').toLowerCase().includes(search.toLowerCase())).map(a=><div key={a.id} className="flex items-start justify-between gap-2 rounded-md border border-border px-2 py-2 text-xs">
 <div><b>{a.title}</b><p className="text-[10px] text-muted-foreground">{a.id} · {a.classification}</p></div><Status state={a.actualRunCount?'RUN_OBSERVED':'CATALOG_ONLY'}/></div>)}</div></div></div>
 <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[680px] text-xs">
 <thead><tr className="bg-muted/60 text-left"><th scope="col" className="p-3">Revisore indipendente</th>
 <th scope="col" className="p-3 text-right">Rule pass</th><th scope="col" className="p-3 text-right">Bloccati</th>
 <th scope="col" className="p-3 text-right">In attesa</th><th scope="col" className="p-3 text-right">Run reali</th><th scope="col" className="p-3">Runtime</th></tr></thead>
 <tbody>{rows.map(a=>{
 const reviews=currentReviews.filter(r=>r.id===a.id);
 return <tr key={a.id} className="border-t border-border">
 <th scope="row" className="p-3 text-left font-semibold"><span className="block">{a.label}</span><span className="font-normal text-muted-foreground">{a.id}</span></th>
 <td className="p-3 text-right tabular-nums">{reviews.filter(r=>r.status==="RULE_PASS").length}</td>
 <td className="p-3 text-right tabular-nums text-rose-500">{reviews.filter(r=>r.status==="RULE_BLOCKED").length}</td>
 <td className="p-3 text-right tabular-nums">{reviews.filter(r=>r.status!=="RULE_PASS"&&r.status!=="RULE_BLOCKED").length}</td>
 <td className="p-3 text-right tabular-nums">{reviews.filter(r=>r.actualAgentRunId).length}</td>
 <td className="p-3"><Status state={a.runtime}/></td></tr>})}</tbody></table></div></section>;
}
function CompetitorsView({snap}:{snap:Snapshot}){
 return <div className="space-y-4">
 <div className="rounded-xl border border-border bg-card p-4 text-sm"><strong>Competitive Ads Intelligence</strong>
 <p className="mt-1 text-muted-foreground">La somiglianza si riferisce a testi prodotti, non alle performance. Ricerca in library ≠ annuncio osservato. Score/provider spend ≠ ROAS verificato.</p></div>
 <div className="grid gap-3 lg:grid-cols-2">{snap.competitors.map(x=><section key={x.id} className="rounded-xl border border-border bg-card p-5">
 <div className="flex items-start justify-between gap-2"><div><h3 className="text-lg font-semibold">{x.name}</h3><p className="text-xs text-muted-foreground">{x.domain}</p></div>
 <Status state={x.relationship}/></div>
 <div className="mt-4 grid grid-cols-2 gap-2"><KPI name="Affinità categoria" n={x.matchScore*100} suffix="%"/><KPI name="Ads verificati" n={x.actualObservedAds}/></div>
 <div className="mt-3 flex flex-wrap gap-3 text-xs"><a className="inline-flex items-center text-sky-600 hover:underline" href={x.url} target="_blank" rel="noopener noreferrer">Pagina prodotto <ArrowUpRight className="ml-1 h-3 w-3"/></a>
 {x.officialLibraries?.map(a=><a key={a.platform} className="inline-flex items-center text-sky-600 hover:underline" href={a.url} target="_blank" rel="noopener noreferrer">{a.platform} library <ArrowUpRight className="ml-1 h-3 w-3"/></a>)}</div></section>)}</div>
 <div className="rounded-xl border border-border bg-card p-4"><h3 className="mb-3 font-semibold">Stato collegamenti library</h3>
 {snap.adLibraries.length?snap.adLibraries.map((x,i)=><p key={i} className="flex flex-wrap justify-between gap-3 border-b border-border py-2 text-xs">{x.advertiser}<Status state={x.status}/></p>):
 <p className="text-xs text-muted-foreground">Nessuna osservazione provider disponibile.</p>}</div></div>;
}
function NeedsView({snap}:{snap:Snapshot}) {
 return <div className="grid gap-4 xl:grid-cols-2">
 <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">Ipotesi dai messaggi dei concorrenti</h3>
 <p className="my-3 text-xs text-muted-foreground">Non rappresentano frustrazioni dei clienti realmente misurate.</p>
 {snap.needs.length?snap.needs.map(n=><div key={n.id} className="mb-3 rounded-lg border border-border p-3">
  <div className="flex justify-between gap-2 text-xs"><b>{n.id.replaceAll("_"," ")}</b><Status state="HYPOTHESIS_ONLY"/></div>
  <p className="mt-2 text-sm">{n.description}</p><p className="mt-2 text-xs text-muted-foreground">{n.sourceCount} fonti competitor, 0 interviste attestate</p></div>):
 <p className="py-8 text-sm text-muted-foreground">Nessuna ipotesi documentata.</p>}</div>
 <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">Voice-of-Customer verificata</h3>
 <p className="my-3 text-xs text-muted-foreground">Solo ricerche autorizzate, feedback con fonte e periodo; non inferire prevalenza da campioni piccoli.</p>
 {snap.customerPains.length?snap.customerPains.map(p=><div key={p.id} className="mb-3 rounded-lg border border-border p-3">
 <strong className="text-sm">{p.job}</strong><p className="mt-2 text-xs text-muted-foreground">{p.mentions} citazioni · {p.confidence}</p></div>):
 <div className="rounded-lg bg-muted/60 p-6 text-center"><CircleHelp className="mx-auto h-8 w-8 text-muted-foreground"/>
 <p className="mt-2 text-sm">Non sono disponibili interviste o segnalazioni autorizzate.</p></div>}</div>
 <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2"><h3 className="mb-3 font-semibold">Concept differenzianti · da validare</h3>
 <div className="grid gap-3 md:grid-cols-2">{snap.concepts.map(c=><div key={c.id} className="rounded-lg border border-border p-3">
 <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-xs uppercase tracking-wide">{c.angle}</b><Status state={c.status}/></div>
 <p className="mt-2 text-sm">{c.copy}</p><p className="mt-2 text-[11px] text-muted-foreground">Nessun winner/ROAS dimostrato; source {c.sourceId}</p></div>)}</div></div></div>;
}
function EvidenceView({snap}:{snap:Snapshot}) {
 const [filter,setFilter]=useState<Severity|"ALL">("ALL");
 const findings=snap.findings.filter(f=>filter==="ALL"||f.severity===filter);
 return <div className="space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Incidenti, veto, criticità e provenienza</h3>
 <select aria-label="Filtra gravità" value={filter} onChange={e=>setFilter(e.target.value as Severity|"ALL")}
 className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="ALL">Tutte</option><option value="BLOCKER">BLOCKER</option><option value="MAJOR">MAJOR</option><option value="MINOR">MINOR</option></select></div>
 <div className="grid gap-3">{findings.map(f=><article key={f.id} className="rounded-xl border border-border bg-card p-4">
 <div className="flex flex-wrap items-center gap-2"><SeverityTag severity={f.severity}/><strong className="text-sm">{f.domain}</strong><span className="ml-auto text-xs text-muted-foreground">{f.owner}</span></div>
 <p className="mt-2 text-sm">{f.message}</p><p className="mt-2 text-xs text-muted-foreground"><b>Correzione:</b> {f.remediation||"Da definire"}</p>
 <p className="mt-1 text-[11px] text-muted-foreground">Evidence refs: {f.evidenceRefs?.join(", ")||"mancanti"}</p></article>)}
 {!findings.length?<p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">Nessun rilievo per il filtro selezionato.</p>:null}</div>
 <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-3 font-semibold">Registro fonti SHA-256</h3>
 <div className="space-y-2">{snap.evidence.map(e=><div key={e.sourceId} className="rounded-lg bg-muted/40 p-3 text-xs">
  <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline break-all">{e.url}</a>
  <p className="mt-1 font-mono text-[10px] break-all">sha256:{e.sha256}</p>
  <p className="mt-1 text-muted-foreground">Acquisizione: {new Date(e.observedAt).toLocaleString("it-IT")} · {value(e.bytes)} bytes</p></div>)}</div></div></div>;
}
export function MvxMarketingIntelligence() {
 const {selectedCompanyId}=useCompany();
 const [currentView,setCurrentView]=useState<View>("overview");
 const [client,setClient]=useState("all");
 const data=useQuery<Response>({
  queryKey:["mvx-marketing-dashboard",selectedCompanyId],
  queryFn:()=>api.get<Response>(`/companies/${encodeURIComponent(selectedCompanyId!)}/mvx-marketing/dashboard`),
  enabled:Boolean(selectedCompanyId),staleTime:30_000,refetchInterval:60_000
 });
 const snaps=data.data?.snapshots||[];
 const active=client==="all"?snaps[0]:snaps.find(x=>x.clientId===client);
 const tabs=useMemo(()=>nav,[]);
 return <main className="mx-auto max-w-[1600px] space-y-5 p-1 pb-10" aria-label="MVX Marketing Intelligence">
  <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-500/15 via-card to-indigo-500/10 p-5 sm:p-7">
   <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" aria-hidden="true"/>
   <div className="relative flex flex-wrap justify-between gap-4"><div>
    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-300"><Activity className="h-3.5 w-3.5"/>MVX ADS MASTER · INTELLIGENCE CONTROL PLANE</div>
    <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Marketing Intelligence & Visual Audit</h1>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Criticità di comunicazione, campagne e post; competitor, needs/pains, indicatori reali e copertura dei revisori, con provenienza esplicita.</p>
   </div><div className="flex items-center gap-2 self-start"><Status state={active?"LOCAL_EVIDENCE_ONLY":"NO_DATA"}/>
   <button type="button" aria-label="Aggiorna dashboard" onClick={()=>void data.refetch()} className="rounded-lg border border-border bg-background p-2 hover:bg-muted"><RefreshCw className={"h-4 w-4 "+(data.isFetching?"animate-spin":"")}/></button></div></div>
   {active?<div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs">
    <span><b>Brand:</b> {active.campaign.brand}</span><span><b>Prodotto:</b> {active.campaign.product}</span>
    <span><b>Mercato:</b> {active.campaign.market}</span>
    <span><b>Acquisito:</b> {new Date(active.generatedAt).toLocaleString("it-IT")}</span>
    <label className="ml-auto flex items-center gap-2"><span>Cliente</span><select aria-label="Cliente" className="rounded-lg border border-border bg-background px-2 py-1.5" value={client} onChange={e=>setClient(e.target.value)}>
    <option value="all">Ultimo acquisito</option>{snaps.map(s=><option key={s.clientId} value={s.clientId}>{s.clientId}</option>)}</select></label></div>:null}
  </header>
  {!selectedCompanyId?<div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 h-7 w-7"/>Seleziona prima un'azienda autorizzata.</div>:
  data.isLoading?<div role="status" className="rounded-xl border border-border p-10 text-center text-sm">Caricamento KPI e audit tenant-scoped…</div>:
  data.isError?<div role="alert" className="rounded-xl border border-rose-500/50 p-8 text-sm"><AlertTriangle className="mr-2 inline h-4 w-4"/>Impossibile caricare i report. Verifica autenticazione, API e prove raccolte.</div>:
  !active?<div className="space-y-4 rounded-xl border border-dashed border-border bg-card p-8 text-center">
   <FileSearch className="mx-auto h-10 w-10 text-muted-foreground"/><h2 className="text-lg font-semibold">Nessuno snapshot verificabile per questa azienda</h2>
   <p className="mx-auto max-w-2xl text-sm text-muted-foreground">L'interfaccia non inventa KPI, campagne, creatività o review agentiche. Esegui il workflow cliente con companyId corrispondente e registra lo snapshot SHA-256 nel data plane aziendale.</p>
   <p className="text-xs text-muted-foreground">Fonte: .hermes/evidence/mvx-marketing-fleet/dashboards/&lt;companyId&gt;/…</p>
  </div>:
  <><div className="flex flex-wrap gap-2" role="tablist" aria-label="Sezioni intelligence">{tabs.map(t=>{
   const Icon=t.icon;return <button key={t.key} type="button" role="tab" aria-selected={currentView===t.key}
   onClick={()=>setCurrentView(t.key)} className={"inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition "+
   (currentView===t.key?"border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300":"border-border bg-card text-muted-foreground hover:text-foreground")}>
   <Icon className="h-4 w-4"/>{t.label}</button>})}</div>
  <div role="tabpanel">
  {currentView==="overview"?<Overview snap={active} history={data.data?.history||[]}/>:
   currentView==="content"?<ContentView key={active.clientId} snap={active}/>:
   currentView==="agents"?<AgentsView snap={active}/>:
   currentView==="competitors"?<CompetitorsView snap={active}/>:
   currentView==="needs"?<NeedsView snap={active}/>:
   <EvidenceView snap={active}/>}</div>
  <footer className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
  <ShieldCheck className="mr-2 inline h-4 w-4"/>Dati di ricerca locale e bozze: nessuna attestazione di performance reali o audit multimodale concluso. Le review automatiche richiedono ricevute agente + asset licenziati + autorizzazione cliente.</footer></>}
 </main>;
}
