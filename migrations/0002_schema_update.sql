-- Migration: Add new tables and columns for restaurant app refactor

-- Add missing columns to restaurants table
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "image_url" text;

-- Add description to table_layouts
ALTER TABLE "table_layouts" ADD COLUMN IF NOT EXISTS "description" text;

-- Remove unused columns from table_layouts (keeping for now, just adding new)
-- ALTER TABLE "table_layouts" DROP COLUMN IF EXISTS "layout_id";
-- ALTER TABLE "table_layouts" DROP COLUMN IF EXISTS "is_active";
-- ALTER TABLE "table_layouts" DROP COLUMN IF EXISTS "activated_at";

-- Add new columns to tables
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "people_count" integer DEFAULT 0;

-- Add new columns to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "special_item_name" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_special_item" boolean DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "workday_id" integer;

-- Make menu_item_id nullable for special items
ALTER TABLE "orders" ALTER COLUMN "menu_item_id" DROP NOT NULL;

-- Add worker_id to user_profiles
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "worker_id" text;

-- Create workdays table
CREATE TABLE IF NOT EXISTS "workdays" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL,
  "date" text NOT NULL,
  "menu_id" integer,
  "table_layout_id" integer,
  "started_at" timestamp,
  "ended_at" timestamp,
  "is_active" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create workday_workers table
CREATE TABLE IF NOT EXISTS "workday_workers" (
  "id" serial PRIMARY KEY NOT NULL,
  "workday_id" integer NOT NULL,
  "worker_id" text NOT NULL,
  "joined_at" timestamp DEFAULT now()
);

-- Create restaurant_workers table
CREATE TABLE IF NOT EXISTS "restaurant_workers" (
  "id" serial PRIMARY KEY NOT NULL,
  "restaurant_id" integer NOT NULL,
  "worker_id" text NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "role" text NOT NULL DEFAULT 'worker',
  "permissions" jsonb DEFAULT '{}',
  "status" text NOT NULL DEFAULT 'pending',
  "avatar_url" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add is_important column to reminders table
ALTER TABLE "reminders" ADD COLUMN IF NOT EXISTS "is_important" boolean DEFAULT false;
