-- Add missing columns to bookings table that BOG callback tries to use

-- Add currency column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'currency') THEN
    ALTER TABLE bookings ADD COLUMN currency TEXT DEFAULT 'GEL';
    COMMENT ON COLUMN bookings.currency IS 'Payment currency (GEL, USD, EUR, etc.)';
  END IF;
END $$;

-- Ensure bog_order_id column exists (should be from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'bog_order_id') THEN
    ALTER TABLE bookings ADD COLUMN bog_order_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_bookings_bog_order_id ON bookings(bog_order_id);
    COMMENT ON COLUMN bookings.bog_order_id IS 'BOG payment order identifier';
  END IF;
END $$;

-- Ensure payment_method column exists (should be from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
    ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT 'bog';
    COMMENT ON COLUMN bookings.payment_method IS 'Payment provider used (bog, stripe, etc.)';
  END IF;
END $$;

-- Ensure payment_status column exists (should be from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
    COMMENT ON COLUMN bookings.payment_status IS 'Payment completion status (pending, completed, failed)';
  END IF;
END $$;
