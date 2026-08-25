import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { sql } from "drizzle-orm";
import { directiveService } from "../services/directives.js";
import { assertCompanyAccess } from "./authz.js";
import { notFound } from "../errors.js";

export function directiveRoutes(db: Db) {
  const router = Router();
  const directives = directiveService(db);

  // List directives for company
  router.get("/companies/:companyId/directives", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);
      const { status, priority, scope, search } = req.query;

      const result = await directives.listDirectives(companyId, {
        status: status as any,
        priority: priority as any,
        scope: scope as any,
        search: search as string,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Get directive statistics summary
  router.get("/companies/:companyId/directives/stats", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);
      const stats = await directives.getDirectiveStatsSummary(companyId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Create new directive
  router.post("/companies/:companyId/directives", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);
      const actorUserId = (req as any).user?.id ?? "operator";

      const created = await directives.createDirective(companyId, req.body, actorUserId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  // Get directive by ID
  router.get("/directives/:id", async (req, res, next) => {
    try {
      const directive = await directives.getDirective(req.params.id);
      if (!directive) throw notFound("Directive not found");
      assertCompanyAccess(req, directive.companyId);
      res.json(directive);
    } catch (err) {
      next(err);
    }
  });

  // Update directive
  router.patch("/directives/:id", async (req, res, next) => {
    try {
      const directive = await directives.getDirective(req.params.id);
      if (!directive) throw notFound("Directive not found");
      assertCompanyAccess(req, directive.companyId);
      const actorUserId = (req as any).user?.id ?? "operator";

      const updated = await directives.updateDirective(req.params.id, req.body, actorUserId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Certify directive
  router.post("/directives/:id/certify", async (req, res, next) => {
    try {
      const directive = await directives.getDirective(req.params.id);
      if (!directive) throw notFound("Directive not found");
      assertCompanyAccess(req, directive.companyId);
      const actorUserId = (req as any).user?.id ?? "operator";

      const certified = await directives.certifyDirective(req.params.id, actorUserId);
      res.json(certified);
    } catch (err) {
      next(err);
    }
  });

  // Revoke directive
  router.post("/directives/:id/revoke", async (req, res, next) => {
    try {
      const directive = await directives.getDirective(req.params.id);
      if (!directive) throw notFound("Directive not found");
      assertCompanyAccess(req, directive.companyId);
      const actorUserId = (req as any).user?.id ?? "operator";
      const { reason } = req.body ?? {};

      const revoked = await directives.revokeDirective(req.params.id, reason, actorUserId);
      res.json(revoked);
    } catch (err) {
      next(err);
    }
  });

  // Get directive lineage
  router.get("/directives/:id/lineage", async (req, res, next) => {
    try {
      const directive = await directives.getDirective(req.params.id);
      if (!directive) throw notFound("Directive not found");
      assertCompanyAccess(req, directive.companyId);

      const lineage = await directives.getDirectiveLineage(req.params.id);
      res.json(lineage);
    } catch (err) {
      next(err);
    }
  });

  // Analytics: per-directive aggregated stats + event breakdown + agent distribution
  router.get("/companies/:companyId/directives/analytics", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);

      // Event breakdown by type and directive
      const eventBreakdown = await db.execute(sql`
        SELECT
          dle.directive_id,
          d.title AS directive_title,
          d.identifier,
          d.status,
          d.priority,
          dle.event_type,
          COUNT(*) AS event_count,
          SUM(CASE WHEN dle.event_type = 'run_authorized' THEN COALESCE((dle.details->>'costUsd')::numeric, 0) ELSE 0 END) AS total_cost_usd
        FROM directive_lineage_events dle
        JOIN directives d ON d.id = dle.directive_id
        WHERE dle.company_id = ${companyId}
        GROUP BY dle.directive_id, d.title, d.identifier, d.status, d.priority, dle.event_type
        ORDER BY d.identifier, dle.event_type
      `);

      // Agent distribution: which agents executed the most under this company's directives
      const agentActivity = await db.execute(sql`
        SELECT
          a.id AS agent_id,
          a.name AS agent_name,
          a.role AS agent_role,
          COUNT(*) AS total_runs,
          SUM(CASE WHEN dle.event_type = 'run_authorized' THEN 1 ELSE 0 END) AS authorized_runs,
          SUM(CASE WHEN dle.event_type = 'run_blocked' THEN 1 ELSE 0 END) AS blocked_runs
        FROM directive_lineage_events dle
        JOIN agents a ON a.id = dle.agent_id
        WHERE dle.company_id = ${companyId}
          AND dle.agent_id IS NOT NULL
        GROUP BY a.id, a.name, a.role
        ORDER BY total_runs DESC
        LIMIT 20
      `);

      // Time series: lineage events per day (last 30 days)
      const timeSeries = await db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at) AS day,
          event_type,
          COUNT(*) AS count
        FROM directive_lineage_events
        WHERE company_id = ${companyId}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at), event_type
        ORDER BY day DESC, event_type
      `);

      // Cross-directive workflow runs from heartbeat_runs linked via metadata
      const heartbeatRuns = await db.execute(sql`
        SELECT
          hr.id,
          hr.agent_id,
          a.name AS agent_name,
          hr.status,
          hr.model,
          hr.total_tokens,
          hr.cost_usd,
          hr.latency_ms,
          hr.started_at,
          hr.finished_at,
          hr.metadata->>'directiveId' AS directive_id
        FROM heartbeat_runs hr
        LEFT JOIN agents a ON a.id = hr.agent_id
        WHERE hr.company_id = ${companyId}
          AND hr.metadata->>'directiveId' IS NOT NULL
        ORDER BY hr.started_at DESC
        LIMIT 50
      `);

      res.json({
        eventBreakdown: (eventBreakdown as any).rows ?? eventBreakdown,
        agentActivity: (agentActivity as any).rows ?? agentActivity,
        timeSeries: (timeSeries as any).rows ?? timeSeries,
        heartbeatRuns: (heartbeatRuns as any).rows ?? heartbeatRuns,
      });
    } catch (err) {
      next(err);
    }
  });

  // Company-wide lineage feed (recent events across all directives)
  router.get("/companies/:companyId/directives/lineage-feed", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);
      const limit = Math.min(parseInt(req.query.limit as string || "50"), 200);

      const feed = await db.execute(sql`
        SELECT
          dle.id,
          dle.directive_id,
          d.identifier AS directive_identifier,
          d.title AS directive_title,
          d.status AS directive_status,
          d.priority AS directive_priority,
          dle.agent_id,
          a.name AS agent_name,
          a.role AS agent_role,
          dle.run_id,
          dle.event_type,
          dle.actor_user_id,
          dle.details,
          dle.created_at
        FROM directive_lineage_events dle
        JOIN directives d ON d.id = dle.directive_id
        LEFT JOIN agents a ON a.id = dle.agent_id
        WHERE dle.company_id = ${companyId}
        ORDER BY dle.created_at DESC
        LIMIT ${limit}
      `);

      res.json((feed as any).rows ?? feed);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

