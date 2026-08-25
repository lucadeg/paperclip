import { useState } from "react";
import {
  Brain,
  FileCode,
  Compass,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Terminal,
  Activity,
  AlertTriangle,
  CircleDot,
  Check,
  Bot,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface CognitiveTraceProps {
  issue: {
    id: string;
    identifier?: string | null;
    title: string;
    description?: string | null;
    status: string;
    executionRunId?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  activeDirective?: {
    id: string;
    identifier: string;
    title: string;
    priority: string;
    rawInstructions: string;
  } | null;
  agent?: {
    id: string;
    name: string;
    role?: string;
    icon?: string | null;
    model?: string;
    adapterType?: string;
  } | null;
  workProducts?: Array<{
    id: string;
    title: string;
    kind: string;
    createdAt?: string | Date;
  }>;
}

export function IssueCognitiveTrace({
  issue,
  activeDirective,
  agent,
  workProducts = [],
}: CognitiveTraceProps) {
  const [tab, setTab] = useState<"understanding" | "context" | "workflow" | "io" | "analytics">("understanding");

  const modelName = agent?.model || (agent?.adapterType === "hermes_local" ? "Hermes Local / Proxima" : "Google Gemini / Hermes Swarm");

  // Calcolo tempo reale trascorso
  const createdAtMs = issue.createdAt ? new Date(issue.createdAt).getTime() : Date.now();
  const updatedAtMs = issue.updatedAt ? new Date(issue.updatedAt).getTime() : Date.now();
  const elapsedSeconds = Math.max(1, Math.round((updatedAtMs - createdAtMs) / 1000));
  const formattedDuration = elapsedSeconds > 60 
    ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s` 
    : `${elapsedSeconds}s`;

  // Determinazione dinamica dello stato degli step
  const status = issue.status || "todo";
  const isDone = status === "done";
  const isInProgress = status === "in_progress";
  const isInReview = status === "in_review";
  const isBlocked = status === "blocked";
  const isTodo = status === "todo";

  type StepState = "done" | "in_progress" | "blocked" | "pending";

  // Step 1: Analisi Requisiti & Direttiva
  const step1State: StepState = isTodo ? "in_progress" : "done";
  // Step 2: Progettazione, Strategia & Asset (Fasi 1-13)
  const step2State: StepState = isTodo ? "pending" : (isInProgress ? "in_progress" : (isInReview || isDone ? "done" : "pending"));
  // Step 3: Dispacciamento & Esecuzione Swarm (14° Workflow)
  const step3State: StepState = isBlocked ? "blocked" : (isInProgress ? "in_progress" : (isInReview || isDone ? "done" : "pending"));
  // Step 4: Sintesi Deliverable & Convalida Operatore
  const step4State: StepState = isDone ? "done" : (isInReview ? "in_progress" : "pending");

  function renderStepBadge(state: "done" | "in_progress" | "blocked" | "pending") {
    switch (state) {
      case "done":
        return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-2xs">COMPLETATO</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-2xs animate-pulse">IN CORSO</Badge>;
      case "blocked":
        return <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-2xs">BLOCCATO</Badge>;
      default:
        return <Badge variant="outline" className="border-border text-muted-foreground font-mono text-2xs">IN ATTESA</Badge>;
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Cognitive State & Workflow Trace
              </span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-2xs font-mono font-bold text-primary">
                Tracciamento Flusso Reale
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitoraggio reale di comprensione, file di contesto e avanzamento operativo dell'agente.
            </p>
          </div>
        </div>

        {agent && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{agent.name}</span>
            <span className="text-2xs text-muted-foreground font-mono">({modelName})</span>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 text-xs">
          <TabsTrigger value="understanding" className="gap-1.5 text-2xs sm:text-xs">
            <Compass className="h-3.5 w-3.5" />
            Comprensione
          </TabsTrigger>
          <TabsTrigger value="context" className="gap-1.5 text-2xs sm:text-xs">
            <FileCode className="h-3.5 w-3.5" />
            Contesto Letto
          </TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5 text-2xs sm:text-xs">
            <Layers className="h-3.5 w-3.5" />
            Workflow & Step
          </TabsTrigger>
          <TabsTrigger value="io" className="gap-1.5 text-2xs sm:text-xs">
            <FileCheck className="h-3.5 w-3.5" />
            Input & Output
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-2xs sm:text-xs">
            <Coins className="h-3.5 w-3.5" />
            Analytics & Costi
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COMPRENSIONE ED INTENTO */}
        <TabsContent value="understanding" className="mt-3 space-y-3">
          <div className="rounded-lg border border-border/60 bg-background p-3">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Direttiva Quadro Attiva
            </div>
            {activeDirective ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">{activeDirective.identifier}</span>
                  <span className="font-medium text-foreground">{activeDirective.title}</span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-2xs uppercase text-primary font-bold">
                    {activeDirective.priority}
                  </span>
                </div>
                <div className="rounded bg-muted/40 p-2.5 font-mono text-2xs text-muted-foreground mt-1 whitespace-pre-wrap">
                  {activeDirective.rawInstructions}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nessuna direttiva quadro associata. Il task è guidato dal prompt operatore e dal contesto del progetto.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-3">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground mb-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Sintesi Obiettivo & Vincoli Riconosciuti
            </div>
            <div className="space-y-2 text-xs text-foreground/90">
              <p>
                <strong>Obiettivo Assegnato:</strong> {issue.title}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="rounded bg-muted/30 p-2.5 border border-border/40">
                  <span className="font-semibold text-2xs text-muted-foreground uppercase block mb-1">
                    Vincoli di Governance & Sicurezza
                  </span>
                  <ul className="list-disc list-inside text-2xs space-y-1 text-muted-foreground">
                    <li>Esecuzione isolata in ambiente container/PTY controllato</li>
                    <li>Notifiche real-time via canale stream Buzz</li>
                    <li>Richiesta approvazione esplicita operatore per azioni critiche</li>
                  </ul>
                </div>
                <div className="rounded bg-muted/30 p-2.5 border border-border/40">
                  <span className="font-semibold text-2xs text-muted-foreground uppercase block mb-1">
                    Risultato Atteso
                  </span>
                  <p className="text-2xs text-muted-foreground">
                    Completamento di tutte le sotto-fasi operative con generazione di artefatti e work products verificabili.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CONTESTO LETTO (DINAMICO) */}
        <TabsContent value="context" className="mt-3 space-y-3">
          <div className="rounded-lg border border-border/60 bg-background p-3 space-y-2.5">
            <div className="flex items-center justify-between font-semibold text-xs text-foreground">
              <span>Risorse & File di Contesto Attivi nel Task:</span>
              <Badge variant="outline" className="text-2xs font-mono">Contesto Attivo</Badge>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">skills/autonomous-ai-agents/swarm-directive-rollout/SKILL.md</span>
                </div>
                <span className="text-2xs text-muted-foreground">14° Workflow Skill</span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">packages/shared/src/types/directive.ts</span>
                </div>
                <span className="text-2xs text-muted-foreground">Contratti Swarm & Rollout</span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">{issue.title ? `task:${issue.id.slice(0, 8)}` : "workspace_context"}</span>
                </div>
                <span className="text-2xs text-muted-foreground">Prompt e Istruzioni Task</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: WORKFLOW & STEP (DINAMICO) */}
        <TabsContent value="workflow" className="mt-3 space-y-3">
          <div className="rounded-lg border border-border/60 bg-background p-3">
            <div className="flex items-center justify-between font-semibold text-xs text-foreground mb-3">
              <span>Pipeline di Esecuzione (Workflow 1-13 Progettazione → 14 Swarm Rollout):</span>
              <span className="text-2xs font-mono text-muted-foreground">Stato: {status.toUpperCase()}</span>
            </div>
            <div className="space-y-2">
              {/* Step 1 */}
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                {step1State === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-foreground">Step 1: Ricezione Direttiva & Analisi Prompt</span>
                  <p className="text-2xs text-muted-foreground">Verifica parametri operativi, target e pre-condizioni di governance</p>
                </div>
                {renderStepBadge(step1State)}
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                {step2State === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : step2State === "in_progress" ? (
                  <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                ) : (
                  <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-foreground">Step 2: Progettazione, Strategia & Asset (Fasi 1-13)</span>
                  <p className="text-2xs text-muted-foreground">Generazione biografia, copy Instagram/YouTube, sceneggiatura e prompt video</p>
                </div>
                {renderStepBadge(step2State)}
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                {step3State === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : step3State === "in_progress" ? (
                  <Zap className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                ) : step3State === "blocked" ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                ) : (
                  <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-foreground">Step 3: Esecuzione & Rollout Swarm Multi-Agente (14° Workflow)</span>
                  <p className="text-2xs text-muted-foreground">Dispacciamento automatico sotto-task a Devops, Designer, CMO, QA e notifica Buzz</p>
                </div>
                {renderStepBadge(step3State)}
              </div>

              {/* Step 4 */}
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                {step4State === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : step4State === "in_progress" ? (
                  <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                ) : (
                  <CircleDot className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-foreground">Step 4: Sintesi Deliverable & Chiusura Task</span>
                  <p className="text-2xs text-muted-foreground">Registrazione artefatti finali prodotti e conferma operativa</p>
                </div>
                {renderStepBadge(step4State)}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: INPUT & OUTPUT */}
        <TabsContent value="io" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <span className="font-semibold text-xs text-foreground block mb-1.5">
                Input Ricevuto dal Task
              </span>
              <div className="rounded bg-muted/40 p-2.5 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                {issue.description || issue.title || "Nessun testo descrittivo aggiuntivo fornito."}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background p-3">
              <span className="font-semibold text-xs text-foreground block mb-1.5">
                Deliverable & Output Prodotti ({workProducts.length})
              </span>
              {workProducts.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {workProducts.map((wp) => (
                    <div key={wp.id} className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                      <span className="font-medium truncate">{wp.title}</span>
                      <span className="text-2xs font-mono text-muted-foreground uppercase">{wp.kind}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  Nessun work product salvato nel database per questo task.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: ANALYTICS & COSTI (CORRETTO ZERO-COST & ATTRIBUZIONE FASI) */}
        <TabsContent value="analytics" className="mt-3 space-y-3">
          {/* Box Informativo Modello Locale / Free */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              <Zap className="h-4 w-4" />
              Stato Fatturazione Modelli: Free Tier / Modello Locale ($0.00 USD)
            </div>
            <p className="text-2xs text-muted-foreground">
              I workflow attuali sono serviti da modelli locali (Hermes Agent / Ollama) o tier gratuiti (Google Gemini Free Tier). 
              Nessun addebito API commerciale è stato generato per questa operazione.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/60 bg-background p-2.5 text-center">
              <span className="text-2xs text-muted-foreground uppercase block font-medium">Modello Attivo</span>
              <span className="font-mono text-xs font-bold text-foreground truncate block">{modelName}</span>
            </div>
            <div className="rounded-lg border border-border/60 bg-background p-2.5 text-center">
              <span className="text-2xs text-muted-foreground uppercase block font-medium">Tempo Trascorso</span>
              <span className="font-mono text-xs font-bold text-blue-600">{formattedDuration}</span>
            </div>
            <div className="rounded-lg border border-border/60 bg-background p-2.5 text-center">
              <span className="text-2xs text-muted-foreground uppercase block font-medium">Fase Attiva</span>
              <span className="font-mono text-xs font-bold text-foreground">
                {isTodo ? "Fasi 1-13 Prep" : isInProgress ? "14° Swarm Rollout" : isDone ? "Completato" : "Review"}
              </span>
            </div>
            <div className="rounded-lg border border-border/60 bg-background p-2.5 text-center">
              <span className="text-2xs text-muted-foreground uppercase block font-medium">Costo API Reale</span>
              <span className="font-mono text-xs font-bold text-emerald-600">$0.00</span>
            </div>
          </div>

          {/* Ripartizione Dettagliata per Fase */}
          <div className="rounded-lg border border-border/60 bg-background p-3 text-xs space-y-2">
            <span className="font-semibold text-foreground block">Ripartizione Computazionale per Fase:</span>
            <div className="space-y-1.5 text-2xs">
              <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5">
                <div>
                  <span className="font-semibold text-foreground">Fasi 1-13 (Progettazione, Bios, Sceneggiatura & Prompt):</span>
                  <span className="text-muted-foreground block">Generazione prompt visivi, biografia influencer, piano editoriale</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-emerald-600 font-bold">$0.00</span>
                  <span className="text-muted-foreground block text-3xs">Free/Local</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5">
                <div>
                  <span className="font-semibold text-foreground">Fase 14 (Swarm Directive Rollout & Dispatch):</span>
                  <span className="text-muted-foreground block">Dispacciamento multi-agente, wakeup heartbeat, broadcast Buzz</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-emerald-600 font-bold">$0.00</span>
                  <span className="text-muted-foreground block text-3xs">Local PTY</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
