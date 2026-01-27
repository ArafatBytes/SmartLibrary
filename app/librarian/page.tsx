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

interface CheckStatusResult {
  copy_id: number
  isbn: string
  title: string
  authors: string
  publisher: string
  category: string
  publication_year: number
  status: string
  is_available: boolean
  borrow_info?: {
    borrow_id: number
    borrow_date: string
    due_date: string
    member_name: string
    member_email: string
  }
}

interface FineDetails {
  fine_id: number
  borrow_id: number
  member_name: string
  member_email: string
  borrow_date: string
  due_date: string
  days_overdue: number
  fine_amount: number
}

export default function LibrarianDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'borrow' | 'return' | 'check' | 'manage'>('check')

  // Borrow form
  const [borrowCopyId, setBorrowCopyId] = useState('')
  const [borrowMemberId, setBorrowMemberId] = useState('')
  const [borrowDueDate, setBorrowDueDate] = useState('')
  const [borrowMessage, setBorrowMessage] = useState('')

  // Return form
  const [returnCopyId, setReturnCopyId] = useState('')
  const [returnMessage, setReturnMessage] = useState('')
  const [activeBorrows, setActiveBorrows] = useState<ActiveBorrow[]>([])
  const [fineDetails, setFineDetails] = useState<FineDetails | null>(null)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)

  // Check status form
  const [checkCopyId, setCheckCopyId] = useState('')
  const [checkResult, setCheckResult] = useState<CheckStatusResult | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')

  // Book management
  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([])
  const [newBookIsbn, setNewBookIsbn] = useState('')
  const [newBookTitle, setNewBookTitle] = useState('')
  const [newBookPublisher, setNewBookPublisher] = useState('')
  const [newBookAuthors, setNewBookAuthors] = useState('')
  const [newBookCategory, setNewBookCategory] = useState('')
  const [newBookYear, setNewBookYear] = useState('')
  const [newBookDescription, setNewBookDescription] = useState('')
  const [addBookLoading, setAddBookLoading] = useState(false)
  const [addBookMessage, setAddBookMessage] = useState('')
  
  const [removeCopyId, setRemoveCopyId] = useState('')
  const [removeBookLoading, setRemoveBookLoading] = useState(false)
  const [removeBookMessage, setRemoveBookMessage] = useState('')

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

  useEffect(() => {
    // Fetch categories when manage tab is opened
    if (activeSection === 'manage' && categories.length === 0) {
      fetchCategories()
    }
  }, [activeSection])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/librarian/categories')
      const data = await response.json()
      if (response.ok) {
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

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
    setFineDetails(null)
    setShowPaymentConfirm(false)

    if (!user) return

    try {
      const response = await fetch('/api/librarian/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_id: parseInt(returnCopyId),
          librarian_id: user.id,
          confirm_payment: false
        })
      })

      const data = await response.json()

      if (response.ok) {
        setReturnMessage(data.message || 'Book returned successfully!')
        setReturnCopyId('')
        setFineDetails(null)
        setShowPaymentConfirm(false)
      } else if (response.status === 402) {
        // Payment required
        setFineDetails(data.fine_details)
        setShowPaymentConfirm(true)
        setReturnMessage(data.message)
      } else {
        setReturnMessage(`Error: ${data.error || data.message}`)
      }
    } catch (error) {
      setReturnMessage('An error occurred')
      console.error(error)
    }
  }

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddBookMessage('')
    setAddBookLoading(true)

    // Validate inputs
    if (!newBookIsbn.trim() || !newBookTitle.trim() || !newBookAuthors.trim()) {
      setAddBookMessage('ISBN, Title, and Authors are required')
      setAddBookLoading(false)
      return
    }

    // Parse authors (comma-separated)
    const authorArray = newBookAuthors.split(',').map(a => a.trim()).filter(a => a !== '')

    try {
      const response = await fetch('/api/librarian/add-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbn: newBookIsbn.trim(),
          title: newBookTitle.trim(),
          publisher: newBookPublisher.trim() || 'Unknown',
          authors: authorArray,
          category_id: newBookCategory ? parseInt(newBookCategory) : null,
          publication_year: newBookYear ? parseInt(newBookYear) : null,
          description: newBookDescription.trim() || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setAddBookMessage(`✓ ${data.message} (Copy ID: ${data.copy_id})`)
        // Clear form
        setNewBookIsbn('')
        setNewBookTitle('')
        setNewBookPublisher('')
        setNewBookAuthors('')
        setNewBookCategory('')
        setNewBookYear('')
        setNewBookDescription('')
      } else {
        setAddBookMessage(`✗ ${data.error}`)
      }
    } catch (error) {
      console.error('Add book error:', error)
      setAddBookMessage('✗ Failed to add book')
    } finally {
      setAddBookLoading(false)
    }
  }

  const handleRemoveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setRemoveBookMessage('')
    setRemoveBookLoading(true)

    if (!removeCopyId.trim()) {
      setRemoveBookMessage('Copy ID is required')
      setRemoveBookLoading(false)
      return
    }

    try {
      const response = await fetch('/api/librarian/remove-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_id: parseInt(removeCopyId)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setRemoveBookMessage(`✓ ${data.message} (ISBN: ${data.isbn})`)
        setRemoveCopyId('')
      } else {
        setRemoveBookMessage(`✗ ${data.error}`)
      }
    } catch (error) {
      console.error('Remove book error:', error)
      setRemoveBookMessage('✗ Failed to remove book copy')
    } finally {
      setRemoveBookLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!user || !fineDetails) return

    try {
      const response = await fetch('/api/librarian/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy_id: parseInt(returnCopyId),
          librarian_id: user.id,
          confirm_payment: true,
          fine_id: fineDetails.fine_id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setReturnMessage(`✓ ${data.message}`)
        setReturnCopyId('')
        setFineDetails(null)
        setShowPaymentConfirm(false)
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || data.message)
        setReturnMessage(`Error: ${errorMsg}`)
        console.error('Return error:', data)
      }
    } catch (error) {
      setReturnMessage('An error occurred while confirming payment')
      console.error(error)
    }
  }

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckMessage('')
    setCheckResult(null)

    if (!checkCopyId.trim()) {
      setCheckMessage('Please enter a copy ID')
      return
    }

    setCheckLoading(true)

    try {
      const response = await fetch(`/api/librarian/check-status?copy_id=${checkCopyId}`)
      const data = await response.json()

      if (response.ok) {
        setCheckResult(data)
        setCheckMessage('')
      } else {
        setCheckMessage(`Error: ${data.error}`)
        setCheckResult(null)
      }
    } catch (error) {
      setCheckMessage('An error occurred while checking status')
      setCheckResult(null)
      console.error(error)
    } finally {
      setCheckLoading(false)
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
              placeholder="Search by book title or ISBN..."
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
              onClick={() => setActiveSection('check')}
              className={`${
                activeSection === 'check'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Check Status
            </button>
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
            <button
              onClick={() => setActiveSection('manage')}
              className={`${
                activeSection === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Add/Remove Books
            </button>
          </nav>
        </div>

        {/* Check Status Section */}
        {activeSection === 'check' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Check Book Copy Status</h2>
            <form onSubmit={handleCheckStatus} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Copy ID
                </label>
                <input
                  type="number"
                  required
                  value={checkCopyId}
                  onChange={(e) => setCheckCopyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter copy ID to check status"
                />
              </div>
              <button
                type="submit"
                disabled={checkLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {checkLoading ? 'Checking...' : 'Check Status'}
              </button>
              {checkMessage && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md">
                  {checkMessage}
                </div>
              )}
            </form>

            {/* Status Result */}
            {checkResult && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Book Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Copy ID:</span>
                      <p className="text-sm text-gray-900">{checkResult.copy_id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">ISBN:</span>
                      <p className="text-sm text-gray-900">{checkResult.isbn}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Title:</span>
                    <p className="text-base font-semibold text-gray-900">{checkResult.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Author(s):</span>
                      <p className="text-sm text-gray-900">{checkResult.authors}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Publisher:</span>
                      <p className="text-sm text-gray-900">{checkResult.publisher}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Category:</span>
                      <p className="text-sm text-gray-900">{checkResult.category}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Year:</span>
                      <p className="text-sm text-gray-900">{checkResult.publication_year || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <div className="mt-1">
                      {checkResult.is_available ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                          ✓ Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                          ✗ Borrowed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {checkResult.borrow_info && (
                    <div className="pt-3 border-t bg-yellow-50 -m-4 mt-3 p-4 rounded-b-lg">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Current Borrower Information</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Member Name:</span>
                          <span className="ml-2 text-gray-900">{checkResult.borrow_info.member_name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Member Email:</span>
                          <span className="ml-2 text-gray-900">{checkResult.borrow_info.member_email}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Borrowed On:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(checkResult.borrow_info.borrow_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Due Date:</span>
                          <span className="ml-2 text-gray-900 font-semibold">
                            {new Date(checkResult.borrow_info.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
                  disabled={showPaymentConfirm}
                />
              </div>
              <button
                type="submit"
                disabled={showPaymentConfirm}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Process Return
              </button>
              {returnMessage && (
                <p className={`text-sm ${returnMessage.includes('Error') ? 'text-red-600' : returnMessage.includes('\u2713') ? 'text-green-600 font-semibold' : 'text-yellow-600'}`}>
                  {returnMessage}
                </p>
              )}
            </form>

            {/* Fine Details and Payment Confirmation */}
            {fineDetails && showPaymentConfirm && (
              <div className="mt-6 border-t pt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">⚠️ Outstanding Fine Detected</h3>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium text-gray-700">Member:</span>
                        <p className="text-gray-900">{fineDetails.member_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{fineDetails.member_email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-medium text-gray-700">Borrowed On:</span>
                        <p className="text-gray-900">{new Date(fineDetails.borrow_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Due Date:</span>
                        <p className="text-gray-900">{new Date(fineDetails.due_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-red-300">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Days Overdue:</span>
                        <span className="text-red-700 font-semibold text-lg">{fineDetails.days_overdue} days</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-medium text-gray-700">Fine Amount:</span>
                        <span className="text-red-900 font-bold text-2xl">{fineDetails.fine_amount.toFixed(2)} BDT</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-900">
                    <strong>Instructions:</strong> Collect the fine amount of <strong>{fineDetails.fine_amount.toFixed(2)} BDT</strong> from the member before confirming payment.
                  </p>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
                >
                  ✓ Confirm Payment Received - Complete Return
                </button>
              </div>
            )}

            {/* Show active borrows if any */}
            {activeBorrows.length > 0 && !showPaymentConfirm && (
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

        {/* Manage Books Section */}
        {activeSection === 'manage' && (
          <div className="space-y-6">
            {/* Add New Book */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-green-700">➕ Add New Book</h2>
              <form onSubmit={handleAddBook} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ISBN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newBookIsbn}
                      onChange={(e) => setNewBookIsbn(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="978-0-123456-78-9"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Book Title"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Author(s) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newBookAuthors}
                      onChange={(e) => setNewBookAuthors(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Author Name, Another Author"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple authors with commas</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={newBookPublisher}
                      onChange={(e) => setNewBookPublisher(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Publisher Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newBookCategory}
                      onChange={(e) => setNewBookCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Publication Year
                    </label>
                    <input
                      type="number"
                      min="1000"
                      max="2100"
                      value={newBookYear}
                      onChange={(e) => setNewBookYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newBookDescription}
                    onChange={(e) => setNewBookDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Brief description of the book (optional)"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> If the book already exists, a new copy will be added. If authors don't exist, they will be created automatically.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={addBookLoading}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {addBookLoading ? 'Adding Book...' : '➕ Add Book & Create Copy'}
                </button>

                {addBookMessage && (
                  <div className={`p-3 rounded-md ${addBookMessage.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {addBookMessage}
                  </div>
                )}
              </form>
            </div>

            {/* Remove Book Copy */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-700">🗑️ Remove Book Copy</h2>
              <form onSubmit={handleRemoveBook} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book Copy ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={removeCopyId}
                    onChange={(e) => setRemoveCopyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter copy ID to remove"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-yellow-900">
                    <strong>Warning:</strong> This will mark the book copy as "Lost" (unavailable). The copy cannot be removed if it's currently borrowed.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={removeBookLoading}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium"
                >
                  {removeBookLoading ? 'Removing...' : '🗑️ Mark as Unavailable'}
                </button>

                {removeBookMessage && (
                  <div className={`p-3 rounded-md ${removeBookMessage.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {removeBookMessage}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
