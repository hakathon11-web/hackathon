-- Add or update max_booking_days_in_advance column to venues table
-- This handles both scenarios: column doesn't exist OR column exists with NULL default

DO $$ 
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venues' 
    AND column_name = 'max_booking_days_in_advance'
  ) THEN
    -- Column doesn't exist, create it with default 30
    ALTER TABLE "public"."venues" 
    ADD COLUMN "max_booking_days_in_advance" integer DEFAULT 30;
  ELSE
    -- Column exists, just update the default
    ALTER TABLE "public"."venues" 
    ALTER COLUMN "max_booking_days_in_advance" SET DEFAULT 30;
  END IF;
END $$;

-- Update all existing venues to have the 30-day limit (works regardless of above)
UPDATE "public"."venues" 
SET "max_booking_days_in_advance" = 30 
WHERE "max_booking_days_in_advance" IS NULL;

-- Add/update comment for documentation
COMMENT ON COLUMN "public"."venues"."max_booking_days_in_advance" IS 'Maximum number of days in advance that customers can make bookings. Default is 30 days. Venue owners can adjust this value.';

