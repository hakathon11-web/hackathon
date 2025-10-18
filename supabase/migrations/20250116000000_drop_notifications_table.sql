-- Drop notifications table and related constraints
-- This migration removes the notifications system that was used for user notifications

-- Drop the notifications table (this will automatically drop all related constraints and indexes)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Remove any policies related to notifications (if they exist)
-- Note: These will fail silently if the table doesn't exist, which is fine
DO $$ 
BEGIN
    -- Try to drop policies, but don't fail if the table doesn't exist
    BEGIN
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, which is fine
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, which is fine
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, which is fine
    END;
END $$;

-- Remove notifications table from real-time publication (if it was added)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
        RAISE NOTICE 'Removed notifications table from real-time publication';
    ELSE
        RAISE NOTICE 'Notifications table was not in real-time publication';
    END IF;
END $$;
