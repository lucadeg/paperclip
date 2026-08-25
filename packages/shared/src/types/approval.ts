import type { ApprovalStatus, ApprovalType } from "../constants.js";

export interface ApprovalAgentDetails {
  id: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  adapterType: string;
  model: string;
  provider: string;
  spentMonthlyCents: number;
  budgetMonthlyCents: number;
}

export interface ApprovalFlowNode {
  id: string;
  title: string;
  type: "trigger" | "analysis" | "gate" | "action" | "output";
  status: "completed" | "pending" | "queued" | "failed";
  description: string;
  icon?: string;
}

export interface ApprovalTargetSection {
  name: string;
  path?: string;
  type?: "file" | "module" | "database" | "api" | "ui" | "config" | "workflow";
  description?: string;
}

export interface ApprovalExecutionSpecification {
  nextSteps: string[];
  technicalMethodology: string;
  estimatedDuration: string;
  costBreakdown: {
    estimatedTokens: number;
    estimatedCostUsd: number;
    isFreeOrLocal: boolean;
    budgetImpactDescription: string;
  };
  targetSections: ApprovalTargetSection[];
  deliverables: string[];
  rollbackPlan?: string;
  successCriteria?: string[];
}

export interface ApprovalWorkflowTrace {
  sourceWorkflow: string;
  flowNodes: ApprovalFlowNode[];
  reasoningSummary: string;
  whyRequired: string;
  howExecuted: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  governanceTier: string;
  executionSpecification?: ApprovalExecutionSpecification;
}

export interface ApprovalCostAnalytics {
  incurredTokens: number;
  incurredCostUsd: number;
  executionTimeSeconds: number;
  forecastTokens: number;
  forecastCostUsd: number;
  forecastImpact: string;
  isFreeOrLocal?: boolean;
  benchmarkScore?: number | null;
  benchmarkLabel?: string | null;
  metricsSource?: "real_telemetry" | "insufficient_data";
}

export interface Approval {
  id: string;
  companyId: string;
  type: ApprovalType;
  requestedByAgentId: string | null;
  requestedByUserId: string | null;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  decisionNote: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  agentDetails?: ApprovalAgentDetails;
  workflowTrace?: ApprovalWorkflowTrace;
  costAnalytics?: ApprovalCostAnalytics;
  executionSpecification?: ApprovalExecutionSpecification;
}

export interface ApprovalComment {
  id: string;
  companyId: string;
  approvalId: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

