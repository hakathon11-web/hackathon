-- Add DELETE policy for employees to delete employee-created bookings
-- This allows employees to delete bookings they created in their venue

CREATE POLICY "Employees can delete employee bookings for their venue"
ON public.bookings
AS PERMISSIVE
FOR DELETE
TO authenticated, anon
USING (
  -- Allow employees to delete bookings for their venue
  -- that were created by employees (employee_id IS NOT NULL and user_id IS NULL)
  (
    is_employee() 
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.venue_id = bookings.venue_id
      AND e.id = COALESCE((current_setting('app.current_employee_id', true))::uuid, NULL)
      AND e.is_active = true
    )
    AND bookings.employee_id IS NOT NULL
    AND bookings.user_id IS NULL
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Employees can delete employee bookings for their venue" ON public.bookings 
IS 'Allows employees to delete employee-created bookings (not customer bookings) for their venue.';

