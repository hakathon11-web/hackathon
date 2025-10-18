#!/usr/bin/env node

/**
 * Authentication Debug Test
 * 
 * This script helps debug authentication issues by testing:
 * 1. User session validity
 * 2. JWT token expiration
 * 3. Edge function authentication
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthentication() {
  console.log('🔍 Testing Authentication...\n');

  try {
    // 1. Check current session
    console.log('1. Checking current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError.message);
      return;
    }

    if (!sessionData.session) {
      console.log('ℹ️  No active session found');
      console.log('💡 User needs to sign in');
      return;
    }

    const session = sessionData.session;
    console.log('✅ Active session found');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('   Expires at:', new Date(session.expires_at * 1000).toISOString());
    console.log('   Is expired:', session.expires_at * 1000 < Date.now());

    // 2. Test JWT token validity
    console.log('\n2. Testing JWT token validity...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ JWT token validation failed:', userError.message);
      return;
    }

    console.log('✅ JWT token is valid');
    console.log('   User ID:', userData.user.id);
    console.log('   Email:', userData.user.email);

    // 3. Test edge function authentication
    console.log('\n3. Testing edge function authentication...');
    
    // Create a test payload
    const testPayload = {
      amount: 100,
      bookingData: {
        venueId: 'test-venue-id',
        venueName: 'Test Venue',
        date: '2024-01-01',
        time: '12:00',
        guests: 2,
        serviceIds: [],
        serviceBookings: [],
        specialRequests: '',
      },
      locale: 'en',
      mock: true, // Use mock mode for testing
    };

    console.log('   Calling bog-create-order with test payload...');
    const { data, error } = await supabase.functions.invoke('bog-create-order', {
      body: testPayload,
    });

    if (error) {
      console.error('❌ Edge function call failed:', error);
      if (error.message?.includes('Invalid credentials')) {
        console.log('💡 This suggests the JWT token is invalid or expired');
        console.log('💡 Try refreshing the session or signing in again');
      }
      return;
    }

    console.log('✅ Edge function call successful');
    console.log('   Response:', data);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

async function testGuestFlow() {
  console.log('\n🔍 Testing Guest Flow...\n');

  try {
    const testPayload = {
      amount: 100,
      bookingData: {
        venueId: 'test-venue-id',
        venueName: 'Test Venue',
        date: '2024-01-01',
        time: '12:00',
        guests: 2,
        serviceIds: [],
        serviceBookings: [],
        specialRequests: '',
      },
      locale: 'en',
      guestEmail: 'test@example.com',
      mock: true, // Use mock mode for testing
    };

    console.log('   Calling bog-create-order-guest with test payload...');
    const { data, error } = await supabase.functions.invoke('bog-create-order-guest', {
      body: testPayload,
    });

    if (error) {
      console.error('❌ Guest edge function call failed:', error);
      return;
    }

    console.log('✅ Guest edge function call successful');
    console.log('   Response:', data);

  } catch (error) {
    console.error('❌ Guest test failed with error:', error);
  }
}

async function main() {
  console.log('🚀 Authentication Debug Test\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...\n');

  await testAuthentication();
  await testGuestFlow();

  console.log('\n✅ Test completed');
}

main().catch(console.error);

