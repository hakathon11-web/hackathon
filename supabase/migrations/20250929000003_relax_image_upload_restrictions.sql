-- Relax image upload restrictions for better partner experience
-- This migration updates existing storage buckets with more lenient settings

-- Update venue-images bucket settings
UPDATE storage.buckets 
SET 
  file_size_limit = 262144000, -- 250MB (increased from 50MB)
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml']
WHERE id = 'venue-images';

-- Update service-images bucket settings  
UPDATE storage.buckets 
SET 
  file_size_limit = 262144000, -- 250MB (increased from 50MB)
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml']
WHERE id = 'service-images';

-- Ensure buckets exist with relaxed settings (in case they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'venue-images',
    'venue-images', 
    true,
    262144000, -- 250MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml']
  ),
  (
    'service-images',
    'service-images',
    true, 
    262144000, -- 250MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
