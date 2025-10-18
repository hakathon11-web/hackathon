#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugTimezoneCalculation() {
  console.log('🔍 Debugging Timezone Calculation...\n');

  try {
    // 1. Check current times
    console.log('1️⃣ Current time analysis:');
    const now = new Date();
    const utcTime = now.toISOString();
    const tbilisiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000)).toISOString();
    
    console.log(`   UTC Time: ${utcTime}`);
    console.log(`   Tbilisi Time (UTC+4): ${tbilisiTime}`);
    console.log(`   Difference: 4 hours\n`);

    // 2. Get system settings
    console.log('2️⃣ System settings:');
    const { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings');
    
    if (settingsError) {
      console.error('❌ Error fetching system settings:', settingsError);
      return;
    }
    
    const timeoutMinutes = systemSettings?.booking_timeout_minutes || 5;
    console.log(`   Timeout: ${timeoutMinutes} minutes\n`);

    // 3. Check pending bookings with detailed timestamps
    console.log('3️⃣ Detailed booking analysis:');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, created_at, status_updated_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return;
    }

    console.log(`📋 Found ${bookings?.length || 0} pending bookings:`);
    bookings?.forEach(booking => {
      const createdTime = new Date(booking.created_at);
      const nowTime = new Date();
      const ageMinutes = Math.round((nowTime.getTime() - createdTime.getTime()) / 1000 / 60);
      
      // Calculate what the cutoff time should be
      const cutoffTime = new Date(nowTime.getTime() + (4 * 60 * 60 * 1000) - (timeoutMinutes * 60 * 1000));
      const cutoffTimeUTC = new Date(cutoffTime.getTime() - (4 * 60 * 60 * 1000));
      
      const shouldBeExpired = createdTime < cutoffTimeUTC;
      
      console.log(`   - ${booking.id.substring(0, 8)}...`);
      console.log(`     Created: ${booking.created_at} (${ageMinutes}m ago)`);
      console.log(`     Cutoff time: ${cutoffTimeUTC.toISOString()}`);
      console.log(`     Should be expired: ${shouldBeExpired ? 'YES' : 'NO'}`);
      console.log('');
    });

    // 4. Test the database function directly with debug output
    console.log('4️⃣ Testing database function with debug:');
    
    // Create a debug function to see what's happening
    const { data: debugResult, error: debugError } = await supabase
      .rpc('update_expired_bookings_tz');

    if (debugError) {
      console.error('❌ Error testing function:', debugError);
      return;
    }

    console.log('✅ Function executed successfully');
    console.log('');

    // 5. Check bookings after function execution
    console.log('5️⃣ Bookings after function execution:');
    const { data: updatedBookings, error: updatedError } = await supabase
      .from('bookings')
      .select('id, status, created_at, status_updated_at')
      .order('created_at', { ascending: false });

    if (updatedError) {
      console.error('❌ Error fetching updated bookings:', updatedError);
      return;
    }

    const pendingCount = updatedBookings?.filter(b => b.status === 'pending').length || 0;
    const expiredCount = updatedBookings?.filter(b => b.status === 'expired').length || 0;
    
    console.log(`📊 Results:`);
    console.log(`   - Total bookings: ${updatedBookings?.length || 0}`);
    console.log(`   - Pending bookings: ${pendingCount}`);
    console.log(`   - Expired bookings: ${expiredCount}`);

    if (pendingCount > 0) {
      console.log('\n⚠️  Still have pending bookings that should be expired.');
      console.log('   The timezone calculation is still not working correctly.');
    } else {
      console.log('\n🎉 All pending bookings have been expired!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugTimezoneCalculation();
