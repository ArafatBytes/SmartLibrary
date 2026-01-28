import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kdjznrpfmpslvzhhdxga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkanpucnBmbXBzbHZ6aGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQxNTcsImV4cCI6MjA4MDQzMDE1N30.iEfh6Fgc3jzglvlVrSnd_vCj7UacfHpLs6S797qE3oY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAddCopies() {
  console.log('🧪 Testing add_book_copies function...\n')

  // Test with a known ISBN from sample data
  const testIsbn = '978-0-7475-3269-9' // Harry Potter from sample data
  const quantity = 2

  console.log(`📚 Attempting to add ${quantity} copies of ISBN: ${testIsbn}`)

  const { data, error } = await supabase
    .rpc('add_book_copies', {
      p_isbn: testIsbn,
      p_quantity: quantity
    })
    .single()

  if (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
    
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('\n⚠️  The add_book_copies function does not exist in the database.')
      console.log('📋 You need to run the migration file:')
      console.log('   supabase/migrations/20241204_007_book_management_functions.sql')
      console.log('\n💡 Steps:')
      console.log('   1. Open Supabase Dashboard')
      console.log('   2. Go to SQL Editor')
      console.log('   3. Copy and paste the migration file content')
      console.log('   4. Run the query')
    }
    return
  }

  console.log('✅ Success!')
  console.log('Result:', data)
}

testAddCopies()
