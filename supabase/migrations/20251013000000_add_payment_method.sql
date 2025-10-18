-- Add payment_method column to bookings table
-- This allows employees to specify whether customer is paying with card or cash

-- Only add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE "public"."bookings" 
    ADD COLUMN "payment_method" text;
  END IF;
END $$;

-- Clean up any invalid payment_method values before adding constraint
UPDATE "public"."bookings" 
SET payment_method = NULL 
WHERE payment_method IS NOT NULL 
  AND payment_method NOT IN ('card', 'cash');

-- Add check constraint to ensure only valid payment methods
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_payment_method_check'
  ) THEN
    ALTER TABLE "public"."bookings" 
    ADD CONSTRAINT "bookings_payment_method_check" 
    CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['card'::text, 'cash'::text]));
  END IF;
END $$;

-- Add index for faster queries filtering by payment method
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'bookings_payment_method_idx'
  ) THEN
    CREATE INDEX "bookings_payment_method_idx" ON "public"."bookings" ("payment_method");
  END IF;
END $$;

-- Add comment to document the purpose of this field
COMMENT ON COLUMN "public"."bookings"."payment_method" IS 'Payment method selected by employee when confirming booking (card or cash)';

