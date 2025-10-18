-- Fix INSERT RLS for booking_services using safe_current_employee_id()

-- Drop any prior INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Users and employees can insert booking services" ON public.booking_services;
DROP POLICY IF EXISTS "Employees can create booking services" ON public.booking_services;

-- Create a clean INSERT policy that permits:
-- 1) Users inserting services for their own bookings
-- 2) Employees inserting services for bookings in their venue
CREATE POLICY "Insert booking services (user or employee)" 
ON public.booking_services
AS PERMISSIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Users can insert services for their own bookings
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_services.booking_id
    AND b.user_id = auth.uid()
  )
  OR
  -- Employees can insert services for bookings in their venue
  (
    public.is_employee() AND EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.employees e ON e.venue_id = b.venue_id
      WHERE b.id = booking_services.booking_id
      AND e.id = public.safe_current_employee_id()
    )
  )
);

COMMENT ON POLICY "Insert booking services (user or employee)" ON public.booking_services 
IS 'Allows users to insert services for their own bookings and employees to insert services for bookings in their venue (using safe_current_employee_id).';


