import { useState, useMemo } from "react";
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Brain,
  Cpu,
  HeartHandshake,
  Sparkles,
  TrendingUp,
  Briefcase,
  Layers,
  Zap,
  Target,
  X,
  Plus,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  SOVEREIGN_DEPARTMENTS,
  SOVEREIGN_AGENTS,
  type SovereignAgent,
  type SovereignDepartment,
} from "@/lib/sovereign-council-data";
import { useDialogActions } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";

const DEPT_ICONS: Record<string, typeof Cpu> = {
  all: Layers,
  OPERATIONS: Cpu,
  INTELLIGENCE: Brain,
  CUSTOMER: HeartHandshake,
  MARKETING: Sparkles,
  SALES: TrendingUp,
  DEALS: Briefcase,
  "BACK OFFICE": ShieldCheck,
};

export function SovereignCouncil() {
  const { openNewIssue } = useDialogActions();
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeDrawerAgent, setActiveDrawerAgent] = useState<SovereignAgent | null>(null);
  const [mungerVetoOpen, setMungerVetoOpen] = useState<boolean>(false);

  // Filter agents
  const filteredAgents = useMemo(() => {
    return SOVEREIGN_AGENTS.filter((agent) => {
      const matchDept = selectedDept === "all" || agent.department === selectedDept;
      if (!matchDept) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.title.toLowerCase().includes(q) ||
        agent.quote.toLowerCase().includes(q) ||
        agent.departmentLabel.toLowerCase().includes(q) ||
        agent.badge.toLowerCase().includes(q) ||
        agent.specialties.some((s) => s.toLowerCase().includes(q)) ||
        agent.frameworks.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [selectedDept, searchQuery]);

  // Compute exact count for each department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SOVEREIGN_AGENTS.length };
    SOVEREIGN_DEPARTMENTS.forEach((dept) => {
      if (dept.id !== "all") {
        counts[dept.id] = SOVEREIGN_AGENTS.filter((a) => a.department === dept.id).length;
      }
    });
    return counts;
  }, []);

  const handleCreateTaskForAgent = (agent: SovereignAgent) => {
    openNewIssue();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/60 px-6 py-6 bg-card/40 backdrop-blur-md sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {SOVEREIGN_AGENTS.length} Leader in Sessione
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                SOP 01 • Sovereign Council
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Consiglio dei {SOVEREIGN_AGENTS.length} Leader Mondiali
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Direttive esecutive, modelli mentali e KPI non negoziabili governati dal Veto di Charlie Munger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMungerVetoOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/25 transition-all shadow-sm"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Veto di Munger & Pre-Mortem</span>
            </button>
            <Button
              onClick={() => openNewIssue()}
              className="gap-2 bg-primary text-primary-foreground font-medium text-xs px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              Nuovo Task Sovrano
            </Button>
          </div>
        </div>

        {/* Filter chips & Search bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mt-6">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SOVEREIGN_DEPARTMENTS.map((dept) => {
              const Icon = DEPT_ICONS[dept.id] || Layers;
              const isSelected = selectedDept === dept.id;
              const count = departmentCounts[dept.id] ?? dept.count;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{dept.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca leader, modelli mentali..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/40 border border-border/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Grid of Agents */}
      <div className="p-6">
        {filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl p-8">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Nessun leader trovato</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Nessun agente corrisponde ai filtri selezionati o alla query di ricerca "{searchQuery}".
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDept("all");
                setSearchQuery("");
              }}
              className="mt-4 text-xs"
            >
              Ripristina Filtri
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-all duration-200 p-5 shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="relative h-12 w-12 rounded-full overflow-hidden shrink-0 border-2 bg-muted flex items-center justify-center font-bold text-sm"
                        style={{ borderColor: agent.color }}
                      >
                        <img
                          src={`/assets/avatars/${agent.id}.jpg`}
                          alt={agent.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="text-muted-foreground font-mono text-xs">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                          {agent.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {agent.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badge & Dept */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
                      style={{
                        backgroundColor: `${agent.color}15`,
                        color: agent.color,
                        border: `1px solid ${agent.color}35`,
                      }}
                    >
                      {agent.badge}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                      {agent.departmentLabel}
                    </span>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-xs text-muted-foreground/90 italic border-l-2 pl-2.5 py-0.5 mb-3 line-clamp-2" style={{ borderColor: agent.color }}>
                    "{agent.quote}"
                  </blockquote>

                  {/* Frameworks tags */}
                  <div className="flex items-center gap-1 flex-wrap mb-4">
                    {agent.frameworks.slice(0, 2).map((fw, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded border border-border/40 truncate max-w-[130px]"
                      >
                        {fw}
                      </span>
                    ))}
                    {agent.frameworks.length > 2 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        +{agent.frameworks.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono text-xs text-foreground font-semibold">
                      {agent.kpis.length}
                    </span>{" "}
                    KPIs
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveDrawerAgent(agent)}
                      className="text-xs font-medium text-foreground/80 hover:text-foreground px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      Dettagli & KPIs
                    </button>
                    <button
                      onClick={() => handleCreateTaskForAgent(agent)}
                      className="inline-flex items-center justify-center p-1.5 rounded-md text-primary-foreground transition-colors"
                      style={{ backgroundColor: agent.color }}
                      title={`Crea task per ${agent.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Agent Details */}
      {activeDrawerAgent && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-border flex items-start justify-between gap-4 sticky top-0 bg-card/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3.5">
                <div
                  className="h-14 w-14 rounded-full overflow-hidden shrink-0 border-2 bg-muted flex items-center justify-center font-bold"
                  style={{ borderColor: activeDrawerAgent.color }}
                >
                  <img
                    src={`/assets/avatars/${activeDrawerAgent.id}.jpg`}
                    alt={activeDrawerAgent.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-muted-foreground font-mono text-sm">
                    {activeDrawerAgent.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {activeDrawerAgent.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeDrawerAgent.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${activeDrawerAgent.color}15`,
                        color: activeDrawerAgent.color,
                        border: `1px solid ${activeDrawerAgent.color}35`,
                      }}
                    >
                      {activeDrawerAgent.badge}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {activeDrawerAgent.departmentLabel}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveDrawerAgent(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Quote */}
              <div
                className="p-4 rounded-xl border bg-muted/20"
                style={{ borderColor: `${activeDrawerAgent.color}40` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: activeDrawerAgent.color }}>
                  Modello Mentale Fondativo
                </div>
                <p className="text-sm font-medium text-foreground italic">
                  "{activeDrawerAgent.quote}"
                </p>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Mandato Esecutivo & Ruolo
                </h4>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {activeDrawerAgent.description}
                </p>
              </div>

              {/* Specialties */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Aree di Competenza Chiave
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {activeDrawerAgent.specialties.map((spec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-foreground/90 bg-muted/40 px-3 py-2 rounded-lg border border-border/50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPIs Table */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  Obiettivi e Metriche KPI Non Negoziabili
                </h4>
                <div className="border border-border/70 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/70">
                      <tr>
                        <th className="px-3 py-2">Metrica</th>
                        <th className="px-3 py-2">Target</th>
                        <th className="px-3 py-2">Misurazione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {activeDrawerAgent.kpis.map((kpi, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium text-foreground">
                            {kpi.metric}
                          </td>
                          <td className="px-3 py-2 font-mono text-primary font-semibold">
                            {kpi.target}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-[11px]">
                            {kpi.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Veto Triggers */}
              <div>
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Condizioni di Veto Istantaneo (Munger Gate)
                </h4>
                <div className="space-y-1.5">
                  {activeDrawerAgent.veto_triggers.map((trigger, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs bg-red-500/5 text-red-200 border border-red-500/20 p-2.5 rounded-lg leading-snug"
                    >
                      <span className="text-red-400 font-bold shrink-0">•</span>
                      <span>{trigger}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 sticky bottom-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDrawerAgent(null)}
                className="text-xs"
              >
                Chiudi
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setActiveDrawerAgent(null);
                  handleCreateTaskForAgent(activeDrawerAgent);
                }}
                className="gap-2 text-xs bg-primary text-primary-foreground font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Crea Task per {activeDrawerAgent.name}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Munger Veto Modal */}
      {mungerVetoOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-red-500/30 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setMungerVetoOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Charlie Munger Inversion & Veto Gate
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cancello di convalida collegiale ad opposizione preventiva
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-300 leading-relaxed mb-4">
              <strong>Regola Invariante:</strong> Nessun task, piano di lancio o campagna editoriale può procedere in stato 'In Esecuzione' se un'analisi pre-mortem rivela un rischio di rovina non mitigato o la violazione di uno dei veto trigger dei 25 Leader.
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Le 4 Condizioni di Blocco Assoluto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                  <strong className="text-foreground">1. Allucinazione Non Mitigata</strong>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Output sintetici non verificati rispetto al database fattuale della marca.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                  <strong className="text-foreground">2. Dark Patterns o Scarsità Falsa</strong>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Countdown ingannevoli o testimonianze inventate vietate categoricamente.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                  <strong className="text-foreground">3. Rischio di Rovina Finanziaria</strong>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Spesa ad acquisizione o burn rate non coperti da cassa operativa.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20">
                  <strong className="text-foreground">4. Single Point of Failure</strong>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    Architetture senza fallback degradato o ridondanza geografica.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMungerVetoOpen(false)}
                className="text-xs"
              >
                Ho compreso la regola di Veto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
