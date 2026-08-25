import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

// Workflow steps 1-14 for project sessions
export type WorkflowStep =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export const PROJECT_WORKFLOW_STEPS = [
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
] as const;

export type SessionStatus = "active" | "paused" | "completed" | "archived";
export type SessionTopic =
  | "executive"
  | "engineering"
  | "marketing"
  | "legal"
  | "fiscal"
  | "commercial"
  | "customer_success"
  | "resource"
  | "security"
  | "product"
  | "other";

export const projectSessions = pgTable(
  "project_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    agentId: uuid("agent_id").references(() => agents.id),

    // Session identification
    title: text("title").notNull(),
    description: text("description"),
    topic: text("topic").notNull().default("other"),

    // Workflow positioning
    workflowStep: integer("workflow_step").notNull().default(1),
    status: text("status").notNull().default("active"),

    // AI Model & Tool config for this session
    selectedModel: text("selected_model"),
    enabledTools: jsonb("enabled_tools")
      .$type<string[]>()
      .default([]),
    toolConfig: jsonb("tool_config")
      .$type<Record<string, unknown>>()
      .default({}),

    // Linked resources
    linkedIssueIds: jsonb("linked_issue_ids")
      .$type<string[]>()
      .default([]),
    linkedDirectiveIds: jsonb("linked_directive_ids")
      .$type<string[]>()
      .default([]),

    // Session metadata (context, notes, outcomes)
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({}),

    // Chat history stored as JSONB for flexibility
    chatHistory: jsonb("chat_history")
      .$type<Array<{ role: string; content: string; timestamp: string; model?: string }>>()
      .default([]),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    companyTopicIdx: index("project_sessions_company_topic_idx").on(
      table.companyId,
      table.topic,
    ),
    companyStatusIdx: index("project_sessions_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    companyUpdatedIdx: index("project_sessions_company_updated_idx").on(
      table.companyId,
      table.updatedAt,
    ),
  }),
);
