/**
 * Task Evaluation & Learning API Client.
 */

import { api } from "./client";
import type { TaskEvaluation, TaskEvaluationSummary } from "@paperclipai/shared";

export function getIssueEvaluation(
  companyId: string,
  issueId: string,
): Promise<TaskEvaluation> {
  return api.get<TaskEvaluation>(`/companies/${companyId}/issues/${issueId}/evaluation`);
}

export function triggerIssueEvaluation(
  companyId: string,
  issueId: string,
  payload?: {
    model?: string;
    inputPrompt?: string;
    outputResult?: string;
    exitCode?: number;
    error?: string | null;
  },
): Promise<TaskEvaluation> {
  return api.post<TaskEvaluation>(`/companies/${companyId}/issues/${issueId}/evaluate`, payload ?? {});
}

export function getCompanyEvaluationSummary(
  companyId: string,
): Promise<TaskEvaluationSummary> {
  return api.get<TaskEvaluationSummary>(`/companies/${companyId}/evaluations/summary`);
}
