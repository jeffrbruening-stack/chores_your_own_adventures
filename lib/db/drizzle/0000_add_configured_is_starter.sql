-- Add configured column to characters table
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "configured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Add is_starter column to shop_items table
ALTER TABLE "shop_items" ADD COLUMN IF NOT EXISTS "is_starter" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Mark the Traveler's Tunic as the starter item
UPDATE "shop_items" SET "is_starter" = true WHERE "name" = 'Traveler''s Tunic';
