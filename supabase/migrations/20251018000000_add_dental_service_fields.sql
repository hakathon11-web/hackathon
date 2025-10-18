-- Add dental service specific fields to venue_services table
ALTER TABLE public.venue_services 
ADD COLUMN doctor_name VARCHAR(255),
ADD COLUMN doctor_last_name VARCHAR(255),
ADD COLUMN service_total_price NUMERIC(10,2),
ADD COLUMN service_duration_minutes INTEGER;

-- Add comments to explain the purpose
COMMENT ON COLUMN public.venue_services.doctor_name IS 'Doctor first name for dental services';
COMMENT ON COLUMN public.venue_services.doctor_last_name IS 'Doctor last name for dental services';
COMMENT ON COLUMN public.venue_services.service_total_price IS 'Total price for the dental service';
COMMENT ON COLUMN public.venue_services.service_duration_minutes IS 'Duration of the dental service in minutes (in 10-minute intervals)';
