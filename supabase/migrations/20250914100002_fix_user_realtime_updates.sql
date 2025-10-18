-- The issue is that real-time UPDATE events need access to both old and new row states
-- Current policy "Users can view own bookings" only allows SELECT, but real-time needs UPDATE visibility

-- Create a specific policy for real-time UPDATE events for users
CREATE POLICY "Users can see updates to their own bookings for real-time"
ON public.bookings
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Also ensure users can see SELECT for real-time (existing policy should handle this, but let's be explicit)
-- The existing "Users can view own bookings" policy should handle SELECT access

-- Add comment explaining the real-time UPDATE policy
COMMENT ON POLICY "Users can see updates to their own bookings for real-time" ON public.bookings 
IS 'Allows users to receive real-time UPDATE notifications for their own bookings. Required for real-time subscriptions to work.';

-- Make sure the bookings table is in the real-time publication (should already be there from previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
        RAISE NOTICE 'Added bookings table to real-time publication';
    ELSE
        RAISE NOTICE 'Bookings table already in real-time publication';
    END IF;
END $$;