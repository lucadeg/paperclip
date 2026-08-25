import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  directives,
  directiveLineageEvents,
  agents,
  companies,
} from "@paperclipai/db";
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
import { notFound } from "../errors.js";
import { isFreeOrLocalModel } from "./free-model-detector.js";

let tablesEnsured = false;
async function ensureTables(db: Db) {
  if (tablesEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS directives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        identifier TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        priority TEXT NOT NULL DEFAULT 'medium',
        scope TEXT NOT NULL DEFAULT 'global',
        target_agent_ids JSONB DEFAULT '[]'::jsonb,
        target_project_ids JSONB DEFAULT '[]'::jsonb,
        authorized_actions JSONB DEFAULT '["code_analysis", "file_edit", "approval_request", "routine_run", "issue_solve"]'::jsonb,
        budget_limit_usd NUMERIC(10, 2) DEFAULT 100.00,
        spent_budget_usd NUMERIC(10, 2) DEFAULT 0.00,
        max_runs_allowed INTEGER DEFAULT 50,
        executed_runs_count INTEGER NOT NULL DEFAULT 0,
        certified_by_user_id TEXT,
        certified_at TIMESTAMPTZ,
        valid_until TIMESTAMPTZ,
        raw_instructions TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS directives_company_status_idx ON directives(company_id, status);
      CREATE INDEX IF NOT EXISTS directives_company_identifier_idx ON directives(company_id, identifier);
      CREATE INDEX IF NOT EXISTS directives_company_created_at_idx ON directives(company_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS directive_lineage_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        directive_id UUID NOT NULL REFERENCES directives(id) ON DELETE CASCADE,
        agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
        run_id UUID REFERENCES heartbeat_runs(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        actor_user_id TEXT,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS directive_lineage_events_directive_idx ON directive_lineage_events(directive_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS directive_lineage_events_company_idx ON directive_lineage_events(company_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS directive_lineage_events_agent_idx ON directive_lineage_events(agent_id);
    `);
    tablesEnsured = true;
  } catch (e) {
    console.error("Failed to ensure directives tables:", e);
  }
}

export function directiveService(db: Db) {
  return {
    listDirectives: async (
      companyId: string,
      filters: {
        status?: DirectiveStatus;
        priority?: DirectivePriority;
        scope?: DirectiveScope;
        search?: string;
      } = {},
    ): Promise<Directive[]> => {
      await ensureTables(db);
      const conditions: SQL[] = [eq(directives.companyId, companyId)];

      if (filters.status) {
        conditions.push(eq(directives.status, filters.status));
      }
      if (filters.priority) {
        conditions.push(eq(directives.priority, filters.priority));
      }
      if (filters.scope) {
        conditions.push(eq(directives.scope, filters.scope));
      }
      if (filters.search && filters.search.trim().length > 0) {
        const term = `%${filters.search.trim().toLowerCase()}%`;
        conditions.push(
          sql`(LOWER(${directives.title}) LIKE ${term} OR LOWER(${directives.identifier}) LIKE ${term} OR LOWER(${directives.description}) LIKE ${term} OR LOWER(${directives.rawInstructions}) LIKE ${term})`,
        );
      }

      const rows = await db
        .select()
        .from(directives)
        .where(and(...conditions))
        .orderBy(desc(directives.createdAt));

      // Fetch agents for enrichment
      const allAgents = await db
        .select({
          id: agents.id,
          name: agents.name,
          role: agents.role,
          icon: agents.icon,
          status: agents.status,
        })
        .from(agents)
        .where(eq(agents.companyId, companyId));

      const agentMap = new Map(allAgents.map((a) => [a.id, a]));

      // Fetch recent lineage events
      const directiveIds = rows.map((r) => r.id);
      let recentEvents: typeof directiveLineageEvents.$inferSelect[] = [];
      if (directiveIds.length > 0) {
        recentEvents = await db
          .select()
          .from(directiveLineageEvents)
          .where(and(eq(directiveLineageEvents.companyId, companyId), inArray(directiveLineageEvents.directiveId, directiveIds)))
          .orderBy(desc(directiveLineageEvents.createdAt))
          .limit(100);
      }

      const eventsByDirective = new Map<string, DirectiveLineageEvent[]>();
      for (const ev of recentEvents) {
        const ag = ev.agentId ? agentMap.get(ev.agentId) : null;
        const mapped: DirectiveLineageEvent = {
          id: ev.id,
          companyId: ev.companyId,
          directiveId: ev.directiveId,
          agentId: ev.agentId,
          agentName: ag?.name ?? null,
          agentIcon: ag?.icon ?? null,
          runId: ev.runId,
          eventType: ev.eventType as any,
          actorUserId: ev.actorUserId,
          details: (ev.details as any) ?? {},
          createdAt: ev.createdAt.toISOString(),
        };
        const list = eventsByDirective.get(ev.directiveId) ?? [];
        list.push(mapped);
        eventsByDirective.set(ev.directiveId, list);
      }

      return rows.map((row) => {
        const targetIds = (row.targetAgentIds as string[]) ?? [];
        const targetAgents = targetIds
          .map((id) => agentMap.get(id))
          .filter((a): a is NonNullable<typeof a> => a !== undefined);

        const dEvents = eventsByDirective.get(row.id) ?? [];

        return {
          id: row.id,
          companyId: row.companyId,
          identifier: row.identifier,
          title: row.title,
          description: row.description,
          status: row.status as DirectiveStatus,
          priority: row.priority as DirectivePriority,
          scope: row.scope as DirectiveScope,
          targetAgentIds: targetIds,
          targetProjectIds: (row.targetProjectIds as string[]) ?? [],
          authorizedActions: (row.authorizedActions as string[]) ?? [],
          budgetLimitUsd: String(row.budgetLimitUsd ?? "100.00"),
          spentBudgetUsd: String(row.spentBudgetUsd ?? "0.00"),
          maxRunsAllowed: row.maxRunsAllowed ?? 50,
          executedRunsCount: row.executedRunsCount ?? 0,
          certifiedByUserId: row.certifiedByUserId,
          certifiedAt: row.certifiedAt ? row.certifiedAt.toISOString() : null,
          validUntil: row.validUntil ? row.validUntil.toISOString() : null,
          rawInstructions: row.rawInstructions,
          metadata: row.metadata,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          targetAgents,
          recentRunsCount: dEvents.filter((e) => e.eventType === "run_authorized").length,
          recentLineageEvents: dEvents.slice(0, 5),
        };
      });
    },

    getDirective: async (directiveId: string): Promise<Directive | null> => {
      await ensureTables(db);
      const rows = await db
        .select()
        .from(directives)
        .where(eq(directives.id, directiveId))
        .limit(1);

      if (!rows || rows.length === 0) return null;
      const row = rows[0];

      const allAgents = await db
        .select({
          id: agents.id,
          name: agents.name,
          role: agents.role,
          icon: agents.icon,
          status: agents.status,
        })
        .from(agents)
        .where(eq(agents.companyId, row.companyId));

      const agentMap = new Map(allAgents.map((a) => [a.id, a]));
      const targetIds = (row.targetAgentIds as string[]) ?? [];
      const targetAgents = targetIds
        .map((id) => agentMap.get(id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);

      const rawEvents = await db
        .select()
        .from(directiveLineageEvents)
        .where(eq(directiveLineageEvents.directiveId, directiveId))
        .orderBy(desc(directiveLineageEvents.createdAt))
        .limit(100);

      const lineageEvents: DirectiveLineageEvent[] = rawEvents.map((ev) => {
        const ag = ev.agentId ? agentMap.get(ev.agentId) : null;
        return {
          id: ev.id,
          companyId: ev.companyId,
          directiveId: ev.directiveId,
          agentId: ev.agentId,
          agentName: ag?.name ?? null,
          agentIcon: ag?.icon ?? null,
          runId: ev.runId,
          eventType: ev.eventType as any,
          actorUserId: ev.actorUserId,
          details: (ev.details as any) ?? {},
          createdAt: ev.createdAt.toISOString(),
        };
      });

      return {
        id: row.id,
        companyId: row.companyId,
        identifier: row.identifier,
        title: row.title,
        description: row.description,
        status: row.status as DirectiveStatus,
        priority: row.priority as DirectivePriority,
        scope: row.scope as DirectiveScope,
        targetAgentIds: targetIds,
        targetProjectIds: (row.targetProjectIds as string[]) ?? [],
        authorizedActions: (row.authorizedActions as string[]) ?? [],
        budgetLimitUsd: String(row.budgetLimitUsd ?? "100.00"),
        spentBudgetUsd: String(row.spentBudgetUsd ?? "0.00"),
        maxRunsAllowed: row.maxRunsAllowed ?? 50,
        executedRunsCount: row.executedRunsCount ?? 0,
        certifiedByUserId: row.certifiedByUserId,
        certifiedAt: row.certifiedAt ? row.certifiedAt.toISOString() : null,
        validUntil: row.validUntil ? row.validUntil.toISOString() : null,
        rawInstructions: row.rawInstructions,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        targetAgents,
        recentRunsCount: lineageEvents.filter((e) => e.eventType === "run_authorized").length,
        recentLineageEvents: lineageEvents,
      };
    },

    createDirective: async (
      companyId: string,
      data: CreateDirectiveInput,
      actorUserId?: string | null,
    ): Promise<Directive> => {
      // Calculate next identifier
      const existing = await db
        .select({ id: directives.id, identifier: directives.identifier })
        .from(directives)
        .where(eq(directives.companyId, companyId));

      let maxNum = 0;
      for (const d of existing) {
        const match = d.identifier.match(/^DIR-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const identifier = `DIR-${maxNum + 1}`;

      const isCertified = data.certifiedImmediately === true;
      const now = new Date();

      const [inserted] = await db
        .insert(directives)
        .values({
          companyId,
          identifier,
          title: data.title,
          description: data.description ?? null,
          status: isCertified ? "active" : "draft",
          priority: data.priority ?? "medium",
          scope: data.scope ?? "global",
          targetAgentIds: data.targetAgentIds ?? [],
          targetProjectIds: data.targetProjectIds ?? [],
          authorizedActions: data.authorizedActions ?? [
            "code_analysis",
            "file_edit",
            "approval_request",
            "routine_run",
            "issue_solve",
          ],
          budgetLimitUsd: data.budgetLimitUsd ?? "100.00",
          spentBudgetUsd: "0.00",
          maxRunsAllowed: data.maxRunsAllowed ?? 50,
          executedRunsCount: 0,
          certifiedByUserId: isCertified ? (actorUserId ?? "operator") : null,
          certifiedAt: isCertified ? now : null,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          rawInstructions: data.rawInstructions,
          metadata: {},
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Record lineage event
      await db.insert(directiveLineageEvents).values({
        companyId,
        directiveId: inserted.id,
        eventType: isCertified ? "directive_certified" : "directive_modified",
        actorUserId: actorUserId ?? null,
        details: {
          action: isCertified ? "created_and_certified" : "created_draft",
          title: data.title,
          priority: data.priority ?? "medium",
          budgetLimitUsd: data.budgetLimitUsd ?? "100.00",
        },
      });

      const res = await directiveService(db).getDirective(inserted.id);
      if (!res) throw notFound("Directive not found after creation");
      return res;
    },

    updateDirective: async (
      directiveId: string,
      data: UpdateDirectiveInput,
      actorUserId?: string | null,
    ): Promise<Directive> => {
      const now = new Date();
      const patch: Partial<typeof directives.$inferInsert> = {
        updatedAt: now,
      };

      if (data.title !== undefined) patch.title = data.title;
      if (data.description !== undefined) patch.description = data.description;
      if (data.status !== undefined) patch.status = data.status;
      if (data.priority !== undefined) patch.priority = data.priority;
      if (data.scope !== undefined) patch.scope = data.scope;
      if (data.targetAgentIds !== undefined) patch.targetAgentIds = data.targetAgentIds;
      if (data.targetProjectIds !== undefined) patch.targetProjectIds = data.targetProjectIds;
      if (data.authorizedActions !== undefined) patch.authorizedActions = data.authorizedActions;
      if (data.budgetLimitUsd !== undefined) patch.budgetLimitUsd = data.budgetLimitUsd;
      if (data.maxRunsAllowed !== undefined) patch.maxRunsAllowed = data.maxRunsAllowed;
      if (data.rawInstructions !== undefined) patch.rawInstructions = data.rawInstructions;
      if (data.validUntil !== undefined) patch.validUntil = data.validUntil ? new Date(data.validUntil) : null;

      const [updated] = await db
        .update(directives)
        .set(patch)
        .where(eq(directives.id, directiveId))
        .returning();

      if (!updated) throw notFound("Directive not found");

      await db.insert(directiveLineageEvents).values({
        companyId: updated.companyId,
        directiveId: updated.id,
        eventType: "directive_modified",
        actorUserId: actorUserId ?? null,
        details: {
          changedFields: Object.keys(data),
          newStatus: data.status,
        },
      });

      const res = await directiveService(db).getDirective(updated.id);
      if (!res) throw notFound("Directive not found after update");
      return res;
    },

    certifyDirective: async (directiveId: string, actorUserId?: string | null): Promise<Directive> => {
      const now = new Date();
      const [updated] = await db
        .update(directives)
        .set({
          status: "active",
          certifiedAt: now,
          certifiedByUserId: actorUserId ?? "operator",
          updatedAt: now,
        })
        .where(eq(directives.id, directiveId))
        .returning();

      if (!updated) throw notFound("Directive not found");

      await db.insert(directiveLineageEvents).values({
        companyId: updated.companyId,
        directiveId: updated.id,
        eventType: "directive_certified",
        actorUserId: actorUserId ?? null,
        details: {
          certifiedAt: now.toISOString(),
          certifiedBy: actorUserId ?? "operator",
        },
      });

      const res = await directiveService(db).getDirective(updated.id);
      if (!res) throw notFound("Directive not found after certification");
      return res;
    },

    revokeDirective: async (
      directiveId: string,
      reason?: string,
      actorUserId?: string | null,
    ): Promise<Directive> => {
      const now = new Date();
      const [updated] = await db
        .update(directives)
        .set({
          status: "revoked",
          updatedAt: now,
        })
        .where(eq(directives.id, directiveId))
        .returning();

      if (!updated) throw notFound("Directive not found");

      await db.insert(directiveLineageEvents).values({
        companyId: updated.companyId,
        directiveId: updated.id,
        eventType: "directive_revoked",
        actorUserId: actorUserId ?? null,
        details: {
          revokedAt: now.toISOString(),
          revokedBy: actorUserId ?? "operator",
          reason: reason ?? "Operator revoked directive",
        },
      });

      const res = await directiveService(db).getDirective(updated.id);
      if (!res) throw notFound("Directive not found after revocation");
      return res;
    },

    getDirectiveLineage: async (directiveId: string): Promise<DirectiveLineageEvent[]> => {
      const rawEvents = await db
        .select()
        .from(directiveLineageEvents)
        .where(eq(directiveLineageEvents.directiveId, directiveId))
        .orderBy(desc(directiveLineageEvents.createdAt));

      const agentIds = rawEvents.map((e) => e.agentId).filter((id): id is string => Boolean(id));
      let agentMap = new Map<string, { id: string; name: string; icon?: string | null }>();
      if (agentIds.length > 0) {
        const ags = await db
          .select({ id: agents.id, name: agents.name, icon: agents.icon })
          .from(agents)
          .where(inArray(agents.id, agentIds));
        agentMap = new Map(ags.map((a) => [a.id, a]));
      }

      return rawEvents.map((ev) => {
        const ag = ev.agentId ? agentMap.get(ev.agentId) : null;
        return {
          id: ev.id,
          companyId: ev.companyId,
          directiveId: ev.directiveId,
          agentId: ev.agentId,
          agentName: ag?.name ?? null,
          agentIcon: ag?.icon ?? null,
          runId: ev.runId,
          eventType: ev.eventType as any,
          actorUserId: ev.actorUserId,
          details: (ev.details as any) ?? {},
          createdAt: ev.createdAt.toISOString(),
        };
      });
    },

    getDirectiveStatsSummary: async (companyId: string): Promise<DirectiveStatsSummary> => {
      await ensureTables(db);
      const all = await db
        .select()
        .from(directives)
        .where(eq(directives.companyId, companyId));

      const active = all.filter((d) => d.status === "active");
      const draft = all.filter((d) => d.status === "draft");
      const revoked = all.filter((d) => d.status === "revoked");
      const completed = all.filter((d) => d.status === "completed");

      let totalBudgetLimit = 0;
      let totalSpentBudget = 0;
      for (const d of all) {
        totalBudgetLimit += parseFloat(d.budgetLimitUsd ?? "0") || 0;
        totalSpentBudget += parseFloat(d.spentBudgetUsd ?? "0") || 0;
      }

      // Count lineage events
      const lineageCounts = await db
        .select({
          eventType: directiveLineageEvents.eventType,
          count: sql<number>`count(*)`,
        })
        .from(directiveLineageEvents)
        .where(eq(directiveLineageEvents.companyId, companyId))
        .groupBy(directiveLineageEvents.eventType);

      let runsAuthorized = 0;
      let runsBlocked = 0;
      for (const r of lineageCounts) {
        if (r.eventType === "run_authorized") runsAuthorized += Number(r.count);
        if (r.eventType === "run_blocked") runsBlocked += Number(r.count);
      }

      // Unique governed agents
      const governedAgentSet = new Set<string>();
      for (const d of active) {
        const ids = (d.targetAgentIds as string[]) ?? [];
        for (const id of ids) governedAgentSet.add(id);
      }

      return {
        totalDirectives: all.length,
        activeDirectives: active.length,
        draftDirectives: draft.length,
        revokedDirectives: revoked.length,
        completedDirectives: completed.length,
        totalBudgetLimitUsd: totalBudgetLimit,
        totalSpentBudgetUsd: totalSpentBudget,
        totalRunsAuthorized: runsAuthorized,
        totalRunsBlocked: runsBlocked,
        governedAgentsCount: governedAgentSet.size,
      };
    },

    findMatchingCertifiedDirective: async (
      companyId: string,
      agentId: string,
      projectId?: string | null,
    ): Promise<typeof directives.$inferSelect | null> => {
      await ensureTables(db);
      const now = new Date();
      const activeRows = await db
        .select()
        .from(directives)
        .where(
          and(
            eq(directives.companyId, companyId),
            eq(directives.status, "active"),
          ),
        )
        .orderBy(desc(directives.createdAt));

      for (const d of activeRows) {
        // Expiry check
        if (d.validUntil && d.validUntil < now) continue;

        // Run quota check
        if (d.maxRunsAllowed && d.executedRunsCount >= d.maxRunsAllowed) continue;

        // Budget check
        const spent = parseFloat(d.spentBudgetUsd ?? "0") || 0;
        const limit = parseFloat(d.budgetLimitUsd ?? "0") || 0;
        if (limit > 0 && spent >= limit) continue;

        // Agent check
        const targetAgents = (d.targetAgentIds as string[]) ?? [];
        if (targetAgents.length > 0 && !targetAgents.includes(agentId)) continue;

        // Project check
        const targetProjects = (d.targetProjectIds as string[]) ?? [];
        if (projectId && targetProjects.length > 0 && !targetProjects.includes(projectId)) continue;

        return d;
      }

      return null;
    },

    recordLineageEvent: async (input: {
      companyId: string;
      directiveId: string;
      agentId?: string | null;
      runId?: string | null;
      eventType: string;
      actorUserId?: string | null;
      details?: Record<string, unknown>;
    }) => {
      await db.insert(directiveLineageEvents).values({
        companyId: input.companyId,
        directiveId: input.directiveId,
        agentId: input.agentId ?? null,
        runId: input.runId ?? null,
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        details: input.details ?? {},
      });

      if (input.eventType === "run_authorized") {
        const model = (input.details?.model as string | undefined) ?? "";
        const isFree = isFreeOrLocalModel(model);
        const costToAdd = isFree
          ? 0
          : (input.details?.costUsd !== undefined && input.details?.costUsd !== null
              ? Number(input.details.costUsd)
              : 0);

        await db
          .update(directives)
          .set({
            executedRunsCount: sql`${directives.executedRunsCount} + 1`,
            spentBudgetUsd: sql`ROUND(CAST(${directives.spentBudgetUsd} AS NUMERIC) + ${costToAdd}, 2)::text`,
            updatedAt: new Date(),
          })
          .where(eq(directives.id, input.directiveId));
      }
    },
  };
}
