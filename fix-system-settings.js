#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixSystemSettings() {
  console.log('🔧 Fixing System Settings...\n');

  try {
    // 1. Check current system settings
    console.log('1️⃣ Current system settings:');
    const { data: currentSettings, error: currentError } = await supabase
      .rpc('get_system_settings');

    if (currentError) {
      console.error('❌ Error fetching current settings:', currentError);
      return;
    }

    console.log('📊 Current Settings:', currentSettings);
    console.log('');

    // 2. Update system settings to set booking_timeout_minutes
    console.log('2️⃣ Updating system settings...');
    const { data: updateResult, error: updateError } = await supabase
      .from('system_settings')
      .update({ 
        booking_timeout_minutes: 5,
        updated_at: new Date().toISOString()
      })
      .select();

    if (updateError) {
      console.error('❌ Error updating settings:', updateError);
      return;
    }

    console.log('✅ System settings updated:', updateResult);
    console.log('');

    // 3. Verify the update
    console.log('3️⃣ Verifying updated settings:');
    const { data: updatedSettings, error: verifyError } = await supabase
      .rpc('get_system_settings');

    if (verifyError) {
      console.error('❌ Error verifying settings:', verifyError);
      return;
    }

    console.log('📊 Updated Settings:', updatedSettings);
    console.log('');

    // 4. Test the debug function again
    console.log('4️⃣ Testing debug function with fixed settings:');
    const { data: debugResult, error: debugError } = await supabase
      .rpc('debug_timezone_calculation');

    if (debugError) {
      console.error('❌ Error testing debug:', debugError);
      return;
    }

    console.log('📊 Debug Results with Fixed Settings:');
    debugResult?.forEach(row => {
      console.log(`   Current UTC Time: ${row.current_utc_time}`);
      console.log(`   Current Tbilisi Time: ${row.current_tbilisi_time}`);
      console.log(`   Timeout Minutes: ${row.timeout_minutes}`);
      console.log(`   Cutoff Time: ${row.cutoff_time}`);
      console.log(`   Pending Bookings: ${row.pending_bookings_count}`);
      console.log(`   Expired Bookings: ${row.expired_bookings_count}`);
    });
    console.log('');

    // 5. Test the expiration function
    console.log('5️⃣ Testing expiration function with fixed settings:');
    const { data: expirationResult, error: expirationError } = await supabase
      .rpc('update_expired_bookings_tz');

    if (expirationError) {
      console.error('❌ Error testing expiration:', expirationError);
      return;
    }

    console.log('✅ Expiration function executed successfully');
    console.log('');

    // 6. Check final results
    console.log('6️⃣ Final results:');
    const { data: finalResult, error: finalError } = await supabase
      .rpc('debug_timezone_calculation');

    if (finalError) {
      console.error('❌ Error testing final debug:', finalError);
      return;
    }

    console.log('📊 Final Results:');
    finalResult?.forEach(row => {
      console.log(`   Pending Bookings: ${row.pending_bookings_count}`);
      console.log(`   Expired Bookings: ${row.expired_bookings_count}`);
    });

    if (finalResult?.[0]?.pending_bookings_count === 0) {
      console.log('\n🎉 SUCCESS! All pending bookings have been expired!');
      console.log('✅ The booking expiration system is now working correctly.');
    } else {
      console.log('\n⚠️  Still have pending bookings. The issue might be elsewhere.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSystemSettings();
