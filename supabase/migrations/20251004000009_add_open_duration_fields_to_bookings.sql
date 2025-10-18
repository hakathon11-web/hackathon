-- Add open duration fields to bookings table
ALTER TABLE bookings 
ADD COLUMN is_open_duration BOOLEAN DEFAULT FALSE,
ADD COLUMN event_status TEXT CHECK (event_status IN ('active', 'ended')),
ADD COLUMN actual_start_time TIMESTAMPTZ,
ADD COLUMN actual_end_time TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX idx_bookings_open_duration ON bookings(is_open_duration, event_status) WHERE is_open_duration = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN bookings.is_open_duration IS 'Whether this booking has an open duration (not fixed time)';
COMMENT ON COLUMN bookings.event_status IS 'Current status of open duration events: active or ended';
COMMENT ON COLUMN bookings.actual_start_time IS 'When the open duration event actually started';
COMMENT ON COLUMN bookings.actual_end_time IS 'When the open duration event ended (null if still active)';
