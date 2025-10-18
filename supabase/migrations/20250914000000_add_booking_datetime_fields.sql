-- Add datetime fields to booking_services table for proper overnight booking support
-- This migration adds arrival_datetime and departure_datetime fields to store complete datetime information

-- Add new datetime columns to booking_services table
ALTER TABLE "public"."booking_services" 
ADD COLUMN "arrival_datetime" timestamp with time zone,
ADD COLUMN "departure_datetime" timestamp with time zone;

-- Add indexes for better query performance
CREATE INDEX "booking_services_arrival_datetime_idx" ON "public"."booking_services" ("arrival_datetime");
CREATE INDEX "booking_services_departure_datetime_idx" ON "public"."booking_services" ("departure_datetime");

-- Populate the new datetime fields from existing date and time data
-- This handles both same-day and overnight bookings correctly
UPDATE "public"."booking_services" 
SET 
  "arrival_datetime" = (
    SELECT 
      CASE 
        -- If departure time is before arrival time, it's an overnight booking
        WHEN bs.departure_time < bs.arrival_time THEN
          -- Arrival is on the booking date
          (b.booking_date::date + bs.arrival_time::time)::timestamp with time zone
        ELSE
          -- Same day booking
          (b.booking_date::date + bs.arrival_time::time)::timestamp with time zone
      END
    FROM "public"."bookings" b
    WHERE b.id = booking_services.booking_id
  ),
  "departure_datetime" = (
    SELECT 
      CASE 
        -- If departure time is before arrival time, it's an overnight booking
        WHEN bs.departure_time < bs.arrival_time THEN
          -- Departure is on the day after booking date
          (b.booking_date::date + INTERVAL '1 day' + bs.departure_time::time)::timestamp with time zone
        ELSE
          -- Same day booking
          (b.booking_date::date + bs.departure_time::time)::timestamp with time zone
      END
    FROM "public"."bookings" b
    WHERE b.id = booking_services.booking_id
  )
FROM "public"."booking_services" bs
WHERE booking_services.id = bs.id;

-- Make the new fields NOT NULL after populating them
ALTER TABLE "public"."booking_services" 
ALTER COLUMN "arrival_datetime" SET NOT NULL,
ALTER COLUMN "departure_datetime" SET NOT NULL;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN "public"."booking_services"."arrival_datetime" IS 'Complete datetime when the service booking starts. Handles overnight bookings correctly.';
COMMENT ON COLUMN "public"."booking_services"."departure_datetime" IS 'Complete datetime when the service booking ends. Handles overnight bookings correctly.';

-- Create a function to automatically populate datetime fields when booking_services are inserted/updated
CREATE OR REPLACE FUNCTION update_booking_service_datetime()
RETURNS TRIGGER AS $$
DECLARE
  booking_date_val date;
BEGIN
  -- Get the booking date from the related booking
  SELECT b.booking_date INTO booking_date_val
  FROM "public"."bookings" b
  WHERE b.id = NEW.booking_id;
  
  -- Calculate datetime fields based on whether it's an overnight booking
  IF NEW.departure_time < NEW.arrival_time THEN
    -- Overnight booking: arrival is on booking date, departure is next day
    NEW.arrival_datetime := (booking_date_val + NEW.arrival_time::time)::timestamp with time zone;
    NEW.departure_datetime := (booking_date_val + INTERVAL '1 day' + NEW.departure_time::time)::timestamp with time zone;
  ELSE
    -- Same day booking
    NEW.arrival_datetime := (booking_date_val + NEW.arrival_time::time)::timestamp with time zone;
    NEW.departure_datetime := (booking_date_val + NEW.departure_time::time)::timestamp with time zone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update datetime fields
CREATE TRIGGER trigger_update_booking_service_datetime
  BEFORE INSERT OR UPDATE ON "public"."booking_services"
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_service_datetime();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON "public"."booking_services" TO "anon";
GRANT SELECT, INSERT, UPDATE ON "public"."booking_services" TO "authenticated";
GRANT SELECT, INSERT, UPDATE ON "public"."booking_services" TO "service_role";
