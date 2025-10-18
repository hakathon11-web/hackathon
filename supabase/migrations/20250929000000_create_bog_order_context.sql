-- Create table to store BOG order context for callback processing
CREATE TABLE IF NOT EXISTS bog_order_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bog_order_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id TEXT,
  venue_name TEXT,
  booking_date DATE,
  arrival_time TIME,
  guest_count INTEGER,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'GEL',
  booking_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bog_order_context_bog_order_id ON bog_order_context(bog_order_id);
CREATE INDEX IF NOT EXISTS idx_bog_order_context_user_id ON bog_order_context(user_id);
CREATE INDEX IF NOT EXISTS idx_bog_order_context_created_at ON bog_order_context(created_at);

-- Add RLS policies
ALTER TABLE bog_order_context ENABLE ROW LEVEL SECURITY;

-- Users can only see their own order context
CREATE POLICY "Users can view own order context" ON bog_order_context
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all records (for edge functions)
CREATE POLICY "Service role can manage all order context" ON bog_order_context
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Create a table for payment logs if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bog_order_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT,
  amount DECIMAL(10,2),
  currency TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for payment logs
CREATE INDEX IF NOT EXISTS idx_payment_logs_bog_order_id ON payment_logs(bog_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at);

-- RLS for payment logs
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment logs" ON payment_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payment logs" ON payment_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Add bog_order_id column to bookings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'bog_order_id') THEN
    ALTER TABLE bookings ADD COLUMN bog_order_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_bookings_bog_order_id ON bookings(bog_order_id);
  END IF;
END $$;

-- Add payment_method column to bookings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
    ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT 'bog';
  END IF;
END $$;

-- Add payment_status column to bookings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
END $$;

