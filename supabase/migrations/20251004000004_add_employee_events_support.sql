-- Add support for employee-created events/bookings
-- This migration adds fields to distinguish employee-created bookings from customer bookings

-- Add employee_id and event_type fields to bookings table
ALTER TABLE "public"."bookings" 
ADD COLUMN "employee_id" uuid,
ADD COLUMN "event_type" text DEFAULT 'customer'::text CHECK (event_type IN ('customer', 'employee'));

-- Add index for better query performance
CREATE INDEX "bookings_employee_id_idx" ON "public"."bookings" ("employee_id");
CREATE INDEX "bookings_event_type_idx" ON "public"."bookings" ("event_type");

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN "public"."bookings"."employee_id" IS 'ID of the employee who created this event/booking. NULL for customer bookings.';
COMMENT ON COLUMN "public"."bookings"."event_type" IS 'Type of booking: customer (default) or employee.';

-- Add foreign key constraint for employee_id
ALTER TABLE "public"."bookings" 
ADD CONSTRAINT "bookings_employee_id_fkey" 
FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;

-- Update existing bookings to have event_type = 'customer'
UPDATE "public"."bookings" 
SET event_type = 'customer' 
WHERE event_type IS NULL;

-- Make event_type NOT NULL after setting default values
ALTER TABLE "public"."bookings" 
ALTER COLUMN "event_type" SET NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."bookings" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."booking_services" TO "anon";
