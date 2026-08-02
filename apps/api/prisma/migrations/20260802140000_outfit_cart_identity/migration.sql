-- Outfit lines are identical only when cart, immutable revision and selected Outfit size match.
CREATE UNIQUE INDEX "cart_lines_one_outfit_revision_size_per_cart"
  ON "cart_lines" ("cart_id", "outfit_revision_id", "outfit_size")
  WHERE "kind" = 'OUTFIT';
