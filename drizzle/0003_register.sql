CREATE TABLE "ingenium"."consistency_rules" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consistency_rules_code_check" CHECK ("ingenium"."consistency_rules"."code" ~ '^[a-z][a-z0-9-]{1,39}$'),
	CONSTRAINT "consistency_rules_label_check" CHECK (btrim("ingenium"."consistency_rules"."label") <> ''),
	CONSTRAINT "consistency_rules_position_check" CHECK ("ingenium"."consistency_rules"."position" between 1 and 999)
);
--> statement-breakpoint
CREATE TABLE "ingenium"."deliverable_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"revision" text NOT NULL,
	"status" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"by_name" text NOT NULL,
	"reason" text,
	CONSTRAINT "deliverable_revisions_revision_check" CHECK ("ingenium"."deliverable_revisions"."revision" ~ '^[A-Z0-9]{1,3}$'),
	CONSTRAINT "deliverable_revisions_status_check" CHECK ("ingenium"."deliverable_revisions"."status" in ('draft', 'frozen', 'release_proposed', 'released', 'obsolete')),
	CONSTRAINT "deliverable_revisions_by_check" CHECK (btrim("ingenium"."deliverable_revisions"."by_name") <> ''),
	CONSTRAINT "deliverable_revisions_reason_check" CHECK ("ingenium"."deliverable_revisions"."reason" is null or btrim("ingenium"."deliverable_revisions"."reason") <> '')
);
--> statement-breakpoint
CREATE TABLE "ingenium"."register_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"occurred_on" date NOT NULL,
	"kind" text NOT NULL,
	"object_ref" text,
	"revision" text,
	"text" text,
	"recipients" text[] NOT NULL,
	"by_name" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "register_changes_project_check" CHECK ("ingenium"."register_changes"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "register_changes_kind_check" CHECK ("ingenium"."register_changes"."kind" in ('note', 'deliverable_frozen', 'deliverable_proposed', 'deliverable_released', 'deliverable_revised', 'deliverable_obsolete', 'input_confirmed', 'output_generated')),
	CONSTRAINT "register_changes_object_check" CHECK ("ingenium"."register_changes"."object_ref" is null or btrim("ingenium"."register_changes"."object_ref") <> ''),
	CONSTRAINT "register_changes_revision_check" CHECK ("ingenium"."register_changes"."revision" is null or "ingenium"."register_changes"."revision" ~ '^[A-Z0-9]{1,3}$'),
	CONSTRAINT "register_changes_text_check" CHECK (("ingenium"."register_changes"."kind" <> 'note' or "ingenium"."register_changes"."text" is not null) and ("ingenium"."register_changes"."text" is null or btrim("ingenium"."register_changes"."text") <> '')),
	CONSTRAINT "register_changes_recipients_check" CHECK ("ingenium"."register_changes"."recipients" <@ array['process', 'mechanical', 'electrical', 'automation', 'client', 'site', 'purchasing', 'project_management']::text[]),
	CONSTRAINT "register_changes_by_check" CHECK (btrim("ingenium"."register_changes"."by_name") <> ''),
	CONSTRAINT "register_changes_source_check" CHECK ("ingenium"."register_changes"."source" in ('keystone', 'simulation', 'ingenium'))
);
--> statement-breakpoint
CREATE TABLE "ingenium"."register_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"number" text NOT NULL,
	"rule_code" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"owner" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"closed_at" timestamp with time zone,
	"closed_by_name" text,
	"raised_by_name" text NOT NULL,
	"source" text NOT NULL,
	"keystone_id" text,
	"imported_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "register_checks_unique" UNIQUE("project_code","number"),
	CONSTRAINT "register_checks_project_check" CHECK ("ingenium"."register_checks"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "register_checks_number_check" CHECK ("ingenium"."register_checks"."number" ~ '^C-[0-9]{2,4}$'),
	CONSTRAINT "register_checks_severity_check" CHECK ("ingenium"."register_checks"."severity" in ('blocking', 'warning', 'info')),
	CONSTRAINT "register_checks_title_check" CHECK (btrim("ingenium"."register_checks"."title") <> ''),
	CONSTRAINT "register_checks_detail_check" CHECK ("ingenium"."register_checks"."detail" is null or btrim("ingenium"."register_checks"."detail") <> ''),
	CONSTRAINT "register_checks_owner_check" CHECK ("ingenium"."register_checks"."owner" in ('process', 'mechanical', 'electrical', 'automation')),
	CONSTRAINT "register_checks_status_check" CHECK ("ingenium"."register_checks"."status" in ('open', 'in_progress', 'sent_back', 'resolved', 'cancelled')),
	CONSTRAINT "register_checks_note_check" CHECK ("ingenium"."register_checks"."note" is null or btrim("ingenium"."register_checks"."note") <> ''),
	CONSTRAINT "register_checks_closed_check" CHECK (("ingenium"."register_checks"."status" in ('resolved', 'cancelled')) = ("ingenium"."register_checks"."closed_at" is not null) and ("ingenium"."register_checks"."closed_at" is null) = ("ingenium"."register_checks"."closed_by_name" is null)),
	CONSTRAINT "register_checks_closed_note_check" CHECK ("ingenium"."register_checks"."status" not in ('resolved', 'cancelled', 'sent_back') or "ingenium"."register_checks"."note" is not null),
	CONSTRAINT "register_checks_raised_check" CHECK (btrim("ingenium"."register_checks"."raised_by_name") <> ''),
	CONSTRAINT "register_checks_source_check" CHECK ("ingenium"."register_checks"."source" in ('keystone', 'simulation', 'ingenium')),
	CONSTRAINT "register_checks_version_check" CHECK ("ingenium"."register_checks"."row_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "ingenium"."register_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"discipline" text NOT NULL,
	"equipment_ref" text,
	"revision" text NOT NULL,
	"status" text NOT NULL,
	"issued_on" date NOT NULL,
	"author_name" text NOT NULL,
	"recipients" text[] NOT NULL,
	"source" text NOT NULL,
	"keystone_id" text,
	"imported_at" timestamp with time zone,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "register_deliverables_unique" UNIQUE("project_code","number"),
	CONSTRAINT "register_deliverables_project_check" CHECK ("ingenium"."register_deliverables"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "register_deliverables_number_check" CHECK ("ingenium"."register_deliverables"."number" ~ '^[A-Z][A-Z0-9]{1,5}(-[A-Z0-9]{2,8}){1,3}$'),
	CONSTRAINT "register_deliverables_title_check" CHECK (btrim("ingenium"."register_deliverables"."title") <> ''),
	CONSTRAINT "register_deliverables_discipline_check" CHECK ("ingenium"."register_deliverables"."discipline" in ('process', 'mechanical', 'electrical', 'automation')),
	CONSTRAINT "register_deliverables_equipment_check" CHECK ("ingenium"."register_deliverables"."equipment_ref" is null or btrim("ingenium"."register_deliverables"."equipment_ref") <> ''),
	CONSTRAINT "register_deliverables_revision_check" CHECK ("ingenium"."register_deliverables"."revision" ~ '^[A-Z0-9]{1,3}$'),
	CONSTRAINT "register_deliverables_status_check" CHECK ("ingenium"."register_deliverables"."status" in ('draft', 'frozen', 'release_proposed', 'released', 'obsolete')),
	CONSTRAINT "register_deliverables_author_check" CHECK (btrim("ingenium"."register_deliverables"."author_name") <> ''),
	CONSTRAINT "register_deliverables_recipients_check" CHECK ("ingenium"."register_deliverables"."recipients" <@ array['process', 'mechanical', 'electrical', 'automation', 'client', 'site', 'purchasing', 'project_management']::text[]),
	CONSTRAINT "register_deliverables_source_check" CHECK ("ingenium"."register_deliverables"."source" in ('keystone', 'simulation', 'ingenium')),
	CONSTRAINT "register_deliverables_version_check" CHECK ("ingenium"."register_deliverables"."row_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "ingenium"."register_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"consumer" text NOT NULL,
	"document_number" text NOT NULL,
	"external_party" text,
	"external_title" text,
	"revision_in_use" text NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by_name" text,
	"source" text NOT NULL,
	"keystone_id" text,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "register_inputs_unique" UNIQUE("project_code","consumer","document_number"),
	CONSTRAINT "register_inputs_project_check" CHECK ("ingenium"."register_inputs"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "register_inputs_consumer_check" CHECK ("ingenium"."register_inputs"."consumer" in ('process', 'mechanical', 'electrical', 'automation')),
	CONSTRAINT "register_inputs_number_check" CHECK ("ingenium"."register_inputs"."document_number" ~ '^[A-Z][A-Z0-9]{1,5}(-[A-Z0-9]{2,8}){1,3}$'),
	CONSTRAINT "register_inputs_party_check" CHECK ("ingenium"."register_inputs"."external_party" is null or ("ingenium"."register_inputs"."external_party" in ('process', 'mechanical', 'electrical', 'automation', 'client', 'site', 'purchasing', 'project_management') and "ingenium"."register_inputs"."external_party" not in ('process', 'mechanical', 'electrical', 'automation'))),
	CONSTRAINT "register_inputs_title_check" CHECK (("ingenium"."register_inputs"."external_party" is null and "ingenium"."register_inputs"."external_title" is null) or ("ingenium"."register_inputs"."external_party" is not null and "ingenium"."register_inputs"."external_title" is not null and btrim("ingenium"."register_inputs"."external_title") <> '')),
	CONSTRAINT "register_inputs_revision_check" CHECK ("ingenium"."register_inputs"."revision_in_use" ~ '^[A-Z0-9]{1,3}$'),
	CONSTRAINT "register_inputs_ack_check" CHECK (("ingenium"."register_inputs"."acknowledged_at" is null) = ("ingenium"."register_inputs"."acknowledged_by_name" is null) and ("ingenium"."register_inputs"."acknowledged_by_name" is null or btrim("ingenium"."register_inputs"."acknowledged_by_name") <> '')),
	CONSTRAINT "register_inputs_source_check" CHECK ("ingenium"."register_inputs"."source" in ('keystone', 'simulation', 'ingenium'))
);
--> statement-breakpoint
CREATE TABLE "ingenium"."register_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_code" text NOT NULL,
	"number" text NOT NULL,
	"discipline" text NOT NULL,
	"name" text NOT NULL,
	"recipients" text[] NOT NULL,
	"source_deliverable" text,
	"source_text" text,
	"generated_at" timestamp with time zone,
	"generated_by_name" text,
	"generated_from_revision" text,
	"source" text NOT NULL,
	"keystone_id" text,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "register_outputs_unique" UNIQUE("project_code","number"),
	CONSTRAINT "register_outputs_project_check" CHECK ("ingenium"."register_outputs"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "register_outputs_number_check" CHECK ("ingenium"."register_outputs"."number" ~ '^O-[0-9]{2,4}$'),
	CONSTRAINT "register_outputs_discipline_check" CHECK ("ingenium"."register_outputs"."discipline" in ('process', 'mechanical', 'electrical', 'automation')),
	CONSTRAINT "register_outputs_name_check" CHECK (btrim("ingenium"."register_outputs"."name") <> ''),
	CONSTRAINT "register_outputs_recipients_check" CHECK ("ingenium"."register_outputs"."recipients" <@ array['process', 'mechanical', 'electrical', 'automation', 'client', 'site', 'purchasing', 'project_management']::text[]),
	CONSTRAINT "register_outputs_deliverable_check" CHECK ("ingenium"."register_outputs"."source_deliverable" is null or "ingenium"."register_outputs"."source_deliverable" ~ '^[A-Z][A-Z0-9]{1,5}(-[A-Z0-9]{2,8}){1,3}$'),
	CONSTRAINT "register_outputs_source_text_check" CHECK ("ingenium"."register_outputs"."source_text" is null or btrim("ingenium"."register_outputs"."source_text") <> ''),
	CONSTRAINT "register_outputs_generated_check" CHECK (("ingenium"."register_outputs"."generated_at" is null) = ("ingenium"."register_outputs"."generated_by_name" is null)),
	CONSTRAINT "register_outputs_from_check" CHECK ("ingenium"."register_outputs"."generated_from_revision" is null or "ingenium"."register_outputs"."generated_from_revision" ~ '^[A-Z0-9]{1,3}$'),
	CONSTRAINT "register_outputs_source_check" CHECK ("ingenium"."register_outputs"."source" in ('keystone', 'simulation', 'ingenium'))
);
--> statement-breakpoint
CREATE TABLE "ingenium"."object_switchovers" (
	"object" text PRIMARY KEY NOT NULL,
	"switched_at" timestamp with time zone NOT NULL,
	"by_name" text NOT NULL,
	"transfer_run_id" uuid NOT NULL,
	CONSTRAINT "object_switchovers_object_check" CHECK ("ingenium"."object_switchovers"."object" in ('register', 'pid', 'drawings', 'pack', 'interfaces', 'ce', 'parts', 'bom')),
	CONSTRAINT "object_switchovers_by_check" CHECK (btrim("ingenium"."object_switchovers"."by_name") <> '')
);
--> statement-breakpoint
CREATE TABLE "ingenium"."transfer_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object" text NOT NULL,
	"mode" text NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"by_name" text NOT NULL,
	"by_user_id" uuid,
	"counts" jsonb NOT NULL,
	"refused" integer NOT NULL,
	"refusals" jsonb NOT NULL,
	CONSTRAINT "transfer_runs_object_check" CHECK ("ingenium"."transfer_runs"."object" in ('register', 'pid', 'drawings', 'pack', 'interfaces', 'ce', 'parts', 'bom')),
	CONSTRAINT "transfer_runs_mode_check" CHECK ("ingenium"."transfer_runs"."mode" in ('dry_run', 'applied')),
	CONSTRAINT "transfer_runs_source_check" CHECK ("ingenium"."transfer_runs"."source" in ('keystone', 'simulation')),
	CONSTRAINT "transfer_runs_by_check" CHECK (btrim("ingenium"."transfer_runs"."by_name") <> ''),
	CONSTRAINT "transfer_runs_refused_check" CHECK ("ingenium"."transfer_runs"."refused" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ingenium"."free_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"project_code" text,
	"assignee_email" text NOT NULL,
	"assignee_name" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_by_name" text NOT NULL,
	"due_on" date,
	"priority" text DEFAULT 'normal' NOT NULL,
	"state" text DEFAULT 'todo' NOT NULL,
	"done_at" timestamp with time zone,
	"cancel_reason" text,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_tasks_title_check" CHECK (btrim("ingenium"."free_tasks"."title") <> '' and length("ingenium"."free_tasks"."title") <= 200),
	CONSTRAINT "free_tasks_project_check" CHECK ("ingenium"."free_tasks"."project_code" is null or "ingenium"."free_tasks"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "free_tasks_assignee_check" CHECK ("ingenium"."free_tasks"."assignee_email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and "ingenium"."free_tasks"."assignee_email" = lower("ingenium"."free_tasks"."assignee_email")),
	CONSTRAINT "free_tasks_assignee_name_check" CHECK (btrim("ingenium"."free_tasks"."assignee_name") <> ''),
	CONSTRAINT "free_tasks_created_by_check" CHECK (btrim("ingenium"."free_tasks"."created_by_name") <> ''),
	CONSTRAINT "free_tasks_priority_check" CHECK ("ingenium"."free_tasks"."priority" in ('normal', 'high')),
	CONSTRAINT "free_tasks_state_check" CHECK ("ingenium"."free_tasks"."state" in ('todo', 'in_progress', 'waiting', 'done', 'cancelled')),
	CONSTRAINT "free_tasks_done_check" CHECK (("ingenium"."free_tasks"."state" = 'done') = ("ingenium"."free_tasks"."done_at" is not null)),
	CONSTRAINT "free_tasks_cancel_check" CHECK (("ingenium"."free_tasks"."state" = 'cancelled') = ("ingenium"."free_tasks"."cancel_reason" is not null) and ("ingenium"."free_tasks"."cancel_reason" is null or btrim("ingenium"."free_tasks"."cancel_reason") <> '')),
	CONSTRAINT "free_tasks_version_check" CHECK ("ingenium"."free_tasks"."row_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "ingenium"."published_tasks" (
	"task_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"person_id" uuid,
	"nature" text NOT NULL,
	"type" text NOT NULL,
	"type_label" text NOT NULL,
	"type_label_en" text NOT NULL,
	"object_ref" text,
	"title" text NOT NULL,
	"state" text NOT NULL,
	"due_on" date,
	"priority" text NOT NULL,
	"actions" text[] NOT NULL,
	"sensitive" boolean NOT NULL,
	"project_code" text,
	"link" text NOT NULL,
	"version" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "published_tasks_task_id_recipient_email_pk" PRIMARY KEY("task_id","recipient_email"),
	CONSTRAINT "published_tasks_task_check" CHECK (btrim("ingenium"."published_tasks"."task_id") <> ''),
	CONSTRAINT "published_tasks_recipient_check" CHECK ("ingenium"."published_tasks"."recipient_email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and "ingenium"."published_tasks"."recipient_email" = lower("ingenium"."published_tasks"."recipient_email")),
	CONSTRAINT "published_tasks_nature_check" CHECK ("ingenium"."published_tasks"."nature" in ('tache', 'approbation')),
	CONSTRAINT "published_tasks_type_check" CHECK ("ingenium"."published_tasks"."type" ~ '^[a-z][a-z_]{1,39}$'),
	CONSTRAINT "published_tasks_labels_check" CHECK (btrim("ingenium"."published_tasks"."type_label") <> '' and btrim("ingenium"."published_tasks"."type_label_en") <> '' and btrim("ingenium"."published_tasks"."title") <> ''),
	CONSTRAINT "published_tasks_state_check" CHECK ("ingenium"."published_tasks"."state" in ('a_faire', 'en_cours', 'en_attente', 'faite', 'annulee')),
	CONSTRAINT "published_tasks_priority_check" CHECK ("ingenium"."published_tasks"."priority" in ('normale', 'haute')),
	CONSTRAINT "published_tasks_actions_check" CHECK ("ingenium"."published_tasks"."actions" <@ array['ouvrir', 'commenter', 'approuver', 'refuser', 'demarrer', 'suspendre', 'reprendre', 'terminer']::text[]),
	CONSTRAINT "published_tasks_project_check" CHECK ("ingenium"."published_tasks"."project_code" is null or "ingenium"."published_tasks"."project_code" ~ '^[A-Z]{3}-[0-9]{3}$'),
	CONSTRAINT "published_tasks_link_check" CHECK ("ingenium"."published_tasks"."link" ~ '^https?://'),
	CONSTRAINT "published_tasks_version_check" CHECK (btrim("ingenium"."published_tasks"."version") <> '')
);
--> statement-breakpoint
ALTER TABLE "ingenium"."deliverable_revisions" ADD CONSTRAINT "deliverable_revisions_deliverable_id_register_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "ingenium"."register_deliverables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingenium"."register_checks" ADD CONSTRAINT "register_checks_rule_code_consistency_rules_code_fk" FOREIGN KEY ("rule_code") REFERENCES "ingenium"."consistency_rules"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingenium"."object_switchovers" ADD CONSTRAINT "object_switchovers_transfer_run_id_transfer_runs_id_fk" FOREIGN KEY ("transfer_run_id") REFERENCES "ingenium"."transfer_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingenium"."free_tasks" ADD CONSTRAINT "free_tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "ingenium"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliverable_revisions_deliverable_idx" ON "ingenium"."deliverable_revisions" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "register_changes_project_idx" ON "ingenium"."register_changes" USING btree ("project_code","occurred_on");--> statement-breakpoint
CREATE INDEX "transfer_runs_object_idx" ON "ingenium"."transfer_runs" USING btree ("object","occurred_at");--> statement-breakpoint
CREATE INDEX "free_tasks_assignee_idx" ON "ingenium"."free_tasks" USING btree ("assignee_email");--> statement-breakpoint
CREATE INDEX "published_tasks_recipient_idx" ON "ingenium"."published_tasks" USING btree ("recipient_email");