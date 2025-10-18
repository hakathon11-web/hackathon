-- Set up automatic cron job to run booking timeout checks every minute
-- This ensures expired bookings are automatically updated to 'expired' status

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job that runs every minute to check for expired bookings
-- The job calls the update_expired_bookings function
SELECT cron.schedule(
    'auto-reject-expired-bookings',           -- job name
    '* * * * *',                              -- run every minute
    'SELECT public.update_expired_bookings();'  -- SQL to execute
);

-- Optional: Create a more frequent job (every 30 seconds) for more responsive timeout handling
-- Note: This might be too frequent for production, adjust as needed
SELECT cron.schedule(
    'auto-reject-expired-bookings-frequent',  -- job name
    '*/30 * * * * *',                         -- run every 30 seconds
    'SELECT public.update_expired_bookings();'  -- SQL to execute
);
