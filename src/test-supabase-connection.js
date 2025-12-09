// Quick Supabase Connection Test
// Run this in browser console or as a test script

import { supabase } from './lib/supabase.js'

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n')
  
  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables...')
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!url) {
    console.error('❌ VITE_SUPABASE_URL is missing!')
    return false
  }
  if (!key) {
    console.error('❌ Supabase key is missing!')
    return false
  }
  
  console.log('✅ Environment variables found')
  console.log(`   URL: ${url.substring(0, 30)}...`)
  console.log(`   Key: ${key.substring(0, 20)}...\n`)
  
  // Test 2: Check Supabase client initialization
  console.log('2️⃣ Testing Supabase client...')
  if (!supabase) {
    console.error('❌ Supabase client not initialized!')
    return false
  }
  console.log('✅ Supabase client initialized\n')
  
  // Test 3: Test database connection (try to query profiles table)
  console.log('3️⃣ Testing database connection...')
  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      console.error('   Details:', error)
      return false
    }
    
    console.log('✅ Database connection successful!')
    console.log(`   Profiles table accessible (${count || 0} records)\n`)
  } catch (err) {
    console.error('❌ Database connection error:', err.message)
    return false
  }
  
  // Test 4: Test authentication
  console.log('4️⃣ Testing authentication...')
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Auth check failed:', error.message)
      return false
    }
    
    if (session) {
      console.log('✅ User is authenticated:', session.user.email)
    } else {
      console.log('ℹ️  No active session (this is OK for testing)')
    }
    console.log('')
  } catch (err) {
    console.error('❌ Auth error:', err.message)
    return false
  }
  
  console.log('🎉 All connection tests passed!')
  return true
}

// Export for use in components
export { testSupabaseConnection }

// If running directly, execute the test
if (import.meta.hot) {
  // In Vite dev environment, we can call it
  testSupabaseConnection()
}

