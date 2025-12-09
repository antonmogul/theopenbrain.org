<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Supabase Connection Test</h1>
    
    <div v-if="loading" class="text-gray-600">
      Testing connection...
    </div>
    
    <div v-else class="space-y-4">
      <!-- Environment Variables -->
      <div class="border rounded p-4">
        <h2 class="font-semibold mb-2">1. Environment Variables</h2>
        <div class="space-y-1 text-sm">
          <div>
            <span class="font-mono text-gray-600">VITE_SUPABASE_URL:</span>
            <span :class="envVars.url ? 'text-green-600' : 'text-red-600'">
              {{ envVars.url ? '✅ Found' : '❌ Missing' }}
            </span>
            <div v-if="envVars.url" class="text-xs text-gray-500 mt-1">
              {{ envVars.url.substring(0, 40) }}...
            </div>
          </div>
          <div>
            <span class="font-mono text-gray-600">VITE_SUPABASE_PUBLISHABLE_KEY:</span>
            <span :class="envVars.key ? 'text-green-600' : 'text-red-600'">
              {{ envVars.key ? '✅ Found' : '❌ Missing' }}
            </span>
            <div v-if="envVars.key" class="text-xs text-gray-500 mt-1">
              {{ envVars.key.substring(0, 30) }}...
            </div>
          </div>
        </div>
      </div>
      
      <!-- Database Connection -->
      <div class="border rounded p-4">
        <h2 class="font-semibold mb-2">2. Database Connection</h2>
        <div v-if="dbTest.error" class="text-red-600">
          ❌ Error: {{ dbTest.error }}
          <details v-if="dbTest.details" class="mt-2 text-xs">
            <summary class="cursor-pointer text-blue-600">Show details</summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded overflow-auto">{{ dbTest.details }}</pre>
          </details>
        </div>
        <div v-else-if="dbTest.success" class="text-green-600">
          ✅ Connection successful!
          <div class="text-sm text-gray-600 mt-1">
            <div v-if="dbTest.note">{{ dbTest.note }}</div>
            <div v-else>Profiles table accessible ({{ dbTest.count }} records)</div>
          </div>
        </div>
        <div v-else class="text-gray-600">
          Not tested yet
        </div>
      </div>
      
      <!-- Authentication -->
      <div class="border rounded p-4">
        <h2 class="font-semibold mb-2">3. Authentication</h2>
        <div v-if="authTest.error" class="text-red-600">
          ❌ Error: {{ authTest.error }}
        </div>
        <div v-else-if="authTest.session" class="text-green-600">
          ✅ User authenticated: {{ authTest.session.user.email }}
        </div>
        <div v-else class="text-gray-600">
          ℹ️ No active session (this is OK)
        </div>
      </div>
      
      <!-- Test Button -->
      <button
        @click="runTests"
        :disabled="loading"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {{ loading ? 'Testing...' : 'Run Tests' }}
      </button>
      
      <!-- Results Summary -->
      <div v-if="allTestsComplete" class="mt-4 p-4 rounded" :class="allTestsPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <h3 class="font-semibold mb-2">
          {{ allTestsPassed ? '🎉 All tests passed!' : '❌ Some tests failed' }}
        </h3>
        <div class="text-sm space-y-1">
          <div>Environment Variables: {{ envVars.url && envVars.key ? '✅' : '❌' }}</div>
          <div>Database Connection: {{ dbTest.success ? '✅' : '❌' }}</div>
          <div>Authentication: {{ authTest.error ? '❌' : '✅' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(false)
const envVars = ref({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
})

const dbTest = ref({
  success: false,
  error: null,
  count: 0,
  note: null,
  details: null
})

const authTest = ref({
  session: null,
  error: null
})

const allTestsComplete = computed(() => {
  return dbTest.value.success || dbTest.value.error || authTest.value.error !== null
})

const allTestsPassed = computed(() => {
  return envVars.value.url && 
         envVars.value.key && 
         dbTest.value.success && 
         !authTest.value.error
})

const runTests = async () => {
  loading.value = true
  dbTest.value = { success: false, error: null, count: 0 }
  authTest.value = { session: null, error: null }
  
  // Test database connection - try multiple approaches
  try {
    // Try querying a table that should exist - modules table (might be more permissive)
    let testPassed = false
    
    // First try: modules table
    const { data: modulesData, error: modulesError } = await supabase
      .from('modules')
      .select('id', { count: 'exact', head: true })
    
    if (!modulesError) {
      dbTest.value.success = true
      dbTest.value.count = 'Connection verified via modules table'
      dbTest.value.note = 'Database connection successful!'
      testPassed = true
    } else if (modulesError.code === '42P01') {
      // Table doesn't exist
      dbTest.value.error = `Table 'modules' not found. Did you run the migration?`
    } else {
      // Try profiles table as fallback
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        // Check error type
        if (error.code === 'PGRST301' || error.message.includes('permission denied') || error.message.includes('RLS')) {
          dbTest.value.success = true
          dbTest.value.count = 'N/A (RLS protected)'
          dbTest.value.error = null
          dbTest.value.note = 'Connection works! Table is protected by RLS (this is correct).'
        } else if (error.code === '42P01') {
          dbTest.value.error = `Table 'profiles' not found. Did you run the migration?`
        } else {
          dbTest.value.error = `${error.message} (Code: ${error.code || 'unknown'})`
          dbTest.value.details = JSON.stringify(error, null, 2)
        }
      } else {
        dbTest.value.success = true
        dbTest.value.count = count || 0
      }
    }
  } catch (err) {
    dbTest.value.error = err.message
    dbTest.value.details = err.stack
  }
  
  // Test authentication
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      authTest.value.error = error.message
    } else {
      authTest.value.session = session
    }
  } catch (err) {
    authTest.value.error = err.message
  }
  
  loading.value = false
}

// Auto-run tests on mount
runTests()
</script>

