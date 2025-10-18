-- Create a debug version of the timezone function to see what's happening

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
    -- Get timeout from system settings
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    LIMIT 1;
    
    -- Calculate cutoff time
    cutoff_time := (NOW() + INTERVAL '4 hours') - INTERVAL '1 minute' * timeout_minutes;
    
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

-- Also create a function to show pending bookings with their ages
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
    -- Get timeout from system settings
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    LIMIT 1;
    
    -- Calculate cutoff time
    cutoff_time := (NOW() + INTERVAL '4 hours') - INTERVAL '1 minute' * timeout_minutes;
    
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
