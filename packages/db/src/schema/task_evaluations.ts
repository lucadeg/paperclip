import type {
  DistilledLearning,
  TaskInputEvaluation,
  TaskOutputEvaluation,
} from "@paperclipai/shared";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
import { directives } from "./directives.js";

export const taskEvaluations = pgTable(
  "task_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    directiveId: uuid("directive_id").references(() => directives.id, { onDelete: "set null" }),
    model: text("model").notNull().default(""),
    isFreeOrLocal: boolean("is_free_or_local").notNull().default(false),
    inputClarityScore: integer("input_clarity_score").notNull().default(0),
    outputQualityScore: integer("output_quality_score").notNull().default(0),
    efficiencyScore: integer("efficiency_score").notNull().default(0),
    overallScore: integer("overall_score").notNull().default(0),
    grade: text("grade").notNull().default("A"),
    inputEvaluation: jsonb("input_evaluation").$type<TaskInputEvaluation>().notNull(),
    outputEvaluation: jsonb("output_evaluation").$type<TaskOutputEvaluation>().notNull(),
    distilledLearnings: jsonb("distilled_learnings").$type<DistilledLearning[]>().notNull().default([]),
    suggestedModelOptimization: text("suggested_model_optimization"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCreatedAtIdx: index("task_evaluations_company_created_at_idx").on(
      table.companyId,
      table.createdAt,
    ),
    issueIdx: index("task_evaluations_issue_idx").on(table.issueId),
    agentIdx: index("task_evaluations_agent_idx").on(table.agentId),
    heartbeatRunIdx: index("task_evaluations_heartbeat_run_idx").on(table.heartbeatRunId),
  }),
);
