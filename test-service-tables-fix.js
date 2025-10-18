// Test script to verify the service tables fix
// Run this after applying the migration to ensure everything works correctly

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testServiceTablesFix() {
  console.log('🧪 Testing Service Tables Fix...\n');

  try {
    // Test 1: Verify services table has translations
    console.log('1️⃣ Testing services table structure...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, name_en, name_ka, type')
      .limit(5);

    if (servicesError) {
      console.error('❌ Services table error:', servicesError.message);
      return;
    }

    console.log('✅ Services table structure is correct');
    services.forEach(service => {
      console.log(`   📋 ${service.name}:`);
      console.log(`      🇺🇸 EN: ${service.name_en || 'NOT SET'}`);
      console.log(`      🇬🇪 KA: ${service.name_ka || 'NOT SET'}`);
    });

    // Test 2: Verify venue_services table structure
    console.log('\n2️⃣ Testing venue_services table structure...');
    
    // Check if the problematic columns were removed
    const { data: venueServicesSchema } = await supabase
      .from('venue_services')
      .select('*')
      .limit(1);

    if (venueServicesSchema && venueServicesSchema[0]) {
      const columns = Object.keys(venueServicesSchema[0]);
      const hasNameEn = columns.includes('name_en');
      const hasNameKa = columns.includes('name_ka');
      
      if (hasNameEn || hasNameKa) {
        console.log('❌ venue_services still has duplicate translation fields!');
        console.log('   Found columns:', columns.filter(c => c.includes('name')));
      } else {
        console.log('✅ venue_services duplicate fields removed successfully');
        console.log('   Remaining name fields:', columns.filter(c => c.includes('name')));
      }
    }

    // Test 3: Test join query (how the app actually gets data)
    console.log('\n3️⃣ Testing service joins...');
    const { data: venueServices, error: joinError } = await supabase
      .from('venue_services')
      .select(`
        id, name, price,
        services (
          name, name_en, name_ka, type
        )
      `)
      .limit(3);

    if (joinError) {
      console.error('❌ Join query error:', joinError.message);
      return;
    }

    console.log('✅ Service joins working correctly');
    venueServices?.forEach(vs => {
      console.log(`   🏪 Venue Service: ${vs.name || 'No override'}`);
      console.log(`      📊 Base Service: ${vs.services?.name}`);
      console.log(`      🇺🇸 EN: ${vs.services?.name_en || 'NOT SET'}`);
      console.log(`      🇬🇪 KA: ${vs.services?.name_ka || 'NOT SET'}`);
    });

    // Test 4: Check for orphaned venue_services
    console.log('\n4️⃣ Checking for data consistency...');
    const { data: orphans } = await supabase
      .from('venue_services')
      .select('id, name, service_id')
      .is('service_id', null);

    if (orphans && orphans.length > 0) {
      console.log(`❌ Found ${orphans.length} venue_services without service_id`);
      orphans.forEach(o => console.log(`   Orphan: ${o.name} (ID: ${o.id})`));
    } else {
      console.log('✅ No orphaned venue_services found');
    }

    console.log('\n✅ Service tables fix verification completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the admin panel - edit service translations');
    console.log('   2. Check frontend - verify proper language switching');
    console.log('   3. Test booking dialogs - ensure correct service names');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testServiceTablesFix();
