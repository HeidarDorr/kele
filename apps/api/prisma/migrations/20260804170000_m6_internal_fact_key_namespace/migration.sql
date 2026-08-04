-- Sensitive M6 commands keep client Idempotency-Key values at 120 characters
-- maximum. Internally derived append-only fact keys use a deterministic
-- 133-character namespace so they cannot collide with client-provided keys.
-- The Prisma model already declares this historical-fact column as VARCHAR(160).

ALTER TABLE "inventory_movements"
  ALTER COLUMN "idempotency_key" TYPE VARCHAR(160);
