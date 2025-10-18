-- Create storage buckets for venue and service images
-- These buckets are required for the image upload functionality

-- Create venue-images bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-images',
  'venue-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create service-images bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for venue-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload venue images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'venue-images');

-- Allow public read access to venue images
CREATE POLICY "Allow public read access to venue images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'venue-images');

-- Allow authenticated users to update their own venue images
CREATE POLICY "Allow authenticated users to update venue images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'venue-images');

-- Allow authenticated users to delete venue images
CREATE POLICY "Allow authenticated users to delete venue images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'venue-images');

-- Create storage policies for service-images bucket
-- Allow authenticated users to upload service images
CREATE POLICY "Allow authenticated users to upload service images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- Allow public read access to service images
CREATE POLICY "Allow public read access to service images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'service-images');

-- Allow authenticated users to update service images
CREATE POLICY "Allow authenticated users to update service images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'service-images');

-- Allow authenticated users to delete service images
CREATE POLICY "Allow authenticated users to delete service images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'service-images');
