#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wdquunptqiglffuiehfk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXV1bnB0cWlnbGZmdWllaGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzgzMzQyMCwiZXhwIjoyMDczNDA5NDIwfQ.T9N3YPFX9PzeVsm7eXFGOjeT1OdgayEidTlUJHAo5wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testTimeoutWaiting() {
  console.log('⏰ Testing Timeout Waiting Logic...\n');

  try {
    // 1. Get system settings
    console.log('1️⃣ System settings:');
    const { data: systemSettings, error: settingsError } = await supabase
      .rpc('get_system_settings');
    
    if (settingsError) {
      console.error('❌ Error fetching system settings:', settingsError);
      return;
    }
    
    const timeoutMinutes = systemSettings?.[0]?.booking_timeout_minutes || 5;
    console.log(`   Timeout: ${timeoutMinutes} minutes`);
    console.log('');

    // 2. Create a test booking
    console.log('2️⃣ Creating test booking...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError || !profiles || profiles.length === 0) {
      console.log('❌ No profiles found.');
      return;
    }

    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id')
      .limit(1);

    if (venuesError || !venues || venues.length === 0) {
      console.log('❌ No venues found.');
      return;
    }

    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: profiles[0].id,
        venue_id: venues[0].id,
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

    // 3. Monitor the booking for the timeout period
    console.log(`3️⃣ Monitoring booking for ${timeoutMinutes} minutes...`);
    console.log('   (This will check every 30 seconds)');
    console.log('');

    const startTime = new Date();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const checkInterval = 30000; // 30 seconds
    let checks = 0;
    let maxChecks = Math.ceil(timeoutMs / checkInterval) + 2; // +2 for safety

    const monitorInterval = setInterval(async () => {
      checks++;
      const currentTime = new Date();
      const elapsedMs = currentTime.getTime() - startTime.getTime();
      const elapsedMinutes = Math.round(elapsedMs / 60000 * 100) / 100;

      console.log(`   Check ${checks}: ${elapsedMinutes} minutes elapsed`);

      try {
        // Check the booking status
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('id, status, created_at, status_updated_at')
          .eq('id', newBooking.id)
          .single();

        if (bookingError) {
          console.error('❌ Error fetching booking:', bookingError);
          return;
        }

        console.log(`     Status: ${booking.status}`);
        if (booking.status_updated_at) {
          console.log(`     Status updated: ${booking.status_updated_at}`);
        }

        // Check debug info
        const { data: debugResult, error: debugError } = await supabase
          .rpc('debug_timezone_calculation');

        if (!debugError && debugResult) {
          const row = debugResult[0];
          console.log(`     Pending bookings: ${row.pending_bookings_count}`);
          console.log(`     Expired bookings: ${row.expired_bookings_count}`);
        }

        // If booking is expired, we're done
        if (booking.status === 'expired') {
          console.log(`\n🎉 SUCCESS! Booking expired after ${elapsedMinutes} minutes!`);
          console.log('✅ The timeout logic is working correctly.');
          clearInterval(monitorInterval);
          return;
        }

        // If we've exceeded the timeout period and booking is still pending, something's wrong
        if (elapsedMs > timeoutMs + 60000) { // +1 minute tolerance
          console.log(`\n⚠️  Booking is still pending after ${elapsedMinutes} minutes (timeout: ${timeoutMinutes} minutes)`);
          console.log('❌ The timeout logic might not be working correctly.');
          clearInterval(monitorInterval);
          return;
        }

        // If we've done too many checks, stop
        if (checks >= maxChecks) {
          console.log(`\n⏰ Monitoring stopped after ${checks} checks (${elapsedMinutes} minutes)`);
          console.log('   The booking should expire soon if the logic is working.');
          clearInterval(monitorInterval);
          return;
        }

      } catch (error) {
        console.error('❌ Error during monitoring:', error);
        clearInterval(monitorInterval);
        return;
      }

      console.log('');
    }, checkInterval);

    // Also run the expiration function manually every minute to ensure it runs
    const expirationInterval = setInterval(async () => {
      try {
        const { data: result, error } = await supabase
          .rpc('update_expired_bookings_tz');
        
        if (!error) {
          console.log('   🔄 Expiration function executed');
        }
      } catch (error) {
        console.error('❌ Error running expiration function:', error);
      }
    }, 60000); // Every minute

    // Clean up intervals after timeout + 2 minutes
    setTimeout(() => {
      clearInterval(monitorInterval);
      clearInterval(expirationInterval);
    }, timeoutMs + 120000);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testTimeoutWaiting();
