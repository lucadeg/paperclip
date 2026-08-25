import { useState } from "react";
import { useParams, Link } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Bot,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Layers,
  Activity,
  UserCheck,
  Ban,
  Pencil,
  Save,
  Cpu,
  FileText,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { directivesApi } from "@/api/directives";
import { useToastActions } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

export function DirectiveDetail() {
  const { directiveId } = useParams();
  const { addToast } = useToastActions();
  const queryClient = useQueryClient();

  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");

  const { data: directive, isLoading } = useQuery({
    queryKey: ["directive", directiveId],
    queryFn: () => directivesApi.get(directiveId!),
    enabled: !!directiveId,
  });

  const { data: lineageEvents = [] } = useQuery({
    queryKey: ["directive-lineage", directiveId],
    queryFn: () => directivesApi.getLineage(directiveId!),
    enabled: !!directiveId,
    refetchInterval: 10_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { rawInstructions?: string; title?: string }) =>
      directivesApi.update(directiveId!, data),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Direttiva Aggiornata",
        message: "Le modifiche alle istruzioni sono state registrate con tracciamento di revisione.",
      });
      setEditingInstructions(false);
      void queryClient.invalidateQueries({ queryKey: ["directive", directiveId] });
      void queryClient.invalidateQueries({ queryKey: ["directive-lineage", directiveId] });
    },
  });

  const certifyMutation = useMutation({
    mutationFn: () => directivesApi.certify(directiveId!),
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Direttiva Certificata",
        message: "Direttiva attiva e autorizzata.",
      });
      void queryClient.invalidateQueries({ queryKey: ["directive", directiveId] });
      void queryClient.invalidateQueries({ queryKey: ["directive-lineage", directiveId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => directivesApi.revoke(directiveId!, "Revocata manualmente dall'operatore"),
    onSuccess: () => {
      addToast({
        type: "warning",
        title: "Direttiva Revocata",
        message: "Direttiva disattivata. Nuove esecuzioni autonome bloccate.",
      });
      void queryClient.invalidateQueries({ queryKey: ["directive", directiveId] });
      void queryClient.invalidateQueries({ queryKey: ["directive-lineage", directiveId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        Caricamento dettagli direttiva e storico lineage...
      </div>
    );
  }

  if (!directive) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-sm font-semibold">Direttiva non trovata</h2>
        <Link to="/directives" className="mt-2 text-xs text-primary hover:underline block">
          Torna all'elenco delle direttive
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400";
      case "draft":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400";
      case "revoked":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "run_authorized":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "run_blocked":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "action_executed":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "directive_certified":
        return <UserCheck className="h-4 w-4 text-emerald-600" />;
      case "directive_revoked":
        return <Ban className="h-4 w-4 text-destructive" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/directives"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {directive.identifier}
              </span>
              <h1 className="font-bold text-lg text-foreground">
                {directive.title}
              </h1>
              <span className={cn("rounded border px-2 py-0.5 text-2xs font-medium uppercase tracking-wider", getStatusBadge(directive.status))}>
                {directive.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {directive.description || "Nessuna descrizione aggiuntiva fornita."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {directive.status === "draft" && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={certifyMutation.isPending}
              onClick={() => certifyMutation.mutate()}
            >
              <CheckCircle2 className="h-4 w-4" />
              Certifica Direttiva
            </Button>
          )}

          {directive.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={revokeMutation.isPending}
              onClick={() => revokeMutation.mutate()}
            >
              <Ban className="h-4 w-4" />
              Revoca Direttiva
            </Button>
          )}
        </div>
      </div>

      {/* Meta Stats Dossier */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
          <span className="text-2xs font-medium uppercase text-muted-foreground">Certificazione</span>
          <div className="mt-1 flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground">
              {directive.certifiedAt ? new Date(directive.certifiedAt).toLocaleDateString() : "Non Certificata"}
            </span>
          </div>
          <span className="text-2xs text-muted-foreground block mt-0.5">
            Da: {directive.certifiedByUserId || "In attesa"}
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
          <span className="text-2xs font-medium uppercase text-muted-foreground">Budget Utilizzato</span>
          <div className="mt-1 font-mono text-xs font-bold text-foreground">
            ${directive.spentBudgetUsd} / ${directive.budgetLimitUsd}
          </div>
          <span className="text-2xs text-muted-foreground block mt-0.5">
            Hard-stop automatico attivo
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
          <span className="text-2xs font-medium uppercase text-muted-foreground">Runs Autorizzati</span>
          <div className="mt-1 font-mono text-xs font-bold text-foreground">
            {directive.executedRunsCount} / max {directive.maxRunsAllowed}
          </div>
          <span className="text-2xs text-muted-foreground block mt-0.5">
            Quota di esecuzione
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
          <span className="text-2xs font-medium uppercase text-muted-foreground">Priorità & Scope</span>
          <div className="mt-1 text-xs font-bold uppercase text-foreground">
            {directive.priority} · {directive.scope}
          </div>
          <span className="text-2xs text-muted-foreground block mt-0.5">
            Vincolo gerarchico
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Instructions Blueprint & Governed Agents */}
        <div className="space-y-6 lg:col-span-1">
          {/* Instructions Dossier Card */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Istruzioni Operative Certificate
              </div>
              {!editingInstructions ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 text-2xs"
                  onClick={() => {
                    setInstructionsDraft(directive.rawInstructions);
                    setEditingInstructions(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                  Modifica
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-2xs"
                    onClick={() => setEditingInstructions(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 gap-1 text-2xs"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({ rawInstructions: instructionsDraft })
                    }
                  >
                    <Save className="h-3 w-3" />
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {editingInstructions ? (
              <Textarea
                value={instructionsDraft}
                onChange={(e) => setInstructionsDraft(e.target.value)}
                className="min-h-(--sz-180px) font-mono text-xs"
              />
            ) : (
              <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {directive.rawInstructions}
              </div>
            )}
          </div>

          {/* Governed Swarm Nodes */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-xs text-foreground border-b border-border/60 pb-2.5 mb-3">
              <Bot className="h-4 w-4 text-primary" />
              Agenti Swarm Autorizzati
            </div>

            {directive.targetAgents && directive.targetAgents.length > 0 ? (
              <div className="space-y-2">
                {directive.targetAgents.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {ag.name.slice(0, 1)}
                      </span>
                      <div>
                        <span className="font-medium text-foreground block">{ag.name}</span>
                        <span className="text-2xs text-muted-foreground capitalize">{ag.role}</span>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-2xs font-mono font-medium text-emerald-600">
                      Vincolato
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground">
                Tutti gli agenti dello swarm aziendale sono autorizzati sotto questa direttiva.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Lineage Timeline ("Tracciamento nel Tempo") */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">
                  Lineage Timeline & Tracciamento nel Tempo
                </h2>
              </div>
              <span className="text-2xs text-muted-foreground">
                {lineageEvents.length} eventi registrati
              </span>
            </div>

            {lineageEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                Nessuna esecuzione ancora registrata sotto questa direttiva.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 border-l-2 border-primary/30 mt-2">
                {lineageEvents.map((ev) => (
                  <div key={ev.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/80 p-3 hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getEventIcon(ev.eventType)}
                          <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                            {ev.eventType.replace(/_/g, " ")}
                          </span>
                          {ev.agentName && (
                            <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-2xs text-muted-foreground">
                              {ev.agentName}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-2xs text-muted-foreground">
                          {new Date(ev.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {ev.details && Object.keys(ev.details).length > 0 && (
                        <div className="mt-2 rounded bg-muted/40 p-2 font-mono text-2xs text-muted-foreground space-y-0.5">
                          {Object.entries(ev.details).map(([k, v]) => (
                            <div key={k} className="flex gap-1.5">
                              <span className="text-foreground/70 font-semibold">{k}:</span>
                              <span className="truncate">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
