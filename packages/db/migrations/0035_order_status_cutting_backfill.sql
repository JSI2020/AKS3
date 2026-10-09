-- Backfill IN_PRODUCTION → CUTTING cannot run in the same Postgres transaction
-- as ALTER TYPE ... ADD VALUE 'CUTTING' (0015). drizzle-kit applies pending
-- migrations in one transaction, so a literal UPDATE here fails with:
--   unsafe use of new value "CUTTING" of enum type order_status
--
-- Fresh installs have no IN_PRODUCTION rows. Existing DBs that still need the
-- backfill can run once after migrate (separate session/commit):
--   UPDATE "orders" SET "status" = 'CUTTING' WHERE "status" = 'IN_PRODUCTION';
SELECT 1;
