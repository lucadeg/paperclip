import { CheckCircle2, XCircle, Clock, Cpu, Zap, ShieldAlert, ShieldCheck, ArrowRight, DollarSign, Activity, FileText } from "lucide-react";
import { Link } from "@/lib/router";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Identity } from "./Identity";
import {
  approvalSubject,
  typeIcon,
  defaultTypeIcon,
  ApprovalPayloadRenderer,
  typeLabel,
} from "./ApprovalPayload";
import { timeAgo } from "../lib/timeAgo";
import type { Approval, Agent } from "@paperclipai/shared";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

function statusBadge(status: string) {
  if (status === "approved") {
    return (
      <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 font-semibold gap-1">
        <CheckCircle2 className="h-3 w-3" /> Approvato
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold gap-1">
        <XCircle className="h-3 w-3" /> Rifiutato
      </Badge>
    );
  }
  if (status === "revision_requested") {
    return (
      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold gap-1">
        <Clock className="h-3 w-3" /> Revisione Richiesta
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold animate-pulse gap-1">
      <Clock className="h-3 w-3" /> In Attesa di Approvazione
    </Badge>
  );
}

function riskBadge(riskLevel?: string) {
  if (riskLevel === "CRITICAL") {
    return <Badge className="bg-red-600 text-white font-bold text-(length:--text-nano) px-1.5 py-0.5">RISCHIO CRITICO</Badge>;
  }
  if (riskLevel === "HIGH") {
    return <Badge className="bg-orange-600 text-white font-semibold text-(length:--text-nano) px-1.5 py-0.5">ALTO RISCHIO</Badge>;
  }
  if (riskLevel === "MEDIUM") {
    return <Badge className="bg-amber-600/80 text-white text-(length:--text-nano) px-1.5 py-0.5">MEDIO RISCHIO</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground text-(length:--text-nano) px-1.5 py-0.5">BASSO RISCHIO</Badge>;
}

export function ApprovalCard({
  approval,
  requesterAgent,
  onApprove,
  onReject,
  onOpen,
  detailLink,
  isPending = false,
  pendingAction = null,
}: {
  approval: Approval;
  requesterAgent: Agent | null;
  onApprove?: () => void;
  onReject?: () => void;
  onOpen?: () => void;
  detailLink?: string;
  isPending?: boolean;
  pendingAction?: "approve" | "reject" | null;
}) {
  const payload = approval.payload as Record<string, unknown> | null;
  const Icon = typeIcon[approval.type] ?? defaultTypeIcon;
  const kindLabel = typeLabel[approval.type] ?? approval.type;
  const subject = approvalSubject(payload);
  const showResolutionButtons =
    Boolean(onApprove && onReject) &&
    approval.type !== "budget_override_required" &&
    (approval.status === "pending" || approval.status === "revision_requested");
  const hasFooter = showResolutionButtons || Boolean(detailLink || onOpen);

  const agentDetails = approval.agentDetails;
  const workflowTrace = approval.workflowTrace;
  const costAnalytics = approval.costAnalytics;
  const execSpec = approval.executionSpecification ?? workflowTrace?.executionSpecification;

  // Resolve Model string
  const agentCfg = (requesterAgent?.adapterConfig as Record<string, unknown>) || {};
  const modelName =
    agentDetails?.model ||
    (typeof agentCfg.model === "string"
      ? agentCfg.model
      : requesterAgent?.adapterType === "hermes_local"
        ? "proxima-claude-3-5-sonnet"
        : "hermes-3-llama-3.1-70b");

  return (
    <Card className="block border-border/80 bg-card/60 backdrop-blur-sm p-5 transition-all hover:border-primary/40 shadow-xs">
      {/* Header with Icon, Subject, Agent and Status */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/5 px-2 py-0.5 text-(length:--text-micro) font-bold uppercase tracking-(--tracking-label) text-primary"
                >
                  {kindLabel}
                </Badge>

                {riskBadge(workflowTrace?.riskLevel)}

                {workflowTrace?.governanceTier && (
                  <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground text-(length:--text-nano)">
                    {workflowTrace.governanceTier}
                  </Badge>
                )}

                {execSpec?.costBreakdown?.isFreeOrLocal && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[0.65rem] font-bold px-2 py-0.5">
                    <Zap className="h-2.5 w-2.5 mr-1 inline" /> FREE / $0.00
                  </Badge>
                )}
              </div>

              <h3 className="text-base font-bold leading-tight text-foreground">
                {subject ?? kindLabel}
              </h3>

              {/* Requester Agent and Model Telemetry */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                {(agentDetails || requesterAgent) && (
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-muted-foreground/70">Richiesto da:</span>
                    <Identity
                      name={agentDetails?.name ?? requesterAgent?.name ?? "Agente Specialista"}
                      size="sm"
                      className="font-semibold text-foreground"
                    />
                  </div>
                )}

                <div className="inline-flex items-center gap-1 font-mono text-(length:--text-micro) bg-muted/60 px-2 py-0.5 rounded border border-border/50 text-foreground/80">
                  <Cpu className="h-3 w-3 text-primary" />
                  <span>{modelName}</span>
                </div>

                <span className="text-muted-foreground/50">·</span>
                <span className="text-(length:--text-micro)">Creato {timeAgo(approval.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {statusBadge(approval.status)}
        </div>
      </div>

      {/* Execution Specification Quick Dossier */}
      {execSpec && (
        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/[0.03] p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Prossimo Passo Post-Approvazione:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.68rem] text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                <Clock className="h-3 w-3 inline" /> {execSpec.estimatedDuration || "~20m"}
              </span>
              <span className="text-[0.68rem] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                {execSpec.targetSections.length} sezioni target
              </span>
            </div>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            {execSpec.nextSteps[0] ?? "Esecuzione modifiche architetturali e test automatici."}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {execSpec.targetSections.slice(0, 3).map((sec, sIdx) => (
              <span
                key={sIdx}
                className="inline-flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-[0.62rem] font-mono text-muted-foreground border border-border/60"
              >
                <FileText className="h-2.5 w-2.5 text-primary" />
                {sec.path || sec.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mini Workflow Pipeline Node Strip (N8N Style) */}
      <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground mb-2">
          <span className="flex items-center gap-1.5 text-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            Flusso di Esecuzione Neurale & Governance Gate
          </span>
          <span className="text-(length:--text-nano) font-mono text-muted-foreground/70">
            {workflowTrace?.flowNodes?.length ?? 4} Nodi di Workflow
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(workflowTrace?.flowNodes ?? [
            { id: "1", title: "1. Trigger", status: "completed", description: "Identificazione Requisito" },
            { id: "2", title: "2. Deep Analysis", status: "completed", description: "Benchmark & Rischio" },
            { id: "3", title: "3. Human Gate", status: approval.status === "approved" ? "completed" : "pending", description: "Approvazione LDG Admin" },
            { id: "4", title: "4. Swarm Rollout", status: approval.status === "approved" ? "completed" : "queued", description: "Attivazione Sub-Agenti" },
          ]).map((node, i) => {
            const isDone = node.status === "completed";
            const isPending = node.status === "pending";
            const isFailed = node.status === "failed";

            return (
              <div
                key={node.id || i}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs space-y-0.5 transition-colors",
                  isDone
                    ? "border-green-500/30 bg-green-500/[0.05] text-green-700 dark:text-green-300"
                    : isPending
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/20 animate-pulse"
                      : isFailed
                        ? "border-red-500/30 bg-red-500/[0.05] text-red-700 dark:text-red-300"
                        : "border-border/50 bg-background/50 text-muted-foreground",
                )}
              >
                <div className="flex items-center justify-between font-semibold text-(length:--text-micro)">
                  <span className="truncate">{node.title}</span>
                  {isDone && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {isPending && <Clock className="h-3 w-3 text-amber-500" />}
                </div>
                <p className="text-(length:--text-nano) opacity-80 truncate">{node.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Telemetry & Forecast Summary Box */}
      {costAnalytics && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              Costo Lavoro Svolto:
            </span>
            <span className="font-mono font-bold text-foreground flex items-center gap-1">
              {costAnalytics.isFreeOrLocal ? (
                <span className="text-3xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  FREE / $0.00
                </span>
              ) : (
                `$${costAnalytics.incurredCostUsd.toFixed(3)} USD `
              )}
              <span className="text-(length:--text-nano) font-normal text-muted-foreground">
                ({(costAnalytics.incurredTokens / 1000).toFixed(1)}k tokens{costAnalytics.executionTimeSeconds > 0 ? ` · ${costAnalytics.executionTimeSeconds}s` : ""})
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Preventivo Downstream:
            </span>
            <span className="font-mono font-bold text-primary flex items-center gap-1">
              {costAnalytics.isFreeOrLocal ? (
                <span className="text-3xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  AZZERATO ($0.00)
                </span>
              ) : (
                `$${costAnalytics.forecastCostUsd.toFixed(3)} USD `
              )}
              <span className="text-(length:--text-nano) font-normal text-muted-foreground">
                ({(costAnalytics.forecastTokens / 1000).toFixed(1)}k tokens)
              </span>
            </span>
          </div>

          {costAnalytics.benchmarkLabel && (
            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Affidabilità Telemetrica:
              </span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {costAnalytics.benchmarkLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payload summary */}
      <div className="mt-3 border-t border-border/60 pt-3">
        <ApprovalPayloadRenderer
          type={approval.type}
          payload={approval.payload}
          hidePrimaryTitle={Boolean(subject)}
        />
      </div>

      {approval.decisionNote && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
          <span className="font-bold text-foreground">Decision Note:</span> {approval.decisionNote}
        </div>
      )}

      {/* Action Footer */}
      {hasFooter && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {showResolutionButtons && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-500 text-white font-bold gap-1.5 shadow-xs"
                  onClick={onApprove}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {pendingAction === "approve" ? "In Approvazione..." : "Approva Ora"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="font-bold gap-1.5 shadow-xs"
                  onClick={onReject}
                  disabled={isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {pendingAction === "reject" ? "In Rifiuto..." : "Rifiuta"}
                </Button>
              </>
            )}
          </div>

          {(detailLink || onOpen) ? (
            detailLink ? (
              <Link
                to={detailLink}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "font-semibold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10",
                )}
              >
                Dettagli Completi & Istruzioni <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="font-semibold text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={onOpen}
              >
                Dettagli Completi & Istruzioni <ArrowRight className="h-3 w-3" />
              </Button>
            )
          ) : null}
        </div>
      )}
    </Card>
  );
}
