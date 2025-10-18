-- Allow NULL departure_datetime for open duration events
-- This migration removes the NOT NULL constraint on departure_datetime 
-- to support open duration events that don't have a fixed end time

-- First, remove the NOT NULL constraint so we can set values to NULL
ALTER TABLE "public"."booking_services" 
ALTER COLUMN "departure_datetime" DROP NOT NULL;

-- Now fix existing data inconsistencies
-- For any rows where duration_hours = 0, set departure_datetime to NULL
UPDATE "public"."booking_services" 
SET departure_datetime = NULL 
WHERE duration_hours = 0 AND departure_datetime IS NOT NULL;

-- For any rows where duration_hours > 0 but departure_datetime is NULL,
-- calculate it based on arrival_datetime and duration_hours
UPDATE "public"."booking_services" 
SET departure_datetime = arrival_datetime + INTERVAL '1 hour' * duration_hours
WHERE duration_hours > 0 AND departure_datetime IS NULL;

-- Update the comment to reflect the new behavior
COMMENT ON COLUMN "public"."booking_services"."departure_datetime" IS 'Complete datetime when the service booking ends. Can be NULL for open duration events that end manually.';

-- Add a check constraint to ensure data integrity
-- departure_datetime should be NULL for open duration events (duration_hours = 0)
-- or should have a valid datetime for fixed duration events
ALTER TABLE "public"."booking_services" 
ADD CONSTRAINT "booking_services_departure_datetime_check" 
CHECK (
  (duration_hours = 0 AND departure_datetime IS NULL) OR 
  (duration_hours > 0 AND departure_datetime IS NOT NULL)
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT "booking_services_departure_datetime_check" ON "public"."booking_services" 
IS 'Ensures departure_datetime is NULL for open duration events (duration_hours = 0) and not NULL for fixed duration events';
