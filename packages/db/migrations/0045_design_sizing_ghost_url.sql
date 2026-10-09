-- Per-design ghost-mannequin image for the storefront size guide (written by
-- the design editor's size recognition). The column was added to the schema
-- without a migration, so fresh databases lacked it and every query selecting
-- designs failed. Idempotent: databases patched by hand keep their data.
ALTER TABLE "designs" ADD COLUMN IF NOT EXISTS "sizing_ghost_url" text;
