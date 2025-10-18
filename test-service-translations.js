// Test script for the new service translation system
// Run this after applying the migration scripts

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServiceTranslations() {
  console.log('🧪 Testing Service Translations System...\n');

  try {
    // Test 1: Check if migration columns exist
    console.log('1️⃣ Testing database schema...');
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, name_en, name_ka')
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error.message);
      if (error.message.includes('column "name_en" does not exist')) {
        console.log('💡 Please run the migration scripts first:');
        console.log('   - 20250929000000_add_service_name_translations.sql');
        console.log('   - 20250929000001_populate_service_translations.sql');
      }
      return;
    }

    console.log('✅ Database schema is correct');

    // Test 2: Check if services have translations
    console.log('\n2️⃣ Checking existing service translations...');
    const { data: allServices } = await supabase
      .from('services')
      .select('id, name, name_en, name_ka, is_visible')
      .eq('is_visible', true)
      .order('sort_order');

    if (allServices && allServices.length > 0) {
      console.log(`✅ Found ${allServices.length} visible services:`);
      allServices.forEach(service => {
        console.log(`   📋 ${service.name}:`);
        console.log(`      🇺🇸 EN: ${service.name_en || 'NOT SET'}`);
        console.log(`      🇬🇪 KA: ${service.name_ka || 'NOT SET'}`);
      });

      // Check for missing translations
      const missingEnglish = allServices.filter(s => !s.name_en).length;
      const missingGeorgian = allServices.filter(s => !s.name_ka).length;

      if (missingEnglish > 0) {
        console.log(`⚠️  ${missingEnglish} services missing English translations`);
      }
      if (missingGeorgian > 0) {
        console.log(`⚠️  ${missingGeorgian} services missing Georgian translations`);
      }
      if (missingEnglish === 0 && missingGeorgian === 0) {
        console.log('✅ All services have complete translations!');
      }
    } else {
      console.log('⚠️  No visible services found');
    }

    // Test 3: Create a test service with translations
    console.log('\n3️⃣ Testing service creation with translations...');
    const testServiceName = `test_service_${Date.now()}`;
    
    const { data: newService, error: createError } = await supabase
      .from('services')
      .insert({
        name: testServiceName,
        name_en: 'Test Gaming Service',
        name_ka: 'ტესტის სათამაშო სერვისი',
        type: 'gaming',
        description: 'Test service for translation system',
        pricing_model: 'hourly',
        is_visible: false, // Hidden test service
        sort_order: 999
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create test service:', createError.message);
    } else {
      console.log('✅ Test service created successfully:');
      console.log(`   ID: ${newService.id}`);
      console.log(`   Name: ${newService.name}`);
      console.log(`   English: ${newService.name_en}`);
      console.log(`   Georgian: ${newService.name_ka}`);

      // Clean up test service
      await supabase
        .from('services')
        .delete()
        .eq('id', newService.id);
      console.log('🧹 Test service cleaned up');
    }

    console.log('\n✅ Service translation system test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your React components to use the new useServiceTranslation hook');
    console.log('   2. Use admin panel to create services with proper translations');
    console.log('   3. Test the admin interface by creating/editing services');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testServiceTranslations();
