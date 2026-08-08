CREATE TYPE "administrator_role" AS ENUM ('SUPER_ADMIN', 'INVENTORY_ADMIN', 'INSTAGRAM_ADMIN');

CREATE TABLE "administrators" (
  "id" UUID NOT NULL,
  "mobile" VARCHAR(15) NOT NULL,
  "display_name" VARCHAR(160) NOT NULL,
  "role" "administrator_role" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "administrator_otp_challenges" (
  "id" UUID NOT NULL,
  "administrator_id" UUID,
  "mobile_hash" CHAR(64) NOT NULL,
  "ip_hash" CHAR(64) NOT NULL,
  "code_salt" CHAR(32) NOT NULL,
  "code_verifier" CHAR(128) NOT NULL,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "administrator_otp_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "administrator_otp_attempts_nonnegative" CHECK ("failed_attempts" >= 0 AND "failed_attempts" <= 5)
);

CREATE TABLE "administrator_sessions" (
  "id" UUID NOT NULL,
  "administrator_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "csrf_hash" CHAR(64) NOT NULL,
  "idle_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "absolute_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "administrator_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "administrator_session_expiry_order" CHECK ("idle_expires_at" <= "absolute_expires_at")
);

CREATE TABLE "administrator_identity_audit" (
  "id" UUID NOT NULL,
  "administrator_id" UUID,
  "action" VARCHAR(64) NOT NULL,
  "outcome" VARCHAR(64) NOT NULL,
  "correlation_id" VARCHAR(128) NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "administrator_identity_audit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "administrators_mobile_key" ON "administrators"("mobile");
CREATE INDEX "administrators_enabled_role_idx" ON "administrators"("enabled", "role");
CREATE INDEX "administrator_otp_challenges_mobile_hash_created_at_idx" ON "administrator_otp_challenges"("mobile_hash", "created_at");
CREATE INDEX "administrator_otp_challenges_ip_hash_created_at_idx" ON "administrator_otp_challenges"("ip_hash", "created_at");
CREATE INDEX "administrator_otp_challenges_expires_at_idx" ON "administrator_otp_challenges"("expires_at");
CREATE UNIQUE INDEX "administrator_sessions_token_hash_key" ON "administrator_sessions"("token_hash");
CREATE INDEX "administrator_sessions_administrator_id_revoked_at_idx" ON "administrator_sessions"("administrator_id", "revoked_at");
CREATE INDEX "administrator_sessions_idle_expires_at_idx" ON "administrator_sessions"("idle_expires_at");
CREATE INDEX "administrator_sessions_absolute_expires_at_idx" ON "administrator_sessions"("absolute_expires_at");
CREATE INDEX "administrator_identity_audit_administrator_id_occurred_at_idx" ON "administrator_identity_audit"("administrator_id", "occurred_at");
CREATE INDEX "administrator_identity_audit_action_occurred_at_idx" ON "administrator_identity_audit"("action", "occurred_at");

ALTER TABLE "administrator_otp_challenges"
  ADD CONSTRAINT "administrator_otp_challenges_administrator_id_fkey"
  FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "administrator_sessions"
  ADD CONSTRAINT "administrator_sessions_administrator_id_fkey"
  FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "administrator_identity_audit"
  ADD CONSTRAINT "administrator_identity_audit_administrator_id_fkey"
  FOREIGN KEY ("administrator_id") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_administrator_identity_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'administrator identity audit is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "administrator_identity_audit_append_only"
BEFORE UPDATE OR DELETE ON "administrator_identity_audit"
FOR EACH ROW EXECUTE FUNCTION prevent_administrator_identity_audit_mutation();
