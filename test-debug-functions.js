#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDebugFunctions() {
  console.log('🔍 Testing Debug Functions...\n');

  try {
    // 1. Test timezone calculation debug
    console.log('1️⃣ Timezone calculation debug:');
    const { data: timezoneDebug, error: timezoneError } = await supabase
      .rpc('debug_timezone_calculation');

    if (timezoneError) {
      console.error('❌ Error testing timezone debug:', timezoneError);
      return;
    }

    console.log('📊 Timezone Debug Results:');
    timezoneDebug?.forEach(row => {
      console.log(`   Current UTC Time: ${row.current_utc_time}`);
      console.log(`   Current Tbilisi Time: ${row.current_tbilisi_time}`);
      console.log(`   Timeout Minutes: ${row.timeout_minutes}`);
      console.log(`   Cutoff Time: ${row.cutoff_time}`);
      console.log(`   Pending Bookings: ${row.pending_bookings_count}`);
      console.log(`   Expired Bookings: ${row.expired_bookings_count}`);
    });
    console.log('');

    // 2. Test pending bookings debug
    console.log('2️⃣ Pending bookings debug:');
    const { data: pendingDebug, error: pendingError } = await supabase
      .rpc('debug_pending_bookings');

    if (pendingError) {
      console.error('❌ Error testing pending debug:', pendingError);
      return;
    }

    console.log('📋 Pending Bookings Debug:');
    pendingDebug?.forEach(row => {
      console.log(`   Booking ID: ${row.booking_id.substring(0, 8)}...`);
      console.log(`   Created At: ${row.created_at}`);
      console.log(`   Age Minutes: ${row.age_minutes.toFixed(2)}`);
      console.log(`   Cutoff Time: ${row.cutoff_time}`);
      console.log(`   Should Be Expired: ${row.should_be_expired ? 'YES' : 'NO'}`);
      console.log('');
    });

    // 3. Now test the actual expiration function
    console.log('3️⃣ Testing expiration function:');
    const { data: expirationResult, error: expirationError } = await supabase
      .rpc('update_expired_bookings_tz');

    if (expirationError) {
      console.error('❌ Error testing expiration:', expirationError);
      return;
    }

    console.log('✅ Expiration function executed successfully');
    console.log('');

    // 4. Check results after expiration
    console.log('4️⃣ Results after expiration:');
    const { data: finalDebug, error: finalError } = await supabase
      .rpc('debug_timezone_calculation');

    if (finalError) {
      console.error('❌ Error testing final debug:', finalError);
      return;
    }

    console.log('📊 Final Results:');
    finalDebug?.forEach(row => {
      console.log(`   Pending Bookings: ${row.pending_bookings_count}`);
      console.log(`   Expired Bookings: ${row.expired_bookings_count}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDebugFunctions();
