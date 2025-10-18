-- Create functions for managing product stock quantities
-- These functions are used when products are added/removed from events

-- Function to decrease product stock (when products are added to events)
CREATE OR REPLACE FUNCTION decrease_product_stock(
  product_id UUID,
  quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only decrease stock if the product has stock tracking enabled (stock_quantity is not null)
  -- If stock_quantity is null, it means unlimited stock
  UPDATE venue_products 
  SET 
    stock_quantity = CASE 
      WHEN stock_quantity IS NULL THEN NULL  -- Keep unlimited stock as unlimited
      WHEN stock_quantity >= quantity THEN stock_quantity - quantity
      ELSE stock_quantity  -- Don't allow negative stock
    END,
    updated_at = NOW()
  WHERE id = product_id;
  
  -- Check if the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with id % not found', product_id;
  END IF;
END;
$$;

-- Function to increase product stock (when products are removed from events)
CREATE OR REPLACE FUNCTION increase_product_stock(
  product_id UUID,
  quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only increase stock if the product has stock tracking enabled (stock_quantity is not null)
  -- If stock_quantity is null, it means unlimited stock
  UPDATE venue_products 
  SET 
    stock_quantity = CASE 
      WHEN stock_quantity IS NULL THEN NULL  -- Keep unlimited stock as unlimited
      ELSE stock_quantity + quantity
    END,
    updated_at = NOW()
  WHERE id = product_id;
  
  -- Check if the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with id % not found', product_id;
  END IF;
END;
$$;

-- Function to set product stock quantity (for manual stock management)
CREATE OR REPLACE FUNCTION set_product_stock(
  product_id UUID,
  new_stock_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE venue_products 
  SET 
    stock_quantity = new_stock_quantity,
    updated_at = NOW()
  WHERE id = product_id;
  
  -- Check if the update actually happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with id % not found', product_id;
  END IF;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION decrease_product_stock(UUID, INTEGER) IS 'Decreases product stock quantity when products are added to events';
COMMENT ON FUNCTION increase_product_stock(UUID, INTEGER) IS 'Increases product stock quantity when products are removed from events';
COMMENT ON FUNCTION set_product_stock(UUID, INTEGER) IS 'Sets product stock quantity for manual stock management';
