import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kdjznrpfmpslvzhhdxga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkanpucnBmbXBzbHZ6aGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQxNTcsImV4cCI6MjA4MDQzMDE1N30.iEfh6Fgc3jzglvlVrSnd_vCj7UacfHpLs6S797qE3oY'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Checking if functions exist...\n')

// Test get_active_borrow_with_fine function
try {
  const { data, error } = await supabase.rpc('get_active_borrow_with_fine', { p_copy_id: 1 })
  
  if (error) {
    if (error.code === '42883') {
      console.log('❌ Function get_active_borrow_with_fine does NOT exist')
      console.log('   You need to run migration: 20241204_005_functions_triggers.sql\n')
    } else if (error.code === '42702') {
      console.log('⚠️  Function exists but has ambiguous column reference error')
      console.log('   You need to RE-RUN migration: 20241204_005_functions_triggers.sql (with the fix)\n')
    } else {
      console.log('❌ Error:', error.message)
      console.log('   Code:', error.code, '\n')
    }
  } else {
    console.log('✅ Function get_active_borrow_with_fine exists and works!')
    console.log('   Result:', data, '\n')
  }
} catch (err) {
  console.log('❌ Error:', err.message, '\n')
}

// Check if sample data exists
try {
  const { data, error } = await supabase.from('books').select('isbn').limit(1)
  if (data && data.length > 0) {
    console.log('✅ Sample data exists (books table has data)')
  } else {
    console.log('⚠️  No books found - you may need to run: 20241204_004_sample_data.sql')
  }
} catch (err) {
  console.log('❌ Error checking books:', err.message)
}
