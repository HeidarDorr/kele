-- Manual rollback: drop media_assets_color_hex_check, then drop color_hex.
-- The column is optional metadata, so rollback does not affect product ownership or pricing facts.
ALTER TABLE "media_assets"
ADD COLUMN "color_hex" VARCHAR(7);

ALTER TABLE "media_assets"
ADD CONSTRAINT "media_assets_color_hex_check"
CHECK ("color_hex" IS NULL OR "color_hex" ~ '^#[0-9A-Fa-f]{6}$');
