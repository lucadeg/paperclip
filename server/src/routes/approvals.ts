import { Router, type Request } from "express";
import { eq, desc } from "drizzle-orm";
import { agents as agentsTable, heartbeatRuns, type Db } from "@paperclipai/db";
import {
  addApprovalCommentSchema,
  createApprovalSchema,
  requestApprovalRevisionSchema,
  resolveApprovalSchema,
  resubmitApprovalSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logger } from "../middleware/logger.js";
import {
  approvalService,
  accessService,
  heartbeatService,
  issueApprovalService,
  logActivity,
  secretService,
} from "../services/index.js";
import { assertBoard, assertCompanyAccess, getAccessibleResource, getActorInfo, hasCompanyAccess } from "./authz.js";
import { redactEventPayload } from "../redaction.js";
import type { PluginWorkerManager } from "../services/plugin-worker-manager.js";
import { issueService } from "../services/issues.js";
import { REVIEW_PATH_RECOVERY_INSTRUCTION } from "../services/recovery/review-path-recovery.js";
import { isFreeOrLocalModel } from "../services/free-model-detector.js";

function redactApprovalPayload<T extends { payload: Record<string, unknown> }>(approval: T): T {
  return {
    ...approval,
    payload: redactEventPayload(approval.payload) ?? {},
  };
}

async function enrichApprovalRecord(approval: any, db: Db): Promise<any> {
  const redacted = redactApprovalPayload(approval);
  let agentDetails: any = null;

  if (approval.requestedByAgentId) {
    const agent = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, approval.requestedByAgentId))
      .then((rows) => rows[0] ?? null);

    if (agent) {
      const adapterCfg = (agent.adapterConfig as Record<string, unknown>) || {};
      const model =
        typeof adapterCfg.model === "string"
          ? adapterCfg.model
          : agent.adapterType === "hermes_local"
            ? "proxima-claude-3-5-sonnet"
            : "hermes-3-llama-3.1-70b";
      const provider =
        typeof adapterCfg.provider === "string"
          ? adapterCfg.provider
          : model.includes("claude")
            ? "Anthropic (Proxima Route)"
            : model.includes("hydra")
              ? "Hydra Neural Router"
              : "Nous Hermes Distributed";

      agentDetails = {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        title: agent.title ?? `${agent.role.toUpperCase()} Specialist`,
        icon: agent.icon ?? "bot",
        adapterType: agent.adapterType,
        model,
        provider,
        spentMonthlyCents: agent.spentMonthlyCents ?? 0,
        budgetMonthlyCents: agent.budgetMonthlyCents ?? 0,
      };
    }
  }

  const payload = (approval.payload as Record<string, any>) || {};
  const amountUsd = Number(payload.amountUsd || 0);
  const isHighRisk = amountUsd > 10000 || approval.type === "approve_ceo_strategy";
  const riskLevel = isHighRisk
    ? amountUsd > 25000
      ? "CRITICAL"
      : "HIGH"
    : approval.type === "budget_override_required"
      ? "MEDIUM"
      : "LOW";

  const subject = payload.title || payload.name || payload.summary || "Executive Action Gate";
  const governanceTier =
    payload.governanceLevel ||
    (approval.type === "approve_ceo_strategy"
      ? "God Tier (LDG Admin Approval Mandatory)"
      : approval.type === "budget_override_required"
        ? "Financial Budget Override"
        : "Technical Board Approval");

  const flowNodes = [
    {
      id: "node_trigger",
      title: "1. Trigger & Discovery",
      type: "trigger",
      status: "completed",
      description: `Analisi delle metriche e identificazione del requisito operativo per "${subject}"`,
      icon: "zap",
    },
    {
      id: "node_analysis",
      title: "2. Deep Neural Analysis",
      type: "analysis",
      status: "completed",
      description:
        payload.technicalMoat ||
        payload.impact ||
        payload.riskAssessment ||
        payload.summary ||
        "Valutazione dei vincoli architetturali, benchmark prestazionali e conformità",
      icon: "cpu",
    },
    {
      id: "node_gate",
      title: "3. 🛡️ Human Governance Gate",
      type: "gate",
      status:
        approval.status === "approved"
          ? "completed"
          : approval.status === "rejected"
            ? "failed"
            : "pending",
      description: "Blocco di sicurezza Zero-Trust: autorizzazione obbligatoria da parte di LDG Admin",
      icon: "shield-check",
    },
    {
      id: "node_execution",
      title: "4. Swarm Execution & Rollout",
      type: "action",
      status: approval.status === "approved" ? "completed" : "queued",
      description: "Attivazione dei sub-agenti, allocazione risorse e sincronizzazione dei file di produzione",
      icon: "play-circle",
    },
  ];

  const workflowTrace = {
    sourceWorkflow: subject,
    flowNodes,
    reasoningSummary:
      payload.summary ||
      payload.description ||
      "L'agente ha elaborato la proposta strategica richiedendo il via libera sovrano prima dell'esecuzione.",
    whyRequired: `La politica di Zero-Trust Governance aziendale richiede approvazione manuale per la tipologia "${approval.type.replace(
      /_/g,
      " ",
    )}" e livello "${governanceTier}".`,
    howExecuted: `Eseguito mediante ${agentDetails?.model ?? "Modello Neurale"} (${
      agentDetails?.adapterType ?? "hermes"
    }). L'agente rimane in pausa fino alla risoluzione del gate.`,
    riskLevel,
    governanceTier,
  };

  const modelName = (payload.model as string | undefined) ?? (agentDetails?.model as string | undefined) ?? "";
  const isFree = isFreeOrLocalModel(modelName);

  let realIncurredTokens = typeof payload.incurredTokens === "number" ? payload.incurredTokens : 0;
  let realIncurredCostUsd = typeof payload.incurredCostUsd === "number" ? payload.incurredCostUsd : 0;
  let realExecutionTimeSeconds = typeof payload.executionTimeSeconds === "number" ? payload.executionTimeSeconds : 0;
  let benchmarkScore: number | null = null;
  let benchmarkLabel: string | null = null;
  let metricsSource: "real_telemetry" | "insufficient_data" = "insufficient_data";

  if (approval.requestedByAgentId) {
    try {
      const runs = await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.agentId, approval.requestedByAgentId))
        .orderBy(desc(heartbeatRuns.createdAt))
        .limit(20);

      if (runs.length > 0) {
        metricsSource = "real_telemetry";
        let tokenSum = 0;
        let timeSum = 0;
        let completedCount = 0;
        let successCount = 0;

        for (const r of runs) {
          const u = (r.usageJson as Record<string, any>) || {};
          const t = Number(u.total_tokens || u.totalTokens || (Number(u.input_tokens || 0) + Number(u.output_tokens || 0)) || 0);
          tokenSum += t;

          if (r.startedAt && r.finishedAt) {
            timeSum += Math.max(0, (new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000);
          }

          if (r.status === "succeeded" || r.status === "completed") {
            completedCount++;
            successCount++;
          } else if (r.status === "failed" || r.status === "error") {
            completedCount++;
          }
        }

        if (realIncurredTokens === 0 && tokenSum > 0) {
          realIncurredTokens = tokenSum;
        }
        if (realExecutionTimeSeconds === 0 && timeSum > 0) {
          realExecutionTimeSeconds = Math.round(timeSum * 10) / 10;
        }

        if (completedCount > 0) {
          const pct = Math.round((successCount / completedCount) * 100 * 10) / 10;
          benchmarkScore = pct;
          benchmarkLabel = `${pct}% (${successCount}/${completedCount} run superati)`;
        } else {
          benchmarkScore = null;
          benchmarkLabel = "N/D - Nessun run completato";
        }
      } else {
        benchmarkScore = null;
        benchmarkLabel = "N/D - Nessun run telemetrico";
      }
    } catch {
      benchmarkScore = null;
      benchmarkLabel = "N/D - Telemetria non disponibile";
    }
  } else {
    benchmarkScore = null;
    benchmarkLabel = "N/D - Nessun agente richiedente";
  }

  if (isFree) {
    realIncurredCostUsd = 0;
  } else if (realIncurredCostUsd === 0 && realIncurredTokens > 0) {
    realIncurredCostUsd = Math.round(realIncurredTokens * 0.0000025 * 1000) / 1000;
  }

  const forecastTokens = typeof payload.forecastTokens === "number" ? payload.forecastTokens : 0;
  const forecastCostUsd = isFree ? 0 : (typeof payload.forecastCostUsd === "number" ? payload.forecastCostUsd : amountUsd);

  const costAnalytics = {
    incurredTokens: realIncurredTokens,
    incurredCostUsd: realIncurredCostUsd,
    executionTimeSeconds: realExecutionTimeSeconds,
    forecastTokens: forecastTokens,
    forecastCostUsd: forecastCostUsd,
    isFreeOrLocal: isFree,
    benchmarkScore,
    benchmarkLabel,
    metricsSource,
    forecastImpact: isFree
      ? "Zero Cost / Modello Gratuito o Locale ($0.00 USD)"
      : (forecastCostUsd > 0
          ? `Richiesta allocazione di $${forecastCostUsd.toLocaleString()}`
          : "Nessun costo computazionale aggiuntivo previsto"),
  };

  // ── Smart Execution Specification Dossier (Cosa, Come, Quando, Costi, Sezioni) ──
  const rawNextSteps = Array.isArray(payload.nextSteps)
    ? (payload.nextSteps as string[])
    : Array.isArray(payload.steps)
      ? (payload.steps as string[])
      : null;

  const nextSteps = rawNextSteps && rawNextSteps.length > 0
    ? rawNextSteps
    : [
        `1. Creazione e checkout del branch di lavoro isolato per "${subject}".`,
        `2. Esecuzione modifiche architetturali sui moduli target e file sorgenti.`,
        `3. Esecuzione suite di test TDD e verifica di non-regressione automatica.`,
        `4. Generazione deliverable, commit firmato e notifica di completamento su Paperclip.`,
      ];

  const technicalMethodology =
    (typeof payload.technicalMethodology === "string" && payload.technicalMethodology) ||
    (typeof payload.methodology === "string" && payload.methodology) ||
    `Implementazione modulare TypeScript/Node guidata da ${agentDetails?.model ?? "Hermes Agent"} con adapter ${agentDetails?.adapterType ?? "hermes_local"}. Toolset vincolato e safe isolation sandbox.`;

  const estimatedDuration =
    (typeof payload.estimatedDuration === "string" && payload.estimatedDuration) ||
    (typeof payload.duration === "string" && payload.duration) ||
    (amountUsd > 10000 ? "~45-90 minuti (Multi-Agent Swarm)" : "~15-30 minuti (Single Sprint Execution)");

  const targetSections = Array.isArray(payload.targetSections) && payload.targetSections.length > 0
    ? payload.targetSections
    : [
        {
          name: "Sorgenti & Moduli Core",
          path: (typeof payload.targetPath === "string" && payload.targetPath) || "packages/ or server/src/",
          type: "file" as const,
          description: "Codice sorgente applicativo e logica di business",
        },
        {
          name: "Interfaccia Utente & Visual Paneling",
          path: "ui/src/",
          type: "ui" as const,
          description: "Componenti UI, visualizzatori e pannelli interattivi",
        },
        {
          name: "Schema DB & Migrazioni",
          path: "packages/db/src/schema/",
          type: "database" as const,
          description: "Struttura dati relazionale e vincoli di integrità",
        },
      ];

  const deliverables = Array.isArray(payload.deliverables) && payload.deliverables.length > 0
    ? payload.deliverables
    : [
        "Commit atomico e tracciabile nel repository",
        "Artefatto di verifica (walkthrough.md / test report)",
        "Aggiornamento stato issue e rilascio blocco governance",
      ];

  const rollbackPlan =
    (typeof payload.rollbackPlan === "string" && payload.rollbackPlan) ||
    "In caso di fallimento o errori di compilazione, ripristino automatico dello snapshot del branch di lavoro e apertura automatica di un'issue di revisione.";

  const successCriteria = Array.isArray(payload.successCriteria) && payload.successCriteria.length > 0
    ? payload.successCriteria
    : [
        "Tutti i test unitari e di tipo passano con exit code 0",
        "Nessuna regressione sui contratti API e schema DB",
        "Validazione completata da parte del supervisore",
      ];

  const executionSpecification = {
    nextSteps,
    technicalMethodology,
    estimatedDuration,
    costBreakdown: {
      estimatedTokens: forecastTokens || 8500,
      estimatedCostUsd: forecastCostUsd,
      isFreeOrLocal: isFree,
      budgetImpactDescription: isFree
        ? "Impatto sul budget: $0.00 USD (Modello Locale / Gratuito Zero Cost)"
        : forecastCostUsd > 0
          ? `Impatto sul budget: $${forecastCostUsd.toFixed(3)} USD allocati dal budget agente`
          : "Nessun impatto economico diretto sul budget mensile",
    },
    targetSections,
    deliverables,
    rollbackPlan,
    successCriteria,
  };

  const enrichedWorkflowTrace = {
    ...workflowTrace,
    executionSpecification,
  };

  return {
    ...redacted,
    agentDetails,
    workflowTrace: enrichedWorkflowTrace,
    costAnalytics,
    executionSpecification,
  };
}

function isStatusOnlyCheapRecoveryContext(contextSnapshot: unknown) {
  if (!contextSnapshot || typeof contextSnapshot !== "object" || Array.isArray(contextSnapshot)) return false;
  const context = contextSnapshot as Record<string, unknown>;
  return context.modelProfile === "cheap" &&
    context.recoveryIntent === "status_only" &&
    context.allowDeliverableWork === false &&
    context.allowDocumentUpdates === false &&
    context.resumeRequiresNormalModel === true;
}

export function approvalRoutes(
  db: Db,
  options: { pluginWorkerManager?: PluginWorkerManager } = {},
) {
  const router = Router();
  const svc = approvalService(db);
  const access = accessService(db);
  const heartbeat = heartbeatService(db, {
    pluginWorkerManager: options.pluginWorkerManager,
  });
  const issueApprovalsSvc = issueApprovalService(db);
  const issuesSvc = issueService(db);
  const secretsSvc = secretService(db);
  const strictSecretsMode = process.env.PAPERCLIP_SECRETS_STRICT_MODE === "true";

  async function lostReviewPathIssueIds(
    companyId: string,
    linkedIssues: Awaited<ReturnType<typeof issueApprovalsSvc.listIssuesForApproval>>,
  ) {
    const attention = await issuesSvc.listReviewAttention(companyId, linkedIssues);
    return new Set(linkedIssues
      .filter((issue) => attention.get(issue.id)?.state === "stalled")
      .map((issue) => issue.id));
  }

  function approvalReviewPathContext(approvalId: string) {
    return {
      reviewPathLost: true,
      reviewPathConsumedRef: approvalId,
      reviewPathInstruction: REVIEW_PATH_RECOVERY_INSTRUCTION,
    };
  }

  async function queueAdditionalApprovalReviewPathWakes(input: {
    approvalId: string;
    approvalStatus: string;
    companyId: string;
    linkedIssues: Awaited<ReturnType<typeof issueApprovalsSvc.listIssuesForApproval>>;
    lostIssueIds: Set<string>;
    alreadyWoken?: { agentId: string; issueId: string } | null;
    requestedByUserId: string;
  }) {
    for (const issue of input.linkedIssues) {
      if (!input.lostIssueIds.has(issue.id) || !issue.assigneeAgentId) continue;
      if (
        input.alreadyWoken?.agentId === issue.assigneeAgentId
        && input.alreadyWoken.issueId === issue.id
      ) continue;

      const wakeReason = `approval_${input.approvalStatus}`;
      try {
        const wakeRun = await heartbeat.wakeup(issue.assigneeAgentId, {
          source: "automation",
          triggerDetail: "system",
          reason: wakeReason,
          idempotencyKey: `approval-review-path:${input.approvalId}:${issue.id}:${input.approvalStatus}`,
          payload: {
            approvalId: input.approvalId,
            approvalStatus: input.approvalStatus,
            issueId: issue.id,
            ...approvalReviewPathContext(input.approvalId),
          },
          requestedByActorType: "user",
          requestedByActorId: input.requestedByUserId,
          contextSnapshot: {
            source: `approval.${input.approvalStatus}`,
            approvalId: input.approvalId,
            approvalStatus: input.approvalStatus,
            issueId: issue.id,
            taskId: issue.id,
            wakeReason,
            ...approvalReviewPathContext(input.approvalId),
          },
        });

        await logActivity(db, {
          companyId: input.companyId,
          actorType: "user",
          actorId: input.requestedByUserId,
          action: "approval.review_path_wakeup_queued",
          entityType: "approval",
          entityId: input.approvalId,
          details: {
            approvalStatus: input.approvalStatus,
            issueId: issue.id,
            assigneeAgentId: issue.assigneeAgentId,
            wakeRunId: wakeRun?.id ?? null,
          },
        });
      } catch (err) {
        logger.warn(
          { err, approvalId: input.approvalId, issueId: issue.id, agentId: issue.assigneeAgentId },
          "failed to queue review-path wake after approval resolution",
        );
        await logActivity(db, {
          companyId: input.companyId,
          actorType: "user",
          actorId: input.requestedByUserId,
          action: "approval.review_path_wakeup_failed",
          entityType: "approval",
          entityId: input.approvalId,
          details: {
            approvalStatus: input.approvalStatus,
            issueId: issue.id,
            assigneeAgentId: issue.assigneeAgentId,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }

  async function requireApprovalAccess(req: Request, id: string) {
    const approval = await svc.getById(id);
    if (!approval || !hasCompanyAccess(req, approval.companyId)) {
      return null;
    }
    assertCompanyAccess(req, approval.companyId);
    return approval;
  }

  async function assertApprovalAccessAllowed(req: Request, res: any, companyId: string) {
    const decision = await access.decide({
      actor: req.actor,
      action: "company_scope:read",
      resource: { type: "company", companyId },
    });
    if (decision.allowed) return true;
    res.status(403).json({ error: "Approvals are outside this actor's authorization boundary" });
    return false;
  }

  async function assertApprovalMutationAllowedByRunContext(req: Request, res: any, companyId: string) {
    if (req.actor.type !== "agent") return true;
    const runId = req.actor.runId?.trim();
    if (!runId || !req.actor.agentId) return true;

    const run = await db
      .select({
        id: heartbeatRuns.id,
        companyId: heartbeatRuns.companyId,
        agentId: heartbeatRuns.agentId,
        contextSnapshot: heartbeatRuns.contextSnapshot,
      })
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId))
      .then((rows) => rows[0] ?? null);
    if (!run || run.companyId !== companyId || run.agentId !== req.actor.agentId) return true;
    if (!isStatusOnlyCheapRecoveryContext(run.contextSnapshot)) return true;

    res.status(403).json({
      error: "Cheap status-only recovery runs cannot create or modify approvals",
      details: {
        companyId,
        runId: run.id,
        modelProfile: "cheap",
        recoveryIntent: "status_only",
        resumeRequiresNormalModel: true,
      },
    });
    return false;
  }

  router.get("/companies/:companyId/approvals", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertApprovalAccessAllowed(req, res, companyId))) return;
    const status = req.query.status as string | undefined;
    const result = await svc.list(companyId, status);
    const enriched = await Promise.all(result.map((approval) => enrichApprovalRecord(approval, db)));
    res.json(enriched);
  });

  router.get("/approvals/:id", async (req, res) => {
    const id = req.params.id as string;
    const approval = await getAccessibleResource(req, res, svc.getById(id), "Approval not found");
    if (!approval) return;
    if (!(await assertApprovalAccessAllowed(req, res, approval.companyId))) return;
    const enriched = await enrichApprovalRecord(approval, db);
    res.json(enriched);
  });

  router.post("/companies/:companyId/approvals", validate(createApprovalSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertApprovalAccessAllowed(req, res, companyId))) return;
    if (!(await assertApprovalMutationAllowedByRunContext(req, res, companyId))) return;
    const rawIssueIds = req.body.issueIds;
    const issueIds = Array.isArray(rawIssueIds)
      ? rawIssueIds.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const uniqueIssueIds = Array.from(new Set(issueIds));
    const { issueIds: _issueIds, ...approvalInput } = req.body;
    const normalizedPayload =
      approvalInput.type === "hire_agent"
        ? await secretsSvc.normalizeHireApprovalPayloadForPersistence(
            companyId,
            approvalInput.payload,
            { strictMode: strictSecretsMode },
          )
        : approvalInput.payload;

    const actor = getActorInfo(req);
    const approval = await svc.create(companyId, {
      ...approvalInput,
      payload: normalizedPayload,
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      requestedByAgentId:
        approvalInput.requestedByAgentId ?? (actor.actorType === "agent" ? actor.actorId : null),
      status: "pending",
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    if (uniqueIssueIds.length > 0) {
      await issueApprovalsSvc.linkManyForApproval(approval.id, uniqueIssueIds, {
        agentId: actor.agentId,
        userId: actor.actorType === "user" ? actor.actorId : null,
      });
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.created",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type, issueIds: uniqueIssueIds },
    });

    res.status(201).json(redactApprovalPayload(approval));
  });

  router.get("/approvals/:id/issues", async (req, res) => {
    const id = req.params.id as string;
    const approval = await getAccessibleResource(req, res, svc.getById(id), "Approval not found");
    if (!approval) return;
    if (!(await assertApprovalAccessAllowed(req, res, approval.companyId))) return;
    const issues = await issueApprovalsSvc.listIssuesForApproval(id);
    res.json(issues);
  });

  router.post("/approvals/:id/approve", validate(resolveApprovalSchema), async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    if (!(await requireApprovalAccess(req, id))) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    const decidedByUserId = req.actor.userId ?? "board";
    const { approval, applied } = await svc.approve(id, decidedByUserId, req.body.decisionNote);

    if (applied) {
      const linkedIssues = await issueApprovalsSvc.listIssuesForApproval(approval.id);
      const linkedIssueIds = linkedIssues.map((issue) => issue.id);
      const primaryIssueId = linkedIssueIds[0] ?? null;
      const lostReviewIssueIds = await lostReviewPathIssueIds(approval.companyId, linkedIssues);
      const primaryReviewPathContext = primaryIssueId && lostReviewIssueIds.has(primaryIssueId)
        ? approvalReviewPathContext(approval.id)
        : null;

      await logActivity(db, {
        companyId: approval.companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "approval.approved",
        entityType: "approval",
        entityId: approval.id,
        details: {
          type: approval.type,
          requestedByAgentId: approval.requestedByAgentId,
          linkedIssueIds,
        },
      });

      let primaryReviewPathWakeCovered = false;
      if (approval.requestedByAgentId) {
        try {
          const wakeRun = await heartbeat.wakeup(approval.requestedByAgentId, {
            source: "automation",
            triggerDetail: "system",
            reason: "approval_approved",
            payload: {
              approvalId: approval.id,
              approvalStatus: approval.status,
              issueId: primaryIssueId,
              issueIds: linkedIssueIds,
              ...(primaryReviewPathContext ?? {}),
            },
            requestedByActorType: "user",
            requestedByActorId: req.actor.userId ?? "board",
            contextSnapshot: {
              source: "approval.approved",
              approvalId: approval.id,
              approvalStatus: approval.status,
              issueId: primaryIssueId,
              issueIds: linkedIssueIds,
              taskId: primaryIssueId,
              wakeReason: "approval_approved",
              ...(primaryReviewPathContext ?? {}),
            },
          });
          primaryReviewPathWakeCovered = Boolean(wakeRun && primaryReviewPathContext);

          await logActivity(db, {
            companyId: approval.companyId,
            actorType: "user",
            actorId: req.actor.userId ?? "board",
            action: "approval.requester_wakeup_queued",
            entityType: "approval",
            entityId: approval.id,
            details: {
              requesterAgentId: approval.requestedByAgentId,
              wakeRunId: wakeRun?.id ?? null,
              linkedIssueIds,
            },
          });
        } catch (err) {
          logger.warn(
            {
              err,
              approvalId: approval.id,
              requestedByAgentId: approval.requestedByAgentId,
            },
            "failed to queue requester wakeup after approval",
          );
          await logActivity(db, {
            companyId: approval.companyId,
            actorType: "user",
            actorId: req.actor.userId ?? "board",
            action: "approval.requester_wakeup_failed",
            entityType: "approval",
            entityId: approval.id,
            details: {
              requesterAgentId: approval.requestedByAgentId,
              linkedIssueIds,
              error: err instanceof Error ? err.message : String(err),
            },
          });
        }
      }

      await queueAdditionalApprovalReviewPathWakes({
        approvalId: approval.id,
        approvalStatus: approval.status,
        companyId: approval.companyId,
        linkedIssues,
        lostIssueIds: lostReviewIssueIds,
        alreadyWoken: primaryReviewPathWakeCovered && approval.requestedByAgentId && primaryIssueId
          ? { agentId: approval.requestedByAgentId, issueId: primaryIssueId }
          : null,
        requestedByUserId: req.actor.userId ?? "board",
      });
    }

    res.json(redactApprovalPayload(approval));
  });

  router.post("/approvals/:id/reject", validate(resolveApprovalSchema), async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    if (!(await requireApprovalAccess(req, id))) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    const decidedByUserId = req.actor.userId ?? "board";
    const { approval, applied } = await svc.reject(id, decidedByUserId, req.body.decisionNote);

    if (applied) {
      const linkedIssues = await issueApprovalsSvc.listIssuesForApproval(approval.id);
      const lostReviewIssueIds = await lostReviewPathIssueIds(approval.companyId, linkedIssues);
      await logActivity(db, {
        companyId: approval.companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "approval.rejected",
        entityType: "approval",
        entityId: approval.id,
        details: { type: approval.type },
      });
      await queueAdditionalApprovalReviewPathWakes({
        approvalId: approval.id,
        approvalStatus: approval.status,
        companyId: approval.companyId,
        linkedIssues,
        lostIssueIds: lostReviewIssueIds,
        requestedByUserId: req.actor.userId ?? "board",
      });
    }

    res.json(redactApprovalPayload(approval));
  });

  router.post(
    "/approvals/:id/request-revision",
    validate(requestApprovalRevisionSchema),
    async (req, res) => {
      assertBoard(req);
      const id = req.params.id as string;
      if (!(await requireApprovalAccess(req, id))) {
        res.status(404).json({ error: "Approval not found" });
        return;
      }
      const decidedByUserId = req.actor.userId ?? "board";
      const approval = await svc.requestRevision(id, decidedByUserId, req.body.decisionNote);

      await logActivity(db, {
        companyId: approval.companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "approval.revision_requested",
        entityType: "approval",
        entityId: approval.id,
        details: { type: approval.type },
      });

      res.json(redactApprovalPayload(approval));
    },
  );

  router.post("/approvals/:id/resubmit", validate(resubmitApprovalSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await getAccessibleResource(req, res, svc.getById(id), "Approval not found");
    if (!existing) return;
    if (!(await assertApprovalMutationAllowedByRunContext(req, res, existing.companyId))) return;

    if (req.actor.type === "agent" && req.actor.agentId !== existing.requestedByAgentId) {
      res.status(403).json({ error: "Only requesting agent can resubmit this approval" });
      return;
    }

    const normalizedPayload = req.body.payload
      ? existing.type === "hire_agent"
        ? await secretsSvc.normalizeHireApprovalPayloadForPersistence(
            existing.companyId,
            req.body.payload,
            { strictMode: strictSecretsMode },
          )
        : req.body.payload
      : undefined;
    const approval = await svc.resubmit(id, normalizedPayload);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.resubmitted",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type },
    });
    res.json(redactApprovalPayload(approval));
  });

  router.get("/approvals/:id/comments", async (req, res) => {
    const id = req.params.id as string;
    const approval = await getAccessibleResource(req, res, svc.getById(id), "Approval not found");
    if (!approval) return;
    const comments = await svc.listComments(id);
    res.json(comments);
  });

  router.post("/approvals/:id/comments", validate(addApprovalCommentSchema), async (req, res) => {
    const id = req.params.id as string;
    const approval = await getAccessibleResource(req, res, svc.getById(id), "Approval not found");
    if (!approval) return;
    if (!(await assertApprovalMutationAllowedByRunContext(req, res, approval.companyId))) return;
    const actor = getActorInfo(req);
    const comment = await svc.addComment(id, req.body.body, {
      agentId: actor.agentId ?? undefined,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.comment_added",
      entityType: "approval",
      entityId: approval.id,
      details: { commentId: comment.id },
    });

    res.status(201).json(comment);
  });

  return router;
}
