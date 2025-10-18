-- Fix the service translation structure by removing duplicate fields from venue_services
-- The venue_services table should only reference services, not duplicate their data

-- Step 1: Ensure all venue_services have proper service_id references
-- Update any venue_services that might have inconsistent service references

-- First, let's see if there are venue_services without proper service_id
-- We'll handle this by creating services for any orphaned venue_services

INSERT INTO public.services (name, name_en, name_ka, type, description, duration, pricing_model, is_visible, sort_order)
SELECT DISTINCT 
    vs.name,
    COALESCE(vs.name_en, vs.name) as name_en,
    COALESCE(vs.name_ka, vs.name) as name_ka,
    COALESCE(vs.service_type, 'general') as type,
    vs.description,
    vs.duration,
    vs.pricing_model,
    true as is_visible,
    0 as sort_order
FROM public.venue_services vs
LEFT JOIN public.services s ON s.id = vs.service_id
WHERE s.id IS NULL
ON CONFLICT (name) DO NOTHING;

-- Update venue_services to reference the correct services
UPDATE public.venue_services vs
SET service_id = s.id
FROM public.services s
WHERE vs.service_id IS NULL 
AND s.name = vs.name;

-- Step 2: Remove the duplicate translation fields from venue_services
-- These should be inherited from the services table via the join

DO $$ 
BEGIN
    -- Drop name_en if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'name_en') THEN
        ALTER TABLE public.venue_services DROP COLUMN name_en;
    END IF;
    
    -- Drop name_ka if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'name_ka') THEN
        ALTER TABLE public.venue_services DROP COLUMN name_ka;
    END IF;
    
    -- Keep the 'name' field for now as it might be used for venue-specific customization
    -- But add a comment to clarify its purpose
END $$;

-- Add proper foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'venue_services_service_id_fkey'
    ) THEN
        ALTER TABLE public.venue_services 
        ADD CONSTRAINT venue_services_service_id_fkey 
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comments to clarify the data structure
COMMENT ON COLUMN public.venue_services.name IS 'Venue-specific service name (optional override of services.name)';
COMMENT ON COLUMN public.venue_services.service_id IS 'References services table - translations come from there';
COMMENT ON TABLE public.venue_services IS 'Venue-specific service implementations - inherits basic info from services table';

-- Update the services table to ensure all have proper translations
UPDATE public.services 
SET 
    name_en = COALESCE(name_en, name),
    name_ka = COALESCE(name_ka, name)
WHERE name_en IS NULL OR name_ka IS NULL;
