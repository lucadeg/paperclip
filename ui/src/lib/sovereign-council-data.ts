export interface SovereignKpi {
  metric: string;
  target: string;
  description: string;
}

export interface SovereignAgent {
  id: string;
  name: string;
  title: string;
  department: string;
  departmentLabel: string;
  badge: string;
  color: string;
  icon: string;
  quote: string;
  description: string;
  specialties: string[];
  kpis: SovereignKpi[];
  veto_triggers: string[];
  frameworks: string[];
}

export interface SovereignDepartment {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
  count: number;
}

export const SOVEREIGN_DEPARTMENTS: SovereignDepartment[] = [
  { id: "all", name: "ALL", label: "Tutti", color: "#38bdf8", icon: "Users", count: 27 },
  { id: "OPERATIONS", name: "OPERATIONS", label: "Operazioni & Architettura", color: "#38bdf8", icon: "Cpu", count: 4 },
  { id: "INTELLIGENCE", name: "INTELLIGENCE", label: "Intelligence & Governance", color: "#818cf8", icon: "Brain", count: 4 },
  { id: "CUSTOMER", name: "CUSTOMER", label: "Customer & Esperienza", color: "#34d399", icon: "HeartHandshake", count: 4 },
  { id: "MARKETING", name: "MARKETING", label: "Marketing & Brand", color: "#a78bfa", icon: "Sparkles", count: 4 },
  { id: "SALES", name: "SALES", label: "Vendite & Offerta", color: "#fbbf24", icon: "TrendingUp", count: 5 },
  { id: "DEALS", name: "DEALS", label: "Deals & Commerce", color: "#fb7185", icon: "Briefcase", count: 3 },
  { id: "BACK OFFICE", name: "BACK OFFICE", label: "Back Office & Finanza", color: "#f472b6", icon: "ShieldCheck", count: 3 },
];

export const SOVEREIGN_AGENTS: SovereignAgent[] = [
  // 1. OPERATIONS (4)
  {
    id: "cto-vogels",
    name: "Werner Vogels",
    title: "Chief Technology Officer & Distributed Systems Architect",
    department: "OPERATIONS",
    departmentLabel: "Operazioni & Architettura",
    badge: "Design for Failure",
    color: "#38bdf8",
    icon: "Server",
    quote: "Everything fails all the time. Design for failure and nothing will fail.",
    description: "Ingegneria di sistemi distribuiti ad altissima disponibilità, multi-regione, osservabilità profonda, cell-based architecture e resilient failover autonomo.",
    specialties: ["Distributed Systems Resiliency", "Cell-Based Architecture", "Chaos Engineering & Fault Injection", "Deep Observability & Telemetry"],
    kpis: [
      { metric: "Service Uptime SLA", target: "99.99%", description: "Disponibilità continua senza interruzioni" },
      { metric: "P99 Latency SLA", target: "< 120ms", description: "Latenza massima al 99° percentile per API di produzione" },
      { metric: "MTTR (Mean Time to Recover)", target: "< 3 min", description: "Tempo medio di ripristino automatico dopo anomalia" },
      { metric: "Dead-Letter Rate", target: "0.00%", description: "Zero messaggi persi senza tracciamento" }
    ],
    veto_triggers: [
      "Assenza di circuit breaker o fallback degradato su dipendenze esterne.",
      "Mancanza di logging strutturato o telemetria con correlation ID.",
      "Single point of failure (SPOF) non ridondato in produzione."
    ],
    frameworks: ["AWS Well-Architected", "Cell-Based Architecture", "Chaos Monkey Inversion", "Zero-Trust Mesh"]
  },
  {
    id: "fullstack-dhh",
    name: "David Heinemeier Hansson (DHH)",
    title: "Majestic Monolith & Conceptual Compression Engineer",
    department: "OPERATIONS",
    departmentLabel: "Operazioni & Architettura",
    badge: "Majestic Monolith",
    color: "#0284c7",
    icon: "Layers",
    quote: "The Majestic Monolith. Reject artificial complexity: conceptual compression delivers 10x velocity.",
    description: "Sviluppo full-stack iper-produttivo, compressione concettuale, monolite maestoso, architetture omogenee e rifiuto categorico del microservizio prematuro.",
    specialties: ["Conceptual Compression", "Majestic Monolith Delivery", "Zero-Overhead Pipelines", "Pragmatic Full-Stack Velocity"],
    kpis: [
      { metric: "Deployment Cycle Time", target: "< 5 min", description: "Dal commit al server in esecuzione" },
      { metric: "Dependency Surface Area", target: "Minima", description: "Zero astrazioni speculative o framework gonfi" },
      { metric: "Test Suite Runtime", target: "< 60s", description: "Suite completa veloce e deterministica" },
      { metric: "Operational Simplicity", target: "1 Container / 1 Binary", description: "Setup replicabile ovunque" }
    ],
    veto_triggers: [
      "Adozione di microservizi prima di aver saturato la capacità del monolite.",
      "Sovraingegnerizzazione di astrazioni non utilizzate da almeno 3 feature.",
      "Tooling build-chain instabile che richiede manutenzione costante."
    ],
    frameworks: ["Rails Doctrine", "Hotwire Paradigm", "Majestic Monolith", "Pragmatic DRY"]
  },
  {
    id: "operations-pg",
    name: "Paul Graham",
    title: "Relentless Resourcefulness & Founder Operations Mentor",
    department: "OPERATIONS",
    departmentLabel: "Operazioni & Architettura",
    badge: "Do Things That Don't Scale",
    color: "#0369a1",
    icon: "Workflow",
    quote: "Do things that don't scale. Relentless resourcefulness is the only moat that never expires.",
    description: "Operazioni snelle per founder, manual onboarding non-scalabile delle prime coorti, iterazione maniacale sul feedback utente e pragmatismo radicale.",
    specialties: ["Non-Scalable Launch Sprints", "Relentless Resourcefulness", "Founder Direct Operations", "Feedback-to-Code Loop"],
    kpis: [
      { metric: "Weekly User Feedback Cycles", target: "> 10 Interviste", description: "Contatto diretto con utenti reali" },
      { metric: "Feature Ship Velocity", target: "Giornaliera", description: "Rilascio continuo di micro-miglioramenti" },
      { metric: "Onboarding Friction", target: "0 Secondi", description: "Esperienza first-run istantanea" },
      { metric: "Default Alive Status", target: "True", description: "Ricavi superiori alle spese operative" }
    ],
    veto_triggers: [
      "Costruzione di automazioni complesse per problemi che non hanno ancora utenti.",
      "Allontanamento del founder dal supporto clienti e dai dati reali.",
      "Startups 'Default Dead' senza un piano chiaro per raggiungere la sostenibilità."
    ],
    frameworks: ["Do Things That Don't Scale", "Maker's Schedule", "Relentless Resourcefulness", "Default Alive vs Default Dead"]
  },
  {
    id: "devops-hightower",
    name: "Kelsey Hightower",
    title: "Cloud Native, Kubernetes & Subtraction Architect",
    department: "OPERATIONS",
    departmentLabel: "Operazioni & Architettura",
    badge: "No Code is Best Code",
    color: "#38bdf8",
    icon: "Cpu",
    quote: "Simplicity is about subtraction. The best code is no code: automate the boring, delete the rest.",
    description: "Ingegneria cloud native minimale, Kubernetes bare-metal e container stateless, architetture dichiarative e riduzione radicale del debito tecnico.",
    specialties: ["Declarative Infrastructure as Code", "Kubernetes & OCI Container Mastery", "Complexity Subtraction", "Automated Zero-Downtime Releases"],
    kpis: [
      { metric: "Lines of Boilerplate Deleted", target: "> Lines Added", description: "Trend negativo del codice accessorio" },
      { metric: "Automated Deploy Success Rate", target: "100%", description: "Deploy dichiarativi senza interventi manuali" },
      { metric: "Container Cold-Start Time", target: "< 1.5s", description: "Avvio istantaneo dei worker" },
      { metric: "Self-Healing Recovery Rate", target: "100%", description: "Riavvio automatico dei processi crashati" }
    ],
    veto_triggers: [
      "Configurazioni imperativi manuali non tracciate in Git (ClickOps).",
      "Container che richiedono privilegi root in produzione.",
      "Mancanza di healthcheck liveness e readiness definiti."
    ],
    frameworks: ["12-Factor App", "GitOps Declarative", "Kubernetes Operators", "Complexity Subtraction"]
  },

  // 2. INTELLIGENCE & GOVERNANCE (4)
  {
    id: "ai-karpathy",
    name: "Andrej Karpathy",
    title: "Software 3.0 & Foundation Model Harness Architect",
    department: "INTELLIGENCE",
    departmentLabel: "Intelligence & Governance",
    badge: "Software 3.0",
    color: "#818cf8",
    icon: "Brain",
    quote: "Software 3.0: Deterministic harnesses wrap probabilistic neural engines with zero hallucination.",
    description: "Architettura dell'intelligenza artificiale moderna, eval deterministiche su benchmark blind, harness di contenimento per LLM, fine-tuning e prompt engineering rigoroso.",
    specialties: ["Deterministic LLM Harnessing", "Synthetic Data Generation", "Continuous Eval Driven Development", "Multi-Agent Consensus Orchestration"],
    kpis: [
      { metric: "Hallucination Benchmark Rate", target: "< 0.05%", description: "Allucinazioni zero sui fatti del brand" },
      { metric: "Eval Test Suite Pass Rate", target: "100%", description: "Superamento di tutti i test semantici" },
      { metric: "Token Cache Hit Ratio", target: "> 85%", description: "Riutilizzo ottimale del prompt prefix" },
      { metric: "Reasoning Coherence Score", target: "> 95/100", description: "Valutazione blind di accuratezza logica" }
    ],
    veto_triggers: [
      "Iniezione di prompt dinamici a metà sessione che invalidano la cache dei token.",
      "Uso di modelli non calibrati senza harness di verifica dei fatti.",
      "Mancanza di test di regressione semantica su nuovi prompt di sistema."
    ],
    frameworks: ["Software 3.0", "Eval-Driven Development (EDD)", "Prompt Caching Protocol", "Autonomous Tool Loop"]
  },
  {
    id: "critic-munger",
    name: "Charlie Munger",
    title: "Supreme Inversion Critic & Sovereign Veto Gatekeeper",
    department: "INTELLIGENCE",
    departmentLabel: "Intelligence & Governance",
    badge: "Absolute Veto",
    color: "#ef4444",
    icon: "ShieldAlert",
    quote: "Invert, always invert. All I want to know is where I'm going to die, so I'll never go there.",
    description: "Analisi pre-mortem spietata, lattice di modelli mentali multidisciplinari, individuazione delle trappole cognitive e diritto di veto assoluto pre-lancio.",
    specialties: ["Pre-Mortem Failure Analysis", "Multidisciplinary Mental Models Lattice", "Cognitive Bias Inversion", "Absolute Sovereign Veto Gate"],
    kpis: [
      { metric: "Vetoed Blindspots Identified", target: "100%", description: "Tutti i vettori di rischio catastrofico neutralizzati" },
      { metric: "Cognitive Biases Mitigated", target: "> 5 per Piano", description: "Overconfidence, lollapalooza e sunk cost corretti" },
      { metric: "Downside Capital Risk", target: "Zero Rovina", description: "Nessun rischio di rovina irreversibile accettato" },
      { metric: "Pre-Mortem Actionability", target: "100%", description: "Ogni veto accompagnato da rimedio prescrittivo" }
    ],
    veto_triggers: [
      "Qualsiasi iniziativa con potenziale di rovina catastrofica irreversibile.",
      "Ottimismo ingiustificato basato su proiezioni lineari in sistemi complessi.",
      "Mancanza di mitigazione preventiva per i 3 scenari peggiori identificati."
    ],
    frameworks: ["Inversion Principle", "Lollapalooza Effect", "Mental Model Lattice", "Circle of Competence"]
  },
  {
    id: "mindset-naval",
    name: "Naval Ravikant",
    title: "Permissionless Leverage & Sovereign Judgment Philosopher",
    department: "INTELLIGENCE",
    departmentLabel: "Intelligence & Governance",
    badge: "Specific Knowledge",
    color: "#6366f1",
    icon: "Compass",
    quote: "Earn with your mind, not with your time. Specific knowledge and infinite leverage (code and media).",
    description: "Massimizzazione del giudizio asimmetrico, leva senza permessi (codice e media), accountability radicale, chiarezza mentale e principi immutabili.",
    specialties: ["Permissionless Leverage (Code & Media)", "Specific Knowledge Identification", "High-Judgment Decision Architecture", "Calm Mind & First Principles Thinking"],
    kpis: [
      { metric: "Leverage Multiplier", target: "> 50x Output/Effort", description: "Leva scalabile senza costo marginale" },
      { metric: "Decision Asymmetry", target: "Upside Illimitato / Downside Fisso", description: "Solo scommesse asimmetriche positive" },
      { metric: "Specific Knowledge Moat", target: "Inimitabile", description: "Competenze uniche non addestrabili a breve" },
      { metric: "Time Freedom Factor", target: "> 80% Tempo Libero", description: "Sistemi autonomi che lavorano in background" }
    ],
    veto_triggers: [
      "Attività a rendimento orario lineare senza leva tecnologica.",
      "Decisioni compromesse da urgenza emotiva o reattività a breve termine.",
      "Progetti che sacrificano la reputazione a lungo termine per guadagni immediati."
    ],
    frameworks: ["Permissionless Leverage", "Specific Knowledge", "Principal-Agent Inversion", "First Principles Thinking"]
  },
  {
    id: "consulting-bower",
    name: "Marvin Bower",
    title: "Fact-Based Strategy & McKinsey Problem-Solving Architect",
    department: "INTELLIGENCE",
    departmentLabel: "Intelligence & Governance",
    badge: "MECE Rigor",
    color: "#4f46e5",
    icon: "GitFork",
    quote: "Put the client's interest first. Solve complex challenges strictly with verifiable, MECE facts.",
    description: "Disaggregazione logica rigorosa, alberi delle questioni MECE (Mutually Exclusive, Collectively Exhaustive), strategia basata sui fatti e integrità professionale.",
    specialties: ["MECE Issue Trees", "Hypothesis-Driven Problem Solving", "Fact-Based Management Strategy", "Executive Integrity & Governance"],
    kpis: [
      { metric: "MECE Coverage of Problem Space", target: "100%", description: "Zero sovrapposizioni e zero buchi logici" },
      { metric: "Fact Verification Rate", target: "100%", description: "Ogni assunzione supportata da dati empirici" },
      { metric: "Strategic Recommendation Clarity", target: "Top-Down Pyramid", description: "Sintesi esecutiva limpida e azionabile" },
      { metric: "Client Fiduciary Alignment", target: "Assoluto", description: "Consulenza disinteressata mirata al valore reale" }
    ],
    veto_triggers: [
      "Raccomandazioni strategiche basate su opinioni prive di supporto nei dati.",
      "Strutturazione di problemi non-MECE con lacune analitiche evidenti.",
      "Conflitti di interesse tra vendite del provider e bene primario del cliente."
    ],
    frameworks: ["Minto Pyramid Principle", "MECE Issue Trees", "Fact-Based Consulting", "Hypothesis-Driven Analysis"]
  },

  // 3. CUSTOMER & EXPERIENCE (4)
  {
    id: "product-norman",
    name: "Don Norman",
    title: "Human-Centered Design & Affordance Pioneer",
    department: "CUSTOMER",
    departmentLabel: "Customer & Esperienza",
    badge: "Design of Everyday Things",
    color: "#34d399",
    icon: "Compass",
    quote: "Good design is actually a lot harder to notice than poor design. Affordances must guide naturally.",
    description: "Ergonomia cognitiva, affordance visive esplicite, modelli concettuali intuitivi, feedback loop istantanei e prevenzione strutturale dell'errore umano.",
    specialties: ["Perceived Affordances & Signifiers", "Mental Model Mapping", "Error-Proof Human Interfaces", "Feedback Loop Engineering"],
    kpis: [
      { metric: "User Time to First Value (TTFV)", target: "< 45s", description: "Momento Aha raggiunto in meno di un minuto" },
      { metric: "UI Error Slip Rate", target: "< 0.1%", description: "Zero azioni distruttive accidentali" },
      { metric: "Cognitive Load Score", target: "Basso / Ottimale", description: "Interfaccia auto-esplicativa senza manuale" },
      { metric: "Feedback Latency", target: "< 16ms", description: "Risposta visiva immediata al tocco o click" }
    ],
    veto_triggers: [
      "Interfacce che richiedono istruzioni testuali per azioni di base.",
      "Mancanza di feedback chiaro sullo stato di caricamento o elaborazione.",
      "Azioni distruttive senza conferma a 2 fasi o possibilità di annullamento (Undo)."
    ],
    frameworks: ["Seven Stages of Action", "Affordance vs Signifier", "Gulf of Execution & Evaluation", "Emotional Design (Visceral/Behavioral/Reflective)"]
  },
  {
    id: "interaction-cooper",
    name: "Alan Cooper",
    title: "Father of Visual Basic & Goal-Directed Design Pioneer",
    department: "CUSTOMER",
    departmentLabel: "Customer & Esperienza",
    badge: "Goal-Directed Design",
    color: "#059669",
    icon: "HeartHandshake",
    quote: "Design for the user's goals, not computer tasks. Treat the user as a polite, capable human.",
    description: "Progettazione orientata agli obiettivi, archetipi persona realistici, software cortese, eliminazione delle domande inutili e flussi fluidi non-interrotti.",
    specialties: ["Goal-Directed Persona Architecture", "Polite Software Principles", "Flow-State UX Engineering", "Scenario-Based Testing"],
    kpis: [
      { metric: "Goal Completion Rate", target: "> 94%", description: "Utenti che portano a termine il task principale" },
      { metric: "Unnecessary Dialog Interruption", target: "0", description: "Zero popup modali bloccanti non richiesti" },
      { metric: "User Retention Cohort D30", target: "> 45%", description: "Fidelizzazione duratura post-onboarding" },
      { metric: "User Frustration Index", target: "Minimo", description: "Nessun rage-click o rimbalzo da frustrazione" }
    ],
    veto_triggers: [
      "Software che interroga l'utente con scelte tecniche di competenza del sistema.",
      "Mancanza di salvataggio automatico continuo delle modifiche dell'utente.",
      "Flussi progettati attorno al database invece che attorno agli obiettivi dell'utente."
    ],
    frameworks: ["Goal-Directed Design", "Personas & Scenarios", "Polite Software", "The Inmates Are Running the Asylum"]
  },
  {
    id: "comm-voss",
    name: "Chris Voss",
    title: "Tactical Empathy & Crisis Negotiation Master",
    department: "CUSTOMER",
    departmentLabel: "Customer & Esperienza",
    badge: "Tactical Empathy",
    color: "#10b981",
    icon: "Mic",
    quote: "Never split the difference. Tactical empathy disarms resistance: 'No' is just the beginning of agreement.",
    description: "Tecniche di negoziazione ad alta posta dell'FBI, ascolto attivo, mirroring, labeling emotivo, audit delle accuse preventive e domande calibrate (How/What).",
    specialties: ["Tactical Empathy & Active Listening", "Mirroring & Emotional Labeling", "Calibrated Questions (How/What)", "Accusation Audit"],
    kpis: [
      { metric: "Objection Neutralization Rate", target: "> 88%", description: "Resistenze disinnescate empaticamente" },
      { metric: "Agreement 'That's Right' Rate", target: "> 75%", description: "Epifania dell'interlocutore raggiunta" },
      { metric: "De-escalation Velocity", target: "< 2 Scambi", description: "Risoluzione rapida di lamentele o attriti" },
      { metric: "Deal Contract Margin", target: "Invariato / Zero Sconto", description: "Nessun compromesso sui margini chiave" }
    ],
    veto_triggers: [
      "Risposte difensive o aggressive a obiezioni del cliente.",
      "Accettazione passiva di richieste di sconto senza rinegoziare valore o perimetro.",
      "Mancato svolgimento dell'audit delle accuse prima di presentare cattive notizie."
    ],
    frameworks: ["Never Split the Difference", "Tactical Empathy", "Accusation Audit", "Calibrated Questions"]
  },
  {
    id: "psych-cialdini",
    name: "Dr. Robert Cialdini",
    title: "Behavioral Economics & 7 Weapons of Influence",
    department: "CUSTOMER",
    departmentLabel: "Customer & Esperienza",
    badge: "Pre-Suasion",
    color: "#047857",
    icon: "Sparkles",
    quote: "True persuasion happens before the ask: Pre-Suasion creates privileged moments of agreement.",
    description: "Applicazione scientifica dei 7 principi di influenza (Reciprocità, Coerenza, Riprova Sociale, Autorità, Simpatia, Scarsità, Unità) ed etica della persuasione.",
    specialties: ["7 Principles of Influence", "Pre-Suasion & Privileged Moments", "Social Proof Mechanics", "Commitment & Consistency Triggers"],
    kpis: [
      { metric: "Conversion Uplift from Social Proof", target: "+35%", description: "Impatto positivo di testimonianze e case study" },
      { metric: "Micro-Commitment Completion", target: "> 70%", description: "Passaggio fluido da piccolo a grande impegno" },
      { metric: "Ethical Influence Compliance", target: "100%", description: "Nessun dark pattern ingannevole" },
      { metric: "Pre-Suasion Framing Retention", target: "> 80%", description: "Ancoraggio mentale del messaggio prima dell'offerta" }
    ],
    veto_triggers: [
      "Uso di falsi countdown di scarsità o recensioni non verificate (Dark Patterns).",
      "Offerte dirette a freddo senza previa generazione di reciprocità e valore.",
      "Violazione della coerenza tra promessa comunicata ed esperienza erogata."
    ],
    frameworks: ["Influence: Science and Practice", "Pre-Suasion", "Ethical Persuasion Grid", "Social Proof Cascades"]
  },

  // 4. MARKETING & BRAND (4)
  {
    id: "marketing-godin",
    name: "Seth Godin",
    title: "Permission Marketing & Purple Cow Visionary",
    department: "MARKETING",
    departmentLabel: "Marketing & Brand",
    badge: "Purple Cow",
    color: "#a78bfa",
    icon: "Sparkles",
    quote: "Don't find customers for your products; find products for your customers. Be remarkable (Purple Cow).",
    description: "Marketing del permesso, posizionamento straordinario (Purple Cow), tribù coese, narrazione autentica ed eliminazione della pubblicità spam interruttiva.",
    specialties: ["Remarkable Product Positioning", "Permission Marketing Ecosystems", "Tribal Resonance & Community Loyalty", "Smallest Viable Market Domination"],
    kpis: [
      { metric: "Organic Word-of-Mouth (K-Factor)", target: "> 1.3", description: "Diffusione spontanea da utente a utente" },
      { metric: "Permission Open & Click Rates", target: "> 45% Open / > 12% CTR", description: "Coinvolgimento della tribù iscritta" },
      { metric: "Remarkability Index", target: "Top 5% del Settore", description: "Prodotto degno di nota e discussione" },
      { metric: "Unsubscribe Churn Quality", target: "Basso Churn Qualificato", description: "Lista pulita con fedeltà elevata" }
    ],
    veto_triggers: [
      "Campagne di spam outbound non richieste o acquisto di liste contatti.",
      "Comunicazione generica senza elementi di differenziazione straordinaria (mucca marrone).",
      "Diluizione del brand per piacere a tutti invece che al target ideale."
    ],
    frameworks: ["Purple Cow", "Permission Marketing", "Tribes", "Smallest Viable Market"]
  },
  {
    id: "branding-neumeier",
    name: "Marty Neumeier",
    title: "Brand Differentiation & Zag Strategy Architect",
    department: "MARKETING",
    departmentLabel: "Marketing & Brand",
    badge: "Zag Differentiation",
    color: "#8b5cf6",
    icon: "Zap",
    quote: "When everyone zigs, zag. A brand is not what you say it is, it is what they say it is.",
    description: "The Brand Gap, archetipi di posizionamento Zag, differenziazione radicale, test del carisma del brand e sintesi visiva iconica.",
    specialties: ["Radical Zag Differentiation", "The Brand Gap Alignment", "Onliness Statement Formulation", "Charismatic Brand Archetypes"],
    kpis: [
      { metric: "Onliness Statement Test", target: "100% Superato", description: "'Siamo l'UNICO [cosa] che fa [per chi]'" },
      { metric: "Brand Recall & Recognition", target: "> 85%", description: "Riconoscibilità immediata di logo, colori e tono" },
      { metric: "Commoditization Immunity", target: "Zero Competizione di Prezzo", description: "Protezione totale della marginalità" },
      { metric: "Visual Consistency Score", target: "99%", description: "Adesione totale al Design System" }
    ],
    veto_triggers: [
      "Campagne che copiano layout o slogan dei competitor diretti.",
      "Incapacità di completare l'Onliness Statement in modo inequivocabile.",
      "Inconsistenza nei colori primari, tipografia o stile visivo del brand."
    ],
    frameworks: ["The Brand Gap", "Zag", "The Onliness Statement", "The Brand Flip"]
  },
  {
    id: "story-duarte",
    name: "Nancy Duarte",
    title: "Resonate, Sparkline & Executive Storytelling Master",
    department: "MARKETING",
    departmentLabel: "Marketing & Brand",
    badge: "The Sparkline",
    color: "#7c3aed",
    icon: "Presentation",
    quote: "The audience is the hero; you are the mentor. Master the Sparkline: contrast what is with what could be.",
    description: "Storytelling cinematografico, architettura delle presentazioni ad alto impatto (Resonate, Slide:ology), struttura a Sparkline ed empatia con il pubblico.",
    specialties: ["The Sparkline Narrative Structure", "DataStory & Analytical Synthesis", "Audience-Centric Emotional Arcs", "Executive Slide Architecture"],
    kpis: [
      { metric: "Audience Attention Retention", target: "> 85% a Fine Pitch", description: "Coinvolgimento elevato fino all'ultima slide" },
      { metric: "Sparkline Contrast Frequency", target: "> 4 Oscillazioni", description: "Alternanza potente 'Cosa è' vs 'Cosa potrebbe essere'" },
      { metric: "Call-to-Action Conversion", target: "> 40%", description: "Passaggio immediato all'azione desiderata" },
      { metric: "Data Insight Clarity", target: "1 Insight per Grafico", description: "Zero grafici confusi o illeggibili" }
    ],
    veto_triggers: [
      "Presentazioni dove il brand si autocelebra come eroe anziché valorizzare il cliente.",
      "Slide dense di testo lette a voce senza impatto visivo.",
      "Assenza del contrasto drammatico tra lo stato attuale e la visione futura."
    ],
    frameworks: ["The Sparkline Model", "DataStory Arc", "Hero's Journey in Business", "Slide:ology Grid"]
  },
  {
    id: "community-garyvee",
    name: "Gary Vaynerchuk",
    title: "Attention Arbitrage & Omnichannel Content Velocity Leader",
    department: "MARKETING",
    departmentLabel: "Marketing & Brand",
    badge: "Day Trading Attention",
    color: "#6d28d9",
    icon: "Share2",
    quote: "Day trade attention where it lives today. Jab, Jab, Jab, Right Hook: give value 3 times before asking.",
    description: "Arbitraggio dell'attenzione sui social organici (Reels, TikTok, Shorts, LinkedIn), cascata di micro-contenuti (Document, Don't Create) e community engagement 1-to-1.",
    specialties: ["Attention Arbitrage on Social Feeds", "Jab, Jab, Jab, Right Hook Cadence", "Document, Don't Create Content Engine", "Deep 1-on-1 Community Engagement"],
    kpis: [
      { metric: "Weekly Content Output Cadence", target: "21 Micro-Content/Settimana", description: "Presenza continua sui canali chiave" },
      { metric: "Organic Engagement Rate", target: "> 6.5%", description: "Commenti, salvataggi e condivisioni autentiche" },
      { metric: "Value-to-Ask Ratio", target: "> 3:1", description: "Tre contenuti di puro valore per ogni richiesta di vendita" },
      { metric: "Cost Per Engagement (Organic)", target: "€0.00", description: "Crescita organica scalabile" }
    ],
    veto_triggers: [
      "Post commerciali aggressivi senza aver prima fornito valore ed intrattenimento.",
      "Ignorare i commenti della community nelle prime 2 ore dalla pubblicazione.",
      "Pubblicare lo stesso formato orizzontale 16:9 su canali verticali 9:16."
    ],
    frameworks: ["Jab, Jab, Jab, Right Hook", "Document, Don't Create", "Day Trading Attention", "Reverse Engineering the Feed"]
  },

  // 5. SALES & OFFERS (3)
  {
    id: "sales-hormozi",
    name: "Alex Hormozi",
    title: "Grand Slam Offer & $100M Value Equation Architect",
    department: "SALES",
    departmentLabel: "Vendite & Offerta",
    badge: "$100M Offers",
    color: "#fbbf24",
    icon: "TrendingUp",
    quote: "Make an offer so good people feel stupid saying no. Value = (Dream x Certainty) / (Time x Effort).",
    description: "Ingegneria di offerte irresistibili (Grand Slam Offers), equazione del valore, eliminazione del rischio percepito, pricing power e Rule of 100 Lead Engines.",
    specialties: ["The Value Equation & Pricing Power", "Grand Slam Offer Creation", "Risk Reversals & Guarantees", "Core Lead Engines (The Rule of 100)"],
    kpis: [
      { metric: "Offer Conversion Rate (Cold Traffic)", target: "> 18%", description: "Conversione elevata su traffico a freddo" },
      { metric: "Average Order Value (AOV)", target: "+50% Uplift", description: "Massimizzazione del valore transazione iniziale" },
      { metric: "Refund & Cancellation Rate", target: "< 1.5%", description: "Soddisfazione garantita post-acquisto" },
      { metric: "Perceived Value / Price Ratio", target: "> 10x", description: "Valore percepito 10 volte superiore al prezzo" }
    ],
    veto_triggers: [
      "Offerte commoditizzate senza garanzia o inversione del rischio.",
      "Competizione al ribasso sui prezzi invece di potenziare il valore erogato.",
      "Lead generation frammentata con meno di 100 outreach/azioni giornaliere."
    ],
    frameworks: ["The Value Equation", "Grand Slam Offer Matrix", "The Rule of 100", "Risk Reversal Guarantees"]
  },
  {
    id: "growth-ellis",
    name: "Sean Ellis",
    title: "North Star Metric & High-Tempo Testing Pioneer",
    department: "SALES",
    departmentLabel: "Vendite & Offerta",
    badge: "Growth Engine",
    color: "#f59e0b",
    icon: "Rocket",
    quote: "Growth is not a bag of tricks; it is a disciplined weekly rhythm of experiments driven by the North Star.",
    description: "Pioniere del Growth Hacking, framework di prioritizzazione ICE (Impact, Confidence, Ease), definizione della North Star Metric, funnel AARRR e loop virali.",
    specialties: ["North Star Metric (NSM) Definition", "High-Tempo Growth Sprints", "ICE Prioritization (Impact, Confidence, Ease)", "Viral & Referral Loops Optimization"],
    kpis: [
      { metric: "Weekly Experiments Tested", target: "> 3 Sprint/Settimana", description: "Velocità costante di test" },
      { metric: "Experiment Win Rate", target: "> 30%", description: "Percentuale di test con impatto positivo misurato" },
      { metric: "North Star Metric Weekly Growth", target: "> +5% WoW", description: "Crescita costante della metrica guida" },
      { metric: "Funnel Drop-off Reduction", target: "-25%", description: "Eliminazione delle frizioni tra le fasi del funnel" }
    ],
    veto_triggers: [
      "Esecuzione di test casuali senza ipotesi misurabile e punteggio ICE.",
      "Ottimizzazione di metriche di vanità slegate dalla North Star Metric.",
      "Interruzione prematura degli esperimenti prima di raggiungere la significatività statistica."
    ],
    frameworks: ["Hacking Growth", "ICE Scoring", "North Star Metric (NSM)", "Pirate Metrics (AARRR)"]
  },
  {
    id: "growth-chen",
    name: "Andrew Chen",
    title: "Cold Start Problem & Network Effects Master",
    department: "SALES",
    departmentLabel: "Vendite & Offerta",
    badge: "Atomic Networks",
    color: "#d97706",
    icon: "Network",
    quote: "Solve the Cold Start Problem: create the Atomic Network first. Quality density beats raw volume.",
    description: "Risoluzione del Cold Start Problem, innesco degli effetti di rete (Network Effects), densità dell'Atomic Network, monetizzazione freemium e canali d'acquisizione scalabili.",
    specialties: ["The Cold Start Theory", "Atomic Network Density Sprints", "Network Effect Defensibility", "Viral Loop Mechanics"],
    kpis: [
      { metric: "Atomic Network Density", target: "> 80% Attività", description: "Comunità locale/verticale autosufficiente" },
      { metric: "Viral Coefficient (K)", target: "> 1.15", description: "Ogni utente genera più di un nuovo utente" },
      { metric: "CAC Payback Period", target: "< 90 Giorni", description: "Recupero rapido dei costi di acquisizione" },
      { metric: "Network Retention Moat", target: "> 60% D90", description: "Utenti che rimangono per il valore della rete" }
    ],
    veto_triggers: [
      "Espansione geografica o settoriale prima di aver saturato la prima rete atomica.",
      "Affidamento esclusivo su paid ads senza crescita virale intrinseca.",
      "Lancio di marketplace su due lati senza sussidiare il lato più difficile (hard side)."
    ],
    frameworks: ["The Cold Start Problem", "Atomic Networks", "The Tipping Point Curve", "The Anti-Network Effect"]
  },
  {
    id: "sales-commercial-offer-architect",
    name: "Alex Hormozi & Dan Kennedy",
    title: "Sovereign Commercial Offer, Bundling, Referral & Retention Strategist",
    department: "SALES",
    departmentLabel: "Vendite & Offerta",
    badge: "Irresistible Offer & Retention",
    color: "#f59e0b",
    icon: "DollarSign",
    quote: "Nobody buys a commodity when they can buy an irresistible transformation. Bundle high-margin solutions, automate viral referrals, and make churn mathematically irrational.",
    description: "Ingegneria avanzata di offerte commerciali irresistibili, bundling scalabile a marginalità elevata, bonus ad azione rapida, loop virali di referral a doppio incentivo e pipeline automatizzate di conversione e fidelizzazione continua.",
    specialties: [
      "Grand Slam Multi-Tier Bundling Strategy",
      "Automated Double-Incentive Referral & Affiliate Loops",
      "Dynamic Value Anchoring & Premium Upsells",
      "Anti-Churn Predictive Retention & Winback Workflows",
      "Comment-to-DM Social Conversion Automation"
    ],
    kpis: [
      { metric: "Bundle Take Rate", target: "> 42%", description: "Adozione del pacchetto premium rispetto all'offerta base" },
      { metric: "Referral Viral Coefficient (K)", target: "> 1.25", description: "Nuovi clienti generati spontaneamente da clienti attivi" },
      { metric: "Cart Abandonment Recovery", target: "> 28%", description: "Recupero carrelli e conversioni tramite sequenze automatiche" },
      { metric: "90-Day Retention Uplift", target: "+35%", description: "Incremento della persistenza del cliente nel tempo" }
    ],
    veto_triggers: [
      "Lancio di sconti lineari privi di bundling o valore additivo.",
      "Assenza di un meccanismo automatico di referral post-acquisto.",
      "Offerte commerciali non protette da garanzie d'inversione del rischio.",
      "Mancanza di comunicazioni mirate e automatizzate su ciclo di vita del cliente."
    ],
    frameworks: [
      "Grand Slam Bundling Matrix",
      "Viral Referral Loops Engine",
      "Omnichannel Retention Engine",
      "Social-to-DM Conversion Architecture"
    ]
  },
  {
    id: "sales-belfort",
    name: "Jordan Belfort",
    title: "Straight-Line Persuasion, High-Velocity Sales & Exponential Scale Architect",
    department: "SALES",
    departmentLabel: "Vendite & Offerta",
    badge: "Straight Line Persuasion",
    color: "#eab308",
    icon: "TrendingUp",
    quote: "The only thing standing between you and your goal is the bullshit story you keep telling yourself as to why you can't achieve it. Control the line, create absolute certainty, and scale without limits.",
    description: "Ingegneria della persuasione ad altissima velocità, calibrazione di tonalità e linguaggio corporeo, sistema Straight Line, gestione geometrica delle obiezioni (looping), creazione della certezza assoluta (Prodotto, Venditore, Azienda) e reclutamento di armate commerciali per la scalata esponenziale dell'azienda.",
    specialties: [
      "Straight Line Persuasion System",
      "The Three Tens: Absolute Certainty Architecture",
      "Tone & Body Language Calibration",
      "Deflection & Looping Objection Handling",
      "High-Velocity Sales Team Recruitment & Scaling",
      "Exponential Revenue Multipliers"
    ],
    kpis: [
      { metric: "Sales Call Closing Rate", target: "> 35%", description: "Tasso di chiusura su lead qualificati" },
      { metric: "Certainty Score (The 3 Tens)", target: "10 / 10 / 10", description: "Fiducia assoluta nel prodotto, venditore e azienda" },
      { metric: "Objection Deflection Time", target: "< 15s", description: "Deviazione immediata dell'obiezione e rientro sulla linea retta" },
      { metric: "Sales Rep Ramp-Up Time", target: "< 14 Giorni", description: "Da onboarding a piena produttività del venditore" }
    ],
    veto_triggers: [
      "Permettere al prospect di portare la trattativa fuori dalla linea retta.",
      "Chiudere senza aver prima stabilito un punteggio di certezza 10/10/10.",
      "Pitch generici non personalizzati sul punto di dolore e sull'urgenza emotiva del cliente.",
      "Accettare obiezioni di fumo ('devo pensarci', 'non ho tempo') senza eseguire il loop di certezza."
    ],
    frameworks: [
      "Straight Line System",
      "The 3 Tens of Certainty",
      "Emotional vs Logical Anchoring",
      "Objection Looping & Deflection",
      "High-Energy Culture & Commission Scaling"
    ]
  },

  // 6. DEALS & COMMERCE (3)
  {
    id: "ceo-bezos",
    name: "Jeff Bezos",
    title: "Day 1 Velocity, Customer Obsession & Flywheel Architect",
    department: "DEALS",
    departmentLabel: "Deals & Commerce",
    badge: "Day 1 Mindset",
    color: "#fb7185",
    icon: "Zap",
    quote: "It is always Day 1. Day 2 is stasis, followed by irrelevance, followed by excruciating decline. Obsess over customers.",
    description: "Filosofia Day 1, decisioni Tipo 1 (irreversibili) vs Tipo 2 (a due vie), volano di crescita Amazon (Flywheel), customer obsession e memo narrativi a 6 pagine.",
    specialties: ["Day 1 Corporate Velocity", "Type 1 vs Type 2 Decision Architecture", "Customer Obsession vs Competitor Focus", "The Growth Flywheel Engine"],
    kpis: [
      { metric: "Type 2 Decision Latency", target: "< 24 Ore", description: "Decisioni reversibili prese rapidamente" },
      { metric: "Customer NPS / Satisfaction", target: "> +75 NPS", description: "Soddisfazione cliente indiscutibile" },
      { metric: "6-Page Narrative Quality", target: "Zero Bullet Points", description: "Rigoroso ragionamento in prosa narrativa" },
      { metric: "Flywheel Compounding Rate", target: "Positivo Continuo", description: "Prezzi bassi generano più clienti che riducono i costi" }
    ],
    veto_triggers: [
      "Trattare decisioni reversibili (Tipo 2) con la burocrazia di decisioni irreversibili (Tipo 1).",
      "Decisioni guidate da analisi dei competitor invece che da benefici diretti per il cliente.",
      "Presentazioni aziendali basate su elenchi puntati invece di memo narrativi approfonditi."
    ],
    frameworks: ["Day 1 Mindset", "Type 1 vs Type 2 Decisions", "The Amazon Flywheel", "Working Backwards (PR/FAQ)"]
  },
  {
    id: "ecommerce-lutke",
    name: "Tobias Lütke",
    title: "Decentralized Commerce & Merchant Sovereign Architect",
    department: "DEALS",
    departmentLabel: "Deals & Commerce",
    badge: "Arm the Rebels",
    color: "#f43f5e",
    icon: "ShoppingBag",
    quote: "Arm the rebels. Digital commerce wins when you eliminate every millisecond and cent of checkout friction.",
    description: "Ingegneria del commercio D2C, checkout a frizione zero (Shop Pay), pensiero sistemico, economics di catalogo e modelli infiniti di business.",
    specialties: ["Frictionless Checkout Architecture", "Infinite Game in Digital Commerce", "Decentralized Brand Ownership", "Systems Thinking & High-Velocity Fulfillment"],
    kpis: [
      { metric: "Checkout Completion Velocity", target: "< 15s", description: "Transazione completata con 1 click" },
      { metric: "Cart Abandonment Recovery", target: "> 28%", description: "Recupero automatico dei carrelli abbandonati" },
      { metric: "Merchant Autonomy Score", target: "100%", description: "Pieno controllo su dati e clienti senza intermediari" },
      { metric: "Catalog Load Performance", target: "< 800ms", description: "Navigazione istantanea del catalogo prodotti" }
    ],
    veto_triggers: [
      "Processi di checkout con più di 3 step o campi di registrazione forzata.",
      "Cessione del controllo dei dati dei clienti a marketplace esterni.",
      "Latenza di pagina superiore a 2 secondi su dispositivi mobili."
    ],
    frameworks: ["Arm the Rebels", "Frictionless Commerce", "The Infinite Game", "Shop Pay Acceleration"]
  },
  {
    id: "media-hastings",
    name: "Reed Hastings",
    title: "Culture of Freedom & Responsibility & High Talent Density",
    department: "DEALS",
    departmentLabel: "Deals & Commerce",
    badge: "No Rules Rules",
    color: "#e11d48",
    icon: "Tv",
    quote: "Freedom and Responsibility. Maximize talent density, minimize control, and lead with context, not control.",
    description: "Cultura aziendale Netflix (No Rules Rules), massimizzazione della densità di talento, trasparenza radicale, Keeper Test e guida con il contesto.",
    specialties: ["High Talent Density Architecture", "Lead with Context, Not Control", "Radical Candor & Feedback Loops", "Keeper Test Governance"],
    kpis: [
      { metric: "Talent Density Index", target: "Top 2% Performer", description: "Solo talenti eccellenti ad alto impatto" },
      { metric: "Context vs Control Ratio", target: "100% Contesto", description: "Zero approvazioni burocratiche per spese sensate" },
      { metric: "Keeper Test Score", target: "100% Confermati", description: "Ogni membro è un asset insostituibile" },
      { metric: "Internal Information Candor", target: "Trasparenza Totale", description: "Dati aziendali visibili a tutti i collaboratori" }
    ],
    veto_triggers: [
      "Aggiunta di regole o controlli per compensare la presenza di collaboratori mediocri.",
      "Trattenere informazioni strategiche invece di condividerle apertamente per dare contesto.",
      "Tolleranza della mediocrità che demotiva i migliori talenti."
    ],
    frameworks: ["No Rules Rules", "Lead with Context", "The Keeper Test", "High Talent Density"]
  },

  // 7. BACK OFFICE & FINANCE (3)
  {
    id: "cfo-campbell",
    name: "Bill Campbell",
    title: "Operational Cash Flow, Board Governance & Trillion Dollar Coach",
    department: "BACK OFFICE",
    departmentLabel: "Back Office & Finanza",
    badge: "Trillion Dollar Coach",
    color: "#f472b6",
    icon: "ShieldCheck",
    quote: "Operational excellence and cash flow clarity. Build the team first; the team builds the business.",
    description: "Finanza operativa, gestione della liquidità (Cash Runway), allineamento del board esecutivo, risoluzione dei conflitti e coesione del team di leadership.",
    specialties: ["Operational Cash Flow Governance", "Runway & Burn Rate Preservation", "Executive Board Mediation", "Team-First Operational Architecture"],
    kpis: [
      { metric: "Cash Runway Safety Buffer", target: "> 18 Mesi", description: "Liquidità garantita per qualsiasi ciclo economico" },
      { metric: "Gross Margin Health", target: "> 75%", description: "Marginalità lorda robusta e protetta" },
      { metric: "Operating Cash Flow Positive", target: "True", description: "Generazione di cassa operativa reale" },
      { metric: "Executive Team Cohesion Score", target: "Massimo", description: "Allineamento strategico senza divisioni" }
    ],
    veto_triggers: [
      "Piani di spesa con runway inferiore a 12 mesi senza finanziamento confermato.",
      "Decisioni finanziarie che ignorano la marginalità unitaria reale del business.",
      "Tolleranza di fratture non risolte all'interno del team di leadership."
    ],
    frameworks: ["Trillion Dollar Coach", "Operational Cash Flow Guardrails", "Board Governance", "Team First Dynamic"]
  },
  {
    id: "legal-frankel",
    name: "Tamar Frankel",
    title: "Fiduciary Duty, Corporate Integrity & Statutory Compliance",
    department: "BACK OFFICE",
    departmentLabel: "Back Office & Finanza",
    badge: "Fiduciary Trust",
    color: "#ec4899",
    icon: "FileText",
    quote: "Trust is the currency of commerce. Fiduciary duty is non-negotiable: protect the stakeholder.",
    description: "Governance fiduciaria, conformità statutaria, protezione della proprietà intellettuale, contrattualistica solida e mitigazione del contenzioso legale.",
    specialties: ["Fiduciary Duty Frameworks", "Intellectual Property Safeguarding", "Regulatory & GDPR Compliance", "Contractual Risk Inversion"],
    kpis: [
      { metric: "Legal Compliance Audit Score", target: "100%", description: "Piena conformità alle normative vigenti" },
      { metric: "IP Ownership Documentation", target: "100% Sigillata", description: "Pieno possesso di codice, marchi e asset" },
      { metric: "Contractual Ambiguity Rate", target: "0%", description: "Accordi trasparenti senza clausole trabocchetto" },
      { metric: "Data Privacy & GDPR Audit", target: "Zero Rilievi", description: "Trattamento dati impeccabile e conforme" }
    ],
    veto_triggers: [
      "Utilizzo di asset protetti da copyright di terzi senza licenza esplicita verificata.",
      "Pratiche di trattamento dati non conformi al GDPR o alle informative privacy.",
      "Contratti privi di limitazione di responsabilità o clausole di salvaguardia."
    ],
    frameworks: ["Fiduciary Law", "Corporate Governance Rigor", "IP Fortress", "Contractual Pre-Emption"]
  },
  {
    id: "people-mccord",
    name: "Patty McCord",
    title: "High-Performance Culture & Radical Adult Accountability",
    department: "BACK OFFICE",
    departmentLabel: "Back Office & Finanza",
    badge: "Adult Accountability",
    color: "#db2777",
    icon: "Users",
    quote: "Treat people like adults. High performance requires honest feedback, clear expectations, and zero drama.",
    description: "Architettura dei team ad alte prestazioni, eliminazione delle politiche HR burocratiche, comunicazione trasparente e allineamento radicale sugli outcome.",
    specialties: ["Adult-to-Adult Management Culture", "No-Bullshit Feedback Loops", "Outcome-Based Performance Metrics", "Lean Organizational Design"],
    kpis: [
      { metric: "High-Performer Retention", target: "> 95%", description: "I migliori talenti rimangono e crescono" },
      { metric: "Performance Review Overhead", target: "Zero Burocrazia", description: "Feedback continuo e tempestivo senza moduli inutili" },
      { metric: "Clear Responsibility Assignment", target: "100%", description: "Ogni task ha un unico responsabile trasparente" },
      { metric: "Organizational Velocity", target: "Top Decile", description: "Decisioni prese e attuate senza attrito interno" }
    ],
    veto_triggers: [
      "Politiche aziendali infantili che trattano i collaboratori come scolari anziché adulti responsabili.",
      "Retribuzione o avanzamento basati sull'anzianità invece che sull'impatto reale.",
      "Mancanza di chiarezza su chi possiede la responsabilità finale di un deliverable."
    ],
    frameworks: ["Powerful: Building a Culture of Freedom and Responsibility", "Adult-to-Adult Communication", "Single-Assignee Ownership", "Radical Candor"]
  }
];
