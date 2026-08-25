import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  OctagonAlert,
  PauseCircle,
  Play,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { companiesApi } from "../api/companies";
import { queryKeys } from "../lib/queryKeys";

interface EmergencyControlBarProps {
  companyId: string;
}

export function EmergencyControlBar({ companyId }: EmergencyControlBarProps) {
  const queryClient = useQueryClient();
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  const { data: governance, isLoading } = useQuery({
    queryKey: queryKeys.companies.governanceStatus(companyId),
    queryFn: () => companiesApi.getGovernanceStatus(companyId),
    refetchInterval: 3000,
  });

  const invalidateEverything = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.governanceStatus(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.liveRuns(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.fileActivities(companyId) });
  };

  const stopAllMutation = useMutation({
    mutationFn: () => companiesApi.emergencyStop(companyId),
    onSuccess: (data) => {
      invalidateEverything();
      setIsConfirmingStop(false);
      setFeedbackMessage({
        type: "error",
        text: `🛑 STOP ALL ESEGUITO: ${data.pausedAgentsCount} agenti messi in pausa, ${data.cancelledRunsCount} processi terminati immediatamente.`,
      });
      setTimeout(() => setFeedbackMessage(null), 8000);
    },
    onError: (err: Error) => {
      setFeedbackMessage({ type: "error", text: `Errore durante Stop All: ${err.message}` });
    },
  });

  const pauseAllMutation = useMutation({
    mutationFn: () => companiesApi.pauseAllAgents(companyId),
    onSuccess: (data) => {
      invalidateEverything();
      setFeedbackMessage({
        type: "warning",
        text: `⏸️ Tutti i ${data.pausedCount} agenti sono stati messi in pausa. Nessun processo autonomo può avviarsi.`,
      });
      setTimeout(() => setFeedbackMessage(null), 8000);
    },
  });

  const resumeAllMutation = useMutation({
    mutationFn: () => companiesApi.resumeAllAgents(companyId),
    onSuccess: (data) => {
      invalidateEverything();
      setFeedbackMessage({
        type: "success",
        text: `▶️ Agenti riattivati in modalità controllata: ${data.resumedCount} agenti pronti con approvazione manuale obbligatoria.`,
      });
      setTimeout(() => setFeedbackMessage(null), 8000);
    },
  });

  const isEmergencyActive = governance?.emergencyStopped || (governance?.pausedAgentsCount ?? 0) > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-card shadow-lg">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-primary/5 pointer-events-none" />

      <div className="relative p-4 sm:p-5 flex flex-col gap-4">
        {/* Top line: Header, Live Badges & Main Emergency Trigger */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-500">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Governance & Kill-Switch Centrale
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <Lock className="h-3 w-3" />
                  Approvazione Manuale Obbligatoria
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controllo immediato dei processi in esecuzione, blocco delle attivazioni autonome e monitoraggio trasparente dei file.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Emergency Stop Button */}
            {!isConfirmingStop ? (
              <button
                type="button"
                onClick={() => setIsConfirmingStop(true)}
                disabled={stopAllMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2.5 text-sm font-bold shadow-md shadow-red-600/20 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
              >
                <OctagonAlert className="h-4 w-4" />
                <span>STOP ALL / KILL SWITCH</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-950/80 border border-red-500 p-1.5 rounded-xl animate-in fade-in zoom-in-95 duration-150">
                <span className="text-xs font-bold text-red-200 px-2">Confermi arresto totale?</span>
                <button
                  type="button"
                  onClick={() => stopAllMutation.mutate()}
                  disabled={stopAllMutation.isPending}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold shadow transition-colors cursor-pointer"
                >
                  {stopAllMutation.isPending ? "Arresto in corso..." : "SÌ, FERMA TUTTO"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingStop(false)}
                  className="rounded-lg bg-secondary hover:bg-secondary/80 text-foreground px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            )}

            {/* Pause All */}
            <button
              type="button"
              onClick={() => pauseAllMutation.mutate()}
              disabled={pauseAllMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <PauseCircle className="h-4 w-4" />
              <span>Pausa Agenti</span>
            </button>

            {/* Resume Safe */}
            <button
              type="button"
              onClick={() => resumeAllMutation.mutate()}
              disabled={resumeAllMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>Riprendi (Modo Protetto)</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={invalidateEverything}
              title="Aggiorna stato processi"
              className="rounded-xl border border-border bg-secondary/50 hover:bg-secondary p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2.5 rounded-xl bg-background/60 p-2.5 border border-border/50">
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Processi Attivi</div>
              <div className="text-sm font-bold text-foreground">
                {governance?.activeProcessesCount ?? 0} in esecuzione
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-background/60 p-2.5 border border-border/50">
            <PauseCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Agenti in Pausa</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {governance?.pausedAgentsCount ?? 0} / {governance?.totalAgents ?? 0}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-background/60 p-2.5 border border-border/50">
            <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Agenti Pronti (Idle)</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {governance?.idleAgentsCount ?? 0} in attesa
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-background/60 p-2.5 border border-border/50">
            <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Policy di Esecuzione</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                Solo su Approvazione
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Message Toast / Alert */}
        {feedbackMessage && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
              feedbackMessage.type === "error"
                ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                : feedbackMessage.type === "warning"
                ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
