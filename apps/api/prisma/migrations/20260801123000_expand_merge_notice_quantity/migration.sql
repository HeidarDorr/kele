ALTER TABLE "cart_notices"
  DROP CONSTRAINT "cart_notices_requested_quantity_check",
  DROP CONSTRAINT "cart_notices_applied_quantity_check";

ALTER TABLE "cart_notices"
  ADD CONSTRAINT "cart_notices_requested_quantity_check"
  CHECK ("requested_quantity" IS NULL OR "requested_quantity" > 0),
  ADD CONSTRAINT "cart_notices_applied_quantity_check"
  CHECK ("applied_quantity" IS NULL OR "applied_quantity" > 0);
