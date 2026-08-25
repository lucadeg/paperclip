/**
 * Task Evaluation & Continuous Learning API Routes.
 */

import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { issues, agents, heartbeatRuns } from "@paperclipai/db";
import { eq, desc } from "drizzle-orm";
import { assertCompanyAccess } from "./authz.js";
import { createTaskEvaluationService } from "../services/task-evaluation.js";

export function taskEvaluationRoutes(db: Db) {
  const router = Router();
  const evaluationService = createTaskEvaluationService(db);

  // Get evaluation for a specific issue
  router.get("/companies/:companyId/issues/:issueId/evaluation", async (req, res) => {
    const { companyId, issueId } = req.params;
    assertCompanyAccess(req, companyId);

    let evaluation = await evaluationService.getEvaluationForIssue(issueId);

    // If no stored evaluation exists yet, generate one on demand from the issue data
    if (!evaluation) {
      const [issue] = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId));

      if (!issue) {
        res.status(404).json({ error: "Issue not found" });
        return;
      }

      let agentModel = "openrouter/meta-llama/llama-3.3-70b-instruct:free";
      if (issue.assigneeAgentId) {
        const [agent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, issue.assigneeAgentId));
        if (agent?.adapterConfig && typeof agent.adapterConfig === "object") {
          const cfg = agent.adapterConfig as Record<string, unknown>;
          if (typeof cfg.model === "string" && cfg.model.trim()) {
            agentModel = cfg.model.trim();
          }
        }
      }

      // Check for last heartbeat run
      const [lastRun] = await db
        .select()
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.companyId, companyId))
        .orderBy(desc(heartbeatRuns.createdAt))
        .limit(1);

      evaluation = await evaluationService.evaluateAndRecordTask({
        companyId,
        issueId,
        agentId: issue.assigneeAgentId ?? null,
        heartbeatRunId: lastRun?.id ?? null,
        model: agentModel,
        title: issue.title,
        description: issue.description ?? "",
        inputPrompt: `${issue.title}\n\n${issue.description ?? ""}`,
        outputResult: issue.status === "done" ? "Task successfully delivered and verified." : "Task in progress / evaluation pending completion.",
        exitCode: 0,
      });
    }

    res.json(evaluation);
  });

  // Explicitly trigger/re-evaluate an issue
  router.post("/companies/:companyId/issues/:issueId/evaluate", async (req, res) => {
    const { companyId, issueId } = req.params;
    assertCompanyAccess(req, companyId);

    const [issue] = await db
      .select()
      .from(issues)
      .where(eq(issues.id, issueId));

    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const { model, inputPrompt, outputResult, exitCode, error } = req.body || {};

    const evaluation = await evaluationService.evaluateAndRecordTask({
      companyId,
      issueId,
      agentId: issue.assigneeAgentId ?? null,
      model: model || "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      title: issue.title,
      description: issue.description ?? "",
      inputPrompt: inputPrompt || `${issue.title}\n\n${issue.description ?? ""}`,
      outputResult: outputResult || "Task execution evaluated.",
      exitCode: typeof exitCode === "number" ? exitCode : 0,
      error: error ?? null,
    });

    res.json(evaluation);
  });

  // Get company-wide evaluation summary & learning metrics
  router.get("/companies/:companyId/evaluations/summary", async (req, res) => {
    const { companyId } = req.params;
    assertCompanyAccess(req, companyId);

    const summary = await evaluationService.getCompanyEvaluationSummary(companyId);
    res.json(summary);
  });

  return router;
}
