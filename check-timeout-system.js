import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTimeoutSystem() {
  console.log('🔍 Checking booking timeout system...\n');
  
  try {
    // 1. Check if cron extension exists
    console.log('1️⃣ Checking pg_cron extension...');
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'pg_cron');

    if (extError) {
      console.log('   ⚠️ Could not check extensions (normal if no access)');
    } else if (extensions && extensions.length > 0) {
      console.log('   ✅ pg_cron extension is installed');
    } else {
      console.log('   ❌ pg_cron extension not found');
    }

    // 2. Check if the timezone-aware function exists
    console.log('\n2️⃣ Testing timezone-aware expiration function...');
    const { data: tzResult, error: tzError } = await supabase
      .rpc('update_expired_bookings_tz');

    if (tzError) {
      console.log('   ❌ Error calling timezone-aware function:', tzError.message);
    } else {
      console.log('   ✅ Timezone-aware function executed successfully');
    }

    // 3. Test the debug function
    console.log('\n3️⃣ Getting timezone debug info...');
    const { data: debugResult, error: debugError } = await supabase
      .rpc('debug_timezone_calculation');

    if (debugError) {
      console.log('   ❌ Error calling debug function:', debugError.message);
    } else if (debugResult && debugResult.length > 0) {
      const debug = debugResult[0];
      console.log('   ✅ Debug info:');
      console.log('     Current UTC time:', debug.current_utc_time);
      console.log('     Current Tbilisi time:', debug.current_tbilisi_time);
      console.log('     Timeout minutes:', debug.timeout_minutes);
      console.log('     Cutoff time:', debug.cutoff_time);
      console.log('     Pending bookings:', debug.pending_bookings_count);
      console.log('     Expired bookings:', debug.expired_bookings_count);
    }

    // 4. Check pending bookings details
    console.log('\n4️⃣ Checking pending bookings details...');
    const { data: pendingResult, error: pendingError } = await supabase
      .rpc('debug_pending_bookings');

    if (pendingError) {
      console.log('   ❌ Error getting pending bookings:', pendingError.message);
    } else if (pendingResult && pendingResult.length > 0) {
      console.log(`   📊 Found ${pendingResult.length} pending bookings:`);
      pendingResult.forEach((booking, index) => {
        console.log(`     ${index + 1}. Booking ${booking.booking_id.slice(0, 8)}...`);
        console.log(`        Created: ${booking.created_at}`);
        console.log(`        Age: ${Math.round(booking.age_minutes)} minutes`);
        console.log(`        Should be expired: ${booking.should_be_expired}`);
      });
    } else {
      console.log('   ✅ No pending bookings found');
    }

    // 5. Test the original function too
    console.log('\n5️⃣ Testing original expiration function...');
    const { data: originalResult, error: originalError } = await supabase
      .rpc('update_expired_bookings');

    if (originalError) {
      console.log('   ❌ Error calling original function:', originalError.message);
    } else {
      console.log('   ✅ Original function executed successfully');
    }

    // 6. Try calling the edge function
    console.log('\n6️⃣ Testing edge function...');
    const { data: edgeResult, error: edgeError } = await supabase.functions
      .invoke('auto-reject-expired-bookings');

    if (edgeError) {
      console.log('   ❌ Error calling edge function:', edgeError.message);
    } else {
      console.log('   ✅ Edge function result:', edgeResult);
    }

  } catch (error) {
    console.error('❌ Error checking timeout system:', error);
  }
}

checkTimeoutSystem();