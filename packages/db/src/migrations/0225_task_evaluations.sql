-- Migration: Add task_evaluations table
-- Stores input/output task evaluations, quality scores, and distilled learnings

CREATE TABLE IF NOT EXISTS "task_evaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "issue_id" uuid NOT NULL REFERENCES "issues"("id"),
  "agent_id" uuid REFERENCES "agents"("id"),
  "execution_run_id" uuid REFERENCES "heartbeat_runs"("id"),
  "model" text,
  "is_free_or_local" boolean DEFAULT false NOT NULL,
  "input_clarity_score" integer DEFAULT 100 NOT NULL,
  "input_context_completeness" integer DEFAULT 100 NOT NULL,
  "input_evaluation" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "output_quality_score" integer DEFAULT 100 NOT NULL,
  "output_efficiency_score" integer DEFAULT 100 NOT NULL,
  "output_evaluation" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "distilled_learnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "summary" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "task_evaluations_company_issue_idx" 
  ON "task_evaluations" ("company_id", "issue_id");

CREATE INDEX IF NOT EXISTS "task_evaluations_company_agent_idx" 
  ON "task_evaluations" ("company_id", "agent_id");

CREATE INDEX IF NOT EXISTS "task_evaluations_company_created_idx" 
  ON "task_evaluations" ("company_id", "created_at");
