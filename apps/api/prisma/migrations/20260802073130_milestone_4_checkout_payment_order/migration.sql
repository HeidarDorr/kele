-- CreateEnum
CREATE TYPE "shipping_method_code" AS ENUM ('IRAN_POST', 'TIPAX', 'TEHRAN_LOCAL_COURIER');

-- CreateEnum
CREATE TYPE "checkout_status" AS ENUM ('ACTIVE', 'PAYMENT_PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "payment_attempt_status" AS ENUM ('CREATED', 'REDIRECTED', 'VERIFIED', 'FAILED', 'CANCELLED', 'PENDING', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "payment_callback_result" AS ENUM ('PAID', 'FAILED', 'CANCELLED', 'PENDING', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "order_fulfillment_status" AS ENUM ('PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "payment_reconciliation_status" AS ENUM ('OPEN', 'RESOLVED', 'FAILED');

-- CreateEnum
CREATE TYPE "database_job_type" AS ENUM ('EXPIRE_CHECKOUT', 'RECOVER_PAYMENT');

-- CreateEnum
CREATE TYPE "database_job_status" AS ENUM ('PENDING', 'LEASED', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "inventory_action" ADD VALUE 'RESERVATION';
ALTER TYPE "inventory_action" ADD VALUE 'RESERVATION_RELEASE';

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "order_id" UUID,
ADD COLUMN     "reservation_id" UUID;

-- CreateTable
CREATE TABLE "shipping_policy_versions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "free_shipping_threshold_rial" BIGINT,
    "eligibility_basis" VARCHAR(40) NOT NULL DEFAULT 'order_subtotal',
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_id" VARCHAR(120) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_method_versions" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "code" "shipping_method_code" NOT NULL,
    "localized_name" VARCHAR(120) NOT NULL,
    "fixed_price_rial" BIGINT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_method_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "cart_version" INTEGER NOT NULL,
    "status" "checkout_status" NOT NULL DEFAULT 'ACTIVE',
    "idempotency_key" VARCHAR(120) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
    "items_subtotal_rial" BIGINT NOT NULL,
    "shipping_total_rial" BIGINT NOT NULL,
    "payable_total_rial" BIGINT NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "shipping_method_code" "shipping_method_code" NOT NULL,
    "shipping_method_name" VARCHAR(120) NOT NULL,
    "shipping_fixed_price_rial" BIGINT NOT NULL,
    "free_shipping_threshold_rial" BIGINT,
    "free_shipping_applied" BOOLEAN NOT NULL,
    "shipping_settings_version" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_lines" (
    "id" UUID NOT NULL,
    "checkout_session_id" UUID NOT NULL,
    "cart_line_id" UUID NOT NULL,
    "kind" "cart_line_kind" NOT NULL,
    "sku_id" UUID,
    "outfit_revision_id" UUID,
    "outfit_size" VARCHAR(40),
    "title_snapshot" VARCHAR(180) NOT NULL,
    "selection_snapshot" VARCHAR(180) NOT NULL,
    "sku_code_snapshot" VARCHAR(64),
    "image_snapshot" JSONB,
    "quantity" INTEGER NOT NULL,
    "unit_price_rial" BIGINT NOT NULL,
    "line_total_rial" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL,
    "checkout_session_id" UUID NOT NULL,
    "checkout_line_id" UUID NOT NULL,
    "sku_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "reservation_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL,
    "checkout_session_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_reference" VARCHAR(120) NOT NULL,
    "provider_transaction_id" VARCHAR(120),
    "status" "payment_attempt_status" NOT NULL DEFAULT 'CREATED',
    "amount_rial" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
    "redirect_url" VARCHAR(1000),
    "idempotency_key" VARCHAR(120) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "failure_code" VARCHAR(120),
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_callback_receipts" (
    "id" UUID NOT NULL,
    "payment_attempt_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_transaction_id" VARCHAR(120) NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "result" "payment_callback_result" NOT NULL,
    "order_id" UUID,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_callback_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(40) NOT NULL,
    "customer_id" UUID NOT NULL,
    "checkout_session_id" UUID NOT NULL,
    "payment_attempt_id" UUID NOT NULL,
    "fulfillment_status" "order_fulfillment_status" NOT NULL DEFAULT 'PAID',
    "currency" CHAR(3) NOT NULL DEFAULT 'IRR',
    "items_subtotal_rial" BIGINT NOT NULL,
    "shipping_total_rial" BIGINT NOT NULL,
    "paid_total_rial" BIGINT NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "shipping_method_code" "shipping_method_code" NOT NULL,
    "shipping_method_name" VARCHAR(120) NOT NULL,
    "shipping_fixed_price_rial" BIGINT NOT NULL,
    "free_shipping_threshold_rial" BIGINT,
    "free_shipping_applied" BOOLEAN NOT NULL,
    "shipping_settings_version" INTEGER NOT NULL,
    "payment_provider" VARCHAR(40) NOT NULL,
    "provider_transaction_id" VARCHAR(120) NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "kind" "cart_line_kind" NOT NULL,
    "sku_id" UUID,
    "outfit_revision_id" UUID,
    "outfit_size" VARCHAR(40),
    "title_snapshot" VARCHAR(180) NOT NULL,
    "selection_snapshot" VARCHAR(180) NOT NULL,
    "sku_code_snapshot" VARCHAR(64),
    "image_snapshot" JSONB,
    "quantity" INTEGER NOT NULL,
    "unit_price_rial" BIGINT NOT NULL,
    "line_total_rial" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reconciliations" (
    "id" UUID NOT NULL,
    "checkout_session_id" UUID NOT NULL,
    "payment_attempt_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_transaction_id" VARCHAR(120) NOT NULL,
    "verified_amount_rial" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "status" "payment_reconciliation_status" NOT NULL DEFAULT 'OPEN',
    "resolution_note" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_jobs" (
    "id" UUID NOT NULL,
    "type" "database_job_type" NOT NULL,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "database_job_status" NOT NULL DEFAULT 'PENDING',
    "run_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "lease_owner" VARCHAR(120),
    "lease_expires_at" TIMESTAMPTZ(6),
    "last_error_code" VARCHAR(120),
    "last_error" VARCHAR(1000),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "database_jobs_pkey" PRIMARY KEY ("id")
);

-- Milestone 4 database invariants. These checks make client amount tampering,
-- invalid money arithmetic, partial line shapes and impossible job leases
-- unrepresentable even if an application regression reaches persistence.
ALTER TABLE "shipping_policy_versions"
  ADD CONSTRAINT "shipping_policy_versions_version_positive" CHECK ("version" > 0),
  ADD CONSTRAINT "shipping_policy_versions_threshold_nonnegative" CHECK ("free_shipping_threshold_rial" IS NULL OR "free_shipping_threshold_rial" >= 0),
  ADD CONSTRAINT "shipping_policy_versions_basis_order_subtotal" CHECK ("eligibility_basis" = 'order_subtotal');

ALTER TABLE "shipping_method_versions"
  ADD CONSTRAINT "shipping_method_versions_price_nonnegative" CHECK ("fixed_price_rial" >= 0),
  ADD CONSTRAINT "shipping_method_versions_display_order_nonnegative" CHECK ("display_order" >= 0);

ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_currency_irr" CHECK ("currency" = 'IRR'),
  ADD CONSTRAINT "checkout_sessions_amounts_nonnegative" CHECK ("items_subtotal_rial" >= 0 AND "shipping_total_rial" >= 0 AND "payable_total_rial" >= 0 AND "shipping_fixed_price_rial" >= 0),
  ADD CONSTRAINT "checkout_sessions_total_exact" CHECK ("payable_total_rial" = "items_subtotal_rial" + "shipping_total_rial"),
  ADD CONSTRAINT "checkout_sessions_threshold_nonnegative" CHECK ("free_shipping_threshold_rial" IS NULL OR "free_shipping_threshold_rial" >= 0),
  ADD CONSTRAINT "checkout_sessions_free_shipping_exact" CHECK (
    ("free_shipping_applied" AND "free_shipping_threshold_rial" IS NOT NULL AND "items_subtotal_rial" >= "free_shipping_threshold_rial" AND "shipping_total_rial" = 0)
    OR
    (NOT "free_shipping_applied" AND ("free_shipping_threshold_rial" IS NULL OR "items_subtotal_rial" < "free_shipping_threshold_rial") AND "shipping_total_rial" = "shipping_fixed_price_rial")
  ),
  ADD CONSTRAINT "checkout_sessions_expiry_after_creation" CHECK ("expires_at" > "created_at");

ALTER TABLE "checkout_lines"
  ADD CONSTRAINT "checkout_lines_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "checkout_lines_money_nonnegative" CHECK ("unit_price_rial" >= 0 AND "line_total_rial" >= 0),
  ADD CONSTRAINT "checkout_lines_total_exact" CHECK ("line_total_rial" = "unit_price_rial" * "quantity"),
  ADD CONSTRAINT "checkout_lines_selection_shape" CHECK (
    ("kind" = 'PRODUCT' AND "sku_id" IS NOT NULL AND "outfit_revision_id" IS NULL AND "outfit_size" IS NULL)
    OR
    ("kind" = 'OUTFIT' AND "sku_id" IS NULL AND "outfit_revision_id" IS NOT NULL AND "outfit_size" IS NOT NULL)
  );

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "inventory_reservations_terminal_timestamp" CHECK (
    ("status" = 'ACTIVE' AND "consumed_at" IS NULL AND "released_at" IS NULL)
    OR ("status" = 'CONSUMED' AND "consumed_at" IS NOT NULL AND "released_at" IS NULL)
    OR ("status" IN ('RELEASED', 'EXPIRED') AND "consumed_at" IS NULL AND "released_at" IS NOT NULL)
  );

ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_amount_positive" CHECK ("amount_rial" > 0),
  ADD CONSTRAINT "payment_attempts_currency_irr" CHECK ("currency" = 'IRR');

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_currency_irr" CHECK ("currency" = 'IRR'),
  ADD CONSTRAINT "orders_amounts_nonnegative" CHECK ("items_subtotal_rial" >= 0 AND "shipping_total_rial" >= 0 AND "paid_total_rial" >= 0 AND "shipping_fixed_price_rial" >= 0),
  ADD CONSTRAINT "orders_total_exact" CHECK ("paid_total_rial" = "items_subtotal_rial" + "shipping_total_rial"),
  ADD CONSTRAINT "orders_threshold_nonnegative" CHECK ("free_shipping_threshold_rial" IS NULL OR "free_shipping_threshold_rial" >= 0),
  ADD CONSTRAINT "orders_free_shipping_exact" CHECK (
    ("free_shipping_applied" AND "free_shipping_threshold_rial" IS NOT NULL AND "items_subtotal_rial" >= "free_shipping_threshold_rial" AND "shipping_total_rial" = 0)
    OR
    (NOT "free_shipping_applied" AND ("free_shipping_threshold_rial" IS NULL OR "items_subtotal_rial" < "free_shipping_threshold_rial") AND "shipping_total_rial" = "shipping_fixed_price_rial")
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_money_nonnegative" CHECK ("unit_price_rial" >= 0 AND "line_total_rial" >= 0),
  ADD CONSTRAINT "order_items_total_exact" CHECK ("line_total_rial" = "unit_price_rial" * "quantity"),
  ADD CONSTRAINT "order_items_selection_shape" CHECK (
    ("kind" = 'PRODUCT' AND "sku_id" IS NOT NULL AND "outfit_revision_id" IS NULL AND "outfit_size" IS NULL)
    OR
    ("kind" = 'OUTFIT' AND "sku_id" IS NULL AND "outfit_revision_id" IS NOT NULL AND "outfit_size" IS NOT NULL)
  );

ALTER TABLE "payment_reconciliations"
  ADD CONSTRAINT "payment_reconciliations_amount_positive" CHECK ("verified_amount_rial" > 0),
  ADD CONSTRAINT "payment_reconciliations_currency_irr" CHECK ("currency" = 'IRR');

ALTER TABLE "database_jobs"
  ADD CONSTRAINT "database_jobs_attempt_bounds" CHECK ("attempt_count" >= 0 AND "max_attempts" > 0 AND "attempt_count" <= "max_attempts"),
  ADD CONSTRAINT "database_jobs_lease_shape" CHECK ("status" <> 'LEASED' OR ("lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL));

-- CreateIndex
CREATE UNIQUE INDEX "shipping_policy_versions_version_key" ON "shipping_policy_versions"("version");

-- CreateIndex
CREATE INDEX "shipping_policy_versions_effective_at_idx" ON "shipping_policy_versions"("effective_at");

-- CreateIndex
CREATE INDEX "shipping_method_versions_policy_id_display_order_idx" ON "shipping_method_versions"("policy_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_method_versions_policy_id_code_key" ON "shipping_method_versions"("policy_id", "code");

-- CreateIndex
CREATE INDEX "checkout_sessions_customer_id_created_at_idx" ON "checkout_sessions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "checkout_sessions_cart_id_status_idx" ON "checkout_sessions"("cart_id", "status");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_expires_at_idx" ON "checkout_sessions"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessions_customer_id_idempotency_key_key" ON "checkout_sessions"("customer_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "checkout_lines_sku_id_idx" ON "checkout_lines"("sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_lines_checkout_session_id_cart_line_id_key" ON "checkout_lines"("checkout_session_id", "cart_line_id");

-- CreateIndex
CREATE INDEX "inventory_reservations_checkout_session_id_status_idx" ON "inventory_reservations"("checkout_session_id", "status");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_expires_at_idx" ON "inventory_reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "inventory_reservations_sku_id_status_idx" ON "inventory_reservations"("sku_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservations_checkout_line_id_sku_id_key" ON "inventory_reservations"("checkout_line_id", "sku_id");

-- CreateIndex
CREATE INDEX "payment_attempts_checkout_session_id_created_at_idx" ON "payment_attempts"("checkout_session_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_attempts_status_updated_at_idx" ON "payment_attempts"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_checkout_session_id_idempotency_key_key" ON "payment_attempts"("checkout_session_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_provider_reference_key" ON "payment_attempts"("provider", "provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_provider_transaction_id_key" ON "payment_attempts"("provider", "provider_transaction_id");

-- CreateIndex
CREATE INDEX "payment_callback_receipts_payment_attempt_id_received_at_idx" ON "payment_callback_receipts"("payment_attempt_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_callback_receipts_provider_provider_transaction_id_key" ON "payment_callback_receipts"("provider", "provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_session_id_key" ON "orders"("checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_attempt_id_key" ON "orders"("payment_attempt_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_fulfillment_status_created_at_idx" ON "orders"("fulfillment_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_provider_provider_transaction_id_key" ON "orders"("payment_provider", "provider_transaction_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_created_at_idx" ON "order_items"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_items_sku_id_idx" ON "order_items"("sku_id");

-- CreateIndex
CREATE INDEX "payment_reconciliations_status_created_at_idx" ON "payment_reconciliations"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_reconciliations_provider_provider_transaction_id_key" ON "payment_reconciliations"("provider", "provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "database_jobs_idempotency_key_key" ON "database_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "database_jobs_status_run_at_idx" ON "database_jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "database_jobs_lease_expires_at_idx" ON "database_jobs"("lease_expires_at");

-- CreateIndex
CREATE INDEX "inventory_movements_reservation_id_idx" ON "inventory_movements"("reservation_id");

-- CreateIndex
CREATE INDEX "inventory_movements_order_id_idx" ON "inventory_movements"("order_id");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_method_versions" ADD CONSTRAINT "shipping_method_versions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "shipping_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_shipping_settings_version_fkey" FOREIGN KEY ("shipping_settings_version") REFERENCES "shipping_policy_versions"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_lines" ADD CONSTRAINT "checkout_lines_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_checkout_line_id_fkey" FOREIGN KEY ("checkout_line_id") REFERENCES "checkout_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_callback_receipts" ADD CONSTRAINT "payment_callback_receipts_payment_attempt_id_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_callback_receipts" ADD CONSTRAINT "payment_callback_receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_attempt_id_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliations" ADD CONSTRAINT "payment_reconciliations_payment_attempt_id_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
