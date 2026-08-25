import { api } from "./client";
import type {
  Directive,
  DirectiveLineageEvent,
  CreateDirectiveInput,
  UpdateDirectiveInput,
  DirectiveStatsSummary,
  DirectiveStatus,
  DirectivePriority,
  DirectiveScope,
} from "@paperclipai/shared";

export const directivesApi = {
  list: (
    companyId: string,
    filters: {
      status?: DirectiveStatus;
      priority?: DirectivePriority;
      scope?: DirectiveScope;
      search?: string;
    } = {},
  ): Promise<Directive[]> => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.scope) params.set("scope", filters.scope);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return api.get(`/companies/${companyId}/directives${qs ? `?${qs}` : ""}`);
  },

  getStats: (companyId: string): Promise<DirectiveStatsSummary> =>
    api.get(`/companies/${companyId}/directives/stats`),

  getAnalytics: (companyId: string): Promise<{
    eventBreakdown: Array<{
      directive_id: string;
      directive_title: string;
      identifier: string;
      status: string;
      priority: string;
      event_type: string;
      event_count: string;
      total_cost_usd: string;
    }>;
    agentActivity: Array<{
      agent_id: string;
      agent_name: string;
      agent_role: string;
      total_runs: string;
      authorized_runs: string;
      blocked_runs: string;
    }>;
    timeSeries: Array<{
      day: string;
      event_type: string;
      count: string;
    }>;
    heartbeatRuns: Array<{
      id: string;
      agent_id: string;
      agent_name: string;
      status: string;
      model: string;
      total_tokens: number;
      cost_usd: string;
      latency_ms: number;
      started_at: string;
      finished_at: string;
      directive_id: string;
    }>;
  }> =>
    api.get(`/companies/${companyId}/directives/analytics`),

  getLineageFeed: (companyId: string, limit = 50): Promise<Array<{
    id: string;
    directive_id: string;
    directive_identifier: string;
    directive_title: string;
    directive_status: string;
    directive_priority: string;
    agent_id: string | null;
    agent_name: string | null;
    agent_role: string | null;
    run_id: string | null;
    event_type: string;
    actor_user_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }>> =>
    api.get(`/companies/${companyId}/directives/lineage-feed?limit=${limit}`),

  get: (id: string): Promise<Directive> =>
    api.get(`/directives/${id}`),

  create: (companyId: string, data: CreateDirectiveInput): Promise<Directive> =>
    api.post(`/companies/${companyId}/directives`, data),

  update: (id: string, data: UpdateDirectiveInput): Promise<Directive> =>
    api.patch(`/directives/${id}`, data),

  certify: (id: string): Promise<Directive> =>
    api.post(`/directives/${id}/certify`, {}),

  revoke: (id: string, reason?: string): Promise<Directive> =>
    api.post(`/directives/${id}/revoke`, { reason }),

  getLineage: (id: string): Promise<DirectiveLineageEvent[]> =>
    api.get(`/directives/${id}/lineage`),
};

