// Test the add-member API endpoint directly
async function testAddMemberAPI() {
  console.log('🧪 Testing /api/librarian/add-member endpoint...\n')

  const testData = {
    name: 'John Doe',
    email: `john${Date.now()}@example.com`,
    phone: '+1234567890',
    address: '123 Main Street, City, Country'
  }

  console.log('📚 Request data:', testData)

  try {
    const response = await fetch('http://localhost:3000/api/librarian/add-member', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    console.log('📡 Response status:', response.status)
    
    const data = await response.json()
    console.log('📦 Response data:', data)

    if (response.ok) {
      console.log('✅ Success! Member added with ID:', data.member_id)
    } else {
      console.log('❌ Error:', data.error)
      if (data.details) {
        console.log('Details:', data.details)
      }
    }
  } catch (error) {
    console.error('❌ Fetch error:', error)
  }
}

testAddMemberAPI()
