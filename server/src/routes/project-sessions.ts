import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  projectSessions,
  agents as agentsTable,
  type Db,
} from "@paperclipai/db";
import { assertCompanyAccess } from "./authz.js";
import { notFound } from "../errors.js";

export function projectSessionRoutes(db: Db) {
  const router = Router();

  // List sessions for a company (with optional topic/status filters)
  router.get("/companies/:companyId/project-sessions", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);

      const { topic, status } = req.query;

      let query = db
        .select()
        .from(projectSessions)
        .where(eq(projectSessions.companyId, companyId));

      const rows = await db
        .select()
        .from(projectSessions)
        .where(
          and(
            eq(projectSessions.companyId, companyId),
            ...(topic && typeof topic === "string"
              ? [eq(projectSessions.topic, topic)]
              : []),
            ...(status && typeof status === "string"
              ? [eq(projectSessions.status, status)]
              : []),
          ),
        )
        .orderBy(desc(projectSessions.updatedAt))
        .limit(100);

      // Attach agent names
      const agentIds = [...new Set(rows.map((r) => r.agentId).filter(Boolean))] as string[];
      let agentMap = new Map<string, { name: string; icon: string | null }>();
      if (agentIds.length > 0) {
        const agentRows = await db
          .select({ id: agentsTable.id, name: agentsTable.name, icon: agentsTable.icon })
          .from(agentsTable)
          .where(eq(agentsTable.companyId, companyId));
        agentMap = new Map(agentRows.map((a) => [a.id, { name: a.name, icon: a.icon }]));
      }

      const sessions = rows.map((s) => ({
        ...s,
        agentName: s.agentId ? (agentMap.get(s.agentId)?.name ?? null) : null,
        agentIcon: s.agentId ? (agentMap.get(s.agentId)?.icon ?? null) : null,
      }));

      res.json({ success: true, sessions });
    } catch (err) {
      next(err);
    }
  });

  // Create a new project session
  router.post("/companies/:companyId/project-sessions", async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      assertCompanyAccess(req, companyId);

      const {
        title,
        description,
        topic,
        workflowStep,
        agentId,
        selectedModel,
        enabledTools,
        toolConfig,
        linkedIssueIds,
        linkedDirectiveIds,
        metadata,
      } = req.body ?? {};

      if (!title || typeof title !== "string") {
        res.status(400).json({ error: "title is required" });
        return;
      }

      const [session] = await db
        .insert(projectSessions)
        .values({
          companyId,
          title: title.trim(),
          description: description ?? null,
          topic: topic ?? "other",
          workflowStep: typeof workflowStep === "number" ? workflowStep : 1,
          agentId: agentId ?? null,
          selectedModel: selectedModel ?? null,
          enabledTools: enabledTools ?? [],
          toolConfig: toolConfig ?? {},
          linkedIssueIds: linkedIssueIds ?? [],
          linkedDirectiveIds: linkedDirectiveIds ?? [],
          metadata: metadata ?? {},
          chatHistory: [],
          status: "active",
        })
        .returning();

      res.status(201).json({ success: true, session });
    } catch (err) {
      next(err);
    }
  });

  // Get a single project session by ID
  router.get("/project-sessions/:sessionId", async (req, res, next) => {
    try {
      const [session] = await db
        .select()
        .from(projectSessions)
        .where(eq(projectSessions.id, req.params.sessionId))
        .limit(1);

      if (!session) throw notFound("Project session not found");
      assertCompanyAccess(req, session.companyId);

      res.json({ success: true, session });
    } catch (err) {
      next(err);
    }
  });

  // Update a session (workflow step, status, model, tools, chat history)
  router.patch("/project-sessions/:sessionId", async (req, res, next) => {
    try {
      const [existing] = await db
        .select()
        .from(projectSessions)
        .where(eq(projectSessions.id, req.params.sessionId))
        .limit(1);

      if (!existing) throw notFound("Project session not found");
      assertCompanyAccess(req, existing.companyId);

      const {
        title,
        description,
        topic,
        workflowStep,
        status,
        selectedModel,
        enabledTools,
        toolConfig,
        linkedIssueIds,
        linkedDirectiveIds,
        metadata,
        chatMessage, // Append a single message to chat history
      } = req.body ?? {};

      // Build update object (only defined fields)
      const updates: Partial<typeof projectSessions.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (topic !== undefined) updates.topic = topic;
      if (workflowStep !== undefined) updates.workflowStep = workflowStep;
      if (status !== undefined) updates.status = status;
      if (selectedModel !== undefined) updates.selectedModel = selectedModel;
      if (enabledTools !== undefined) updates.enabledTools = enabledTools;
      if (toolConfig !== undefined) updates.toolConfig = toolConfig;
      if (linkedIssueIds !== undefined) updates.linkedIssueIds = linkedIssueIds;
      if (linkedDirectiveIds !== undefined) updates.linkedDirectiveIds = linkedDirectiveIds;
      if (metadata !== undefined) updates.metadata = metadata;

      // Append a chat message if provided
      if (chatMessage && typeof chatMessage === "object") {
        const currentHistory = (existing.chatHistory as Array<{ role: string; content: string; timestamp: string; model?: string }>) ?? [];
        updates.chatHistory = [
          ...currentHistory,
          {
            role: chatMessage.role ?? "user",
            content: chatMessage.content ?? "",
            timestamp: new Date().toISOString(),
            model: chatMessage.model ?? undefined,
          },
        ];
      }

      const [updated] = await db
        .update(projectSessions)
        .set(updates)
        .where(eq(projectSessions.id, req.params.sessionId))
        .returning();

      res.json({ success: true, session: updated });
    } catch (err) {
      next(err);
    }
  });

  // Delete (archive) a session
  router.delete("/project-sessions/:sessionId", async (req, res, next) => {
    try {
      const [existing] = await db
        .select()
        .from(projectSessions)
        .where(eq(projectSessions.id, req.params.sessionId))
        .limit(1);

      if (!existing) throw notFound("Project session not found");
      assertCompanyAccess(req, existing.companyId);

      // Soft delete: set status to archived
      const [archived] = await db
        .update(projectSessions)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(projectSessions.id, req.params.sessionId))
        .returning();

      res.json({ success: true, session: archived });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
