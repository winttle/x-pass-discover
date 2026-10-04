CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"profile" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"office_zone_key" text DEFAULT '' NOT NULL,
	"accent_color" text DEFAULT '#2563eb' NOT NULL,
	"status" text DEFAULT 'coming_soon' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"product_id" uuid,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"mission" text DEFAULT '' NOT NULL,
	"student_role" text DEFAULT '' NOT NULL,
	"core_question" text DEFAULT '' NOT NULL,
	"final_output" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_version_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"organization" text DEFAULT '' NOT NULL,
	"avatar_color" text DEFAULT '#2563eb' NOT NULL,
	"visible_context" text DEFAULT '' NOT NULL,
	"opening_message" text DEFAULT '' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"conversation_rules" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"persona_key" text NOT NULL,
	"label" text NOT NULL,
	"content" text NOT NULL,
	"visibility" text DEFAULT 'hidden' NOT NULL,
	"disclosure_rule" text DEFAULT '' NOT NULL,
	"trigger_topics" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_version_id" uuid,
	"department_id" uuid,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"resource_type" text NOT NULL,
	"body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"file_url" text,
	"visibility" text DEFAULT 'scenario' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_version_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"step_type" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"estimated_minutes" integer,
	"sort_order" integer NOT NULL,
	"office_zone_key" text,
	"unlock_rule" jsonb NOT NULL,
	"completion_rule" jsonb NOT NULL,
	"event_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "scenario_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"student_role" text DEFAULT '' NOT NULL,
	"mission" text DEFAULT '' NOT NULL,
	"final_output_title" text DEFAULT '' NOT NULL,
	"deadline_hours" integer DEFAULT 24 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"current_version" integer
);
--> statement-breakpoint
CREATE TABLE "step_resources" (
	"step_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "step_resources_step_id_resource_id_pk" PRIMARY KEY("step_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"persona_key" text,
	"prefill_from_task_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reference_task_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guardrail_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completion_rule" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"persona_key" text NOT NULL,
	"step_key" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"revealed_fact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"department_slug" text,
	"step_key" text,
	"task_key" text,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_slug" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"scenario_version_id" uuid NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"current_step_key" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "step_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step_id" uuid,
	"step_key" text NOT NULL,
	"status" text DEFAULT 'locked' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"task_key" text NOT NULL,
	"title" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_answer_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"task_key" text NOT NULL,
	"version" integer NOT NULL,
	"previous_value" jsonb,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"task_id" uuid,
	"task_key" text NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "career_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"dimension_key" text NOT NULL,
	"source_type" text NOT NULL,
	"source_ref" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"dimension_key" text NOT NULL,
	"rating" integer,
	"rating_status" text DEFAULT 'NE' NOT NULL,
	"confidence" text DEFAULT 'low' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "like_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"session_id" uuid,
	"score" integer NOT NULL,
	"source" text DEFAULT 'post_survey' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rubric_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"bars_anchors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_version_id" uuid,
	"key" text NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_personas" ADD CONSTRAINT "ai_personas_scenario_version_id_scenario_versions_id_fk" FOREIGN KEY ("scenario_version_id") REFERENCES "public"."scenario_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_scenario_version_id_scenario_versions_id_fk" FOREIGN KEY ("scenario_version_id") REFERENCES "public"."scenario_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_steps" ADD CONSTRAINT "scenario_steps_scenario_version_id_scenario_versions_id_fk" FOREIGN KEY ("scenario_version_id") REFERENCES "public"."scenario_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_versions" ADD CONSTRAINT "scenario_versions_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_resources" ADD CONSTRAINT "step_resources_step_id_scenario_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."scenario_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_resources" ADD CONSTRAINT "step_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_step_id_scenario_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."scenario_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_events" ADD CONSTRAINT "behavior_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_events" ADD CONSTRAINT "behavior_events_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_selections" ADD CONSTRAINT "department_selections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_surveys" ADD CONSTRAINT "post_surveys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_surveys" ADD CONSTRAINT "pre_surveys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sessions" ADD CONSTRAINT "project_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sessions" ADD CONSTRAINT "project_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sessions" ADD CONSTRAINT "project_sessions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_sessions" ADD CONSTRAINT "project_sessions_scenario_version_id_scenario_versions_id_fk" FOREIGN KEY ("scenario_version_id") REFERENCES "public"."scenario_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "step_progress" ADD CONSTRAINT "step_progress_step_id_scenario_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."scenario_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_answer_revisions" ADD CONSTRAINT "task_answer_revisions_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_answers" ADD CONSTRAINT "task_answers_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_answers" ADD CONSTRAINT "task_answers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_reports" ADD CONSTRAINT "career_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_evidence" ADD CONSTRAINT "evaluation_evidence_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like_scores" ADD CONSTRAINT "like_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like_scores" ADD CONSTRAINT "like_scores_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "like_scores" ADD CONSTRAINT "like_scores_session_id_project_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."project_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_dimensions" ADD CONSTRAINT "rubric_dimensions_rubric_id_rubrics_id_fk" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_scenario_version_id_scenario_versions_id_fk" FOREIGN KEY ("scenario_version_id") REFERENCES "public"."scenario_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_idx" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_slug_idx" ON "departments" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_key_idx" ON "projects" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_personas_key_idx" ON "ai_personas" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_key_idx" ON "resources" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_steps_unique_idx" ON "scenario_steps" USING btree ("scenario_version_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_versions_unique_idx" ON "scenario_versions" USING btree ("scenario_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "scenarios_key_idx" ON "scenarios" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_unique_idx" ON "tasks" USING btree ("step_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_conversations_unique_idx" ON "ai_conversations" USING btree ("session_id","persona_key","step_key");--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "behavior_events_session_idx" ON "behavior_events" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "behavior_events_user_idx" ON "behavior_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "department_selections_user_idx" ON "department_selections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_surveys_unique_idx" ON "post_surveys" USING btree ("user_id","department_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pre_surveys_user_idx" ON "pre_surveys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_sessions_user_idx" ON "project_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "step_progress_unique_idx" ON "step_progress" USING btree ("session_id","step_key");--> statement-breakpoint
CREATE INDEX "submissions_session_idx" ON "submissions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "task_answer_revisions_session_idx" ON "task_answer_revisions" USING btree ("session_id","task_key");--> statement-breakpoint
CREATE UNIQUE INDEX "task_answers_unique_idx" ON "task_answers" USING btree ("session_id","task_key");--> statement-breakpoint
CREATE INDEX "career_reports_user_idx" ON "career_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "evaluation_evidence_session_idx" ON "evaluation_evidence" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_unique_idx" ON "evaluations" USING btree ("session_id","dimension_key");--> statement-breakpoint
CREATE UNIQUE INDEX "like_scores_unique_idx" ON "like_scores" USING btree ("user_id","department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_dimensions_unique_idx" ON "rubric_dimensions" USING btree ("rubric_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "rubrics_key_idx" ON "rubrics" USING btree ("key");