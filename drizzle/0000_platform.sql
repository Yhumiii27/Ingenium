CREATE TABLE "ingenium"."app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_name" text NOT NULL,
	CONSTRAINT "app_settings_key_check" CHECK ("ingenium"."app_settings"."key" ~ '^[a-z][a-z0-9_.-]{1,63}$')
);
--> statement-breakpoint
CREATE TABLE "ingenium"."audit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_user_id" uuid,
	"actor_name" text NOT NULL,
	"actor_role" text,
	"object_ref" text NOT NULL,
	"change" text NOT NULL,
	"area" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	CONSTRAINT "audit_entries_text_check" CHECK (btrim("ingenium"."audit_entries"."actor_name") <> '' and btrim("ingenium"."audit_entries"."object_ref") <> '' and btrim("ingenium"."audit_entries"."change") <> '' and btrim("ingenium"."audit_entries"."area") <> '')
);
--> statement-breakpoint
CREATE TABLE "ingenium"."job_runs" (
	"name" text PRIMARY KEY NOT NULL,
	"lease_until" timestamp with time zone,
	"last_started_at" timestamp with time zone,
	"last_finished_at" timestamp with time zone,
	"last_status" text,
	"last_error" text,
	CONSTRAINT "job_runs_status_check" CHECK ("ingenium"."job_runs"."last_status" is null or "ingenium"."job_runs"."last_status" in ('ok', 'error'))
);
--> statement-breakpoint
CREATE TABLE "ingenium"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oid" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	CONSTRAINT "users_oid_unique" UNIQUE("oid"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_check" CHECK ("ingenium"."users"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and "ingenium"."users"."email" = lower("ingenium"."users"."email")),
	CONSTRAINT "users_name_check" CHECK (btrim("ingenium"."users"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "ingenium"."disciplines" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disciplines_code_check" CHECK ("ingenium"."disciplines"."code" in ('process', 'mechanical', 'electrical', 'automation')),
	CONSTRAINT "disciplines_label_check" CHECK (btrim("ingenium"."disciplines"."label") <> ''),
	CONSTRAINT "disciplines_position_check" CHECK ("ingenium"."disciplines"."position" between 1 and 99)
);
--> statement-breakpoint
CREATE TABLE "ingenium"."project_mirror" (
	"code" text PRIMARY KEY NOT NULL,
	"design_office_number" text,
	"name" text NOT NULL,
	"client" text,
	"phase" text,
	"open" boolean NOT NULL,
	"source" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_mirror_code_check" CHECK ("ingenium"."project_mirror"."code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "project_mirror_number_check" CHECK ("ingenium"."project_mirror"."design_office_number" is null or "ingenium"."project_mirror"."design_office_number" ~ '^#[0-9]{3,4}$'),
	CONSTRAINT "project_mirror_name_check" CHECK (btrim("ingenium"."project_mirror"."name") <> ''),
	CONSTRAINT "project_mirror_source_check" CHECK ("ingenium"."project_mirror"."source" in ('keystone', 'simulation'))
);
--> statement-breakpoint
CREATE TABLE "ingenium"."sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"rows" integer DEFAULT 0 NOT NULL,
	"message" text,
	"requested_by" uuid,
	CONSTRAINT "sync_runs_source_check" CHECK ("ingenium"."sync_runs"."source" in ('keystone')),
	CONSTRAINT "sync_runs_outcome_check" CHECK ("ingenium"."sync_runs"."outcome" in ('ok', 'error', 'unavailable')),
	CONSTRAINT "sync_runs_rows_check" CHECK ("ingenium"."sync_runs"."rows" >= 0),
	CONSTRAINT "sync_runs_order_check" CHECK ("ingenium"."sync_runs"."finished_at" >= "ingenium"."sync_runs"."started_at")
);
--> statement-breakpoint
CREATE TABLE "ingenium"."team_mirror" (
	"project_code" text NOT NULL,
	"assignment" text NOT NULL,
	"employee_number" text,
	"person_name" text NOT NULL,
	"email" text,
	"discipline" text,
	"activity" text,
	"source" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "team_mirror_project_code_assignment_pk" PRIMARY KEY("project_code","assignment"),
	CONSTRAINT "team_mirror_assignment_check" CHECK (btrim("ingenium"."team_mirror"."assignment") <> ''),
	CONSTRAINT "team_mirror_name_check" CHECK (btrim("ingenium"."team_mirror"."person_name") <> ''),
	CONSTRAINT "team_mirror_email_check" CHECK ("ingenium"."team_mirror"."email" is null or ("ingenium"."team_mirror"."email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and "ingenium"."team_mirror"."email" = lower("ingenium"."team_mirror"."email"))),
	CONSTRAINT "team_mirror_discipline_check" CHECK ("ingenium"."team_mirror"."discipline" is null or "ingenium"."team_mirror"."discipline" in ('process', 'mechanical', 'electrical', 'automation')),
	CONSTRAINT "team_mirror_source_check" CHECK ("ingenium"."team_mirror"."source" in ('keystone', 'simulation'))
);
--> statement-breakpoint
ALTER TABLE "ingenium"."audit_entries" ADD CONSTRAINT "audit_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "ingenium"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingenium"."team_mirror" ADD CONSTRAINT "team_mirror_project_code_project_mirror_code_fk" FOREIGN KEY ("project_code") REFERENCES "ingenium"."project_mirror"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entries_occurred_at_idx" ON "ingenium"."audit_entries" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_entries_entity_idx" ON "ingenium"."audit_entries" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "sync_runs_started_idx" ON "ingenium"."sync_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "team_mirror_email_idx" ON "ingenium"."team_mirror" USING btree ("email");