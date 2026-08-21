-- OTF-008: an Outfit Cart line is always the complete immutable revision-size
-- composition. Refuse to discard non-canonical development data silently.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "cart_lines"
    WHERE "kind" = 'OUTFIT'
      AND (
        cardinality("outfit_excluded_item_ids") > 0
        OR "outfit_selection_key" IS DISTINCT FROM 'full'
      )
  ) THEN
    RAISE EXCEPTION 'Cannot restore canonical Outfit identity while customized Outfit Cart lines exist';
  END IF;
END
$$;

DROP INDEX "cart_lines_one_outfit_selection_per_cart";

ALTER TABLE "cart_lines"
  DROP CONSTRAINT "cart_lines_outfit_selection_shape";

ALTER TABLE "cart_lines"
  DROP COLUMN "outfit_excluded_item_ids",
  DROP COLUMN "outfit_selection_key";

CREATE UNIQUE INDEX "cart_lines_one_outfit_revision_size_per_cart"
  ON "cart_lines" ("cart_id", "outfit_revision_id", "outfit_size")
  WHERE "kind" = 'OUTFIT';
