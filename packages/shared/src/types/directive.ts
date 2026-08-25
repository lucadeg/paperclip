export type DirectiveStatus = "draft" | "active" | "paused" | "completed" | "revoked";
export type DirectivePriority = "low" | "medium" | "high" | "critical";
export type DirectiveScope = "global" | "team" | "agent" | "project" | "issue";

export interface Directive {
  id: string;
  companyId: string;
  identifier: string; // e.g. "DIR-1"
  title: string;
  description?: string | null;
  status: DirectiveStatus;
  priority: DirectivePriority;
  scope: DirectiveScope;
  targetAgentIds: string[];
  targetProjectIds: string[];
  authorizedActions: string[];
  budgetLimitUsd: string;
  spentBudgetUsd: string;
  maxRunsAllowed: number;
  executedRunsCount: number;
  certifiedByUserId?: string | null;
  certifiedAt?: string | null;
  validUntil?: string | null;
  rawInstructions: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Joined/Enriched runtime fields
  targetAgents?: Array<{
    id: string;
    name: string;
    role: string;
    icon?: string | null;
    status: string;
  }>;
  recentRunsCount?: number;
  recentLineageEvents?: DirectiveLineageEvent[];
}

export type DirectiveLineageEventType =
  | "run_authorized"
  | "run_blocked"
  | "action_executed"
  | "approval_requested"
  | "file_modified"
  | "directive_certified"
  | "directive_revoked"
  | "directive_modified";

export interface DirectiveLineageEvent {
  id: string;
  companyId: string;
  directiveId: string;
  agentId?: string | null;
  agentName?: string | null;
  agentIcon?: string | null;
  runId?: string | null;
  eventType: DirectiveLineageEventType;
  actorUserId?: string | null;
  details: {
    model?: string;
    costUsd?: number;
    tokensIn?: number;
    tokensOut?: number;
    filesModified?: string[];
    approvalId?: string;
    reason?: string;
    source?: string;
    instructionsSnippet?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface CreateDirectiveInput {
  title: string;
  description?: string;
  priority?: DirectivePriority;
  scope?: DirectiveScope;
  targetAgentIds?: string[];
  targetProjectIds?: string[];
  authorizedActions?: string[];
  budgetLimitUsd?: string;
  maxRunsAllowed?: number;
  rawInstructions: string;
  validUntil?: string;
  certifiedImmediately?: boolean;
}

export interface UpdateDirectiveInput {
  title?: string;
  description?: string;
  status?: DirectiveStatus;
  priority?: DirectivePriority;
  scope?: DirectiveScope;
  targetAgentIds?: string[];
  targetProjectIds?: string[];
  authorizedActions?: string[];
  budgetLimitUsd?: string;
  maxRunsAllowed?: number;
  rawInstructions?: string;
  validUntil?: string;
}

export interface DirectiveStatsSummary {
  totalDirectives: number;
  activeDirectives: number;
  draftDirectives: number;
  revokedDirectives: number;
  completedDirectives: number;
  totalBudgetLimitUsd: number;
  totalSpentBudgetUsd: number;
  totalRunsAuthorized: number;
  totalRunsBlocked: number;
  governedAgentsCount: number;
}
