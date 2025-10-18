-- Fix RLS policies for booking_services table to allow employee access
-- This migration updates the booking_services policies to work with employee-created bookings

-- Drop the existing restrictive INSERT policy for booking_services
DROP POLICY IF EXISTS "Users can insert their own booking services" ON public.booking_services;

-- Create a new INSERT policy that allows both users and employees
CREATE POLICY "Users and employees can insert booking services"
ON public.booking_services
AS PERMISSIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Allow users to insert their own booking services
  (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = booking_services.booking_id 
    AND bookings.user_id = auth.uid()
  ))
  OR
  -- Allow employees to insert booking services for employee-created bookings
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  ))
  OR
  -- Fallback: Allow if booking has employee_id and employee exists with venue access
  (EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.id = bookings.employee_id
    WHERE bookings.id = booking_services.booking_id
    AND bookings.employee_id IS NOT NULL
    AND bookings.user_id IS NULL
    AND employees.venue_id = bookings.venue_id
    AND employees.is_active = true
  ))
);

-- Drop the existing UPDATE policy for booking_services
DROP POLICY IF EXISTS "Users can update their own booking services" ON public.booking_services;

-- Create a new UPDATE policy that allows both users and employees
CREATE POLICY "Users and employees can update booking services"
ON public.booking_services
AS PERMISSIVE
FOR UPDATE
TO authenticated, anon
USING (
  -- Allow users to update their own booking services
  (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = booking_services.booking_id 
    AND bookings.user_id = auth.uid()
  ))
  OR
  -- Allow employees to update booking services for employee-created bookings
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  ))
  OR
  -- Fallback: Allow if booking has employee_id and employee exists with venue access
  (EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.id = bookings.employee_id
    WHERE bookings.id = booking_services.booking_id
    AND bookings.employee_id IS NOT NULL
    AND bookings.user_id IS NULL
    AND employees.venue_id = bookings.venue_id
    AND employees.is_active = true
  ))
)
WITH CHECK (
  -- Same conditions for WITH CHECK as for USING
  (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = booking_services.booking_id 
    AND bookings.user_id = auth.uid()
  ))
  OR
  -- Allow employees to update booking services for employee-created bookings
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  ))
  OR
  -- Fallback: Allow if booking has employee_id and employee exists with venue access
  (EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.id = bookings.employee_id
    WHERE bookings.id = booking_services.booking_id
    AND bookings.employee_id IS NOT NULL
    AND bookings.user_id IS NULL
    AND employees.venue_id = bookings.venue_id
    AND employees.is_active = true
  ))
);

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Employees can delete booking services" ON public.booking_services;

-- Create DELETE policy for employees
CREATE POLICY "Employees can delete booking services"
ON public.booking_services
AS PERMISSIVE
FOR DELETE
TO authenticated, anon
USING (
  -- Allow employees to delete booking services for employee-created bookings
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  ))
  OR
  -- Fallback: Allow if booking has employee_id and employee exists with venue access
  (EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.id = bookings.employee_id
    WHERE bookings.id = booking_services.booking_id
    AND bookings.employee_id IS NOT NULL
    AND bookings.user_id IS NULL
    AND employees.venue_id = bookings.venue_id
    AND employees.is_active = true
  ))
);

-- Add comments to document the new policies
COMMENT ON POLICY "Users and employees can insert booking services" ON public.booking_services 
IS 'Allows both users and employees to insert booking services. Users for their own bookings, employees for bookings in their venue.';

COMMENT ON POLICY "Users and employees can update booking services" ON public.booking_services 
IS 'Allows both users and employees to update booking services. Users for their own bookings, employees for bookings in their venue.';

COMMENT ON POLICY "Employees can delete booking services" ON public.booking_services 
IS 'Allows employees to delete booking services for bookings in their venue.';
