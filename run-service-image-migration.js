#!/usr/bin/env node

/**
 * Migration script to centralize service images
 * This script will:
 * 1. Run the database migrations to create the service_images table
 * 2. Migrate existing service images from venue_services to the new centralized table
 * 3. Remove the images column from venue_services
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting service image centralization migration...\n');

  try {
    // Step 1: Create the service_images table
    console.log('📋 Step 1: Creating service_images table...');
    const migration1Path = path.join(__dirname, 'supabase/migrations/20250120000000_centralize_service_images.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
    
    const { error: migration1Error } = await supabase.rpc('exec_sql', { sql: migration1SQL });
    if (migration1Error) {
      console.error('❌ Error creating service_images table:', migration1Error);
      throw migration1Error;
    }
    console.log('✅ Service images table created successfully\n');

    // Step 2: Migrate existing service images
    console.log('📋 Step 2: Migrating existing service images...');
    const migration2Path = path.join(__dirname, 'supabase/migrations/20250120000001_migrate_existing_service_images.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    
    const { error: migration2Error } = await supabase.rpc('exec_sql', { sql: migration2SQL });
    if (migration2Error) {
      console.error('❌ Error migrating existing service images:', migration2Error);
      throw migration2Error;
    }
    console.log('✅ Existing service images migrated successfully\n');

    // Step 3: Verify the migration
    console.log('📋 Step 3: Verifying migration...');
    
    // Check service_images table
    const { data: serviceImages, error: serviceImagesError } = await supabase
      .from('service_images')
      .select('*')
      .limit(5);
    
    if (serviceImagesError) {
      console.error('❌ Error querying service_images table:', serviceImagesError);
      throw serviceImagesError;
    }
    
    console.log(`✅ Service images table contains ${serviceImages.length} records (showing first 5):`);
    serviceImages.forEach(img => {
      console.log(`   - Service ID: ${img.service_id}, Image: ${img.image_url.substring(0, 50)}...`);
    });

    // Check that venue_services no longer has images column
    const { data: venueServices, error: venueServicesError } = await supabase
      .from('venue_services')
      .select('*')
      .limit(1);
    
    if (venueServicesError) {
      console.error('❌ Error querying venue_services table:', venueServicesError);
      throw venueServicesError;
    }
    
    if (venueServices.length > 0 && venueServices[0].images !== undefined) {
      console.log('⚠️  Warning: venue_services still has images column');
    } else {
      console.log('✅ venue_services images column removed successfully');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your application code to use the new centralized service images');
    console.log('   2. Test the admin interface for managing service images');
    console.log('   3. Verify that service images display correctly in the frontend');
    console.log('   4. Remove the old ServiceImageUpload component if no longer needed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
