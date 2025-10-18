-- Add custom pricing label fields to services table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'table_label') THEN
        ALTER TABLE public.services ADD COLUMN table_label text DEFAULT 'Table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'guest_label') THEN
        ALTER TABLE public.services ADD COLUMN guest_label text DEFAULT 'Guest';
    END IF;
END $$;

-- Add custom pricing label fields to venue_services table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'table_label') THEN
        ALTER TABLE public.venue_services ADD COLUMN table_label text DEFAULT 'Table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venue_services' AND column_name = 'guest_label') THEN
        ALTER TABLE public.venue_services ADD COLUMN guest_label text DEFAULT 'Guest';
    END IF;
END $$;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN public.services.table_label IS 'Custom label for table-wise pricing (e.g., "Room", "Table", "Space")';
COMMENT ON COLUMN public.services.guest_label IS 'Custom label for guest-wise pricing (e.g., "Guest", "Person", "Chair")';
COMMENT ON COLUMN public.venue_services.table_label IS 'Custom label for table-wise pricing (e.g., "Room", "Table", "Space")';
COMMENT ON COLUMN public.venue_services.guest_label IS 'Custom label for guest-wise pricing (e.g., "Guest", "Person", "Chair")';
