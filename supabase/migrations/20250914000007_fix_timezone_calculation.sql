-- Fix timezone calculation in the expiration function
-- The previous approach was too complex, let's use a simpler method

-- Drop the existing timezone-aware function
DROP FUNCTION IF EXISTS public.update_expired_bookings_tz();

-- Create a simpler timezone-aware function
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
    
    -- Simple approach: Add 4 hours to current UTC time to get Tbilisi time,
    -- then subtract timeout, then convert back to UTC for comparison
    cutoff_time := (NOW() + INTERVAL '4 hours') - INTERVAL '1 minute' * timeout_minutes;
    
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
