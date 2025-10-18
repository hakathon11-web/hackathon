#!/usr/bin/env node

/**
 * Setup Project Configuration Script
 * 
 * This script helps configure the dynamic database settings for a new Supabase project.
 * It sets the project URL and service role key in the database so that cron jobs
 * and other database functions can work properly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these in your .env file');
  process.exit(1);
}

async function setupProjectConfig() {
  console.log('🔧 Setting up project configuration...');
  console.log(`   Project URL: ${SUPABASE_URL}`);
  console.log(`   Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Call the set_project_config function
    const { data, error } = await supabase.rpc('set_project_config', {
      project_url: SUPABASE_URL,
      service_role_key: SUPABASE_SERVICE_KEY
    });
    
    if (error) {
      console.error('❌ Failed to set project configuration:');
      console.error(error.message);
      process.exit(1);
    }
    
    console.log('✅ Configuration set successfully:', data);
    
    // Validate the configuration
    const { data: validation, error: validationError } = await supabase.rpc('validate_cron_config');
    
    if (validationError) {
      console.error('❌ Failed to validate configuration:');
      console.error(validationError.message);
      process.exit(1);
    }
    
    console.log('\n📋 Configuration Status:');
    validation.forEach(row => {
      const status = row.is_configured ? '✅' : '❌';
      console.log(`   ${status} ${row.setting_name}: ${row.value_preview}`);
    });
    
    console.log('\n🎉 Project configuration completed successfully!');
    console.log('Your cron jobs and database functions should now work properly.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupProjectConfig();
