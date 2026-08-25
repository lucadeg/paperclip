CREATE TABLE "directive_lineage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"directive_id" uuid NOT NULL,
	"agent_id" uuid,
	"run_id" uuid,
	"event_type" text NOT NULL,
	"actor_user_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "directives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"target_agent_ids" jsonb DEFAULT '[]'::jsonb,
	"target_project_ids" jsonb DEFAULT '[]'::jsonb,
	"authorized_actions" jsonb DEFAULT '["code_analysis","file_edit","approval_request","routine_run","issue_solve"]'::jsonb,
	"budget_limit_usd" numeric(10, 2) DEFAULT '100.00',
	"spent_budget_usd" numeric(10, 2) DEFAULT '0.00',
	"max_runs_allowed" integer DEFAULT 50,
	"executed_runs_count" integer DEFAULT 0 NOT NULL,
	"certified_by_user_id" text,
	"certified_at" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"raw_instructions" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "directive_lineage_events" ADD CONSTRAINT "directive_lineage_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directive_lineage_events" ADD CONSTRAINT "directive_lineage_events_directive_id_directives_id_fk" FOREIGN KEY ("directive_id") REFERENCES "public"."directives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directive_lineage_events" ADD CONSTRAINT "directive_lineage_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directive_lineage_events" ADD CONSTRAINT "directive_lineage_events_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directives" ADD CONSTRAINT "directives_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "directive_lineage_events_directive_idx" ON "directive_lineage_events" USING btree ("directive_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "directive_lineage_events_company_idx" ON "directive_lineage_events" USING btree ("company_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "directive_lineage_events_agent_idx" ON "directive_lineage_events" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "directives_company_status_idx" ON "directives" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "directives_company_identifier_idx" ON "directives" USING btree ("company_id","identifier");--> statement-breakpoint
CREATE INDEX "directives_company_created_at_idx" ON "directives" USING btree ("company_id","created_at" DESC NULLS LAST);