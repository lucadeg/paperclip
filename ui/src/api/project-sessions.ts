import { api } from "./client";

export interface WorkflowStepDef {
  step: number;
  label: string;
  description: string;
}

export const PROJECT_WORKFLOW_STEPS: readonly WorkflowStepDef[] = [
  { step: 1, label: "Brief & Discovery", description: "Raccolta requisiti, obiettivi, stakeholder e contesto iniziale" },
  { step: 2, label: "Analisi & Ricerca", description: "Deep analysis del dominio, competitor, tecnologie e vincoli" },
  { step: 3, label: "Strategia & Vision", description: "Definizione dell'approccio strategico, KPI e success criteria" },
  { step: 4, label: "Architettura & Design", description: "Progettazione architetturale, wireframe e specifiche tecniche" },
  { step: 5, label: "Pianificazione & Budget", description: "Task breakdown, timeline, allocazione risorse e stima costi" },
  { step: 6, label: "Governance & Approvazione", description: "Review board, autorizzazione budget e firma direttive" },
  { step: 7, label: "Setup & Onboarding", description: "Configurazione ambienti, tool, agenti e credenziali" },
  { step: 8, label: "Esecuzione Sprint 1", description: "Primo ciclo di sviluppo, prototipo e proof of concept" },
  { step: 9, label: "Testing & QA", description: "Verifica funzionale, test automatizzati e security audit" },
  { step: 10, label: "Review & Feedback", description: "Raccolta feedback stakeholder, revisioni e ottimizzazioni" },
  { step: 11, label: "Esecuzione Sprint 2+", description: "Cicli di sviluppo iterativi fino al completamento features" },
  { step: 12, label: "Integration & Deploy", description: "Integrazione sistemi, deploy staging e smoke testing" },
  { step: 13, label: "Launch & Monitoring", description: "Go-live produzione, monitoring attivo e alert setup" },
  { step: 14, label: "Post-Launch & Scale", description: "Ottimizzazione performance, scaling e roadmap evolutiva" },
];

export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;


export interface ProjectSession {
  id: string;
  companyId: string;
  agentId: string | null;
  agentName: string | null;
  agentIcon: string | null;
  title: string;
  description: string | null;
  topic: string;
  workflowStep: number;
  status: string;
  selectedModel: string | null;
  enabledTools: string[];
  toolConfig: Record<string, unknown>;
  linkedIssueIds: string[];
  linkedDirectiveIds: string[];
  metadata: Record<string, unknown>;
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp: string;
    model?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectSessionInput {
  title: string;
  description?: string;
  topic?: string;
  workflowStep?: number;
  agentId?: string;
  selectedModel?: string;
  enabledTools?: string[];
  toolConfig?: Record<string, unknown>;
  linkedIssueIds?: string[];
  linkedDirectiveIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectSessionInput {
  title?: string;
  description?: string;
  topic?: string;
  workflowStep?: number;
  status?: string;
  selectedModel?: string;
  enabledTools?: string[];
  toolConfig?: Record<string, unknown>;
  linkedIssueIds?: string[];
  linkedDirectiveIds?: string[];
  metadata?: Record<string, unknown>;
  chatMessage?: {
    role: "user" | "assistant" | "system";
    content: string;
    model?: string;
  };
}

export const projectSessionsApi = {
  list: (
    companyId: string,
    filters: { topic?: string; status?: string } = {},
  ): Promise<ProjectSession[]> => {
    const params = new URLSearchParams();
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return api
      .get<{ sessions: ProjectSession[] }>(`/companies/${companyId}/project-sessions${qs ? `?${qs}` : ""}`)
      .then((r) => r.sessions);
  },

  get: (sessionId: string): Promise<ProjectSession> =>
    api
      .get<{ session: ProjectSession }>(`/project-sessions/${sessionId}`)
      .then((r) => r.session),

  create: (
    companyId: string,
    input: CreateProjectSessionInput,
  ): Promise<ProjectSession> =>
    api
      .post<{ session: ProjectSession }>(`/companies/${companyId}/project-sessions`, input)
      .then((r) => r.session),

  update: (
    sessionId: string,
    input: UpdateProjectSessionInput,
  ): Promise<ProjectSession> =>
    api
      .patch<{ session: ProjectSession }>(`/project-sessions/${sessionId}`, input)
      .then((r) => r.session),

  appendMessage: (
    sessionId: string,
    message: { role: "user" | "assistant"; content: string; model?: string },
  ): Promise<ProjectSession> =>
    api
      .patch<{ session: ProjectSession }>(`/project-sessions/${sessionId}`, { chatMessage: message })
      .then((r) => r.session),

  archive: (sessionId: string): Promise<ProjectSession> =>
    api
      .delete<{ session: ProjectSession }>(`/project-sessions/${sessionId}`)
      .then((r) => r.session),
};
