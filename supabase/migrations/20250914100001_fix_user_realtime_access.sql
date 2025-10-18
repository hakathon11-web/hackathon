-- Remove the potentially conflicting policy I created
DROP POLICY IF EXISTS "Employees can access real-time booking events" ON public.bookings;

-- Drop the function we created (no longer needed)
DROP FUNCTION IF EXISTS public.is_employee_session();

-- Ensure real-time is enabled for bookings table (this should persist)
-- Note: The previous migration already added this, but let's ensure it exists
DO $$ 
BEGIN
    -- Check if bookings table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
END $$;

-- The existing policies should handle access correctly:
-- 1. "Users can view own bookings" - allows users to see their own bookings
-- 2. "Partners can view bookings for their venues" - allows partners to see their venue bookings  
-- 3. "Allow employee access to venue bookings" - allows employee access (using true)
-- 4. "Admins can view all bookings" - allows admin access

-- Add a comment to document the real-time setup
COMMENT ON TABLE public.bookings IS 'Real-time enabled for booking status updates. Policies allow users to see their own bookings, partners to see venue bookings, and employees to see all bookings.';