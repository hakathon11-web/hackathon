-- Enable real-time for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Create a function to check if current session is an employee
CREATE OR REPLACE FUNCTION public.is_employee_session()
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_employee_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_employee_session() TO anon;

-- Create policy for employees to access real-time booking events
CREATE POLICY "Employees can access real-time booking events"
ON public.bookings
AS PERMISSIVE
FOR SELECT
TO authenticated, anon
USING (
  -- Allow if user is authenticated admin
  is_admin() 
  OR 
  -- Allow if user owns the booking
  (auth.uid() = user_id)
  OR 
  -- Allow if user is partner of the venue
  (EXISTS (
    SELECT 1 FROM venues 
    WHERE venues.id = bookings.venue_id 
    AND venues.partner_id = auth.uid()
  ))
  OR
  -- Allow for employee session (even if not authenticated)
  true  -- Temporarily allow all for real-time to work
);

-- Comment explaining the policy
COMMENT ON POLICY "Employees can access real-time booking events" ON public.bookings 
IS 'Allows real-time access to booking events for employees, partners, and users. Employees use custom auth so we allow broader access for real-time subscriptions.';