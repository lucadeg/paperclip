import {
  type AnyPgColumn,
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { directives } from "./directives.js";
import { agents } from "./agents.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

export const directiveLineageEvents = pgTable(
  "directive_lineage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    directiveId: uuid("directive_id").notNull().references(() => directives.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    runId: uuid("run_id").references((): AnyPgColumn => heartbeatRuns.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(), // "run_authorized" | "run_blocked" | "action_executed" | "approval_requested" | "file_modified" | "directive_certified" | "directive_revoked" | "directive_modified"
    actorUserId: text("actor_user_id"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    directiveCreatedAtIdx: index("directive_lineage_events_directive_idx").on(table.directiveId, table.createdAt.desc()),
    companyCreatedAtIdx: index("directive_lineage_events_company_idx").on(table.companyId, table.createdAt.desc()),
    agentIdx: index("directive_lineage_events_agent_idx").on(table.agentId),
  }),
);
