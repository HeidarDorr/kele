-- Provider event identity defines an exact callback replay. One provider
-- transaction can legitimately publish multiple events such as pending then
-- success, while PaymentAttempt and Order still enforce transaction identity.
ALTER TABLE "payment_callback_receipts"
  ADD COLUMN "provider_event_id" VARCHAR(120) NOT NULL;

DROP INDEX "payment_callback_receipts_provider_provider_transaction_id_key";

CREATE INDEX "payment_callback_receipts_provider_provider_transaction_id_idx"
  ON "payment_callback_receipts"("provider", "provider_transaction_id");

CREATE UNIQUE INDEX "payment_callback_receipts_provider_provider_event_id_key"
  ON "payment_callback_receipts"("provider", "provider_event_id");

-- One Cart can own at most one live commercial checkout. Terminal sessions
-- remain as immutable history and do not prevent a later checkout.
CREATE UNIQUE INDEX "checkout_sessions_one_open_per_cart_key"
  ON "checkout_sessions"("cart_id")
  WHERE "status" IN ('ACTIVE', 'PAYMENT_PENDING');
