-- Fix the bug where empty system_settings table causes null timeout_minutes
-- When the table is empty, COALESCE doesn't work because no rows are returned

-- Fix the timezone-aware function
CREATE OR REPLACE FUNCTION public.update_expired_bookings_tz()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
    updated_count INTEGER;
BEGIN
    -- Get timeout from system settings with proper handling of empty table
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no rows found, use default value
    IF timeout_minutes IS NULL THEN
        timeout_minutes := 5;
    END IF;
    
    -- Calculate cutoff time correctly
    cutoff_time := (NOW() + INTERVAL '4 hours' - INTERVAL '1 minute' * timeout_minutes) - INTERVAL '4 hours';
    
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

-- Fix the debug function too
CREATE OR REPLACE FUNCTION public.debug_timezone_calculation()
RETURNS TABLE(
    current_utc_time TIMESTAMP WITH TIME ZONE,
    current_tbilisi_time TIMESTAMP WITH TIME ZONE,
    timeout_minutes INTEGER,
    cutoff_time TIMESTAMP WITH TIME ZONE,
    pending_bookings_count BIGINT,
    expired_bookings_count BIGINT
)
LANGUAGE plpgsql
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get timeout from system settings with proper handling of empty table
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no rows found, use default value
    IF timeout_minutes IS NULL THEN
        timeout_minutes := 5;
    END IF;
    
    -- Calculate cutoff time correctly
    cutoff_time := (NOW() + INTERVAL '4 hours' - INTERVAL '1 minute' * timeout_minutes) - INTERVAL '4 hours';
    
    -- Return debug information
    RETURN QUERY
    SELECT 
        NOW() as current_utc_time,
        (NOW() + INTERVAL '4 hours') as current_tbilisi_time,
        timeout_minutes,
        cutoff_time,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings_count,
        (SELECT COUNT(*) FROM bookings WHERE status = 'expired') as expired_bookings_count;
END;
$function$;

-- Fix the pending bookings debug function
CREATE OR REPLACE FUNCTION public.debug_pending_bookings()
RETURNS TABLE(
    booking_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    age_minutes NUMERIC,
    cutoff_time TIMESTAMP WITH TIME ZONE,
    should_be_expired BOOLEAN
)
LANGUAGE plpgsql
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get timeout from system settings with proper handling of empty table
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no rows found, use default value
    IF timeout_minutes IS NULL THEN
        timeout_minutes := 5;
    END IF;
    
    -- Calculate cutoff time correctly
    cutoff_time := (NOW() + INTERVAL '4 hours' - INTERVAL '1 minute' * timeout_minutes) - INTERVAL '4 hours';
    
    -- Return pending bookings with debug info
    RETURN QUERY
    SELECT 
        b.id as booking_id,
        b.created_at,
        EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 60 as age_minutes,
        cutoff_time,
        (b.created_at < cutoff_time) as should_be_expired
    FROM bookings b
    WHERE b.status = 'pending'
    ORDER BY b.created_at DESC;
END;
$function$;

-- Also fix the original update_expired_bookings function
CREATE OR REPLACE FUNCTION public.update_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
    updated_count INTEGER;
BEGIN
    -- Get timeout from system settings with proper handling of empty table
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no rows found, use default value
    IF timeout_minutes IS NULL THEN
        timeout_minutes := 5;
    END IF;
    
    -- Calculate cutoff time (simple UTC-based calculation)
    cutoff_time := NOW() - INTERVAL '1 minute' * timeout_minutes;
    
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
    
    -- Log the update
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % expired bookings', updated_count;
    END IF;
END;
$function$;