import { useState } from "react";
import {
  AlertTriangle,
  Play,
  Wrench,
  Bug,
  Unlock,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToastActions } from "@/context/ToastContext";
import { heartbeatsApi } from "@/api/heartbeats";
import { issuesApi } from "@/api/issues";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface IssueBlockerResolutionBarProps {
  issue: {
    id: string;
    companyId: string;
    identifier?: string | null;
    title: string;
    status: string;
    assigneeAgentId?: string | null;
    activeRecoveryAction?: unknown;
  };
  agentMap?: Map<string, { id: string; name: string; icon?: string | null; role?: string }>;
  onRefresh?: () => void;
}

export function IssueBlockerResolutionBar({
  issue,
  agentMap = new Map(),
  onRefresh,
}: IssueBlockerResolutionBarProps) {
  const { addToast } = useToastActions();
  const queryClient = useQueryClient();
  const [correctiveOpen, setCorrectiveOpen] = useState(false);
  const [correctiveInstructions, setCorrectiveInstructions] = useState("");

  const isBlocked = issue.status === "blocked";
  const hasRecoveryAction = Boolean(issue.activeRecoveryAction);

  // Mutation: Force execution run
  const forceRunMutation = useMutation({
    mutationFn: async (targetAgentId?: string) => {
      const agentId = targetAgentId || issue.assigneeAgentId;
      if (!agentId) throw new Error("Nessun agente assegnato al task");
      return heartbeatsApi.wakeup(agentId, {
        source: "on_demand",
        triggerDetail: "user_force_override",
        reason: "operator_force_resolution",
        requestedByActorType: "user",
        contextSnapshot: {
          issueId: issue.id,
          taskKey: `issue:${issue.id}`,
          operatorForceRun: true,
        },
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Esecuzione Forzata Avviata",
        message: "L'agente è stato risvegliato con autorizzazione diretta dell'operatore.",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issue.id) });
      onRefresh?.();
    },
    onError: (err: any) => {
      addToast({
        type: "danger",
        title: "Errore Avvio Esecuzione",
        message: err?.message || "Impossibile forzare l'esecuzione.",
      });
    },
  });

  // Mutation: Unlock / Restore issue to Todo
  const unlockMutation = useMutation({
    mutationFn: async (targetStatus: "todo" | "in_progress" = "todo") => {
      return issuesApi.update(issue.id, {
        status: targetStatus as any,
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Task Sbloccato",
        message: "Lo stato del task è stato ripristinato ed è pronto per l'esecuzione.",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issue.id) });
      onRefresh?.();
    },
  });

  // Mutation: Inject corrective instruction
  const injectInstructionsMutation = useMutation({
    mutationFn: async () => {
      if (!correctiveInstructions.trim()) return;
      if (!issue.assigneeAgentId) throw new Error("Nessun agente assegnato");

      // 1. Post comment with directive/instructions
      await issuesApi.addComment(
        issue.id,
        `[DIRETTIVA CORRETTIVA OPERATORE]: ${correctiveInstructions.trim()}`,
      );

      // 2. Wakeup agent with injected context
      await heartbeatsApi.wakeup(issue.assigneeAgentId, {
        source: "on_demand",
        triggerDetail: "corrective_instruction",
        reason: "operator_corrective_directive",
        requestedByActorType: "user",
        contextSnapshot: {
          issueId: issue.id,
          correctiveDirective: correctiveInstructions.trim(),
        },
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Istruzioni Iniettate & Run Avviato",
        message: "La nuova direttiva è stata trasmessa all'agente con successo.",
      });
      setCorrectiveInstructions("");
      setCorrectiveOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issue.id) });
      onRefresh?.();
    },
  });

  // Mutation: Reassign to Debug Agent
  const reassignDebugMutation = useMutation({
    mutationFn: async (targetAgentId: string) => {
      await issuesApi.update(issue.id, {
        assigneeAgentId: targetAgentId,
        status: "in_progress",
      });
      return heartbeatsApi.wakeup(targetAgentId, {
        source: "on_demand",
        triggerDetail: "debug_assignment",
        reason: "operator_debug_dispatch",
        requestedByActorType: "user",
        contextSnapshot: {
          issueId: issue.id,
          debugMode: true,
        },
      });
    },
    onSuccess: (_, targetAgentId) => {
      const ag = agentMap.get(targetAgentId);
      addToast({
        type: "success",
        title: "Assegnato a Debugger",
        message: `Task riassegnato a ${ag?.name || "Agente Debug"} ed esecuzione avviata.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issue.id) });
      onRefresh?.();
    },
  });

  const availableAgents = Array.from(agentMap.values());

  return (
    <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 shadow-sm dark:bg-destructive/15">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive dark:bg-destructive/30">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {isBlocked ? "Stato di Blocco Attivo" : "Intervento Operatore Richiesto"}
              </span>
              <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-2xs font-mono font-bold uppercase tracking-wider text-destructive">
                Execution Halted
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rilevata interruzione o mancata disposizione dell'agente. Seleziona un'azione per ripristinare il flusso.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action 1: Force Run / Retry */}
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 text-xs"
            disabled={forceRunMutation.isPending}
            onClick={() => forceRunMutation.mutate(undefined)}
          >
            {forceRunMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Forza Esecuzione
          </Button>

          {/* Action 2: Correct Instructions */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-border/80 bg-background text-xs hover:bg-accent"
            onClick={() => setCorrectiveOpen((v) => !v)}
          >
            <Wrench className="h-3.5 w-3.5 text-amber-500" />
            Correggi Istruzioni
            <ChevronDown className={`h-3 w-3 transition-transform ${correctiveOpen ? "rotate-180" : ""}`} />
          </Button>

          {/* Action 3: Reassign to Debugger Agent */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-border/80 bg-background text-xs hover:bg-accent"
                disabled={reassignDebugMutation.isPending}
              >
                <Bug className="h-3.5 w-3.5 text-purple-500" />
                Assegna Debug
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Seleziona Agente Debugger
              </div>
              {availableAgents.map((ag) => (
                <DropdownMenuItem
                  key={ag.id}
                  onClick={() => reassignDebugMutation.mutate(ag.id)}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {ag.name.slice(0, 1)}
                  </span>
                  <span className="flex-1 truncate">{ag.name}</span>
                  <span className="text-2xs text-muted-foreground capitalize">{ag.role || "agent"}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action 4: Unlock Status */}
          {isBlocked && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs"
              disabled={unlockMutation.isPending}
              onClick={() => unlockMutation.mutate("todo")}
            >
              <Unlock className="h-3.5 w-3.5" />
              Sblocca
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Corrective Instructions Drawer */}
      {correctiveOpen && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Inietta Nuova Direttiva / Istruzione di Risoluzione:
          </label>
          <Textarea
            value={correctiveInstructions}
            onChange={(e) => setCorrectiveInstructions(e.target.value)}
            placeholder="Specifica le istruzioni esatte per superare il blocco (es. 'Ignora il fallimento del report CVSS e procedi con la scansione diretta delle porte usando Nmap...')"
            className="min-h-(--sz-80px) bg-background text-xs resize-y"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setCorrectiveOpen(false)}
            >
              Annulla
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1 bg-primary text-primary-foreground text-xs"
              disabled={!correctiveInstructions.trim() || injectInstructionsMutation.isPending}
              onClick={() => injectInstructionsMutation.mutate()}
            >
              {injectInstructionsMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Invia & Riavvia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
