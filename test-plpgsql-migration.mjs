/**
 * Comprehensive PL/pgSQL Migration Test Suite
 * Tests all migrated API endpoints to ensure they work correctly
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('Make sure .env.local file exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const results = []

function logTest(test, passed, message, data) {
  const status = passed ? '✓' : '✗'
  console.log(`${status} ${test}: ${message}`)
  if (data && !passed) {
    console.log('  Data:', JSON.stringify(data, null, 2))
  }
  results.push({ test, passed, message, data })
}

async function runTests() {
  console.log('\n========================================')
  console.log('COMPREHENSIVE PL/pgSQL MIGRATION TESTS')
  console.log('========================================\n')

  // =============================================
  // TEST 1: AUTHENTICATION FUNCTION
  // =============================================
  console.log('>>> TEST 1: Authentication Function\n')

  try {
    const { data, error } = await supabase
      .rpc('authenticate_user', { p_username: 'admin' })
      .single()

    if (error) {
      logTest('1.1 - Authenticate existing user', false, `Error: ${error.message}`, error)
    } else if (data && data.success && data.username === 'admin') {
      logTest('1.1 - Authenticate existing user', true, 'Successfully retrieved admin user')
    } else {
      logTest('1.1 - Authenticate existing user', false, 'Unexpected response', data)
    }
  } catch (err) {
    logTest('1.1 - Authenticate existing user', false, `Exception: ${err}`)
  }

  try {
    const { data, error } = await supabase
      .rpc('authenticate_user', { p_username: 'nonexistent_user_12345' })
      .single()

    if (error) {
      logTest('1.2 - Authenticate non-existing user', false, `Error: ${error.message}`, error)
    } else if (data && !data.success) {
      logTest('1.2 - Authenticate non-existing user', true, 'Correctly returned no user found')
    } else {
      logTest('1.2 - Authenticate non-existing user', false, 'Unexpected response', data)
    }
  } catch (err) {
    logTest('1.2 - Authenticate non-existing user', false, `Exception: ${err}`)
  }

  // =============================================
  // TEST 2: LIBRARIAN MANAGEMENT FUNCTIONS
  // =============================================
  console.log('\n>>> TEST 2: Librarian Management Functions\n')

  try {
    const { data, error } = await supabase.rpc('get_all_librarians')

    if (error) {
      logTest('2.1 - Get all librarians', false, `Error: ${error.message}`, error)
    } else if (Array.isArray(data)) {
      logTest('2.1 - Get all librarians', true, `Retrieved ${data.length} librarian(s)`)
    } else {
      logTest('2.1 - Get all librarians', false, 'Unexpected response format', data)
    }
  } catch (err) {
    logTest('2.1 - Get all librarians', false, `Exception: ${err}`)
  }

  // =============================================
  // TEST 3: AUDIT LOG FUNCTION
  // =============================================
  console.log('\n>>> TEST 3: Audit Log Function\n')

  try {
    const { data, error } = await supabase.rpc('get_audit_log', {
      p_limit: 10,
      p_offset: 0
    })

    if (error) {
      logTest('3.1 - Get audit log', false, `Error: ${error.message}`, error)
    } else if (Array.isArray(data)) {
      logTest('3.1 - Get audit log', true, `Retrieved ${data.length} log entries`)
    } else {
      logTest('3.1 - Get audit log', false, 'Unexpected response format', data)
    }
  } catch (err) {
    logTest('3.1 - Get audit log', false, `Exception: ${err}`)
  }

  // =============================================
  // TEST 4: PAYMENT FUNCTIONS
  // =============================================
  console.log('\n>>> TEST 4: Payment Functions\n')

  try {
    const { data, error } = await supabase.rpc('get_member_unpaid_fines', {
      p_member_id: 1
    })

    if (error) {
      logTest('4.1 - Get unpaid fines', false, `Error: ${error.message}`, error)
    } else if (Array.isArray(data)) {
      logTest('4.1 - Get unpaid fines', true, `Retrieved ${data.length} unpaid fine(s) for member 1`)
    } else {
      logTest('4.1 - Get unpaid fines', false, 'Unexpected response format', data)
    }
  } catch (err) {
    logTest('4.1 - Get unpaid fines', false, `Exception: ${err}`)
  }

  // =============================================
  // TEST 5: ANALYTICS COUNT FUNCTIONS
  // =============================================
  console.log('\n>>> TEST 5: Analytics Count Functions\n')

  const countFunctions = [
    { name: 'count_total_books', label: '5.1 - Count total books' },
    { name: 'count_total_book_copies', label: '5.2 - Count total copies' },
    { name: 'count_available_copies', label: '5.3 - Count available copies' },
    { name: 'count_total_members', label: '5.4 - Count total members' },
    { name: 'get_total_fines_amount', label: '5.5 - Get total fines' },
    { name: 'get_total_revenue', label: '5.6 - Get total revenue' },
    { name: 'count_active_borrows', label: '5.7 - Count active borrows' },
    { name: 'count_overdue_books', label: '5.8 - Count overdue books' }
  ]

  for (const fn of countFunctions) {
    try {
      const { data, error } = await supabase.rpc(fn.name)

      if (error) {
        logTest(fn.label, false, `Error: ${error.message}`, error)
      } else if (typeof data === 'number' || (typeof data === 'string' && !isNaN(Number(data)))) {
        logTest(fn.label, true, `Returned: ${data}`)
      } else {
        logTest(fn.label, false, 'Unexpected response type', data)
      }
    } catch (err) {
      logTest(fn.label, false, `Exception: ${err}`)
    }
  }

  // =============================================
  // TEST 6: BOOK MANAGEMENT FUNCTIONS
  // =============================================
  console.log('\n>>> TEST 6: Book Management Functions\n')

  try {
    const { data, error } = await supabase.rpc('get_all_categories')

    if (error) {
      logTest('6.1 - Get all categories', false, `Error: ${error.message}`, error)
    } else if (Array.isArray(data) && data.length > 0) {
      logTest('6.1 - Get all categories', true, `Retrieved ${data.length} categories`)
    } else {
      logTest('6.1 - Get all categories', false, 'Unexpected response', data)
    }
  } catch (err) {
    logTest('6.1 - Get all categories', false, `Exception: ${err}`)
  }

  // =============================================
  // SUMMARY
  // =============================================
  console.log('\n========================================')
  console.log('TEST SUMMARY')
  console.log('========================================\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✓ Passed: ${passed}`)
  console.log(`✗ Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`)

  if (failed > 0) {
    console.log('Failed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`)
    })
    console.log('')
  }

  console.log('========================================')
  console.log(failed === 0 ? '✓ ALL TESTS PASSED!' : '✗ SOME TESTS FAILED')
  console.log('========================================\n')

  process.exit(failed > 0 ? 1 : 0)
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error)
  process.exit(1)
})
