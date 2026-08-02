-- CreateEnum
CREATE TYPE "outfit_revision_state" AS ENUM ('DRAFT', 'PUBLISHED', 'HISTORICAL');

-- AlterTable
ALTER TABLE "cart_lines" ADD COLUMN     "outfit_revision_number" INTEGER;

-- AlterTable
ALTER TABLE "checkout_lines" ADD COLUMN     "outfit_revision_number" INTEGER;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "outfit_revision_number" INTEGER;

-- CreateTable
CREATE TABLE "outfits" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_categories" (
    "outfit_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_categories_pkey" PRIMARY KEY ("outfit_id","category_id")
);

-- CreateTable
CREATE TABLE "outfit_revisions" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "state" "outfit_revision_state" NOT NULL DEFAULT 'DRAFT',
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "seo_title" VARCHAR(180),
    "seo_description" VARCHAR(320),
    "version" INTEGER NOT NULL DEFAULT 1,
    "source_revision_id" UUID,
    "published_at" TIMESTAMPTZ(6),
    "superseded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outfit_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_items" (
    "id" UUID NOT NULL,
    "outfit_revision_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "default_color_variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_sizes" (
    "id" UUID NOT NULL,
    "outfit_revision_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "outfit_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_size_components" (
    "id" UUID NOT NULL,
    "outfit_size_id" UUID NOT NULL,
    "outfit_item_id" UUID NOT NULL,
    "sku_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "outfit_size_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_revision_media" (
    "outfit_revision_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "outfit_revision_media_pkey" PRIMARY KEY ("outfit_revision_id","media_asset_id")
);

-- CreateTable
CREATE TABLE "checkout_outfit_components" (
    "id" UUID NOT NULL,
    "checkout_line_id" UUID NOT NULL,
    "outfit_item_id_snapshot" UUID NOT NULL,
    "sku_id_snapshot" UUID NOT NULL,
    "sku_code_snapshot" VARCHAR(64) NOT NULL,
    "product_name_snapshot" VARCHAR(180) NOT NULL,
    "color_name_snapshot" VARCHAR(100) NOT NULL,
    "size_label_snapshot" VARCHAR(40) NOT NULL,
    "quantity_per_outfit" INTEGER NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "checkout_outfit_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_outfit_components" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "outfit_item_id_snapshot" UUID NOT NULL,
    "sku_id_snapshot" UUID NOT NULL,
    "sku_code_snapshot" VARCHAR(64) NOT NULL,
    "product_name_snapshot" VARCHAR(180) NOT NULL,
    "color_name_snapshot" VARCHAR(100) NOT NULL,
    "size_label_snapshot" VARCHAR(40) NOT NULL,
    "quantity_per_outfit" INTEGER NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "order_outfit_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outfits_slug_key" ON "outfits"("slug");

-- CreateIndex
CREATE INDEX "outfits_status_created_at_idx" ON "outfits"("status", "created_at");

-- CreateIndex
CREATE INDEX "outfits_status_slug_idx" ON "outfits"("status", "slug");

-- CreateIndex
CREATE INDEX "outfit_categories_category_id_outfit_id_idx" ON "outfit_categories"("category_id", "outfit_id");

-- CreateIndex
CREATE INDEX "outfit_revisions_outfit_id_state_revision_number_idx" ON "outfit_revisions"("outfit_id", "state", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_revisions_outfit_id_revision_number_key" ON "outfit_revisions"("outfit_id", "revision_number");

-- CreateIndex
CREATE INDEX "outfit_items_product_id_idx" ON "outfit_items"("product_id");

-- CreateIndex
CREATE INDEX "outfit_items_default_color_variant_id_idx" ON "outfit_items"("default_color_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_items_outfit_revision_id_display_order_key" ON "outfit_items"("outfit_revision_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_sizes_outfit_revision_id_code_key" ON "outfit_sizes"("outfit_revision_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_sizes_outfit_revision_id_display_order_key" ON "outfit_sizes"("outfit_revision_id", "display_order");

-- CreateIndex
CREATE INDEX "outfit_size_components_sku_id_idx" ON "outfit_size_components"("sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_size_components_outfit_size_id_outfit_item_id_key" ON "outfit_size_components"("outfit_size_id", "outfit_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_size_components_outfit_size_id_display_order_key" ON "outfit_size_components"("outfit_size_id", "display_order");

-- CreateIndex
CREATE INDEX "outfit_revision_media_media_asset_id_idx" ON "outfit_revision_media"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_revision_media_outfit_revision_id_display_order_key" ON "outfit_revision_media"("outfit_revision_id", "display_order");

-- CreateIndex
CREATE INDEX "checkout_outfit_components_sku_id_snapshot_idx" ON "checkout_outfit_components"("sku_id_snapshot");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_outfit_components_checkout_line_id_outfit_item_id__key" ON "checkout_outfit_components"("checkout_line_id", "outfit_item_id_snapshot");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_outfit_components_checkout_line_id_display_order_key" ON "checkout_outfit_components"("checkout_line_id", "display_order");

-- CreateIndex
CREATE INDEX "order_outfit_components_sku_id_snapshot_idx" ON "order_outfit_components"("sku_id_snapshot");

-- CreateIndex
CREATE UNIQUE INDEX "order_outfit_components_order_item_id_outfit_item_id_snapsh_key" ON "order_outfit_components"("order_item_id", "outfit_item_id_snapshot");

-- CreateIndex
CREATE UNIQUE INDEX "order_outfit_components_order_item_id_display_order_key" ON "order_outfit_components"("order_item_id", "display_order");

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_outfit_revision_id_fkey" FOREIGN KEY ("outfit_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_categories" ADD CONSTRAINT "outfit_categories_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_categories" ADD CONSTRAINT "outfit_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_revisions" ADD CONSTRAINT "outfit_revisions_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_revisions" ADD CONSTRAINT "outfit_revisions_source_revision_id_fkey" FOREIGN KEY ("source_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_revision_id_fkey" FOREIGN KEY ("outfit_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_default_color_variant_id_fkey" FOREIGN KEY ("default_color_variant_id") REFERENCES "color_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_sizes" ADD CONSTRAINT "outfit_sizes_outfit_revision_id_fkey" FOREIGN KEY ("outfit_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_size_components" ADD CONSTRAINT "outfit_size_components_outfit_size_id_fkey" FOREIGN KEY ("outfit_size_id") REFERENCES "outfit_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_size_components" ADD CONSTRAINT "outfit_size_components_outfit_item_id_fkey" FOREIGN KEY ("outfit_item_id") REFERENCES "outfit_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_size_components" ADD CONSTRAINT "outfit_size_components_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_revision_media" ADD CONSTRAINT "outfit_revision_media_outfit_revision_id_fkey" FOREIGN KEY ("outfit_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_revision_media" ADD CONSTRAINT "outfit_revision_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_lines" ADD CONSTRAINT "checkout_lines_outfit_revision_id_fkey" FOREIGN KEY ("outfit_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_outfit_components" ADD CONSTRAINT "checkout_outfit_components_checkout_line_id_fkey" FOREIGN KEY ("checkout_line_id") REFERENCES "checkout_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_outfit_revision_id_fkey" FOREIGN KEY ("outfit_revision_id") REFERENCES "outfit_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_outfit_components" ADD CONSTRAINT "order_outfit_components_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One mutable draft and one current purchasable publication may exist per Outfit.
CREATE UNIQUE INDEX "outfit_revisions_one_draft_per_outfit"
ON "outfit_revisions" ("outfit_id")
WHERE "state" = 'DRAFT';

CREATE UNIQUE INDEX "outfit_revisions_one_published_per_outfit"
ON "outfit_revisions" ("outfit_id")
WHERE "state" = 'PUBLISHED';

CREATE UNIQUE INDEX "outfit_revision_media_one_featured"
ON "outfit_revision_media" ("outfit_revision_id")
WHERE "featured" = true;

ALTER TABLE "outfits"
  ADD CONSTRAINT "outfits_version_positive" CHECK ("version" > 0);

ALTER TABLE "outfit_revisions"
  ADD CONSTRAINT "outfit_revisions_number_version_positive"
    CHECK ("revision_number" > 0 AND "version" > 0),
  ADD CONSTRAINT "outfit_revisions_source_not_self"
    CHECK ("source_revision_id" IS NULL OR "source_revision_id" <> "id"),
  ADD CONSTRAINT "outfit_revisions_state_timestamps"
    CHECK (
      ("state" = 'DRAFT' AND "published_at" IS NULL AND "superseded_at" IS NULL)
      OR ("state" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "superseded_at" IS NULL)
      OR ("state" = 'HISTORICAL' AND "published_at" IS NOT NULL AND "superseded_at" IS NOT NULL)
    );

ALTER TABLE "outfit_items"
  ADD CONSTRAINT "outfit_items_quantity_positive" CHECK ("quantity" BETWEEN 1 AND 20),
  ADD CONSTRAINT "outfit_items_display_order_nonnegative" CHECK ("display_order" >= 0);

ALTER TABLE "outfit_sizes"
  ADD CONSTRAINT "outfit_sizes_price_positive" CHECK ("amount_rial" > 0),
  ADD CONSTRAINT "outfit_sizes_display_order_nonnegative" CHECK ("display_order" >= 0);

ALTER TABLE "outfit_size_components"
  ADD CONSTRAINT "outfit_size_components_quantity_positive" CHECK ("quantity" BETWEEN 1 AND 20),
  ADD CONSTRAINT "outfit_size_components_display_order_nonnegative" CHECK ("display_order" >= 0);

ALTER TABLE "outfit_revision_media"
  ADD CONSTRAINT "outfit_revision_media_display_order_nonnegative" CHECK ("display_order" >= 0);

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_outfit_revision_number_shape"
  CHECK (
    ("kind" = 'PRODUCT' AND "outfit_revision_number" IS NULL)
    OR ("kind" = 'OUTFIT' AND "outfit_revision_number" > 0)
  );

ALTER TABLE "checkout_lines"
  ADD CONSTRAINT "checkout_lines_outfit_revision_number_shape"
  CHECK (
    ("kind" = 'PRODUCT' AND "outfit_revision_number" IS NULL)
    OR ("kind" = 'OUTFIT' AND "outfit_revision_number" > 0)
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_outfit_revision_number_shape"
  CHECK (
    ("kind" = 'PRODUCT' AND "outfit_revision_number" IS NULL)
    OR ("kind" = 'OUTFIT' AND "outfit_revision_number" > 0)
  );

ALTER TABLE "checkout_outfit_components"
  ADD CONSTRAINT "checkout_outfit_components_quantities_positive"
    CHECK ("quantity_per_outfit" > 0 AND "total_quantity" > 0),
  ADD CONSTRAINT "checkout_outfit_components_display_order_nonnegative" CHECK ("display_order" >= 0);

ALTER TABLE "order_outfit_components"
  ADD CONSTRAINT "order_outfit_components_quantities_positive"
    CHECK ("quantity_per_outfit" > 0 AND "total_quantity" > 0),
  ADD CONSTRAINT "order_outfit_components_display_order_nonnegative" CHECK ("display_order" >= 0);

-- Published composition facts are immutable even if a future application bug
-- attempts a direct child-table write. The sole allowed published-row update is
-- the lifecycle-only transition from current PUBLISHED to HISTORICAL.
CREATE FUNCTION "guard_outfit_revision_immutable"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."state" <> 'DRAFT' THEN
    RAISE EXCEPTION 'published Outfit revisions are immutable' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."state" <> 'DRAFT' THEN
    IF NOT (
      OLD."state" = 'PUBLISHED'
      AND NEW."state" = 'HISTORICAL'
      AND NEW."superseded_at" IS NOT NULL
      AND NEW."outfit_id" IS NOT DISTINCT FROM OLD."outfit_id"
      AND NEW."revision_number" IS NOT DISTINCT FROM OLD."revision_number"
      AND NEW."name" IS NOT DISTINCT FROM OLD."name"
      AND NEW."description" IS NOT DISTINCT FROM OLD."description"
      AND NEW."seo_title" IS NOT DISTINCT FROM OLD."seo_title"
      AND NEW."seo_description" IS NOT DISTINCT FROM OLD."seo_description"
      AND NEW."version" IS NOT DISTINCT FROM OLD."version"
      AND NEW."source_revision_id" IS NOT DISTINCT FROM OLD."source_revision_id"
      AND NEW."published_at" IS NOT DISTINCT FROM OLD."published_at"
    ) THEN
      RAISE EXCEPTION 'published Outfit revisions are immutable' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "outfit_revisions_immutable"
BEFORE UPDATE OR DELETE ON "outfit_revisions"
FOR EACH ROW EXECUTE FUNCTION "guard_outfit_revision_immutable"();

CREATE FUNCTION "guard_outfit_revision_child_mutable"() RETURNS trigger AS $$
DECLARE
  revision_id UUID;
  revision_state "outfit_revision_state";
BEGIN
  IF TG_TABLE_NAME = 'outfit_items' THEN
    revision_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."outfit_revision_id" ELSE NEW."outfit_revision_id" END;
  ELSIF TG_TABLE_NAME = 'outfit_sizes' THEN
    revision_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."outfit_revision_id" ELSE NEW."outfit_revision_id" END;
  ELSIF TG_TABLE_NAME = 'outfit_revision_media' THEN
    revision_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."outfit_revision_id" ELSE NEW."outfit_revision_id" END;
  ELSE
    SELECT os."outfit_revision_id" INTO revision_id
    FROM "outfit_sizes" os
    WHERE os."id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."outfit_size_id" ELSE NEW."outfit_size_id" END;
  END IF;

  SELECT r."state" INTO revision_state FROM "outfit_revisions" r WHERE r."id" = revision_id;
  IF revision_state IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'published Outfit revision children are immutable' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "outfit_items_mutable_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "outfit_items"
FOR EACH ROW EXECUTE FUNCTION "guard_outfit_revision_child_mutable"();

CREATE TRIGGER "outfit_sizes_mutable_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "outfit_sizes"
FOR EACH ROW EXECUTE FUNCTION "guard_outfit_revision_child_mutable"();

CREATE TRIGGER "outfit_size_components_mutable_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "outfit_size_components"
FOR EACH ROW EXECUTE FUNCTION "guard_outfit_revision_child_mutable"();

CREATE TRIGGER "outfit_revision_media_mutable_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "outfit_revision_media"
FOR EACH ROW EXECUTE FUNCTION "guard_outfit_revision_child_mutable"();
