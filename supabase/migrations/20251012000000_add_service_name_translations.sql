-- Add multilingual service name fields to services table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'name_en') THEN
        ALTER TABLE public.services ADD COLUMN name_en text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'name_ka') THEN
        ALTER TABLE public.services ADD COLUMN name_ka text;
    END IF;
END $$;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN public.services.name_en IS 'Service name in English';
COMMENT ON COLUMN public.services.name_ka IS 'Service name in Georgian';

-- Add multilingual service name fields to venue_services table for consistency
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'name_en') THEN
        ALTER TABLE public.venue_services ADD COLUMN name_en text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'name_ka') THEN
        ALTER TABLE public.venue_services ADD COLUMN name_ka text;
    END IF;
END $$;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN public.venue_services.name_en IS 'Service name in English';
COMMENT ON COLUMN public.venue_services.name_ka IS 'Service name in Georgian';
