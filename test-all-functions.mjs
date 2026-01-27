import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kdjznrpfmpslvzhhdxga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkanpucnBmbXBzbHZ6aGhkeGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTQxNTcsImV4cCI6MjA4MDQzMDE1N30.iEfh6Fgc3jzglvlVrSnd_vCj7UacfHpLs6S797qE3oY'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Testing All PL/pgSQL Functions...\n')

const functionsToTest = [
  // Librarian functions
  { name: 'search_books', params: { p_search_query: 'the' } },
  { name: 'check_copy_status', params: { p_copy_id: 1 } },
  { name: 'get_active_borrow_with_fine', params: { p_copy_id: 1 } },
  
  // Analytics functions
  { name: 'count_active_borrows', params: {} },
  { name: 'count_overdue_books', params: {} },
  { name: 'get_monthly_borrowing_trend', params: {} },
  { name: 'get_fines_collected_per_month', params: {} },
  { name: 'get_top_borrowed_books', params: { p_limit: 5 } },
  { name: 'get_category_wise_borrows', params: {} },
  { name: 'get_most_active_members', params: { p_limit: 5 } },
  { name: 'get_book_availability', params: {} },
  { name: 'get_never_borrowed_books', params: {} },
  { name: 'get_members_highest_overdue', params: {} },
  { name: 'get_overdue_books_today', params: {} },
  { name: 'get_librarian_activity', params: {} },
]

let passed = 0
let failed = 0

for (const func of functionsToTest) {
  try {
    const { data, error } = await supabase.rpc(func.name, func.params)
    
    if (error) {
      console.log(`❌ ${func.name}`)
      console.log(`   Error: ${error.message}`)
      console.log(`   Code: ${error.code}`)
      if (error.code === '42883') {
        console.log(`   ⚠️  Function does not exist - run migration!`)
      } else if (error.code === '42702') {
        console.log(`   ⚠️  Ambiguous column reference - SQL needs fixing`)
      }
      failed++
    } else {
      console.log(`✅ ${func.name}`)
      if (data !== null && data !== undefined) {
        if (Array.isArray(data)) {
          console.log(`   Returned ${data.length} rows`)
        } else if (typeof data === 'object') {
          console.log(`   Returned: ${JSON.stringify(data).substring(0, 100)}...`)
        } else {
          console.log(`   Returned: ${data}`)
        }
      }
      passed++
    }
  } catch (err) {
    console.log(`❌ ${func.name}`)
    console.log(`   Exception: ${err.message}`)
    failed++
  }
  console.log('')
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`📊 Results: ${passed} passed, ${failed} failed`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

if (failed > 0) {
  console.log('⚠️  Some functions failed. Please run migrations:')
  console.log('   1. Open Supabase SQL Editor')
  console.log('   2. Run: 20241204_005_functions_triggers.sql')
  console.log('   3. Run: 20241204_006_analytics_functions.sql')
} else {
  console.log('✅ All functions are working correctly!')
}
