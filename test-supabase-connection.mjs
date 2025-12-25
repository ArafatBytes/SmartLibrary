// Simple test script to verify Supabase connection
// Run with: node test-supabase-connection.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kdjznrpfmpslvzhhdxga.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkanpucnBmbXBzbHZ6aGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQxNTcsImV4cCI6MjA4MDQzMDE1N30.iEfh6Fgc3jzglvlVrSnd_vCj7UacfHpLs6S797qE3oY'

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

try {
  // Try to query categories table
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .limit(1)

  if (error) {
    if (error.code === '42P01') {
      console.log('✅ Connection successful! (Table "categories" does not exist yet - run migrations)')
    } else {
      console.log('❌ Error:', error.message)
      console.log('Error code:', error.code)
    }
  } else {
    console.log('✅ Connection successful!')
    console.log('Data:', data)
  }
} catch (err) {
  console.log('❌ Connection failed:', err.message)
}
