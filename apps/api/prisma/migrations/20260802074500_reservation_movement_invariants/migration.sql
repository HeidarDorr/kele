-- Reservation holds and releases change reserved quantity without changing the
-- physical stock ledger. Other inventory actions must continue to carry a
-- non-zero physical delta that exactly matches the before/after quantities.
ALTER TABLE "inventory_movements"
  DROP CONSTRAINT "inventory_movements_delta_check";

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_delta_check"
  CHECK (
    (
      "action" = 'RESERVATION'
      AND "quantity_delta" = 0
      AND "after_physical_quantity" = "before_physical_quantity"
      AND "after_reserved_quantity" > "before_reserved_quantity"
    )
    OR
    (
      "action" = 'RESERVATION_RELEASE'
      AND "quantity_delta" = 0
      AND "after_physical_quantity" = "before_physical_quantity"
      AND "after_reserved_quantity" < "before_reserved_quantity"
    )
    OR
    (
      "action" NOT IN ('RESERVATION', 'RESERVATION_RELEASE')
      AND "quantity_delta" <> 0
      AND "after_physical_quantity" - "before_physical_quantity" = "quantity_delta"
    )
  );

-- A reconciliation case is still a live commercial claim on the Cart until
-- its hold expires or an operator resolves it, so it participates in the same
-- one-open-checkout invariant.
DROP INDEX "checkout_sessions_one_open_per_cart_key";

CREATE UNIQUE INDEX "checkout_sessions_one_open_per_cart_key"
  ON "checkout_sessions"("cart_id")
  WHERE "status" IN ('ACTIVE', 'PAYMENT_PENDING', 'RECONCILIATION');
