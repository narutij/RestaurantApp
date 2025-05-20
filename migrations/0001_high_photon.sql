ALTER TABLE "table_layouts" ADD COLUMN "layout_id" integer;--> statement-breakpoint
ALTER TABLE "table_layouts" ADD COLUMN "is_active" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "table_layouts" ADD COLUMN "activated_at" timestamp;