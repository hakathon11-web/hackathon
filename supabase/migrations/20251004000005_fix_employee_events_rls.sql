-- Fix RLS policies for employee-created events
-- This migration updates the row-level security policies to allow employees to create bookings

-- Create a function to set configuration values (for employee session management)
CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, true);
END;
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION public.set_config(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config(text, text) TO anon;

-- Create a function to get current setting values (for debugging)
CREATE OR REPLACE FUNCTION public.get_current_setting(setting_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting(setting_name, true);
END;
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION public.get_current_setting(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_setting(text) TO anon;

-- Create a function to check if the current session is an employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE id = COALESCE(
      (current_setting('app.current_employee_id', true))::uuid,
      NULL
    )
  );
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION public.is_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_employee() TO anon;

-- Update the existing "Users can create own bookings" policy to also allow employees
-- Drop the existing policy first
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;

-- Create a new policy that allows both users and employees to create bookings
CREATE POLICY "Users and employees can create bookings"
ON public.bookings
AS PERMISSIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Allow users to create their own bookings (user_id = auth.uid())
  (auth.uid() = user_id)
  OR
  -- Allow employees to create bookings (employee_id is set and user_id is null)
  (is_employee() AND employee_id IS NOT NULL AND user_id IS NULL)
);

-- Update the existing "Users can update own bookings" policy to also allow employees
-- Drop the existing policy first
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

-- Create a new policy that allows both users and employees to update bookings
CREATE POLICY "Users and employees can update bookings"
ON public.bookings
AS PERMISSIVE
FOR UPDATE
TO authenticated, anon
USING (
  -- Allow users to update their own bookings
  (auth.uid() = user_id)
  OR
  -- Allow employees to update bookings they created
  (is_employee() AND employee_id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL))
  OR
  -- Allow employees to update any booking for their venue
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
    AND employees.venue_id = bookings.venue_id
  ))
)
WITH CHECK (
  -- Allow users to update their own bookings
  (auth.uid() = user_id)
  OR
  -- Allow employees to update bookings they created
  (is_employee() AND employee_id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL))
  OR
  -- Allow employees to update any booking for their venue
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
    AND employees.venue_id = bookings.venue_id
  ))
);

-- Also need to update booking_services policies for employee access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own booking services" ON public.booking_services;

-- Create new policy for booking_services that includes employee access
CREATE POLICY "Users and employees can view booking services"
ON public.booking_services
AS PERMISSIVE
FOR SELECT
TO authenticated, anon
USING (
  -- Allow users to view their own booking services
  (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = booking_services.booking_id 
    AND bookings.user_id = auth.uid()
  ))
  OR
  -- Allow employees to view booking services for their venue
  (is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  ))
);

-- Create policy for employees to insert booking services
CREATE POLICY "Employees can create booking services"
ON public.booking_services
AS PERMISSIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (
  is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  )
);

-- Create policy for employees to update booking services
CREATE POLICY "Employees can update booking services"
ON public.booking_services
AS PERMISSIVE
FOR UPDATE
TO authenticated, anon
USING (
  is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  )
)
WITH CHECK (
  is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  )
);

-- Create policy for employees to delete booking services
CREATE POLICY "Employees can delete booking services"
ON public.booking_services
AS PERMISSIVE
FOR DELETE
TO authenticated, anon
USING (
  is_employee() AND EXISTS (
    SELECT 1 FROM public.bookings 
    JOIN public.employees ON employees.venue_id = bookings.venue_id
    WHERE bookings.id = booking_services.booking_id
    AND employees.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
  )
);

-- Add comments to document the new policies
COMMENT ON POLICY "Users and employees can create bookings" ON public.bookings 
IS 'Allows both authenticated users and employees to create bookings. Users create customer bookings, employees create employee events.';

COMMENT ON POLICY "Users and employees can update bookings" ON public.bookings 
IS 'Allows users to update their own bookings and employees to update bookings for their venue.';

COMMENT ON POLICY "Employees can create booking services" ON public.booking_services 
IS 'Allows employees to create booking services for bookings in their venue.';

COMMENT ON POLICY "Employees can update booking services" ON public.booking_services 
IS 'Allows employees to update booking services for bookings in their venue.';

COMMENT ON POLICY "Employees can delete booking services" ON public.booking_services 
IS 'Allows employees to delete booking services for bookings in their venue.';
