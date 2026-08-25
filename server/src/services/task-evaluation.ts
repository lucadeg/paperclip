/**
 * Task Input & Output Evaluation and Continuous Learning Service.
 *
 * Provides comprehensive evaluation of prompts (input clarity, complexity, completeness)
 * and execution outcomes (output correctness, deliverable quality, token efficiency, tool verdict).
 * Distills durable lessons and feeds them into the agent's working memory & directive lineage
 * for automatic continuous improvement across all tasks.
 */

import { desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { taskEvaluations, directiveLineageEvents } from "@paperclipai/db";
import type {
  DistilledLearning,
  TaskEvaluation,
  TaskEvaluationSummary,
  TaskInputEvaluation,
  TaskOutputEvaluation,
} from "@paperclipai/shared";
import { isFreeOrLocalModel } from "./free-model-detector.js";

// ============================================================================
// 1. INPUT EVALUATION ENGINE
// ============================================================================

export function evaluateTaskInput(
  promptText: string,
  context?: {
    title?: string;
    description?: string;
    model?: string;
  },
): TaskInputEvaluation {
  const text = (promptText || "").trim();
  const title = (context?.title || "").trim();
  const descText = (context?.description || "").trim();
  const fullContent = `${title}\n${descText}\n${text}`.trim();

  let clarityScore = 80;
  let specificityScore = 75;
  let contextCompletenessScore = 70;
  const missingContextWarnings: string[] = [];
  const identifiedRequirements: string[] = [];
  const promptImprovements: string[] = [];

  // Evaluate length & depth
  if (fullContent.length < 30) {
    clarityScore -= 30;
    specificityScore -= 35;
    contextCompletenessScore -= 40;
    missingContextWarnings.push("Task brief is very short (< 30 characters). Ambiguity risk is high.");
    promptImprovements.push("Provide explicit acceptance criteria and expected deliverable format.");
  } else if (fullContent.length > 200) {
    clarityScore += 10;
    specificityScore += 15;
    contextCompletenessScore += 15;
  }

  // Check for concrete file/code references
  const hasFilePaths = /[\w\-./\\]+\.(ts|js|tsx|jsx|json|py|rs|go|html|css|md|yaml|yml)/i.test(fullContent);
  if (hasFilePaths) {
    specificityScore += 10;
    identifiedRequirements.push("Target files/paths explicitly specified");
  } else {
    missingContextWarnings.push("No specific file paths or directories mentioned in the prompt");
    promptImprovements.push("Mention exact file paths or modules to reduce search overhead.");
  }

  // Check for acceptance criteria / tests
  const hasVerificationKeywords = /(verify|test|check|unit test|benchmark|build|criteria|assert)/i.test(fullContent);
  if (hasVerificationKeywords) {
    contextCompletenessScore += 10;
    identifiedRequirements.push("Verification / testing requirements defined");
  } else {
    promptImprovements.push("Specify how the solution should be verified (e.g. 'run pnpm test').");
  }

  // Determine estimated complexity
  let estimatedComplexity: "simple" | "moderate" | "complex" | "architectural" = "moderate";
  const wordCount = fullContent.split(/\s+/).length;
  const isArchitectural = /(architecture|refactor|migration|protocol|infrastructure|redesign|multi-package|cross-module)/i.test(fullContent);
  const isComplex = /(integrate|pipeline|security|concurrency|database schema|drizzle|auth)/i.test(fullContent) || wordCount > 250;
  const isSimple = wordCount < 50 && !isComplex && !isArchitectural;

  if (isArchitectural) {
    estimatedComplexity = "architectural";
  } else if (isComplex) {
    estimatedComplexity = "complex";
  } else if (isSimple) {
    estimatedComplexity = "simple";
  }

  // Recommend optimal model
  let recommendedModel = "openrouter/meta-llama/llama-3.3-70b-instruct:free";
  if (estimatedComplexity === "simple") {
    recommendedModel = "ollama/qwen2.5-coder:32b (Local $0.00) or openrouter/qwen/qwen-2.5-coder-32b-instruct:free";
  } else if (estimatedComplexity === "moderate") {
    recommendedModel = "openrouter/meta-llama/llama-3.3-70b-instruct:free ($0.00) or google/gemini-2.0-flash";
  } else if (estimatedComplexity === "complex") {
    recommendedModel = "openrouter/deepseek/deepseek-r1:free ($0.00) or anthropic/claude-3-7-sonnet";
  } else {
    recommendedModel = "anthropic/claude-3-7-sonnet or google/gemini-2.5-pro (2M context)";
  }

  return {
    clarityScore: Math.min(100, Math.max(10, clarityScore)),
    specificityScore: Math.min(100, Math.max(10, specificityScore)),
    contextCompletenessScore: Math.min(100, Math.max(10, contextCompletenessScore)),
    estimatedComplexity,
    identifiedRequirements,
    missingContextWarnings,
    recommendedModel,
    promptImprovements,
  };
}

// ============================================================================
// 2. OUTPUT EVALUATION ENGINE
// ============================================================================

export function evaluateTaskOutput(
  inputPrompt: string,
  outputResult: string,
  runMeta: {
    exitCode?: number | null;
    executionTimeMs?: number;
    tokens?: { input?: number; output?: number };
    error?: string | null;
    model?: string;
    isFreeOrLocal?: boolean;
  },
): TaskOutputEvaluation {
  const result = (outputResult || "").trim();
  const isFailure = (runMeta.exitCode !== null && runMeta.exitCode !== undefined && runMeta.exitCode !== 0) || Boolean(runMeta.error);

  let correctnessScore = isFailure ? 30 : 92;
  let completenessScore = isFailure ? 35 : 90;
  let coherenceScore = isFailure ? 50 : 95;
  let deliverableVerdict: "delivered_complete" | "delivered_partial" | "failed" | "no_output" = "delivered_complete";
  let errorRootCause: string | null = runMeta.error ?? null;

  if (result.length === 0) {
    deliverableVerdict = "no_output";
    correctnessScore = 0;
    completenessScore = 0;
    coherenceScore = 0;
    errorRootCause = errorRootCause || "Agent terminated without producing any text or artifacts.";
  } else if (isFailure) {
    deliverableVerdict = "failed";
    if (/timeout|timed out/i.test(result) || /timeout/i.test(runMeta.error || "")) {
      errorRootCause = "Execution timed out before task completion.";
    } else if (/syntax error|reference error|typeerror/i.test(result)) {
      errorRootCause = "Runtime script or code syntax failure during execution.";
    } else if (/command not found|enoent/i.test(result)) {
      errorRootCause = "Missing CLI tool or command in execution environment.";
    }
  } else {
    // Check output quality heuristics
    if (result.includes("Error:") || result.includes("Exception:") || result.includes("FAILED")) {
      correctnessScore -= 15;
      completenessScore -= 10;
      deliverableVerdict = "delivered_partial";
    }
    if (result.length > 500) {
      completenessScore = Math.min(100, completenessScore + 5);
    }
  }

  // Calculate execution efficiency
  const totalTokens = (runMeta.tokens?.input || 0) + (runMeta.tokens?.output || 0);
  let executionEfficiencyScore = 85;
  if (runMeta.isFreeOrLocal) {
    executionEfficiencyScore = 98; // Zero cost local/free tier is maximally cost-efficient
  } else if (totalTokens > 50_000) {
    executionEfficiencyScore = Math.max(60, 90 - Math.floor(totalTokens / 5000));
  }

  // Reasoning assessment
  let reasoningAssessment = "Clear, logical plan followed by targeted execution steps.";
  if (isFailure) {
    reasoningAssessment = `Execution interrupted or encountered errors: ${errorRootCause || "Unresolved error"}`;
  } else if (result.includes("diff") || result.includes("```")) {
    reasoningAssessment = "High-fidelity execution with concrete code artifacts and validation.";
  }

  // Tool execution verdict
  let toolExecutionVerdict = "Tools executed cleanly within host permissions.";
  if (isFailure && /permission|denied|eacces/i.test(result)) {
    toolExecutionVerdict = "Encountered permission or sandbox boundary limitations.";
  }

  return {
    correctnessScore: Math.min(100, Math.max(0, correctnessScore)),
    completenessScore: Math.min(100, Math.max(0, completenessScore)),
    coherenceScore: Math.min(100, Math.max(0, coherenceScore)),
    deliverableVerdict,
    executionEfficiencyScore,
    reasoningAssessment,
    toolExecutionVerdict,
    errorRootCause,
  };
}

// ============================================================================
// 3. LEARNING & CONTINUOUS IMPROVEMENT SYNTHESIS
// ============================================================================

export function synthesizeDistilledLearnings(
  inputEval: TaskInputEvaluation,
  outputEval: TaskOutputEvaluation,
  model: string,
  taskContext?: { title?: string; issueId?: string },
): DistilledLearning[] {
  const learnings: DistilledLearning[] = [];
  const isFree = isFreeOrLocalModel(model);

  // Learning 1: Model performance & cost efficiency match
  if (outputEval.correctnessScore >= 85) {
    if (isFree) {
      learnings.push({
        id: `learn-cost-${Date.now()}-1`,
        category: "optimization",
        title: `Zero-Cost Execution Success with ${model}`,
        insight: `Successfully completed ${inputEval.estimatedComplexity} task using free/local model (${model}) with $0.00 cost.`,
        actionableRecommendation: `Continue selecting ${model} or local Ollama for similar ${inputEval.estimatedComplexity} tasks to maintain $0 spend.`,
        confidence: 0.95,
        modelEvaluated: model,
      });
    } else {
      learnings.push({
        id: `learn-model-${Date.now()}-2`,
        category: "model_match",
        title: `High Accuracy Run with ${model}`,
        insight: `Model ${model} achieved ${outputEval.correctnessScore}% correctness on ${inputEval.estimatedComplexity} complexity task.`,
        actionableRecommendation: `Use ${model} for high-stakes ${inputEval.estimatedComplexity} tasks requiring deep reasoning.`,
        confidence: 0.92,
        modelEvaluated: model,
      });
    }
  } else {
    learnings.push({
      id: `learn-pitfall-${Date.now()}-3`,
      category: "pitfall",
      title: `Task Execution Challenge (${outputEval.errorRootCause || "Partial output"})`,
      insight: `Task faced obstacles: ${outputEval.errorRootCause || "Sub-optimal result"}.`,
      actionableRecommendation: `Ensure input prompts include concrete file paths and verify tool prerequisites prior to execution.`,
      confidence: 0.88,
      modelEvaluated: model,
    });
  }

  // Learning 2: Input prompt quality pattern
  if (inputEval.clarityScore < 70) {
    learnings.push({
      id: `learn-prompt-${Date.now()}-4`,
      category: "pattern",
      title: "Prompt Clarity Enhancement Opportunity",
      insight: `Initial prompt had ambiguity warnings: ${inputEval.missingContextWarnings.join("; ")}`,
      actionableRecommendation: `Include target file paths, expected outputs, and acceptance criteria in future task briefs.`,
      confidence: 0.85,
    });
  }

  return learnings;
}

// ============================================================================
// 4. STORAGE & AUTOMATIC CONTINUOUS LEARNING SERVICE
// ============================================================================

export function calculateOverallGrade(score: number): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "A+";
  if (score >= 88) return "A";
  if (score >= 78) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function createTaskEvaluationService(db: Db) {
  return {
    async evaluateAndRecordTask(params: {
      companyId: string;
      issueId?: string | null;
      agentId?: string | null;
      heartbeatRunId?: string | null;
      directiveId?: string | null;
      model: string;
      inputPrompt: string;
      outputResult: string;
      title?: string;
      description?: string;
      exitCode?: number | null;
      executionTimeMs?: number;
      tokens?: { input?: number; output?: number };
      error?: string | null;
    }): Promise<TaskEvaluation> {
      const isFree = isFreeOrLocalModel(params.model);
      const inputEval = evaluateTaskInput(params.inputPrompt, {
        title: params.title,
        description: params.description,
        model: params.model,
      });

      const outputEval = evaluateTaskOutput(params.inputPrompt, params.outputResult, {
        exitCode: params.exitCode,
        executionTimeMs: params.executionTimeMs,
        tokens: params.tokens,
        error: params.error,
        model: params.model,
        isFreeOrLocal: isFree,
      });

      const distilledLearnings = synthesizeDistilledLearnings(
        inputEval,
        outputEval,
        params.model,
        { title: params.title, issueId: params.issueId ?? undefined },
      );

      const inputClarityScore = Math.round((inputEval.clarityScore + inputEval.specificityScore + inputEval.contextCompletenessScore) / 3);
      const outputQualityScore = Math.round((outputEval.correctnessScore * 0.5) + (outputEval.completenessScore * 0.3) + (outputEval.coherenceScore * 0.2));
      const efficiencyScore = outputEval.executionEfficiencyScore;
      const overallScore = Math.round((inputClarityScore * 0.25) + (outputQualityScore * 0.55) + (efficiencyScore * 0.20));
      const grade = calculateOverallGrade(overallScore);

      const [record] = await db
        .insert(taskEvaluations)
        .values({
          companyId: params.companyId,
          issueId: params.issueId ?? null,
          agentId: params.agentId ?? null,
          heartbeatRunId: params.heartbeatRunId ?? null,
          directiveId: params.directiveId ?? null,
          model: params.model,
          isFreeOrLocal: isFree,
          inputClarityScore,
          outputQualityScore,
          efficiencyScore,
          overallScore,
          grade,
          inputEvaluation: inputEval,
          outputEvaluation: outputEval,
          distilledLearnings,
          suggestedModelOptimization: inputEval.recommendedModel,
        })
        .returning();

      // Continuous Learning: Record distilled learning in directive lineage / company intelligence
      if (params.directiveId) {
        await db.insert(directiveLineageEvents).values({
          companyId: params.companyId,
          directiveId: params.directiveId,
          eventType: "learning_distilled",
          details: {
            evaluationId: record.id,
            grade,
            overallScore,
            model: params.model,
            isFreeOrLocal: isFree,
            distilledLearnings,
          },
        }).catch(() => null);
      }

      return record as unknown as TaskEvaluation;
    },

    async getEvaluationForIssue(issueId: string): Promise<TaskEvaluation | null> {
      const [evalRecord] = await db
        .select()
        .from(taskEvaluations)
        .where(eq(taskEvaluations.issueId, issueId))
        .orderBy(desc(taskEvaluations.createdAt))
        .limit(1);
      return (evalRecord as unknown as TaskEvaluation) ?? null;
    },

    async getEvaluationForRun(heartbeatRunId: string): Promise<TaskEvaluation | null> {
      const [evalRecord] = await db
        .select()
        .from(taskEvaluations)
        .where(eq(taskEvaluations.heartbeatRunId, heartbeatRunId))
        .orderBy(desc(taskEvaluations.createdAt))
        .limit(1);
      return (evalRecord as unknown as TaskEvaluation) ?? null;
    },

    async getCompanyEvaluationSummary(companyId: string): Promise<TaskEvaluationSummary> {
      const records = await db
        .select()
        .from(taskEvaluations)
        .where(eq(taskEvaluations.companyId, companyId))
        .orderBy(desc(taskEvaluations.createdAt))
        .limit(100);

      if (records.length === 0) {
        return {
          totalEvaluatedTasks: 0,
          averageQualityScore: 100,
          averageInputClarityScore: 100,
          freeAndLocalTasksPercentage: 100,
          totalSavedUsd: 0,
          topPerformingModels: [],
          recentLearnings: [],
        };
      }

      const total = records.length;
      const freeCount = records.filter((r) => r.isFreeOrLocal).length;
      const avgQuality = Math.round(records.reduce((acc, r) => acc + r.outputQualityScore, 0) / total);
      const avgClarity = Math.round(records.reduce((acc, r) => acc + r.inputClarityScore, 0) / total);
      const freePercentage = Math.round((freeCount / total) * 100);
      const totalSavedUsd = freeCount * 0.05; // Est. $0.05 per task saved by choosing free/local models

      // Model performance aggregation
      const modelMap = new Map<string, { count: number; totalScore: number; isFree: boolean }>();
      for (const r of records) {
        const m = r.model || "default";
        const entry = modelMap.get(m) ?? { count: 0, totalScore: 0, isFree: r.isFreeOrLocal };
        entry.count += 1;
        entry.totalScore += r.outputQualityScore;
        modelMap.set(m, entry);
      }

      const topPerformingModels = Array.from(modelMap.entries()).map(([model, data]) => ({
        model,
        taskCount: data.count,
        avgQualityScore: Math.round(data.totalScore / data.count),
        isFreeOrLocal: data.isFree,
      })).sort((a, b) => b.avgQualityScore - a.avgQualityScore);

      const allLearnings = records.flatMap((r) => r.distilledLearnings || []);
      const recentLearnings = allLearnings.slice(0, 10);

      return {
        totalEvaluatedTasks: total,
        averageQualityScore: avgQuality,
        averageInputClarityScore: avgClarity,
        freeAndLocalTasksPercentage: freePercentage,
        totalSavedUsd,
        topPerformingModels,
        recentLearnings,
      };
    },
  };
}
