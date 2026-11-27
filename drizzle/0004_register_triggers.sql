-- Custom SQL migration file, put your code below! --
-- The revision history of the deliverables, the recent changes and the transfer journal are append-only (Norma § 4), like
-- the audit trail: the function append_only of the migration 0001 refuses UPDATE, DELETE and TRUNCATE.
CREATE TRIGGER "deliverable_revisions_no_update_delete" BEFORE UPDATE OR DELETE ON "ingenium"."deliverable_revisions" FOR EACH ROW EXECUTE FUNCTION "ingenium"."append_only"();
--> statement-breakpoint
CREATE TRIGGER "deliverable_revisions_no_truncate" BEFORE TRUNCATE ON "ingenium"."deliverable_revisions" FOR EACH STATEMENT EXECUTE FUNCTION "ingenium"."append_only"();
--> statement-breakpoint
CREATE TRIGGER "register_changes_no_update_delete" BEFORE UPDATE OR DELETE ON "ingenium"."register_changes" FOR EACH ROW WHEN (OLD.source = 'ingenium') EXECUTE FUNCTION "ingenium"."append_only"();
--> statement-breakpoint
CREATE TRIGGER "transfer_runs_no_update_delete" BEFORE UPDATE OR DELETE ON "ingenium"."transfer_runs" FOR EACH ROW EXECUTE FUNCTION "ingenium"."append_only"();
--> statement-breakpoint
CREATE TRIGGER "transfer_runs_no_truncate" BEFORE TRUNCATE ON "ingenium"."transfer_runs" FOR EACH STATEMENT EXECUTE FUNCTION "ingenium"."append_only"();
--> statement-breakpoint
-- A frozen revision never changes (docs/spec/04 § 1): once a deliverable has left the draft at a revision, its number, title
-- and discipline stay, and it only returns to draft under a new revision letter. ERRCODE restrict_violation (23001).
CREATE OR REPLACE FUNCTION "ingenium"."frozen_revision"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.number <> OLD.number THEN
    RAISE EXCEPTION 'the number of a deliverable never changes' USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.status <> 'draft' AND NEW.revision = OLD.revision
     AND (NEW.status = 'draft' OR NEW.title <> OLD.title OR NEW.discipline <> OLD.discipline) THEN
    RAISE EXCEPTION 'revision % of % is frozen: a change needs a new revision', OLD.revision, OLD.number USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW.revision <> OLD.revision AND NOT (OLD.status IN ('frozen', 'released') AND NEW.status = 'draft') THEN
    RAISE EXCEPTION 'a new revision of % starts from a frozen or released one, as a draft', OLD.number USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "register_deliverables_frozen_revision" BEFORE UPDATE ON "ingenium"."register_deliverables" FOR EACH ROW WHEN (OLD.source = 'ingenium' OR OLD.imported_at IS NOT NULL) EXECUTE FUNCTION "ingenium"."frozen_revision"();
--> statement-breakpoint
-- No physical deletion of a business record held by Ingenium (Norma § 4): a row written by Ingenium or imported from Keystone
-- is made obsolete, cancelled or closed, never deleted. The rows of Keystone's mirror (before the switch-over) are rewritten
-- by the connector.
CREATE OR REPLACE FUNCTION "ingenium"."no_delete_held"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% held by Ingenium: % refused (make it obsolete, cancel or close it)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "register_inputs_no_delete" BEFORE DELETE ON "ingenium"."register_inputs" FOR EACH ROW WHEN (OLD.source = 'ingenium' OR OLD.imported_at IS NOT NULL) EXECUTE FUNCTION "ingenium"."no_delete_held"();
--> statement-breakpoint
CREATE TRIGGER "register_deliverables_no_delete" BEFORE DELETE ON "ingenium"."register_deliverables" FOR EACH ROW WHEN (OLD.source = 'ingenium' OR OLD.imported_at IS NOT NULL) EXECUTE FUNCTION "ingenium"."no_delete_held"();
--> statement-breakpoint
CREATE TRIGGER "register_outputs_no_delete" BEFORE DELETE ON "ingenium"."register_outputs" FOR EACH ROW WHEN (OLD.source = 'ingenium' OR OLD.imported_at IS NOT NULL) EXECUTE FUNCTION "ingenium"."no_delete_held"();
--> statement-breakpoint
CREATE TRIGGER "register_checks_no_delete" BEFORE DELETE ON "ingenium"."register_checks" FOR EACH ROW WHEN (OLD.source = 'ingenium' OR OLD.imported_at IS NOT NULL) EXECUTE FUNCTION "ingenium"."no_delete_held"();
