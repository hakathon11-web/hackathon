-- Remove old arrival_time and departure_time fields from booking_services table
-- These fields have been replaced by arrival_datetime and departure_datetime for proper overnight booking support

-- Drop the trigger first since it references the old fields
DROP TRIGGER IF EXISTS trigger_update_booking_service_datetime ON "public"."booking_services";

-- Drop the function since it's no longer needed
DROP FUNCTION IF EXISTS update_booking_service_datetime();

-- Remove the old time columns
ALTER TABLE "public"."booking_services" 
DROP COLUMN IF EXISTS "arrival_time",
DROP COLUMN IF EXISTS "departure_time";

-- Add comments to document the change
COMMENT ON TABLE "public"."booking_services" IS 'Service bookings with proper datetime fields for overnight booking support. Old arrival_time and departure_time fields have been removed in favor of arrival_datetime and departure_datetime.';
