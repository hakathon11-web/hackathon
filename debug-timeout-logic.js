#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugTimeoutLogic() {
  console.log('🔍 Debugging Timeout Logic...\n');

  try {
    // 1. Check current system settings
    console.log('1️⃣ Current system settings:');
    const { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings');
    
    if (settingsError) {
      console.error('❌ Error fetching system settings:', settingsError);
      return;
    }
    
    const timeoutMinutes = systemSettings?.[0]?.booking_timeout_minutes || 5;
    console.log(`   Timeout: ${timeoutMinutes} minutes`);
    console.log('');

    // 2. Check current times
    console.log('2️⃣ Current time analysis:');
    const now = new Date();
    const utcTime = now.toISOString();
    const tbilisiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000)).toISOString();
    
    console.log(`   UTC Time: ${utcTime}`);
    console.log(`   Tbilisi Time (UTC+4): ${tbilisiTime}`);
    console.log('');

    // 3. Create a fresh test booking
    console.log('3️⃣ Creating a fresh test booking...');
    
    // First, get a user and venue for the test
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError || !profiles || profiles.length === 0) {
      console.log('❌ No profiles found. Cannot create test booking.');
      return;
    }

    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id')
      .limit(1);

    if (venuesError || !venues || venues.length === 0) {
      console.log('❌ No venues found. Cannot create test booking.');
      return;
    }

    const testUserId = profiles[0].id;
    const testVenueId = venues[0].id;

    // Create a booking with current timestamp
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: testUserId,
        venue_id: testVenueId,
        status: 'pending',
        booking_date: new Date().toISOString().split('T')[0],
        total_price: 50.00
      })
      .select()
      .single();

    if (bookingError) {
      console.error('❌ Error creating test booking:', bookingError);
      return;
    }

    console.log(`✅ Test booking created: ${newBooking.id.substring(0, 8)}...`);
    console.log(`   Created at: ${newBooking.created_at}`);
    console.log(`   Status: ${newBooking.status}`);
    console.log('');

    // 4. Test the debug function to see the calculation
    console.log('4️⃣ Testing debug function with fresh booking:');
    const { data: debugResult, error: debugError } = await supabase
      .rpc('debug_timezone_calculation');

    if (debugError) {
      console.error('❌ Error testing debug:', debugError);
      return;
    }

    console.log('📊 Debug Results:');
    debugResult?.forEach(row => {
      console.log(`   Current UTC Time: ${row.current_utc_time}`);
      console.log(`   Current Tbilisi Time: ${row.current_tbilisi_time}`);
      console.log(`   Timeout Minutes: ${row.timeout_minutes}`);
      console.log(`   Cutoff Time: ${row.cutoff_time}`);
      console.log(`   Pending Bookings: ${row.pending_bookings_count}`);
      console.log(`   Expired Bookings: ${row.expired_bookings_count}`);
    });
    console.log('');

    // 5. Test pending bookings debug
    console.log('5️⃣ Pending bookings analysis:');
    const { data: pendingDebug, error: pendingError } = await supabase
      .rpc('debug_pending_bookings');

    if (pendingError) {
      console.error('❌ Error testing pending debug:', pendingError);
      return;
    }

    console.log('📋 Pending Bookings Analysis:');
    pendingDebug?.forEach(row => {
      console.log(`   Booking ID: ${row.booking_id.substring(0, 8)}...`);
      console.log(`   Created At: ${row.created_at}`);
      console.log(`   Age Minutes: ${row.age_minutes.toFixed(2)}`);
      console.log(`   Cutoff Time: ${row.cutoff_time}`);
      console.log(`   Should Be Expired: ${row.should_be_expired ? 'YES' : 'NO'}`);
      console.log('');
    });

    // 6. Wait a moment and test again
    console.log('6️⃣ Waiting 10 seconds and testing again...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const { data: debugResult2, error: debugError2 } = await supabase
      .rpc('debug_timezone_calculation');

    if (debugError2) {
      console.error('❌ Error testing debug 2:', debugError2);
      return;
    }

    console.log('📊 Debug Results After 10 seconds:');
    debugResult2?.forEach(row => {
      console.log(`   Current UTC Time: ${row.current_utc_time}`);
      console.log(`   Current Tbilisi Time: ${row.current_tbilisi_time}`);
      console.log(`   Timeout Minutes: ${row.timeout_minutes}`);
      console.log(`   Cutoff Time: ${row.cutoff_time}`);
      console.log(`   Pending Bookings: ${row.pending_bookings_count}`);
      console.log(`   Expired Bookings: ${row.expired_bookings_count}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugTimeoutLogic();
