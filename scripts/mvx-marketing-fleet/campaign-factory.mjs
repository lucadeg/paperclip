import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clean=x=>String(x??'').replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim();
const platforms={
 instagram:{captionMax:2100,postTypes:['carousel','reel','story'],tone:'conversational'},
 facebook:{captionMax:3000,postTypes:['feed','video','community'],tone:'helpful'},
 tiktok:{captionMax:1900,postTypes:['short-video'],tone:'fast demonstration'},
 linkedin:{captionMax:2700,postTypes:['professional-story','document'],tone:'professional'},
};
const hypotheses={
 curiosity:['Una scelta quotidiana, tre domande da farsi.','Cosa guardi prima di scegliere?','Il dettaglio che merita attenzione.'],
 demonstration:['Dal prodotto al contesto: ecco cosa osservare.','Un minuto per capire come si inserisce nella tua routine.','Guarda il contesto, non solo la confezione.'],
 objection:['Prima di decidere, chiarisci questi dubbi.','Un confronto senza promesse generiche.','Non è per tutti: valuta ciò che conta per te.']
};
const channelAngles={
 instagram:'Carousel da salvare •',
 facebook:'Domanda per la community •',
 tiktok:'Video rapido: primi 3 secondi •',
 linkedin:'Analisi del contesto d’uso •'
};
const ctas=[
 {kind:'save',copy:'Salva questo post come promemoria.',goal:'save'},
 {kind:'opt_in',copy:'Scrivi GUIDA in privato per richiedere la checklist gratuita.',goal:'consented_guide_request'},
];
function identifyBrand(capture,operatorBrand) {
  const main=capture.pages[0];
  const structured=capture.pages.map(p=>p.structuredProduct?.brand).find(Boolean);
  const tail=main.title.split('|').map(x=>x.trim()).filter(Boolean).at(-1);
  const proposed=clean(operatorBrand||structured||tail||'Brand non identificato');
  return {name:proposed,classification:operatorBrand?'OPERATOR_PROVIDED':structured?'PUBLIC_STRUCTURED_METADATA':'EXTRACTED_HYPOTHESIS'};
}
function sourceFacts(capture) {
  return capture.pages.flatMap(p=>p.verifiedStatements.map(x=>({...x,url:p.source.url})));
}
function inferProduct(p) {
  const name=clean(p.structuredProduct?.name||p.h1||p.title.split('|')[0]);
  const value=clean(p.structuredProduct?.description||p.description);
  return {name,description:value,sourceId:p.source.sourceId,url:p.source.url,
    price:p.structuredProduct?.offers?.price??null,
    pricingEvidence:p.structuredProduct?.offers?.price!=null?'STRUCTURED_SOURCE':'NOT_VERIFIED'};
}
function markdownGuide(brand,product,target,evidences) {
  return '# Checklist gratuita — Scegliere con criterio\n\n'+
    '## Per chi è\n'+target.label+' (scenario definito per il test, non pubblico osservato).\n\n'+
    '## Prodotto esaminato\n**'+product.name+'** — '+brand.name+'\n'+
    'Pagina pubblica: '+product.url+'\n'+
    'Descrizione verificabile dalla pagina: '+(product.description||'non disponibile')+'\n\n'+
    '## Cinque domande utili\n'+
    '1. In quale occasione vorrei usare un prodotto di questa categoria?\n'+
    '2. Quali caratteristiche risultano effettivamente descritte dal produttore?\n'+
    '3. Quali informazioni mancano per prendere una decisione?\n'+
    '4. Disponibilità, prezzo, resi e condizioni sono verificati nel mio mercato?\n'+
    '5. Ci sono alternative adeguate alla mia esigenza?\n\n'+
    '## Tabella personale\n| Criterio | Mia priorità (1–5) | Evidenza/prova |\n|---|---|---|\n| Utilizzo | | |\n| Compatibilità con abitudini | | |\n| Prezzo totale | | |\n| Reperibilità | | |\n\n'+
    '## Fonti\n'+evidences.slice(0,3).map(x=>'- '+x.evidenceId+': '+x.url).join('\n')+'\n\n'+
    'Questo contenuto è informativo: nessun endorsement o partnership è implicito.\n';
}
export function createCampaignPlan({capture,target,channels=['instagram','facebook','tiktok','linkedin'],
  objective='consented_guide_requests',operatorBrand}={}) {
  if(capture?.schema!=='mvx-brand-capture/v1'||capture.status!=='SOURCE_ACQUIRED'||!capture.pages?.length)
    throw new Error('Live or replayed source evidence required');
  if(!target||!clean(target.label)||!clean(target.need)||!clean(target.market)||!clean(target.language))
    throw new Error('Provide explicit market, persona and job-to-be-done; do not infer demographics');
  if(!channels.length||channels.some(x=>!platforms[x])) throw new Error('Unsupported content channel');
  const brand=identifyBrand(capture,operatorBrand);
  const products=capture.pages.map(inferProduct);
  const facts=sourceFacts(capture);
  if(!products[0]?.name || !facts.length) throw new Error('No supported brand/product facts');
  const focus=products.at(-1);
  const persona={label:clean(target.label),need:clean(target.need),market:clean(target.market),
    language:clean(target.language),type:'OPERATOR_TEST_SCENARIO_NOT_OBSERVED_AUDIENCE'};
  const proposedPositioning={
    customerJob:persona.need,
    brandPromise:'Scoprire se '+focus.name+' è adatto all’esigenza dichiarata',
    differentiator:'Da dimostrare con ricerca comparativa; nessun claim competitivo presunto',
    voice:clean(capture.pages[0].description||capture.pages[0].title),
    evidenceIds:[...new Set(facts.slice(0,4).map(x=>x.evidenceId))],
    confidence:'HYPOTHESIS_PENDING_RESEARCH'
  };
  const id='camp-'+sha({urls:capture.sources.map(s=>s.url),persona,objective}).slice(0,18);
  const posts=[];
  for(const channel of [...new Set(channels)]) {
    for(const [style,hooks] of Object.entries(hypotheses)){
      for(const [variant,hook] of hooks.slice(0,2).entries()) {
        const call=ctas[variant];
        const nativeHook=channelAngles[channel]+' '+hook;
        const caption=[
          nativeHook,
          'Tema: '+focus.name+'.',
          'Per '+persona.label+': '+persona.need+'.',
          focus.description?'Secondo la pagina prodotto: '+focus.description.slice(0,210):'Dettagli della pagina prodotto in fase di verifica.',
          'Approfondisci alla fonte: '+focus.url,
          call.copy
        ].join('\n\n').slice(0,platforms[channel].captionMax);
        const creativeId='post-'+sha(id+channel+style+variant).slice(0,16);
        posts.push({id:creativeId,campaignId:id,channel,format:platforms[channel].postTypes[0],
          brand:brand.name,product:focus.name,persona:persona.label,hook:{style,text:nativeHook},
          cta:call,caption,altText:'Bozza creativa: il prodotto '+focus.name+' in un contesto coerente con '+persona.need,
          storyboard:[{scene:1,seconds:'0-3',brief:'Hook in sovraimpressione, visual con licenza verificata'},
            {scene:2,seconds:'3-12',brief:'Mostrare prodotto realmente acquistato/autorizzato in contesto coerente'},
            {scene:3,seconds:'12-20',brief:'Dettaglio solo della caratteristica attestata dalla pagina fonte'},
            {scene:4,seconds:'20-25',brief:call.copy}],
          placement:{surface:channel,context:'target persona use-case hypothesis',
            disclosure:'Partnership o prodotto sponsorizzato solo se contratto verificato, disclosure obbligatoria'},
          sourceEvidenceIds:[...new Set(facts.slice(-3).map(x=>x.evidenceId))],
          optimization:{status:'TEST_REQUIRED',baseline:null,measuredUplift:null,primaryMetric:call.goal,
            guardrails:['consent','complaint rate','verified incremental contribution'],allocation:'preregister before allocation'},
          status:'DRAFT_REQUIRES_OWNER_APPROVAL'});
      }
    }
  }
  const leadMagnet={id:'asset-'+sha(id+'guide').slice(0,16),title:'Checklist gratuita — Scegliere con criterio',
    format:'text/markdown',language:persona.language,content:markdownGuide(brand,focus,persona,facts),
    sourceEvidenceIds:[...new Set(facts.slice(0,3).map(x=>x.evidenceId))],status:'DRAFT'};
  const economics={currency:'EUR',affiliate:{status:'DRAFT_NO_AFFILIATE_LINK_CREATED',
    commissionPercentage:null,cookieDays:null,payoutFloor:null,merchantApproval:false,
    requirements:['verified merchant program','commission liability and refunds','consentful attribution',
      'sponsored disclosure','anti-fraud and deduplication']},
    referral:{status:'DRAFT_NO_INCENTIVE_PROMISED',rewardGross:null,capGross:null,
      requirements:['unique referral ledger','consented invitation','per-user caps',
        'VAT/IVA fiscal classification','refund clawbacks','privacy review']}};
  const journey={awareness:'educational placement + truthful hook',
    consideration:'source-linked product guide',
    conversion:'merchant or authorized landing with explicit terms',
    retention:'permissioned followup and feedback',
    interactionGate:'No DM from a public comment without separate explicit consent',
    personalization:'only operator-provided persona; live cohort data and approvals needed'};
  return {schema:'mvx-campaign-playbook/v1',id,brand,products,target:persona,objective,
    evidence:capture.sources,sourceStatements:facts,proposedPositioning,posts,leadMagnet,
    economics,journey,productionReady:false,
    validation:['product facts sourced','target operator-provided','creatives draft-only',
      'no fake pricing/discount/testimonials','experiment required before claim of optimization']};
}
