// Test all API endpoints
const BASE_URL = 'http://localhost:3000'

console.log('🧪 Testing API Endpoints...\n')

const tests = [
  // Analytics endpoints
  { name: 'Overview Stats', url: '/api/admin/analytics?type=overview' },
  { name: 'Monthly Borrowing', url: '/api/admin/analytics?type=monthly-borrowing' },
  { name: 'Fines Collected', url: '/api/admin/analytics?type=fines-collected' },
  { name: 'Top Borrowed Books', url: '/api/admin/analytics?type=top-borrowed-books&limit=5' },
  { name: 'Category-wise Borrows', url: '/api/admin/analytics?type=category-wise-borrows' },
  { name: 'Most Active Members', url: '/api/admin/analytics?type=most-active-members&limit=5' },
  { name: 'Book Availability', url: '/api/admin/analytics?type=book-availability' },
  { name: 'Never Borrowed', url: '/api/admin/analytics?type=never-borrowed' },
  { name: 'Highest Overdue', url: '/api/admin/analytics?type=highest-overdue' },
  { name: 'Overdue Today', url: '/api/admin/analytics?type=overdue-today' },
  { name: 'Librarian Activity', url: '/api/admin/analytics?type=librarian-activity' },
  
  // Librarian endpoints
  { name: 'Search Books', url: '/api/librarian/search?query=the' },
  { name: 'Check Status', url: '/api/librarian/check-status?copy_id=1' },
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    const response = await fetch(BASE_URL + test.url)
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ ${test.name}`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Report Type: ${data.report_type || 'N/A'}`)
      if (data.stats) {
        console.log(`   Stats: ${Object.keys(data.stats).length} metrics`)
      } else if (Array.isArray(data.data)) {
        console.log(`   Data: ${data.data.length} rows`)
      } else if (data.results) {
        console.log(`   Results: ${data.results.length} items`)
      }
      passed++
    } else {
      console.log(`❌ ${test.name}`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${data.error || data.details || 'Unknown error'}`)
      failed++
    }
  } catch (err) {
    console.log(`❌ ${test.name}`)
    console.log(`   Exception: ${err.message}`)
    failed++
  }
  console.log('')
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`📊 API Test Results: ${passed} passed, ${failed} failed`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (failed === 0) {
  console.log('\n✅ All API endpoints are working correctly!')
  console.log('🎉 PL/pgSQL migration successful!')
} else {
  console.log('\n⚠️  Some endpoints failed. Check the errors above.')
}
