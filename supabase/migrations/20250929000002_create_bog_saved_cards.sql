-- Create table to store BOG saved cards per user
CREATE TABLE IF NOT EXISTS bog_saved_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bog_order_id TEXT NOT NULL, -- The original order ID where card was saved
  card_mask TEXT, -- Last 4 digits like "****1234" (if available from BOG)
  card_brand TEXT, -- visa, mastercard, etc. (if available from BOG) 
  card_exp_month INTEGER, -- Expiration month (if available from BOG)
  card_exp_year INTEGER, -- Expiration year (if available from BOG)
  saved_type TEXT NOT NULL CHECK (saved_type IN ('recurrent', 'subscription')), -- recurrent or subscription
  is_active BOOLEAN DEFAULT true, -- Can be used for payments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bog_saved_cards_user_id ON bog_saved_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_bog_saved_cards_bog_order_id ON bog_saved_cards(bog_order_id);
CREATE INDEX IF NOT EXISTS idx_bog_saved_cards_active ON bog_saved_cards(user_id, is_active) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE bog_saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved cards
CREATE POLICY "Users can view own saved cards" ON bog_saved_cards
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saved cards
CREATE POLICY "Users can insert own saved cards" ON bog_saved_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved cards
CREATE POLICY "Users can update own saved cards" ON bog_saved_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved cards
CREATE POLICY "Users can delete own saved cards" ON bog_saved_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all records (for edge functions)
CREATE POLICY "Service role can manage all saved cards" ON bog_saved_cards
  FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_bog_saved_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bog_saved_cards_updated_at
  BEFORE UPDATE ON bog_saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_bog_saved_cards_updated_at();

-- Add unique constraint to prevent duplicate saved cards per user/order
ALTER TABLE bog_saved_cards 
ADD CONSTRAINT unique_user_bog_order 
UNIQUE (user_id, bog_order_id);
