export interface TaskInputEvaluation {
  clarityScore: number;
  specificityScore: number;
  contextCompletenessScore: number;
  estimatedComplexity: "simple" | "moderate" | "complex" | "architectural";
  identifiedRequirements: string[];
  missingContextWarnings: string[];
  recommendedModel: string;
  promptImprovements: string[];
}

export interface TaskOutputEvaluation {
  correctnessScore: number;
  completenessScore: number;
  coherenceScore: number;
  deliverableVerdict: "delivered_complete" | "delivered_partial" | "failed" | "no_output";
  executionEfficiencyScore: number;
  reasoningAssessment: string;
  toolExecutionVerdict: string;
  errorRootCause?: string | null;
}

export interface DistilledLearning {
  id: string;
  category: "pattern" | "pitfall" | "optimization" | "model_match";
  title: string;
  insight: string;
  actionableRecommendation: string;
  confidence: number;
  modelEvaluated?: string;
}

export interface TaskEvaluation {
  id: string;
  companyId: string;
  issueId?: string | null;
  agentId?: string | null;
  heartbeatRunId?: string | null;
  directiveId?: string | null;
  model: string;
  isFreeOrLocal: boolean;
  inputClarityScore: number;
  outputQualityScore: number;
  efficiencyScore: number;
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  inputEvaluation: TaskInputEvaluation;
  outputEvaluation: TaskOutputEvaluation;
  distilledLearnings: DistilledLearning[];
  suggestedModelOptimization?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvaluationSummary {
  totalEvaluatedTasks: number;
  averageQualityScore: number;
  averageInputClarityScore: number;
  freeAndLocalTasksPercentage: number;
  totalSavedUsd: number;
  topPerformingModels: Array<{
    model: string;
    taskCount: number;
    avgQualityScore: number;
    isFreeOrLocal: boolean;
  }>;
  recentLearnings: DistilledLearning[];
}
