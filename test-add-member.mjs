import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kdjznrpfmpslvzhhdxga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkanpucnBmbXBzbHZ6aGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQxNTcsImV4cCI6MjA4MDQzMDE1N30.iEfh6Fgc3jzglvlVrSnd_vCj7UacfHpLs6S797qE3oY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAddMember() {
  console.log('🧪 Testing add_member function...\n')

  const testData = {
    p_name: 'Test Member',
    p_email: `test${Date.now()}@example.com`,
    p_phone: '+1234567890',
    p_address: '123 Test Street'
  }

  console.log('📚 Attempting to add member:', testData)

  const { data, error } = await supabase
    .rpc('add_member', testData)
    .single()

  if (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
    
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('\n⚠️  The add_member function does not exist in the database.')
      console.log('📋 You need to run the migration file:')
      console.log('   supabase/migrations/20241204_007_book_management_functions.sql')
      console.log('\n💡 Steps:')
      console.log('   1. Open Supabase Dashboard → https://supabase.com/dashboard')
      console.log('   2. Select your project')
      console.log('   3. Go to SQL Editor')
      console.log('   4. Copy and paste the ENTIRE migration file')
      console.log('   5. Run the query')
    }
    return
  }

  console.log('✅ Success!')
  console.log('Result:', data)
}

testAddMember()
