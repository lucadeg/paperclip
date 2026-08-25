import {
  type AnyPgColumn,
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const directives = pgTable(
  "directives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    identifier: text("identifier").notNull(), // e.g. "DIR-1", "DIR-2"
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"), // "draft" | "active" | "paused" | "completed" | "revoked"
    priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high" | "critical"
    scope: text("scope").notNull().default("global"), // "global" | "team" | "agent" | "project" | "issue"
    targetAgentIds: jsonb("target_agent_ids").$type<string[]>().default([]),
    targetProjectIds: jsonb("target_project_ids").$type<string[]>().default([]),
    authorizedActions: jsonb("authorized_actions").$type<string[]>().default([
      "code_analysis",
      "file_edit",
      "approval_request",
      "routine_run",
      "issue_solve"
    ]),
    budgetLimitUsd: numeric("budget_limit_usd", { precision: 10, scale: 2 }).default("100.00"),
    spentBudgetUsd: numeric("spent_budget_usd", { precision: 10, scale: 2 }).default("0.00"),
    maxRunsAllowed: integer("max_runs_allowed").default(50),
    executedRunsCount: integer("executed_runs_count").notNull().default(0),
    certifiedByUserId: text("certified_by_user_id"),
    certifiedAt: timestamp("certified_at", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    rawInstructions: text("raw_instructions").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("directives_company_status_idx").on(table.companyId, table.status),
    companyIdentifierIdx: index("directives_company_identifier_idx").on(table.companyId, table.identifier),
    companyCreatedAtIdx: index("directives_company_created_at_idx").on(table.companyId, table.createdAt.desc()),
  }),
);
