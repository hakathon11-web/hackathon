-- Add color field to bookings table for employee events
-- This allows employees to set custom colors for their events

ALTER TABLE public.bookings 
ADD COLUMN color text DEFAULT '#3b82f6';

-- Add a comment to document the color field
COMMENT ON COLUMN public.bookings.color IS 'Color for the booking event, used in calendar display. Defaults to blue.';
