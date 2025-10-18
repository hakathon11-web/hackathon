-- Add 'booking_cancelled' notification type to the notifications_type_check constraint
-- This allows the system to send notifications when users cancel their bookings

-- First, drop the existing constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new constraint with 'booking_cancelled' type included
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'booking_request_sent'::text, 
  'booking_confirmation'::text, 
  'booking_rejected'::text, 
  'booking_cancelled'::text,
  'booking_reminder_15min'::text, 
  'booking_reminder_1hour'::text, 
  'booking_reminder_2hours'::text, 
  'review_request'::text, 
  '1_hour_before'::text, 
  '2_hours_before'::text, 
  '10_minutes_before'::text, 
  'admin_message'::text
]));
