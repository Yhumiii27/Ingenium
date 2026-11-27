ALTER TABLE "ingenium"."project_mirror" ADD COLUMN "confidential" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingenium"."team_mirror" ADD COLUMN "origin" text DEFAULT 'assignment' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingenium"."team_mirror" ADD CONSTRAINT "team_mirror_origin_check" CHECK ("ingenium"."team_mirror"."origin" in ('assignment', 'stakeholder'));