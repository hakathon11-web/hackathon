-- Fix cron job timezone issue by creating a timezone-aware function
-- Since pg_cron runs in UTC, we need to adjust the function to handle timezone properly

-- First, unschedule the existing cron jobs
SELECT cron.unschedule('auto-reject-expired-bookings');
SELECT cron.unschedule('auto-reject-expired-bookings-frequent');

-- Create a timezone-aware version of the update_expired_bookings function
CREATE OR REPLACE FUNCTION public.update_expired_bookings_tz()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
    updated_count INTEGER;
BEGIN
    -- Get timeout from system settings
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    LIMIT 1;
    
    -- Calculate cutoff time in Tbilisi timezone (UTC+4)
    -- Convert current UTC time to Tbilisi timezone, then subtract timeout
    cutoff_time := (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tbilisi') - INTERVAL '1 minute' * timeout_minutes;
    
    -- Convert back to UTC for comparison with stored timestamps
    cutoff_time := cutoff_time AT TIME ZONE 'Asia/Tbilisi' AT TIME ZONE 'UTC';
    
    -- Update expired bookings
    UPDATE bookings 
    SET 
        status = 'expired',
        status_updated_at = NOW()
    WHERE 
        status = 'pending' 
        AND created_at < cutoff_time;
    
    -- Get count of updated bookings
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the update (optional)
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % expired bookings', updated_count;
    END IF;
END;
$function$;

-- Create a new cron job that runs every minute
-- The job calls the timezone-aware function
SELECT cron.schedule(
    'auto-reject-expired-bookings-tz',  -- job name
    '* * * * *',                        -- run every minute
    'SELECT public.update_expired_bookings_tz();'  -- SQL to execute
);

-- Create a more frequent job (every 30 seconds) for more responsive timeout handling
SELECT cron.schedule(
    'auto-reject-expired-bookings-frequent-tz',  -- job name
    '*/30 * * * * *',                            -- run every 30 seconds
    'SELECT public.update_expired_bookings_tz();'  -- SQL to execute
);
