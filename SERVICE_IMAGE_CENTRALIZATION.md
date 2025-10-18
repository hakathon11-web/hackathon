# Service Image Centralization

This document describes the implementation of centralized service image management, where service images are now managed by administrators instead of individual venue owners.

## Overview

Previously, venue owners could upload images for each of their services individually. This led to inconsistent image quality and branding across venues offering the same service. The new system centralizes service image management, ensuring consistent branding and quality across all venues.

## Changes Made

### 1. Database Schema Changes

#### New Table: `service_images`
- `id` (uuid, primary key)
- `service_id` (uuid, foreign key to services table)
- `image_url` (text, URL of the image)
- `alt_text` (text, optional, for accessibility)
- `sort_order` (integer, for ordering multiple images)
- `is_primary` (boolean, marks the primary image for a service)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### Updated Table: `venue_services`
- Removed `images` column (text array)
- Service images are now referenced through the `service_images` table

### 2. New Components

#### `ServiceImageManager` (`src/components/ServiceImageManager.tsx`)
- Admin interface for managing service images
- Upload, edit, delete, and reorder images
- Set primary image for each service
- Integrated into the admin Services page

#### `useServiceImages` Hook (`src/hooks/useServiceImages.ts`)
- `useServiceImages()` - Get all services with their images
- `useServiceImagesByServiceId(serviceId)` - Get images for a specific service
- `useServicePrimaryImage(serviceId)` - Get the primary image for a service
- `useUploadServiceImage()` - Upload new service images
- `useUpdateServiceImage()` - Update existing service images
- `useDeleteServiceImage()` - Delete service images

### 3. Updated Components

#### Admin Interface
- **Services Page** (`src/pages/admin/Services.tsx`)
  - Added "Images" button for each service
  - Opens `ServiceImageManager` dialog for image management

#### Frontend Components
- **VenueServices** (`src/components/VenueServices.tsx`)
  - Now uses `useServicePrimaryImage` hook to display centralized images
  - Removed dependency on venue-specific service images

- **BookingForm** (`src/components/BookingForm.tsx`)
  - Added `ServiceImageDisplay` component
  - Uses centralized service images instead of venue-specific ones

#### Partner Interface
- **AddVenue** (`src/pages/partner/AddVenue.tsx`)
  - Removed `ServiceImageUpload` component
  - Added informational message about centralized image management

- **EditVenue** (`src/pages/partner/EditVenue.tsx`)
  - Removed service image upload functionality
  - Added informational message about centralized image management

### 4. Data Migration

#### Migration Scripts
1. **`20250120000000_centralize_service_images.sql`**
   - Creates the `service_images` table
   - Sets up proper constraints and triggers
   - Ensures only one primary image per service

2. **`20250120000001_migrate_existing_service_images.sql`**
   - Migrates existing service images from `venue_services.images` to `service_images`
   - Removes the `images` column from `venue_services`

#### Migration Runner
- **`run-service-image-migration.js`**
  - Executes the database migrations
  - Verifies the migration was successful
  - Provides status updates and next steps

### 5. Type Updates

#### Database Types (`src/integrations/supabase/types.ts`)
- Added `service_images` table types
- Removed `images` field from `venue_services` types

#### Interface Updates
- **VenueService** (`src/hooks/useVenues.ts`)
  - Removed `images: string[]` field

- **ServiceWithGuestPricing** (`src/utils/guestPricing.ts`)
  - Removed `images?: string[]` field

## How It Works

### For Administrators
1. Navigate to Admin → Services
2. Click "Images" button for any service
3. Upload, edit, or delete service images
4. Set which image should be the primary image
5. Images are automatically applied to all venues offering that service

### For Venue Owners
1. Service images are automatically displayed from the centralized system
2. No longer need to upload individual service images
3. Contact support to request image updates for specific services

### For Users
1. See consistent, high-quality service images across all venues
2. Better visual experience with standardized branding
3. Improved accessibility with proper alt text

## Benefits

1. **Consistency**: All venues offering the same service show the same high-quality images
2. **Brand Control**: Administrators maintain control over service branding
3. **Quality Assurance**: Centralized management ensures image quality standards
4. **Efficiency**: Venue owners no longer need to manage service images individually
5. **Accessibility**: Proper alt text and image management for better accessibility
6. **Performance**: Optimized image loading and caching

## Migration Instructions

### 1. Run Database Migrations
```bash
node run-service-image-migration.js
```

### 2. Update Application Code
The code changes have already been implemented. Ensure all components are using the new centralized image system.

### 3. Test the System
1. Test admin image management interface
2. Verify service images display correctly in venue listings
3. Check that booking forms show the correct service images
4. Ensure partner interface shows appropriate messaging

### 4. Clean Up (Optional)
- Remove the old `ServiceImageUpload` component if no longer needed
- Update any remaining references to venue-specific service images

## Future Enhancements

1. **Image Optimization**: Automatic image resizing and optimization
2. **CDN Integration**: Serve images through a CDN for better performance
3. **Bulk Upload**: Allow admins to upload multiple images at once
4. **Image Analytics**: Track which service images perform best
5. **A/B Testing**: Test different images for the same service

## Troubleshooting

### Common Issues

1. **Images not displaying**: Check that the `service_images` table has data and the service has a primary image
2. **Migration errors**: Ensure the database has proper permissions and the service role key is correct
3. **Type errors**: Make sure all TypeScript types are updated to reflect the new schema

### Support

For issues with the centralized service image system, contact the development team or check the admin interface for image management options.
