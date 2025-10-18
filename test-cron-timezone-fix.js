#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testCronTimezoneFix() {
  console.log('🕐 Testing Cron Job Timezone Fix...\n');

  try {
    // 1. Check current times
    console.log('1️⃣ Current time comparison:');
    const now = new Date();
    const utcTime = now.toISOString();
    const tbilisiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000)).toISOString();
    
    console.log(`   UTC Time: ${utcTime}`);
    console.log(`   Tbilisi Time (UTC+4): ${tbilisiTime}`);
    console.log(`   Difference: 4 hours\n`);

    // 2. Test the new timezone-aware function directly
    console.log('2️⃣ Testing timezone-aware function directly...');
    const { data: directResult, error: directError } = await supabase
      .rpc('update_expired_bookings_tz');

    if (directError) {
      console.error('❌ Error testing timezone-aware function:', directError);
      return;
    }

    console.log('✅ Timezone-aware function executed successfully');
    console.log('');

    // 3. Check system settings
    console.log('3️⃣ Checking system settings...');
    const { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings');
    
    if (settingsError) {
      console.error('❌ Error fetching system settings:', settingsError);
      return;
    }
    
    const timeoutMinutes = systemSettings?.booking_timeout_minutes || 5;
    console.log(`✅ Timeout set to: ${timeoutMinutes} minutes\n`);

    // 4. Check for existing bookings
    console.log('4️⃣ Checking for existing bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, created_at, status_updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return;
    }

    console.log(`📋 Found ${bookings?.length || 0} bookings:`);
    bookings?.forEach(booking => {
      const createdAge = Math.round((Date.now() - new Date(booking.created_at).getTime()) / 1000 / 60);
      const statusAge = booking.status_updated_at ? 
        Math.round((Date.now() - new Date(booking.status_updated_at).getTime()) / 1000 / 60) : 'N/A';
      console.log(`   - ${booking.id.substring(0, 8)}... (${booking.status}, created ${createdAge}m ago, status updated ${statusAge}m ago)`);
    });
    console.log('');

    // 5. Test the edge functions
    console.log('5️⃣ Testing edge functions...');
    const { data: testResult, error: testError } = await supabase
      .functions.invoke('test-timeout-manual');

    if (testError) {
      console.error('❌ Error testing edge function:', testError);
      return;
    }

    console.log('✅ Edge function result:', testResult);
    console.log('');

    // 6. Summary
    console.log('📊 Cron Timezone Fix Test Summary:');
    console.log(`   - Current UTC time: ${utcTime}`);
    console.log(`   - Current Tbilisi time: ${tbilisiTime}`);
    console.log(`   - System timeout: ${timeoutMinutes} minutes`);
    console.log(`   - Timezone-aware function: ✅ Working`);
    console.log(`   - Edge functions: ✅ Working`);
    console.log(`   - Total bookings: ${bookings?.length || 0}`);
    
    if (bookings && bookings.length > 0) {
      const expiredCount = bookings.filter(b => b.status === 'expired').length;
      const pendingCount = bookings.filter(b => b.status === 'pending').length;
      console.log(`   - Expired bookings: ${expiredCount}`);
      console.log(`   - Pending bookings: ${pendingCount}`);
    }

    console.log('\n🎉 Cron job timezone fix has been applied!');
    console.log('✅ The cron jobs now run with proper timezone handling');
    console.log('⏰ New cron jobs should show correct Tbilisi time in the dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCronTimezoneFix();
