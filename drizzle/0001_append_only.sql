-- Custom SQL migration file, put your code below! --
-- The audit trail is append-only (Norma § 4), enforced by the database: never updated, deleted nor truncated, in code or
-- tests. ERRCODE restrict_violation (23001).
CREATE OR REPLACE FUNCTION "ingenium"."append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % refused', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation', HINT = 'This table can only be added to.';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_entries_no_update_delete" BEFORE UPDATE OR DELETE ON "ingenium"."audit_entries" FOR EACH ROW EXECUTE FUNCTION "ingenium"."append_only"();
--> statement-breakpoint
CREATE TRIGGER "audit_entries_no_truncate" BEFORE TRUNCATE ON "ingenium"."audit_entries" FOR EACH STATEMENT EXECUTE FUNCTION "ingenium"."append_only"();
