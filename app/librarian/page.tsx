'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, startTransition } from 'react'

interface UserSession {
  id: number
  role: string
  username: string
}

interface ActiveBorrow {
  borrow_id: number
  member_id: number
  copy_id: number
  due_date: string
  borrow_date: string
}

interface SearchResult {
  isbn: string
  title: string
  authors: string
  publisher: string
  category: string
  available_copies: number
  total_copies: number
  is_available: boolean
  publication_year: number
}

export default function LibrarianDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'borrow' | 'return' | 'search'>('search')

  // Borrow form
  const [borrowCopyId, setBorrowCopyId] = useState('')
  const [borrowMemberId, setBorrowMemberId] = useState('')
  const [borrowDueDate, setBorrowDueDate] = useState('')
  const [borrowMessage, setBorrowMessage] = useState('')

  // Return form
  const [returnCopyId, setReturnCopyId] = useState('')
  const [returnMessage, setReturnMessage] = useState('')
  const [activeBorrows, setActiveBorrows] = useState<ActiveBorrow[]>([])

  useEffect(() => {
    // Get user session from cookie
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find(c => c.trim().startsWith('user_session='))
    
    if (sessionCookie) {
      try {
        const sessionValue = sessionCookie.split('=')[1]
        const sessionData = JSON.parse(decodeURIComponent(sessionValue)) as UserSession
        startTransition(() => {
          setUser(sessionData)
        })
      } catch (error) {
        console.error('Failed to parse session:', error)
      }
    }
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: clear cookie manually
      document.cookie = 'user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/login')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      alert('Please enter at least 2 characters to search')
      return
    }

    setSearchLoading(true)
    setActiveSection('search')

    try {
      const response = await fetch(`/api/librarian/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.results || [])
      } else {
        alert(`Search error: ${data.error}`)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Failed to search books')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleBorrowBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setBorrowMessage('')

    if (!user) return

    try {
      const response = await fetch('/api/librarian/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_id: parseInt(borrowCopyId),
          member_id: parseInt(borrowMemberId),
          due_date: borrowDueDate,
          librarian_id: user.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setBorrowMessage('Book borrowed successfully!')
        setBorrowCopyId('')
        setBorrowMemberId('')
        setBorrowDueDate('')
      } else {
        setBorrowMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setBorrowMessage('An error occurred')
      console.error(error)
    }
  }

  const handleReturnBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setReturnMessage('')

    if (!user) return

    try {
      const response = await fetch('/api/librarian/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_id: parseInt(returnCopyId),
          librarian_id: user.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setReturnMessage('Book returned successfully!')
        setReturnCopyId('')
        if (data.active_borrows) {
          setActiveBorrows(data.active_borrows)
        }
      } else {
        setReturnMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setReturnMessage('An error occurred')
      console.error(error)
    }
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Search Bar */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Librarian Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by book title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Results Section */}
        {searchResults.length > 0 && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Search Results ({searchResults.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author(s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Publisher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ISBN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Copies
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((book, index) => (
                    <tr key={`${book.isbn}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{book.title}</div>
                        {book.publication_year && (
                          <div className="text-xs text-gray-500">({book.publication_year})</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm text-gray-900">{book.authors}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-normal">
                        <div className="text-sm text-gray-900">{book.publisher || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {book.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{book.isbn}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {book.is_available ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Not Available
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.available_copies} / {book.total_copies}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State for Search */}
        {searchQuery && !searchLoading && searchResults.length === 0 && (
          <div className="mb-8 bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No books found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}

        {/* Section Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveSection('borrow')}
              className={`${
                activeSection === 'borrow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Borrow Book
            </button>
            <button
              onClick={() => setActiveSection('return')}
              className={`${
                activeSection === 'return'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Return Book
            </button>
          </nav>
        </div>

        {/* Borrow Book Section */}
        {activeSection === 'borrow' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Borrow Book</h2>
            <form onSubmit={handleBorrowBook} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Copy ID
                </label>
                <input
                  type="number"
                  required
                  value={borrowCopyId}
                  onChange={(e) => setBorrowCopyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter copy ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member ID
                </label>
                <input
                  type="number"
                  required
                  value={borrowMemberId}
                  onChange={(e) => setBorrowMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter member ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={borrowDueDate}
                  onChange={(e) => setBorrowDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Borrow Transaction
              </button>
              {borrowMessage && (
                <p className={`text-sm ${borrowMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {borrowMessage}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Return Book Section */}
        {activeSection === 'return' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Return Book</h2>
            <form onSubmit={handleReturnBook} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Copy ID
                </label>
                <input
                  type="number"
                  required
                  value={returnCopyId}
                  onChange={(e) => setReturnCopyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter copy ID to return"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Process Return
              </button>
              {returnMessage && (
                <p className={`text-sm ${returnMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {returnMessage}
                </p>
              )}
            </form>

            {/* Show active borrows if any */}
            {activeBorrows.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Active Borrows for this Copy:</h3>
                <div className="space-y-2">
                  {activeBorrows.map((borrow) => (
                    <div key={borrow.borrow_id} className="p-3 bg-gray-50 rounded">
                      <p className="text-sm">Borrow ID: {borrow.borrow_id}</p>
                      <p className="text-sm">Member ID: {borrow.member_id}</p>
                      <p className="text-sm">Due Date: {borrow.due_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
