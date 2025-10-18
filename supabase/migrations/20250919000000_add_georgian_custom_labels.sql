-- Add Georgian custom pricing label fields to services table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'table_label_ka') THEN
        ALTER TABLE public.services ADD COLUMN table_label_ka text DEFAULT 'მაგიდა';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'guest_label_ka') THEN
        ALTER TABLE public.services ADD COLUMN guest_label_ka text DEFAULT 'სტუმარი';
    END IF;
END $$;

-- Add Georgian custom pricing label fields to venue_services table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'table_label_ka') THEN
        ALTER TABLE public.venue_services ADD COLUMN table_label_ka text DEFAULT 'მაგიდა';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'guest_label_ka') THEN
        ALTER TABLE public.venue_services ADD COLUMN guest_label_ka text DEFAULT 'სტუმარი';
    END IF;
END $$;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN public.services.table_label_ka IS 'Custom Georgian label for table-wise pricing (e.g., "ოთახი", "მაგიდა", "სივრცე")';
COMMENT ON COLUMN public.services.guest_label_ka IS 'Custom Georgian label for guest-wise pricing (e.g., "სტუმარი", "პირი", "სკამი")';
COMMENT ON COLUMN public.venue_services.table_label_ka IS 'Custom Georgian label for table-wise pricing (e.g., "ოთახი", "მაგიდა", "სივრცე")';
COMMENT ON COLUMN public.venue_services.guest_label_ka IS 'Custom Georgian label for guest-wise pricing (e.g., "სტუმარი", "პირი", "სკამი")';
