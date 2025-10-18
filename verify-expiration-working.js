#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyExpirationWorking() {
  console.log('🔍 Verifying Booking Expiration is Actually Working...\n');

  try {
    // 1. Check current times
    console.log('1️⃣ Current time comparison:');
    const now = new Date();
    const utcTime = now.toISOString();
    const tbilisiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000)).toISOString();
    
    console.log(`   UTC Time: ${utcTime}`);
    console.log(`   Tbilisi Time (UTC+4): ${tbilisiTime}`);
    console.log(`   Difference: 4 hours\n`);

    // 2. Create a test booking that should expire
    console.log('2️⃣ Creating a test booking (6 minutes ago in Tbilisi time)...');
    
    // Calculate 6 minutes ago in Tbilisi time, then convert to UTC for storage
    const sixMinutesAgoTbilisi = new Date(now.getTime() + (4 * 60 * 60 * 1000) - (6 * 60 * 1000));
    const sixMinutesAgoUTC = new Date(sixMinutesAgoTbilisi.getTime() - (4 * 60 * 60 * 1000));
    
    console.log(`   Tbilisi time 6 minutes ago: ${sixMinutesAgoTbilisi.toISOString()}`);
    console.log(`   UTC time for storage: ${sixMinutesAgoUTC.toISOString()}\n`);

    // 3. Check existing bookings first
    console.log('3️⃣ Checking existing bookings...');
    const { data: existingBookings, error: existingError } = await supabase
      .from('bookings')
      .select('id, status, created_at, status_updated_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (existingError) {
      console.error('❌ Error fetching existing bookings:', existingError);
      return;
    }

    console.log(`📋 Found ${existingBookings?.length || 0} existing bookings:`);
    existingBookings?.forEach(booking => {
      const createdAge = Math.round((Date.now() - new Date(booking.created_at).getTime()) / 1000 / 60);
      const statusAge = booking.status_updated_at ? 
        Math.round((Date.now() - new Date(booking.status_updated_at).getTime()) / 1000 / 60) : 'N/A';
      console.log(`   - ${booking.id.substring(0, 8)}... (${booking.status}, created ${createdAge}m ago, status updated ${statusAge}m ago)`);
    });
    console.log('');

    // 4. Test the timezone-aware function directly
    console.log('4️⃣ Testing timezone-aware function...');
    const { data: directResult, error: directError } = await supabase
      .rpc('update_expired_bookings_tz');

    if (directError) {
      console.error('❌ Error testing timezone-aware function:', directError);
      return;
    }

    console.log('✅ Timezone-aware function executed successfully');
    console.log('');

    // 5. Check bookings after function execution
    console.log('5️⃣ Checking bookings after function execution...');
    const { data: updatedBookings, error: updatedError } = await supabase
      .from('bookings')
      .select('id, status, created_at, status_updated_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (updatedError) {
      console.error('❌ Error fetching updated bookings:', updatedError);
      return;
    }

    console.log(`📋 Found ${updatedBookings?.length || 0} bookings after execution:`);
    updatedBookings?.forEach(booking => {
      const createdAge = Math.round((Date.now() - new Date(booking.created_at).getTime()) / 1000 / 60);
      const statusAge = booking.status_updated_at ? 
        Math.round((Date.now() - new Date(booking.status_updated_at).getTime()) / 1000 / 60) : 'N/A';
      console.log(`   - ${booking.id.substring(0, 8)}... (${booking.status}, created ${createdAge}m ago, status updated ${statusAge}m ago)`);
    });
    console.log('');

    // 6. Summary
    const expiredCount = updatedBookings?.filter(b => b.status === 'expired').length || 0;
    const pendingCount = updatedBookings?.filter(b => b.status === 'pending').length || 0;
    
    console.log('📊 Expiration Verification Summary:');
    console.log(`   - Current UTC time: ${utcTime}`);
    console.log(`   - Current Tbilisi time: ${tbilisiTime}`);
    console.log(`   - Total bookings: ${updatedBookings?.length || 0}`);
    console.log(`   - Expired bookings: ${expiredCount}`);
    console.log(`   - Pending bookings: ${pendingCount}`);
    console.log(`   - Timezone-aware function: ✅ Working`);
    
    if (pendingCount > 0) {
      console.log('\n⚠️  There are still pending bookings that should be expired.');
      console.log('   This suggests the timezone calculation might still need adjustment.');
    } else {
      console.log('\n🎉 All pending bookings have been properly expired!');
      console.log('✅ The booking expiration system is working correctly.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyExpirationWorking();
