-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "media_format" AS ENUM ('JPG', 'PNG', 'WEBP');

-- CreateEnum
CREATE TYPE "media_group" AS ENUM ('PRODUCT_IMAGES', 'OUTFIT_EDITORIAL', 'HOMEPAGE', 'JOURNAL', 'SHARED_ASSETS');

-- CreateEnum
CREATE TYPE "inventory_action" AS ENUM ('PRODUCTION', 'SALE', 'CUSTOMER_RETURN', 'MANUAL_CORRECTION', 'DAMAGED_GOODS', 'INSTAGRAM_SALE');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "seo_title" VARCHAR(180),
    "seo_description" VARCHAR(320),
    "search_text" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

-- CreateTable
CREATE TABLE "color_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "normalized_color_code" VARCHAR(40) NOT NULL,
    "display_hex" VARCHAR(7),
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "color_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "alt_text" VARCHAR(500) NOT NULL,
    "focal_point_x" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focal_point_y" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "format" "media_format" NOT NULL,
    "group" "media_group" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assignments" (
    "color_variant_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "media_assignments_pkey" PRIMARY KEY ("color_variant_id","media_asset_id")
);

-- CreateTable
CREATE TABLE "skus" (
    "id" UUID NOT NULL,
    "color_variant_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "normalized_size" VARCHAR(40) NOT NULL,
    "display_size" VARCHAR(40) NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_records" (
    "id" UUID NOT NULL,
    "sku_id" UUID NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ(6),
    "actor_id" VARCHAR(120) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,

    CONSTRAINT "price_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_sku_prices" (
    "sku_id" UUID NOT NULL,
    "price_record_id" UUID NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "current_sku_prices_pkey" PRIMARY KEY ("sku_id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "sku_id" UUID NOT NULL,
    "physical_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("sku_id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "sku_id" UUID NOT NULL,
    "action" "inventory_action" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "before_physical_quantity" INTEGER NOT NULL,
    "after_physical_quantity" INTEGER NOT NULL,
    "before_reserved_quantity" INTEGER NOT NULL,
    "after_reserved_quantity" INTEGER NOT NULL,
    "actor_id" VARCHAR(120) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_events" (
    "id" UUID NOT NULL,
    "type" VARCHAR(120) NOT NULL,
    "actor_id" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(120) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_receipts" (
    "idempotency_key" VARCHAR(120) NOT NULL,
    "command_type" VARCHAR(120) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_receipts_pkey" PRIMARY KEY ("idempotency_key")
);

-- Catalog and ledger invariants are also enforced at the transactional source
-- of truth so application retries or future integrations cannot bypass them.
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_dimensions_check"
  CHECK ("width" > 0 AND "height" > 0),
  ADD CONSTRAINT "media_assets_focal_point_check"
  CHECK (
    "focal_point_x" BETWEEN 0 AND 1
    AND "focal_point_y" BETWEEN 0 AND 1
  );

ALTER TABLE "price_records"
  ADD CONSTRAINT "price_records_amount_rial_check"
  CHECK ("amount_rial" > 0),
  ADD CONSTRAINT "price_records_validity_check"
  CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from");

ALTER TABLE "current_sku_prices"
  ADD CONSTRAINT "current_sku_prices_amount_rial_check"
  CHECK ("amount_rial" > 0);

ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_quantities_check"
  CHECK (
    "physical_quantity" >= 0
    AND "reserved_quantity" >= 0
    AND "reserved_quantity" <= "physical_quantity"
  );

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_delta_check"
  CHECK ("quantity_delta" <> 0),
  ADD CONSTRAINT "inventory_movements_quantities_check"
  CHECK (
    "before_physical_quantity" >= 0
    AND "after_physical_quantity" >= 0
    AND "before_reserved_quantity" >= 0
    AND "after_reserved_quantity" >= 0
    AND "before_reserved_quantity" <= "before_physical_quantity"
    AND "after_reserved_quantity" <= "after_physical_quantity"
  );

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_status_display_order_idx" ON "categories"("status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_status_created_at_idx" ON "products"("status", "created_at");

-- CreateIndex
CREATE INDEX "products_status_slug_idx" ON "products"("status", "slug");

-- CAT-006: the application stores Persian-normalized text and PostgreSQL owns
-- tokenization, ranking, and indexed retrieval for version 1 search.
CREATE INDEX "products_search_text_fts_idx"
  ON "products"
  USING GIN (to_tsvector('simple', "search_text"));

-- CreateIndex
CREATE INDEX "product_categories_category_id_product_id_idx" ON "product_categories"("category_id", "product_id");

-- CreateIndex
CREATE INDEX "color_variants_product_id_status_display_order_idx" ON "color_variants"("product_id", "status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "color_variants_product_id_normalized_color_code_key" ON "color_variants"("product_id", "normalized_color_code");

-- CreateIndex
CREATE INDEX "media_assets_group_created_at_idx" ON "media_assets"("group", "created_at");

-- CreateIndex
CREATE INDEX "media_assignments_color_variant_id_display_order_idx" ON "media_assignments"("color_variant_id", "display_order");

CREATE UNIQUE INDEX "media_assignments_one_featured_per_variant_idx"
  ON "media_assignments"("color_variant_id")
  WHERE "featured" = true;

-- CreateIndex
CREATE UNIQUE INDEX "skus_code_key" ON "skus"("code");

-- CreateIndex
CREATE INDEX "skus_color_variant_id_status_idx" ON "skus"("color_variant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "skus_color_variant_id_normalized_size_key" ON "skus"("color_variant_id", "normalized_size");

-- CreateIndex
CREATE INDEX "price_records_sku_id_valid_from_idx" ON "price_records"("sku_id", "valid_from");

CREATE UNIQUE INDEX "price_records_one_active_per_sku_idx"
  ON "price_records"("sku_id")
  WHERE "valid_to" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "current_sku_prices_price_record_id_key" ON "current_sku_prices"("price_record_id");

-- CreateIndex
CREATE INDEX "inventory_physical_quantity_reserved_quantity_idx" ON "inventory"("physical_quantity", "reserved_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_idempotency_key_key" ON "inventory_movements"("idempotency_key");

-- CreateIndex
CREATE INDEX "inventory_movements_sku_id_created_at_idx" ON "inventory_movements"("sku_id", "created_at");

-- CreateIndex
CREATE INDEX "business_events_entity_type_entity_id_created_at_idx" ON "business_events"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "business_events_actor_id_created_at_idx" ON "business_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "command_receipts_command_type_entity_id_idx" ON "command_receipts"("command_type", "entity_id");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_variants" ADD CONSTRAINT "color_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assignments" ADD CONSTRAINT "media_assignments_color_variant_id_fkey" FOREIGN KEY ("color_variant_id") REFERENCES "color_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assignments" ADD CONSTRAINT "media_assignments_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skus" ADD CONSTRAINT "skus_color_variant_id_fkey" FOREIGN KEY ("color_variant_id") REFERENCES "color_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_records" ADD CONSTRAINT "price_records_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_sku_prices" ADD CONSTRAINT "current_sku_prices_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_sku_prices" ADD CONSTRAINT "current_sku_prices_price_record_id_fkey" FOREIGN KEY ("price_record_id") REFERENCES "price_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
