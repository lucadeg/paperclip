-- Migration: Add project_sessions table
-- Stores Hermes-agent project planning sessions with workflow step tracking

CREATE TABLE IF NOT EXISTS "project_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "agent_id" uuid REFERENCES "agents"("id"),
  "title" text NOT NULL,
  "description" text,
  "topic" text NOT NULL DEFAULT 'other',
  "workflow_step" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'active',
  "selected_model" text,
  "enabled_tools" jsonb DEFAULT '[]'::jsonb,
  "tool_config" jsonb DEFAULT '{}'::jsonb,
  "linked_issue_ids" jsonb DEFAULT '[]'::jsonb,
  "linked_directive_ids" jsonb DEFAULT '[]'::jsonb,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "chat_history" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "project_sessions_company_topic_idx" 
  ON "project_sessions" ("company_id", "topic");

CREATE INDEX IF NOT EXISTS "project_sessions_company_status_idx" 
  ON "project_sessions" ("company_id", "status");

CREATE INDEX IF NOT EXISTS "project_sessions_company_updated_idx" 
  ON "project_sessions" ("company_id", "updated_at");
