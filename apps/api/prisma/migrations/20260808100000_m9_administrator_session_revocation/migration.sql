CREATE FUNCTION revoke_administrator_sessions_on_security_change() RETURNS trigger AS $$
BEGIN
  IF NEW."role" IS DISTINCT FROM OLD."role"
    OR NEW."enabled" IS DISTINCT FROM OLD."enabled" THEN
    UPDATE "administrator_sessions"
    SET "revoked_at" = CURRENT_TIMESTAMP
    WHERE "administrator_id" = NEW."id"
      AND "revoked_at" IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "administrator_security_change_revokes_sessions"
AFTER UPDATE OF "role", "enabled" ON "administrators"
FOR EACH ROW EXECUTE FUNCTION revoke_administrator_sessions_on_security_change();
