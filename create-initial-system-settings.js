import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createInitialSettings() {
  console.log('🔧 Creating initial system settings...\n');
  
  try {
    // 1. Check if settings already exist
    console.log('1️⃣ Checking existing system settings...');
    const { data: existingSettings, error: getError } = await supabase
      .from('system_settings')
      .select('*');

    if (getError) {
      console.log('   ❌ Error checking settings:', getError.message);
      return;
    }

    if (existingSettings && existingSettings.length > 0) {
      console.log('   ✅ System settings already exist:', existingSettings[0]);
      console.log('   📝 Booking timeout:', existingSettings[0].booking_timeout_minutes, 'minutes');
      return;
    }

    // 2. Create initial settings with service role key
    console.log('2️⃣ Creating initial system settings...');
    const { data: newSettings, error: createError } = await supabase
      .from('system_settings')
      .insert({
        booking_timeout_minutes: 5,
        auto_approval_enabled: false,
        email_notifications_enabled: true,
        review_moderation_enabled: true,
        require_email_verification: true,
        allow_guest_bookings: false,
        default_commission_rate: 15,
        minimum_booking_amount: 25,
        max_advance_booking_days: 90,
        maintenance_mode: false
      })
      .select();

    if (createError) {
      console.log('   ❌ Error creating settings:', createError.message);
      return;
    }

    console.log('   ✅ Created initial system settings:', newSettings[0]);

    // 3. Test that the timeout system works now
    console.log('\n3️⃣ Testing timeout system with new settings...');
    const { data: debugResult, error: debugError } = await supabase
      .rpc('debug_timezone_calculation');

    if (debugError) {
      console.log('   ❌ Error testing functions:', debugError.message);
    } else if (debugResult && debugResult.length > 0) {
      const debug = debugResult[0];
      console.log('   ✅ Timeout system working:');
      console.log('     Timeout minutes:', debug.timeout_minutes);
      console.log('     Cutoff time:', debug.cutoff_time);
    }

    console.log('\n✅ Initial system settings created successfully!');
    console.log('📝 Admins can now configure booking timeout from /admin/settings page');

  } catch (error) {
    console.error('❌ Error creating initial settings:', error);
  }
}

createInitialSettings();