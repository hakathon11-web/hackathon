-- Clean up legacy pg_cron jobs and ensure only the timezone-aware job remains
-- This prevents duplicate or conflicting expiration handlers and centralizes emailing in edge functions

-- Unschedule any old jobs if they exist (safe to call if missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-reject-expired-bookings') THEN
    PERFORM cron.unschedule('auto-reject-expired-bookings');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping unschedule for auto-reject-expired-bookings: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-reject-expired-bookings-frequent') THEN
    PERFORM cron.unschedule('auto-reject-expired-bookings-frequent');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping unschedule for auto-reject-expired-bookings-frequent: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-reject-expired-bookings-tz') THEN
    PERFORM cron.unschedule('auto-reject-expired-bookings-tz');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping unschedule for auto-reject-expired-bookings-tz: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-reject-expired-bookings-frequent-tz') THEN
    PERFORM cron.unschedule('auto-reject-expired-bookings-frequent-tz');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping unschedule for auto-reject-expired-bookings-frequent-tz: %', SQLERRM;
END $$;

-- Optional: if you want to rely solely on the edge function scheduler (Supabase Scheduler) to call
-- functions/v1/booking-timeout-scheduler, keep database cron disabled. Otherwise, re-create a single
-- timezone-aware cron entry below by uncommenting.
--
-- SELECT cron.schedule(
--   'auto-reject-expired-bookings-tz',
--   '* * * * *',
--   'SELECT public.update_expired_bookings_tz();'
-- );


