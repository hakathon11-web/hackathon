import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSystemTable() {
  console.log('🔍 Debugging system_settings table...\n');
  
  try {
    // 1. Direct table query
    console.log('1️⃣ Direct table query...');
    const { data: directData, error: directError } = await supabase
      .from('system_settings')
      .select('*');

    if (directError) {
      console.log('   ❌ Error with direct query:', directError.message);
    } else {
      console.log('   📊 Direct data:', directData);
      console.log('   📊 Row count:', directData ? directData.length : 0);
    }

    // 2. Function query
    console.log('\n2️⃣ Function query...');
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_system_settings');

    if (funcError) {
      console.log('   ❌ Error with function query:', funcError.message);
    } else {
      console.log('   📊 Function data:', funcData);
      console.log('   📊 Row count:', funcData ? funcData.length : 0);
    }

    // 3. Check if we can insert a row manually (with service role key)
    console.log('\n3️⃣ Testing INSERT permissions...');
    const { data: insertData, error: insertError } = await supabase
      .from('system_settings')
      .insert({
        booking_timeout_minutes: 5
      })
      .select();

    if (insertError) {
      console.log('   ❌ Cannot insert:', insertError.message);
    } else {
      console.log('   ✅ Insert successful:', insertData);
    }

  } catch (error) {
    console.error('❌ Error debugging system table:', error);
  }
}

debugSystemTable();