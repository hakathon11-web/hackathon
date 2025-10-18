-- Add rejection message field to bookings table
-- This allows employees to provide a reason when rejecting booking requests

ALTER TABLE "public"."bookings" 
ADD COLUMN "rejection_message" text;

-- Add constraint to limit rejection message length (similar to special_requests)
ALTER TABLE "public"."bookings" 
ADD CONSTRAINT "bookings_rejection_message_length_check" 
CHECK (length(rejection_message) <= 500);

-- Add comment to document the field
COMMENT ON COLUMN "public"."bookings"."rejection_message" IS 'Message provided by employee when rejecting a booking request';
