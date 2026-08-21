-- Historical migration retained for an applied development database. The
-- following migration restores the canonical, non-customizable Outfit model.
ALTER TABLE "cart_lines"
  ADD COLUMN "outfit_excluded_item_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "outfit_selection_key" VARCHAR(64);

UPDATE "cart_lines"
SET "outfit_selection_key" = 'full'
WHERE "kind" = 'OUTFIT';

ALTER TABLE "cart_lines"
  ADD CONSTRAINT "cart_lines_outfit_selection_shape"
  CHECK (
    ("kind" = 'PRODUCT' AND cardinality("outfit_excluded_item_ids") = 0 AND "outfit_selection_key" IS NULL)
    OR
    ("kind" = 'OUTFIT' AND "outfit_selection_key" IS NOT NULL)
  );

DROP INDEX "cart_lines_one_outfit_revision_size_per_cart";

CREATE UNIQUE INDEX "cart_lines_one_outfit_selection_per_cart"
  ON "cart_lines" ("cart_id", "outfit_revision_id", "outfit_size", "outfit_selection_key")
  WHERE "kind" = 'OUTFIT';
