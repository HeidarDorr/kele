-- Command receipts are replay-guard facts. Application code never updates
-- them; enforce that invariant in PostgreSQL as well.

CREATE TRIGGER "command_receipts_immutable"
BEFORE UPDATE ON "command_receipts"
FOR EACH ROW EXECUTE FUNCTION "reject_m6_fact_update"();
