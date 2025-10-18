-- Migration to centralize service images management
-- This migration adds a service_images table and updates the services table to support centralized image management

-- Create service_images table for centralized image management
CREATE TABLE IF NOT EXISTS "public"."service_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "service_id" uuid NOT NULL,
    "image_url" text NOT NULL,
    "alt_text" text,
    "sort_order" integer NOT NULL DEFAULT 0,
    "is_primary" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Add primary key
ALTER TABLE "public"."service_images" ADD CONSTRAINT "service_images_pkey" PRIMARY KEY ("id");

-- Foreign key constraint will be added after services table is created
-- This is handled in the main schema migration

-- Enable RLS
ALTER TABLE "public"."service_images" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_images
-- Allow public read access to service images
CREATE POLICY "Allow public read access to service images" ON "public"."service_images"
FOR SELECT TO public
USING (true);

-- Allow authenticated users to manage service images (for admin use)
CREATE POLICY "Allow authenticated users to manage service images" ON "public"."service_images"
FOR ALL TO authenticated
USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "service_images_service_id_idx" ON "public"."service_images" ("service_id");
CREATE INDEX IF NOT EXISTS "service_images_sort_order_idx" ON "public"."service_images" ("sort_order");
CREATE INDEX IF NOT EXISTS "service_images_is_primary_idx" ON "public"."service_images" ("is_primary");

-- Add comments
COMMENT ON TABLE "public"."service_images" IS 'Centralized service images managed by admins';
COMMENT ON COLUMN "public"."service_images"."service_id" IS 'Reference to the service this image belongs to';
COMMENT ON COLUMN "public"."service_images"."image_url" IS 'URL of the service image';
COMMENT ON COLUMN "public"."service_images"."alt_text" IS 'Alternative text for accessibility';
COMMENT ON COLUMN "public"."service_images"."sort_order" IS 'Order in which images should be displayed';
COMMENT ON COLUMN "public"."service_images"."is_primary" IS 'Whether this is the primary image for the service';

-- Create a function to ensure only one primary image per service
CREATE OR REPLACE FUNCTION ensure_single_primary_service_image()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_primary to true, set all other images for this service to false
    IF NEW.is_primary = true THEN
        UPDATE "public"."service_images" 
        SET is_primary = false 
        WHERE service_id = NEW.service_id AND id != NEW.id;
    END IF;
    
    -- If this is the first image for a service, make it primary
    IF NOT EXISTS (
        SELECT 1 FROM "public"."service_images" 
        WHERE service_id = NEW.service_id AND id != NEW.id
    ) THEN
        NEW.is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure single primary image
CREATE TRIGGER ensure_single_primary_service_image_trigger
    BEFORE INSERT OR UPDATE ON "public"."service_images"
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_service_image();

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_service_images_updated_at_trigger
    BEFORE UPDATE ON "public"."service_images"
    FOR EACH ROW
    EXECUTE FUNCTION update_service_images_updated_at();
