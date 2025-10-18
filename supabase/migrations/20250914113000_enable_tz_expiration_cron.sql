-- Ensure pg_cron is enabled and schedule a timezone-aware expiration job
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Define or update the timezone-aware expiration function (idempotent)
CREATE OR REPLACE FUNCTION public.update_expired_bookings_tz()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    timeout_minutes INTEGER;
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT COALESCE(booking_timeout_minutes, 5) INTO timeout_minutes
    FROM system_settings
    LIMIT 1;

    -- Use UTC now minus timeout (matches Edge logic)
    cutoff_time := NOW() - (INTERVAL '1 minute' * timeout_minutes);

    UPDATE bookings 
    SET 
        status = 'expired',
        status_updated_at = NOW()
    WHERE 
        status = 'pending' 
        AND created_at < cutoff_time;
END;
$function$;

-- Schedule or replace the cron job to run every minute
DO $$
BEGIN
  -- Unschedule if an old job with same name exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-reject-expired-bookings-tz') THEN
    PERFORM cron.unschedule('auto-reject-expired-bookings-tz');
  END IF;
  PERFORM cron.schedule(
    'auto-reject-expired-bookings-tz',
    '* * * * *',
    'SELECT public.update_expired_bookings_tz();'
  );
END $$;


