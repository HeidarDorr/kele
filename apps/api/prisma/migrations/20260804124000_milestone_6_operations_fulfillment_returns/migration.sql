-- Milestone 6 adds operational projections plus append-only fulfillment,
-- tracking, return, refund and bulk-operation facts. Existing commercial
-- snapshots are not rewritten.

ALTER TYPE "inventory_action" ADD VALUE IF NOT EXISTS 'INSTAGRAM_RETURN';
ALTER TYPE "inventory_action" ADD VALUE IF NOT EXISTS 'ORDER_CANCELLATION';

CREATE TYPE "return_request_status" AS ENUM
  ('SUBMITTED', 'APPROVED', 'REJECTED', 'REFUND_PENDING', 'COMPLETED');
CREATE TYPE "refund_status" AS ENUM ('PENDING_PROVIDER', 'CONFIRMED', 'FAILED');
CREATE TYPE "refund_source" AS ENUM ('CANCELLATION', 'RETURN');
CREATE TYPE "bulk_operation_kind" AS ENUM ('PRICE', 'INVENTORY');
CREATE TYPE "bulk_operation_status" AS ENUM
  ('PREVIEWED', 'APPLIED', 'PARTIAL_FAILED', 'FAILED');
CREATE TYPE "bulk_operation_item_status" AS ENUM ('VALID', 'APPLIED', 'FAILED');

ALTER TABLE "orders"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "delivered_at" TIMESTAMPTZ(6);

CREATE TABLE "order_timeline_events" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "from_status" "order_fulfillment_status",
  "to_status" "order_fulfillment_status",
  "actor_id" VARCHAR(120) NOT NULL,
  "reason" VARCHAR(500),
  "correlation_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipment_tracking_revisions" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "carrier" VARCHAR(120) NOT NULL,
  "tracking_number" VARCHAR(160) NOT NULL,
  "tracking_url" VARCHAR(1000),
  "actor_id" VARCHAR(120) NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "correlation_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shipment_tracking_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "return_requests" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "status" "return_request_status" NOT NULL DEFAULT 'SUBMITTED',
  "reason" VARCHAR(1000) NOT NULL,
  "unused" BOOLEAN NOT NULL,
  "unwashed" BOOLEAN NOT NULL,
  "tags_attached" BOOLEAN NOT NULL,
  "delivery_confirmed_at" TIMESTAMPTZ(6) NOT NULL,
  "eligibility_deadline" TIMESTAMPTZ(6) NOT NULL,
  "requested_at" TIMESTAMPTZ(6) NOT NULL,
  "decision_reason" VARCHAR(1000),
  "decided_at" TIMESTAMPTZ(6),
  "decided_by" VARCHAR(120),
  "idempotency_key" VARCHAR(120) NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "correlation_id" UUID NOT NULL,
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_requests_conditions_check"
    CHECK ("unused" AND "unwashed" AND "tags_attached"),
  CONSTRAINT "return_requests_window_check"
    CHECK ("eligibility_deadline" = "delivery_confirmed_at" + INTERVAL '24 hours'
      AND "requested_at" <= "eligibility_deadline"),
  CONSTRAINT "return_requests_decision_check"
    CHECK (("decided_at" IS NULL AND "decided_by" IS NULL AND "decision_reason" IS NULL)
      OR ("decided_at" IS NOT NULL AND "decided_by" IS NOT NULL AND "decision_reason" IS NOT NULL))
);

CREATE TABLE "return_items" (
  "id" UUID NOT NULL,
  "return_request_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "return_items_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "refunds" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "return_request_id" UUID,
  "source" "refund_source" NOT NULL,
  "amount_rial" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
  "provider" VARCHAR(40) NOT NULL,
  "provider_reference" VARCHAR(160),
  "status" "refund_status" NOT NULL DEFAULT 'PENDING_PROVIDER',
  "failure_code" VARCHAR(120),
  "requested_at" TIMESTAMPTZ(6) NOT NULL,
  "confirmed_at" TIMESTAMPTZ(6),
  "provider_idempotency_key" VARCHAR(160) NOT NULL,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refunds_amount_check" CHECK ("amount_rial" > 0 AND "currency" = 'IRR'),
  CONSTRAINT "refunds_confirmation_check"
    CHECK (("status" = 'CONFIRMED' AND "confirmed_at" IS NOT NULL AND "failure_code" IS NULL)
      OR ("status" <> 'CONFIRMED' AND "confirmed_at" IS NULL))
);

CREATE TABLE "refund_attempts" (
  "id" UUID NOT NULL,
  "refund_id" UUID NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "provider_reference" VARCHAR(160),
  "status" "refund_status" NOT NULL,
  "failure_code" VARCHAR(120),
  "actor_id" VARCHAR(120) NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "correlation_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bulk_operations" (
  "id" UUID NOT NULL,
  "kind" "bulk_operation_kind" NOT NULL,
  "status" "bulk_operation_status" NOT NULL DEFAULT 'PREVIEWED',
  "reason" VARCHAR(500) NOT NULL,
  "filters" JSONB NOT NULL,
  "operation" JSONB NOT NULL,
  "actor_id" VARCHAR(120) NOT NULL,
  "correlation_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "applied_at" TIMESTAMPTZ(6),
  "apply_idempotency_key" VARCHAR(120),
  "request_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bulk_operations_version_check" CHECK ("version" > 0),
  CONSTRAINT "bulk_operations_expiry_check" CHECK ("expires_at" > "created_at")
);

CREATE TABLE "bulk_operation_items" (
  "id" UUID NOT NULL,
  "bulk_operation_id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "sku_code" VARCHAR(64) NOT NULL,
  "before_value" BIGINT NOT NULL,
  "proposed_value" BIGINT NOT NULL,
  "expected_version" INTEGER NOT NULL,
  "status" "bulk_operation_item_status" NOT NULL DEFAULT 'VALID',
  "failure_code" VARCHAR(120),
  CONSTRAINT "bulk_operation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bulk_operation_items_version_check" CHECK ("expected_version" > 0)
);

ALTER TABLE "inventory_movements" ADD COLUMN "return_request_id" UUID;

CREATE UNIQUE INDEX "order_timeline_events_idempotency_key_key"
  ON "order_timeline_events"("idempotency_key");
CREATE INDEX "order_timeline_events_order_id_created_at_idx"
  ON "order_timeline_events"("order_id", "created_at");
CREATE UNIQUE INDEX "shipment_tracking_revisions_idempotency_key_key"
  ON "shipment_tracking_revisions"("idempotency_key");
CREATE INDEX "shipment_tracking_revisions_order_id_created_at_idx"
  ON "shipment_tracking_revisions"("order_id", "created_at");
CREATE UNIQUE INDEX "return_requests_customer_id_idempotency_key_key"
  ON "return_requests"("customer_id", "idempotency_key");
CREATE INDEX "return_requests_order_id_requested_at_idx"
  ON "return_requests"("order_id", "requested_at");
CREATE INDEX "return_requests_customer_id_requested_at_idx"
  ON "return_requests"("customer_id", "requested_at");
CREATE INDEX "return_requests_status_eligibility_deadline_idx"
  ON "return_requests"("status", "eligibility_deadline");
CREATE UNIQUE INDEX "return_items_return_request_id_order_item_id_key"
  ON "return_items"("return_request_id", "order_item_id");
CREATE INDEX "return_items_order_item_id_idx" ON "return_items"("order_item_id");
CREATE UNIQUE INDEX "refunds_return_request_id_key" ON "refunds"("return_request_id");
CREATE UNIQUE INDEX "refunds_provider_idempotency_key_key"
  ON "refunds"("provider_idempotency_key");
CREATE INDEX "refunds_order_id_requested_at_idx" ON "refunds"("order_id", "requested_at");
CREATE INDEX "refunds_status_requested_at_idx" ON "refunds"("status", "requested_at");
CREATE UNIQUE INDEX "refund_attempts_idempotency_key_key"
  ON "refund_attempts"("idempotency_key");
CREATE INDEX "refund_attempts_refund_id_created_at_idx"
  ON "refund_attempts"("refund_id", "created_at");
CREATE UNIQUE INDEX "bulk_operations_apply_idempotency_key_key"
  ON "bulk_operations"("apply_idempotency_key");
CREATE INDEX "bulk_operations_kind_status_created_at_idx"
  ON "bulk_operations"("kind", "status", "created_at");
CREATE INDEX "bulk_operations_expires_at_idx" ON "bulk_operations"("expires_at");
CREATE UNIQUE INDEX "bulk_operation_items_bulk_operation_id_sku_id_key"
  ON "bulk_operation_items"("bulk_operation_id", "sku_id");
CREATE INDEX "bulk_operation_items_sku_id_idx" ON "bulk_operation_items"("sku_id");
CREATE INDEX "inventory_movements_return_request_id_idx"
  ON "inventory_movements"("return_request_id");
CREATE INDEX "business_events_type_created_at_idx" ON "business_events"("type", "created_at");
CREATE INDEX "business_events_created_at_idx" ON "business_events"("created_at");

ALTER TABLE "order_timeline_events" ADD CONSTRAINT "order_timeline_events_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_tracking_revisions" ADD CONSTRAINT "shipment_tracking_revisions_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_request_id_fkey"
  FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_return_request_id_fkey"
  FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_attempts" ADD CONSTRAINT "refund_attempts_refund_id_fkey"
  FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bulk_operation_items" ADD CONSTRAINT "bulk_operation_items_bulk_operation_id_fkey"
  FOREIGN KEY ("bulk_operation_id") REFERENCES "bulk_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_return_request_id_fkey"
  FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing paid Orders receive a deterministic creation fact without changing
-- their snapshots or fulfillment projection.
INSERT INTO "order_timeline_events" (
  "id", "order_id", "type", "from_status", "to_status", "actor_id",
  "reason", "correlation_id", "idempotency_key", "created_at"
)
SELECT
  md5("id"::text || ':m6-created')::uuid,
  "id",
  'created',
  NULL,
  'PAID',
  'migration:m6',
  'Milestone 6 immutable timeline backfill',
  "id",
  'migration:m6:order-created:' || "id"::text,
  "created_at"
FROM "orders";

CREATE FUNCTION "reject_m6_fact_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Milestone 6 historical facts are immutable' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "order_timeline_events_immutable"
BEFORE UPDATE ON "order_timeline_events"
FOR EACH ROW EXECUTE FUNCTION "reject_m6_fact_update"();

CREATE TRIGGER "shipment_tracking_revisions_immutable"
BEFORE UPDATE ON "shipment_tracking_revisions"
FOR EACH ROW EXECUTE FUNCTION "reject_m6_fact_update"();

CREATE TRIGGER "return_items_immutable"
BEFORE UPDATE ON "return_items"
FOR EACH ROW EXECUTE FUNCTION "reject_m6_fact_update"();

CREATE TRIGGER "refund_attempts_immutable"
BEFORE UPDATE ON "refund_attempts"
FOR EACH ROW EXECUTE FUNCTION "reject_m6_fact_update"();
