-- Minimal column: per-service discounted total
ALTER TABLE public.booking_services
  ADD COLUMN IF NOT EXISTS discounted_subtotal numeric;

COMMENT ON COLUMN public.booking_services.discounted_subtotal IS 'Subtotal after discounts (service-wise)';


