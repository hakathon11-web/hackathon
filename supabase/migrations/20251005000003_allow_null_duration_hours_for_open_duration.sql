-- Allow NULL duration_hours for open duration events
-- This migration removes the NOT NULL constraint on duration_hours 
-- and updates the check constraint to properly handle NULL values

-- First, remove the NOT NULL constraint from duration_hours
ALTER TABLE "public"."booking_services" 
ALTER COLUMN "duration_hours" DROP NOT NULL;

-- Fix existing data inconsistencies before applying new constraint
-- For rows where duration_hours = 0, set both duration_hours and departure_datetime to NULL (open duration events)
UPDATE "public"."booking_services" 
SET duration_hours = NULL, departure_datetime = NULL
WHERE duration_hours = 0;

-- For rows where duration_hours > 0 but departure_datetime is NULL, calculate departure_datetime
UPDATE "public"."booking_services" 
SET departure_datetime = arrival_datetime + INTERVAL '1 hour' * duration_hours
WHERE duration_hours > 0 AND departure_datetime IS NULL;

-- Drop the existing constraint that expects 0 for open duration events
ALTER TABLE "public"."booking_services" 
DROP CONSTRAINT IF EXISTS "booking_services_departure_datetime_check";

-- Add a new constraint that properly handles NULL values for both fields
ALTER TABLE "public"."booking_services" 
ADD CONSTRAINT "booking_services_open_duration_check" 
CHECK (
  -- For open duration events: both duration_hours and departure_datetime should be NULL
  (duration_hours IS NULL AND departure_datetime IS NULL) OR 
  -- For fixed duration events: both duration_hours and departure_datetime should be NOT NULL
  (duration_hours IS NOT NULL AND departure_datetime IS NOT NULL AND duration_hours > 0)
);

-- Update the comment to reflect the new behavior
COMMENT ON COLUMN "public"."booking_services"."duration_hours" IS 'Duration in hours for fixed duration events. NULL for open duration events that have no predetermined end time.';

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT "booking_services_open_duration_check" ON "public"."booking_services" 
IS 'Ensures duration_hours and departure_datetime are both NULL for open duration events and both NOT NULL for fixed duration events';
