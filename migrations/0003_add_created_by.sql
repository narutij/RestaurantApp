ALTER TABLE "menus" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "table_layouts" ADD COLUMN IF NOT EXISTS "created_by" text;
