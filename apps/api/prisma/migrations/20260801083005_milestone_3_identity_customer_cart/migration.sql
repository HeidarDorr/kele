-- CreateEnum
CREATE TYPE "cart_status" AS ENUM ('ACTIVE', 'MERGED');

-- CreateEnum
CREATE TYPE "cart_line_kind" AS ENUM ('PRODUCT', 'OUTFIT');

-- CreateEnum
CREATE TYPE "cart_line_status" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "cart_notice_code" AS ENUM ('QUANTITY_REDUCED_TO_INVENTORY', 'SKU_UNAVAILABLE', 'OUTFIT_REVISION_REQUIRES_REVIEW');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "first_name" VARCHAR(80),
    "last_name" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(15) NOT NULL,
    "mobile_hash" CHAR(64) NOT NULL,
    "ip_hash" CHAR(64) NOT NULL,
    "device_hash" CHAR(64) NOT NULL,
    "code_salt" CHAR(32) NOT NULL,
    "code_verifier" CHAR(128) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "csrf_hash" CHAR(64) NOT NULL,
    "idle_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "absolute_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "recipient_name" VARCHAR(160) NOT NULL,
    "recipient_mobile" VARCHAR(15) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "address_line" VARCHAR(500) NOT NULL,
    "postal_code" CHAR(10) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "status" "cart_status" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "merged_at" TIMESTAMPTZ(6),

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_lines" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "kind" "cart_line_kind" NOT NULL,
    "sku_id" UUID,
    "outfit_revision_id" UUID,
    "outfit_size" VARCHAR(40),
    "title_snapshot" VARCHAR(180) NOT NULL,
    "selection_snapshot" VARCHAR(180) NOT NULL,
    "sku_code_snapshot" VARCHAR(64),
    "image_snapshot" JSONB,
    "quantity" INTEGER NOT NULL,
    "status" "cart_line_status" NOT NULL DEFAULT 'AVAILABLE',
    "unit_price_rial" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_notices" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "code" "cart_notice_code" NOT NULL,
    "requested_quantity" INTEGER,
    "applied_quantity" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_merge_receipts" (
    "id" UUID NOT NULL,
    "guest_cart_id" UUID NOT NULL,
    "customer_cart_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_merge_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_mobile_key" ON "customers"("mobile");

-- CreateIndex
CREATE INDEX "otp_challenges_mobile_hash_created_at_idx" ON "otp_challenges"("mobile_hash", "created_at");

-- CreateIndex
CREATE INDEX "otp_challenges_ip_hash_created_at_idx" ON "otp_challenges"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "otp_challenges_device_hash_created_at_idx" ON "otp_challenges"("device_hash", "created_at");

-- CreateIndex
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_token_hash_key" ON "customer_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "customer_sessions_customer_id_revoked_at_idx" ON "customer_sessions"("customer_id", "revoked_at");

-- CreateIndex
CREATE INDEX "customer_sessions_idle_expires_at_idx" ON "customer_sessions"("idle_expires_at");

-- CreateIndex
CREATE INDEX "customer_sessions_absolute_expires_at_idx" ON "customer_sessions"("absolute_expires_at");

-- CreateIndex
CREATE INDEX "addresses_customer_id_created_at_idx" ON "addresses"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customer_id_key" ON "carts"("customer_id");

-- CreateIndex
CREATE INDEX "carts_status_updated_at_idx" ON "carts"("status", "updated_at");

-- CreateIndex
CREATE INDEX "cart_lines_cart_id_created_at_idx" ON "cart_lines"("cart_id", "created_at");

-- CreateIndex
CREATE INDEX "cart_lines_cart_id_sku_id_idx" ON "cart_lines"("cart_id", "sku_id");

-- CreateIndex
CREATE INDEX "cart_lines_outfit_revision_id_idx" ON "cart_lines"("outfit_revision_id");

-- CreateIndex
CREATE INDEX "cart_notices_cart_id_created_at_idx" ON "cart_notices"("cart_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cart_merge_receipts_guest_cart_id_key" ON "cart_merge_receipts"("guest_cart_id");

-- CreateIndex
CREATE INDEX "cart_merge_receipts_customer_cart_id_created_at_idx" ON "cart_merge_receipts"("customer_cart_id", "created_at");

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_notices" ADD CONSTRAINT "cart_notices_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_notices" ADD CONSTRAINT "cart_notices_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "cart_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A customer may designate at most one delivery address as the default.
CREATE UNIQUE INDEX "addresses_one_default_per_customer"
ON "addresses" ("customer_id")
WHERE "is_default" = true;

-- Product SKU identity is unique inside one cart. Outfit lines deliberately
-- remain separate because CRT-015 defines quantity combination for Product
-- SKUs only.
CREATE UNIQUE INDEX "cart_lines_one_product_sku_per_cart"
ON "cart_lines" ("cart_id", "sku_id")
WHERE "kind" = 'PRODUCT';

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_mobile_e164_iran_check"
  CHECK ("mobile" ~ '^\+98[0-9]{10}$');

ALTER TABLE "otp_challenges"
  ADD CONSTRAINT "otp_challenges_mobile_e164_iran_check"
  CHECK ("mobile" ~ '^\+98[0-9]{10}$'),
  ADD CONSTRAINT "otp_challenges_failed_attempts_check"
  CHECK ("failed_attempts" BETWEEN 0 AND 5),
  ADD CONSTRAINT "otp_challenges_expiry_check"
  CHECK ("expires_at" > "created_at");

ALTER TABLE "customer_sessions"
  ADD CONSTRAINT "customer_sessions_expiry_order_check"
  CHECK ("idle_expires_at" <= "absolute_expires_at" AND "absolute_expires_at" > "created_at");

ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_recipient_mobile_e164_iran_check"
  CHECK ("recipient_mobile" ~ '^\+98[0-9]{10}$'),
  ADD CONSTRAINT "addresses_postal_code_check"
  CHECK ("postal_code" ~ '^[0-9]{10}$');

ALTER TABLE "carts"
  ADD CONSTRAINT "carts_version_check"
  CHECK ("version" >= 0),
  ADD CONSTRAINT "carts_merge_state_check"
  CHECK (("status" = 'ACTIVE' AND "merged_at" IS NULL) OR ("status" = 'MERGED' AND "merged_at" IS NOT NULL));

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_quantity_check"
  CHECK ("quantity" BETWEEN 1 AND 20),
  ADD CONSTRAINT "cart_lines_price_check"
  CHECK ("unit_price_rial" >= 0),
  ADD CONSTRAINT "cart_lines_kind_reference_check"
  CHECK (
    ("kind" = 'PRODUCT' AND "sku_id" IS NOT NULL AND "outfit_revision_id" IS NULL AND "outfit_size" IS NULL)
    OR
    ("kind" = 'OUTFIT' AND "sku_id" IS NULL AND "outfit_revision_id" IS NOT NULL AND "outfit_size" IS NOT NULL)
  );

ALTER TABLE "cart_notices"
  ADD CONSTRAINT "cart_notices_requested_quantity_check"
  CHECK ("requested_quantity" IS NULL OR "requested_quantity" BETWEEN 1 AND 20),
  ADD CONSTRAINT "cart_notices_applied_quantity_check"
  CHECK ("applied_quantity" IS NULL OR "applied_quantity" BETWEEN 1 AND 20);

ALTER TABLE "cart_merge_receipts"
  ADD CONSTRAINT "cart_merge_receipts_guest_cart_id_fkey"
  FOREIGN KEY ("guest_cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cart_merge_receipts_customer_cart_id_fkey"
  FOREIGN KEY ("customer_cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cart_merge_receipts_distinct_carts_check"
  CHECK ("guest_cart_id" <> "customer_cart_id");
