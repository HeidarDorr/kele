-- PriceRecord rows are immutable ledger facts. CurrentSkuPrice is the sole
-- current-price projection, so multiple historical facts may retain a NULL
-- valid_to without being interpreted as simultaneously current.
DROP INDEX IF EXISTS "price_records_one_active_per_sku_idx";
