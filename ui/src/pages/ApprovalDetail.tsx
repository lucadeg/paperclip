import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalsApi } from "../api/approvals";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { StatusBadge } from "../components/StatusBadge";
import { Identity } from "../components/Identity";
import { approvalLabel, typeIcon, defaultTypeIcon, ApprovalPayloadRenderer } from "../components/ApprovalPayload";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Cpu,
  Zap,
  Activity,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Layers,
  Terminal,
  FileCode,
  Sliders,
  Send,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  Clock,
} from "lucide-react";
import type { ApprovalComment } from "@paperclipai/shared";
import { MarkdownBody } from "../components/MarkdownBody";
import { cn } from "@/lib/utils";

export function ApprovalDetail() {
  const { approvalId } = useParams<{ approvalId: string }>();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState("");
  const [customDirectives, setCustomDirectives] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [activeWorkflowNode, setActiveWorkflowNode] = useState<number | null>(2); // Default to Governance Gate

  const { data: approval, isLoading } = useQuery({
    queryKey: queryKeys.approvals.detail(approvalId!),
    queryFn: () => approvalsApi.get(approvalId!),
    enabled: !!approvalId,
  });
  const resolvedCompanyId = approval?.companyId ?? selectedCompanyId;

  const { data: comments } = useQuery({
    queryKey: queryKeys.approvals.comments(approvalId!),
    queryFn: () => approvalsApi.listComments(approvalId!),
    enabled: !!approvalId,
  });

  const { data: linkedIssues } = useQuery({
    queryKey: queryKeys.approvals.issues(approvalId!),
    queryFn: () => approvalsApi.listIssues(approvalId!),
    enabled: !!approvalId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(resolvedCompanyId ?? ""),
    queryFn: () => agentsApi.list(resolvedCompanyId ?? ""),
    enabled: !!resolvedCompanyId,
  });

  useEffect(() => {
    if (!approval?.companyId || approval.companyId === selectedCompanyId) return;
    setSelectedCompanyId(approval.companyId, { source: "route_sync" });
  }, [approval?.companyId, selectedCompanyId, setSelectedCompanyId]);

  const agentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents ?? []) map.set(agent.id, agent.name);
    return map;
  }, [agents]);

  const requestingAgentRecord = useMemo(() => {
    if (!approval?.requestedByAgentId || !agents) return null;
    return agents.find((a) => a.id === approval.requestedByAgentId) ?? null;
  }, [approval?.requestedByAgentId, agents]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Approvals", href: "/approvals" },
      { label: approval?.id?.slice(0, 8) ?? approvalId ?? "Approval" },
    ]);
  }, [setBreadcrumbs, approval, approvalId]);

  const refresh = () => {
    if (!approvalId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.detail(approvalId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.comments(approvalId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.issues(approvalId) });
    if (approval?.companyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(approval.companyId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.list(approval.companyId, "pending"),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(approval.companyId) });
    }
  };

  const approveMutation = useMutation({
    mutationFn: (directives?: string) =>
      approvalsApi.approve(approvalId!, directives ? `Istruzioni Operative Applicate: ${directives}` : undefined),
    onSuccess: () => {
      setError(null);
      refresh();
      navigate(`/approvals/${approvalId}?resolved=approved`, { replace: true });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (rationale?: string) =>
      approvalsApi.reject(approvalId!, rationale ? `Motivazione Rifiuto Governance: ${rationale}` : undefined),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Reject failed"),
  });

  const revisionMutation = useMutation({
    mutationFn: () => approvalsApi.requestRevision(approvalId!),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Revision request failed"),
  });

  const resubmitMutation = useMutation({
    mutationFn: () => approvalsApi.resubmit(approvalId!),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Resubmit failed"),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => approvalsApi.addComment(approvalId!, commentBody.trim()),
    onSuccess: () => {
      setCommentBody("");
      setError(null);
      refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Comment failed"),
  });

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!approval) return <p className="text-sm text-muted-foreground">Approval not found.</p>;

  const payload = (approval.payload as Record<string, unknown>) || {};
  const linkedAgentId = typeof payload.agentId === "string" ? payload.agentId : null;
  const isActionable = approval.status === "pending" || approval.status === "revision_requested";
  const isBudgetApproval = approval.type === "budget_override_required";
  const TypeIcon = typeIcon[approval.type] ?? defaultTypeIcon;
  const showApprovedBanner = searchParams.get("resolved") === "approved" && approval.status === "approved";
  const primaryLinkedIssue = linkedIssues?.[0] ?? null;

  const agentDetails = approval.agentDetails;
  const workflowTrace = approval.workflowTrace;
  const costAnalytics = approval.costAnalytics;
  const execSpec = approval.executionSpecification ?? workflowTrace?.executionSpecification;

  const agentCfg = (requestingAgentRecord?.adapterConfig as Record<string, unknown>) || {};
  const modelName =
    agentDetails?.model ||
    (typeof agentCfg.model === "string"
      ? agentCfg.model
      : requestingAgentRecord?.adapterType === "hermes_local"
        ? "proxima-claude-3-5-sonnet"
        : "hermes-3-llama-3.1-70b");
  const providerName =
    agentDetails?.provider || (modelName.includes("claude") ? "Anthropic (Proxima Routing)" : "Nous Hermes Swarm Mesh");

  const flowNodes = workflowTrace?.flowNodes ?? [
    {
      id: "node_trigger",
      title: "1. Trigger & Discovery",
      type: "trigger" as const,
      status: "completed" as const,
      description: "Scansione autonoma e identificazione del fabbisogno strategico.",
      icon: "zap",
    },
    {
      id: "node_analysis",
      title: "2. Deep Neural Analysis",
      type: "analysis" as const,
      status: "completed" as const,
      description: "Elaborazione multimodale, calcolo ROI e verifica conformità industriale.",
      icon: "cpu",
    },
    {
      id: "node_gate",
      title: "3. 🛡️ Human Governance Gate",
      type: "gate" as const,
      status: approval.status === "approved" ? ("completed" as const) : ("pending" as const),
      description: "Blocco di sicurezza Zero-Trust: attesa autorizzazione sovrana LDG Admin.",
      icon: "shield-check",
    },
    {
      id: "node_execution",
      title: "4. Swarm Execution & Rollout",
      type: "action" as const,
      status: approval.status === "approved" ? ("completed" as const) : ("queued" as const),
      description: "Dispacciamento sub-agenti, allocazione risorse e sincronizzazione repository.",
      icon: "play-circle",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Success Notification Banner */}
      {showApprovedBanner && (
        <div className="border border-green-500/40 bg-green-500/10 rounded-xl px-5 py-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/20 text-green-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-green-950 dark:text-green-100 font-bold">Approvazione Convalidata con Successo</p>
                <p className="text-xs text-green-800/80 dark:text-green-300/80">
                  L'agente richiedente e lo swarm esecutivo sono stati attivati per proseguire il rollout.
                </p>
              </div>
            </div>
            <Link
              to="/approvals"
              className="text-xs font-bold text-green-700 dark:text-green-300 hover:underline px-3 py-1.5 rounded-lg border border-green-500/30"
            >
              Torna alle Approvazioni →
            </Link>
          </div>
        </div>
      )}

      {/* Main Governance Header Card */}
      <Card className="border-border/80 bg-card/70 backdrop-blur-md p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <TypeIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs uppercase">
                  {approvalLabel(approval.type)}
                </Badge>
                {workflowTrace?.governanceTier && (
                  <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-semibold">
                    {workflowTrace.governanceTier}
                  </Badge>
                )}
                <span className="font-mono text-xs text-muted-foreground">ID: {approval.id}</span>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {String(payload.title ?? payload.name ?? payload.summary ?? "Richiesta di Approvazione Esecutiva")}
              </h1>

              <p className="text-xs text-muted-foreground">
                Inoltrata da{" "}
                <span className="font-semibold text-foreground">
                  {agentDetails?.name ?? requestingAgentRecord?.name ?? "Agente di Sistema"}
                </span>{" "}
                · Registrata il {new Date(approval.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={approval.status} />
          </div>
        </div>

        {/* N8N-STYLE INTERACTIVE VISUAL WORKFLOW GRAPH */}
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Pipeline Esecutiva Neurale & Workflow Node Graph</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Motore: Hermes Swarm Orchestrator</span>
          </div>

          {/* Workflow Graph Nodes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {flowNodes.map((node, index) => {
              const isDone = node.status === "completed";
              const isPending = node.status === "pending";
              const isFailed = node.status === "failed";
              const isSelected = activeWorkflowNode === index;

              return (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => setActiveWorkflowNode(index)}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-all relative overflow-hidden",
                    isSelected ? "ring-2 ring-primary border-primary shadow-md" : "hover:border-border",
                    isDone
                      ? "border-green-500/30 bg-green-500/[0.04]"
                      : isPending
                        ? "border-amber-500/40 bg-amber-500/[0.08] animate-pulse"
                        : isFailed
                          ? "border-red-500/30 bg-red-500/[0.04]"
                          : "border-border/60 bg-background/50",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-(length:--text-nano) uppercase font-bold tracking-wider text-muted-foreground">
                      Passo {index + 1}
                    </span>
                    {isDone && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {isPending && <Clock className="h-4 w-4 text-amber-500 animate-spin" />}
                    {isFailed && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>

                  <p className="text-xs font-bold text-foreground truncate">{node.title}</p>
                  <p className="text-(length:--text-micro) text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {node.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Node Details Box */}
          {activeWorkflowNode !== null && flowNodes[activeWorkflowNode] && (
            <div className="rounded-xl border border-primary/20 bg-background/60 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  Dettaglio Nodo Selezionato: {flowNodes[activeWorkflowNode].title}
                </span>
                <Badge variant="outline" className="font-mono text-(length:--text-nano) uppercase">
                  Stato: {flowNodes[activeWorkflowNode].status}
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">{flowNodes[activeWorkflowNode].description}</p>
            </div>
          )}
        </div>

        {/* 2-COLUMN DOSSIER: AGENT TELEMETRY + COST METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Agent & Model Telemetry Card */}
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              Intelligence & Modello Neurale Richiedente
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground text-(length:--text-nano)">Agente</span>
                <p className="font-bold text-foreground">
                  {agentDetails?.name ?? requestingAgentRecord?.name ?? "Swarm Specialist"}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground text-(length:--text-nano)">Ruolo / Divisione</span>
                <p className="font-semibold text-foreground uppercase">
                  {agentDetails?.role ?? requestingAgentRecord?.role ?? "General"}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground text-(length:--text-nano)">Modello LLM Attivo</span>
                <p className="font-mono font-bold text-primary">{modelName}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-(length:--text-nano)">Inference Provider</span>
                <p className="font-semibold text-foreground">{providerName}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-(length:--text-nano)">Runtime Adapter</span>
                <p className="font-mono text-muted-foreground">{requestingAgentRecord?.adapterType ?? "hermes_local"}</p>
              </div>

              <div>
                <span className="text-muted-foreground text-(length:--text-nano)">Budget Mensile Agente</span>
                <p className="font-mono font-bold text-foreground">
                  ${((requestingAgentRecord?.budgetMonthlyCents ?? 0) / 100).toFixed(2)} USD
                </p>
              </div>
            </div>
          </div>

          {/* Cost Analytics & Forecast Card */}
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              Analytics Costi Svolti & Preventivo Downstream
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/50 bg-background/50 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-(length:--text-nano) text-muted-foreground font-semibold">Costo Analisi Svolta</span>
                  {costAnalytics?.isFreeOrLocal && (
                    <span className="text-3xs font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      FREE / $0.00
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-foreground font-mono">
                  ${(costAnalytics?.incurredCostUsd ?? 0).toFixed(3)} USD
                </p>
                <p className="text-(length:--text-nano) text-muted-foreground">
                  Token consumati: {((costAnalytics?.incurredTokens ?? 0) / 1000).toFixed(1)}k ({costAnalytics?.executionTimeSeconds ?? 0}s)
                </p>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-(length:--text-nano) text-primary font-semibold">Preventivo Downstream</span>
                  {costAnalytics?.isFreeOrLocal && (
                    <span className="text-3xs font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      AZZERATO ($0.00)
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-primary font-mono">
                  ${(costAnalytics?.forecastCostUsd ?? 0).toFixed(3)} USD
                </p>
                <p className="text-(length:--text-nano) text-muted-foreground">
                  Token stimati: {((costAnalytics?.forecastTokens ?? 0) / 1000).toFixed(1)}k
                </p>
              </div>
            </div>

            {costAnalytics?.benchmarkLabel && (
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Verifica Telemetrica Esecutiva:
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {costAnalytics.benchmarkLabel}
                </span>
              </div>
            )}

            <p className="text-(length:--text-micro) text-muted-foreground leading-relaxed">
              {costAnalytics?.forecastImpact ?? "Nessun costo computazionale aggiuntivo rilevato."}
            </p>
          </div>
        </div>

        {/* EXECUTION SPECIFICATION DOSSIER (COSA, COME, QUANDO, COSTI, SEZIONI) */}
        <div className="rounded-2xl border border-primary/40 bg-card/90 backdrop-blur-md p-6 space-y-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Dossier Esecutivo & Piano di Azione Post-Approvazione
                </h3>
                <p className="text-xs text-muted-foreground">
                  Specifiche operative trasparenti: sequenza operativa, metodologia tecnica, SLA, preventivo computazionale e sezioni/file target.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs px-2.5 py-1">
                <Clock className="h-3.5 w-3.5 mr-1 text-primary inline" />
                Tempo Stimato: {execSpec?.estimatedDuration || "~20 minuti"}
              </Badge>
              {execSpec?.costBreakdown?.isFreeOrLocal ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <Zap className="h-3 w-3 mr-1 inline" /> $0.00 FREE / LOCAL
                </Badge>
              ) : (
                <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-bold font-mono">
                  ${(execSpec?.costBreakdown?.estimatedCostUsd ?? 0).toFixed(3)} USD
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. COSA SARÀ FATTO DOPO (NEXT STEPS) */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                1. Cosa Sarà Fatto Dopo (Sequenza dei Prossimi Passi)
              </h4>
              <div className="space-y-2">
                {(execSpec?.nextSteps ?? [
                  "1. Creazione e checkout del branch di lavoro isolato.",
                  "2. Modifiche architetturali e implementazione del codice.",
                  "3. Esecuzione suite di test TDD e verifica di non-regressione.",
                  "4. Commit firmato e completamento task su Paperclip."
                ]).map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs text-foreground leading-relaxed"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[0.65rem] mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-medium">{step.replace(/^[0-9]+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. COME SARÀ FATTO (METODOLOGIA TECNICA) */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                2. Come Sarà Fatto (Metodologia Tecnica & Architettura)
              </h4>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-3 text-xs leading-relaxed">
                <p className="text-foreground font-medium">
                  {execSpec?.technicalMethodology ||
                    `Implementazione modulare guidata da ${modelName} (${providerName}). Toolset isolato e sandbox con controllo di conformità.`}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[0.7rem]">
                  <div>
                    <span className="text-muted-foreground block">Modello Esecutore:</span>
                    <span className="font-mono font-bold text-foreground truncate block">{modelName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Provider / Routing:</span>
                    <span className="font-semibold text-foreground truncate block">{providerName}</span>
                  </div>
                </div>
              </div>

              {/* Success Criteria */}
              {execSpec?.successCriteria && execSpec.successCriteria.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-3 space-y-1.5 text-xs">
                  <span className="text-[0.68rem] font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Criteri di Accettazione & Definizione di Done
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[0.72rem]">
                    {execSpec.successCriteria.map((crit, cIdx) => (
                      <li key={cIdx} className="leading-tight">{crit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 3. SU QUALI SEZIONI E FILE LAVORERÀ (TARGET SECTIONS) */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" />
                3. Su Quali Sezioni e File Lavorerà (Scope & Componenti)
              </h4>
              <div className="grid gap-2">
                {(execSpec?.targetSections ?? [
                  { name: "Sorgenti & Core Server", path: "server/src/", type: "file", description: "Rotte API e business logic" },
                  { name: "Interfaccia Utente", path: "ui/src/", type: "ui", description: "Componenti grafici e viste utente" },
                  { name: "Schema & DB Migrations", path: "packages/db/src/schema/", type: "database", description: "Modelli dati e tabelle" }
                ]).map((sec, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{sec.name}</span>
                        {sec.type && (
                          <Badge variant="outline" className="text-[0.6rem] uppercase px-1.5 py-0 font-mono">
                            {sec.type}
                          </Badge>
                        )}
                      </div>
                      {sec.path && (
                        <span className="font-mono text-[0.68rem] text-primary truncate block mt-0.5">
                          {sec.path}
                        </span>
                      )}
                      {sec.description && (
                        <p className="text-[0.68rem] text-muted-foreground mt-0.5 truncate">{sec.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. TEMPO, COSTI E PIANO DI ROLLBACK */}
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                4. Dettaglio Costi, Tempo di Esecuzione & Rollback
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground text-[0.68rem] block font-semibold">Durata Prevista (SLA)</span>
                  <p className="font-bold text-foreground text-sm">{execSpec?.estimatedDuration || "~15-30 minuti"}</p>
                  <span className="text-muted-foreground text-[0.65rem]">Timeout max: 600s</span>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                  <span className="text-muted-foreground text-[0.68rem] block font-semibold">Costo Computazionale</span>
                  <p className="font-bold text-foreground text-sm font-mono">
                    {execSpec?.costBreakdown?.isFreeOrLocal ? "$0.00 USD (FREE)" : `$${(execSpec?.costBreakdown?.estimatedCostUsd ?? 0).toFixed(3)} USD`}
                  </p>
                  <span className="text-muted-foreground text-[0.65rem]">
                    Token stimati: {((execSpec?.costBreakdown?.estimatedTokens ?? 8500) / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              {/* Rollback Strategy */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3 space-y-1 text-xs">
                <span className="text-[0.68rem] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Piano di Ripristino & Rollback
                </span>
                <p className="text-[0.72rem] text-muted-foreground leading-relaxed">
                  {execSpec?.rollbackPlan ||
                    "In caso di fallimento o errori di build, ripristino istantaneo dello snapshot del branch e notifica automatica al supervisore."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CAUSALITY & REASONING TRACE ("COME E PERCHÉ") */}
        <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
            Tracciamento Causale e Motivazione Decisionale ("Come e Perché")
          </h4>

          <div className="space-y-2 text-xs leading-relaxed text-foreground">
            <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
              <span className="font-bold text-primary">Sintesi Strategica: </span>
              {String(payload.summary ?? payload.description ?? "L'agente ha elaborato la proposta strategica e richiede validazione sovrana.")}
            </div>

            {Boolean(payload.technicalMoat) && (
              <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                <span className="font-bold text-green-500">Vantaggio Tecnico & Moat: </span>
                {String(payload.technicalMoat)}
              </div>
            )}

            {Boolean(payload.riskAssessment) && (
              <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                <span className="font-bold text-amber-500">Valutazione dei Rischi: </span>
                {String(payload.riskAssessment)}
              </div>
            )}

            {Boolean(payload.impact) && (
              <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                <span className="font-bold text-blue-500">Impatto Operativo & ROI: </span>
                {String(payload.impact)}
              </div>
            )}
          </div>
        </div>

        {/* RAW PAYLOAD EXPANDER */}
        <div className="pt-1">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
            onClick={() => setShowRawPayload((v) => !v)}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showRawPayload ? "rotate-90" : "")} />
            Ispeziona Payload JSON Integrale
          </button>

          {showRawPayload && (
            <pre className="mt-2 text-xs font-mono bg-muted/50 rounded-xl p-4 overflow-x-auto border border-border/70 max-h-60">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>

        {/* N8N-STYLE DIRECTIVE & CUSTOM INSTRUCTION INJECTOR */}
        {isActionable && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Iniezione Direttive & Istruzioni Operative per l'Esecuzione (N8N Mode)
                </h3>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary font-mono text-(length:--text-nano)">
                Direttive Sovrane LDG Admin
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Puoi inserire parametri specifici, istruzioni operative, limitazioni o vincoli di esecuzione. L'agente
              riceverà queste direttive nel suo prossimo prompt di avvio esecuzione.
            </p>

            <Textarea
              value={customDirectives}
              onChange={(e) => setCustomDirectives(e.target.value)}
              placeholder="Es. Eseguire la migrazione con priorità alta. Eseguire backup prima di modificare i file di produzione. Limitare le chiamate API a 50 al minuto..."
              rows={3}
              className="font-mono text-xs bg-background/80 border-border/80 focus:border-primary"
            />

            {error && <p className="text-xs text-destructive font-bold">{error}</p>}

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-500 text-white font-bold gap-2 shadow-xs"
                  onClick={() => approveMutation.mutate(customDirectives.trim())}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approveMutation.isPending
                    ? "In Convalida..."
                    : customDirectives.trim()
                      ? "Approva con Direttive"
                      : "Approva Standard"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 font-bold gap-1.5"
                  onClick={() => revisionMutation.mutate()}
                  disabled={revisionMutation.isPending}
                >
                  <Clock className="h-4 w-4" />
                  Richiedi Revisione all'Agente
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="font-bold gap-1.5 shadow-xs"
                  onClick={() => rejectMutation.mutate(customDirectives.trim())}
                  disabled={rejectMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Rifiuta Richiesta
                </Button>
              </div>

              <Link to="/approvals" className="text-xs text-muted-foreground hover:text-foreground font-semibold">
                Annulla e Torna Indietro
              </Link>
            </div>
          </div>
        )}

        {/* Non-actionable status messages */}
        {!isActionable && (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">
              Questa richiesta è nello stato{" "}
              <span className="font-bold text-foreground uppercase">{approval.status}</span> e non richiede ulteriori
              azioni immediate.
            </span>
            <Link to="/approvals" className="font-bold text-primary hover:underline">
              Vedi altre richieste →
            </Link>
          </div>
        )}
      </Card>

      {/* LINKED TASKS SECTION */}
      {linkedIssues && linkedIssues.length > 0 && (
        <Card className="border-border/80 bg-card/60 p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileCode className="h-4 w-4 text-primary" />
            Task Aziendali Collegati ({linkedIssues.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {linkedIssues.map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.identifier ?? issue.id}`}
                className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:border-primary/50 hover:bg-accent/10 transition-colors"
              >
                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                  <span className="font-mono font-bold text-xs text-primary mr-2">
                    {issue.identifier ?? issue.id.slice(0, 8)}
                  </span>
                  <span className="text-xs font-medium text-foreground truncate">{issue.title}</span>
                </div>
                <StatusBadge status={issue.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* COMMENTS & AUDIT LOG */}
      <Card className="border-border/80 bg-card/60 p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Discussione & Note di Governance ({comments?.length ?? 0})</h3>

        <div className="space-y-3">
          {(comments ?? []).map((comment: ApprovalComment) => (
            <div key={comment.id} className="border border-border/60 rounded-xl p-4 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                {comment.authorAgentId ? (
                  <Identity
                    name={agentNameById.get(comment.authorAgentId) ?? comment.authorAgentId.slice(0, 8)}
                    size="sm"
                  />
                ) : (
                  <Identity name="LDG Admin / Board" size="sm" />
                )}
                <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <MarkdownBody className="text-xs leading-relaxed text-foreground">{comment.body}</MarkdownBody>
            </div>
          ))}

          {(!comments || comments.length === 0) && (
            <p className="text-xs text-muted-foreground py-2">Nessun commento registrato su questa delibera.</p>
          )}
        </div>

        <div className="pt-2 space-y-2">
          <Textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Aggiungi una nota o commento alla richiesta di approvazione..."
            rows={2}
            className="text-xs bg-background/80 border-border/70"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => addCommentMutation.mutate()}
              disabled={!commentBody.trim() || addCommentMutation.isPending}
              className="gap-1.5 font-bold"
            >
              <Send className="h-3.5 w-3.5" />
              {addCommentMutation.isPending ? "Invio in corso..." : "Invia Commento"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
