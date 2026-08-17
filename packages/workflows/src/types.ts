/**
 * Paperclip Multi-Agent Workflow Core Types
 */

export type WorkflowTriggerType = 'manual' | 'schedule' | 'webhook' | 'event';
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type WorkflowExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused';

export interface WorkflowStep {
  id: string;
  name: string;
  assignedAgent: string;
  toolRequired?: string;
  mcpServer?: string;
  inputs: Record<string, unknown>;
  dependsOn?: string[];
  timeoutMs?: number;
  retryCount?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  category: 'security' | 'intelligence' | 'geospatial' | 'sync' | 'devops' | 'media';
  description: string;
  trigger: {
    type: WorkflowTriggerType;
    cronExpression?: string;
    eventTopic?: string;
  };
  requiredSkills: string[];
  steps: WorkflowStep[];
}

export interface WorkflowExecutionRun {
  runId: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startedAt: number;
  completedAt?: number;
  stepResults: Record<string, {
    status: WorkflowStepStatus;
    output?: unknown;
    error?: string;
    durationMs: number;
  }>;
  telemetry: {
    totalTokens: number;
    totalDurationMs: number;
    efficiencyScore: number;
  };
}
