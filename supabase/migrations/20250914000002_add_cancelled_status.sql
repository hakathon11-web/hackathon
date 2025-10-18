-- Add 'cancelled' status to the bookings_status_check constraint
-- This allows users to cancel their pending booking requests

-- First, drop the existing constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the new constraint with 'cancelled' status included
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text, 
  'confirmed'::text, 
  'rejected'::text, 
  'expired'::text, 
  'waiting_for_review'::text, 
  'reviewed'::text,
  'cancelled'::text
]));
