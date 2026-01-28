'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, startTransition, useCallback } from 'react'
import { toast } from 'react-hot-toast'

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
  const [pendingFilter, setPendingFilter] = useState({ category: '', availability: '' })
  const [filters, setFilters] = useState({ category: '', availability: '' })
  const [activeSection, setActiveSection] = useState<'borrow' | 'return' | 'check' | 'manage' | 'addMember'>('check')

  // Borrow form
  const [borrowCopyId, setBorrowCopyId] = useState('')
  const [borrowMemberId, setBorrowMemberId] = useState('')
  const [borrowDueDate, setBorrowDueDate] = useState('')

  const [borrowLoading, setBorrowLoading] = useState(false)

  // Return form
  const [returnCopyId, setReturnCopyId] = useState('')

  const [returnLoading, setReturnLoading] = useState(false)
  const [activeBorrows, setActiveBorrows] = useState<ActiveBorrow[]>([])
  const [fineDetails, setFineDetails] = useState<FineDetails | null>(null)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)

  // Check status form
  const [checkCopyId, setCheckCopyId] = useState('')
  const [checkResult, setCheckResult] = useState<CheckStatusResult | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)

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

  const [removeCopyId, setRemoveCopyId] = useState('')
  const [removeBookLoading, setRemoveBookLoading] = useState(false)

  const [addCopiesIsbn, setAddCopiesIsbn] = useState('')
  const [addCopiesQuantity, setAddCopiesQuantity] = useState('')
  const [addCopiesLoading, setAddCopiesLoading] = useState(false)

  // Add member form
  const [memberIdInput, setMemberIdInput] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberPhone, setMemberPhone] = useState('')
  const [memberAddress, setMemberAddress] = useState('')
  const [addMemberLoading, setAddMemberLoading] = useState(false)

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
    // Reset states when switching tabs
    setCheckResult(null)
    setCheckCopyId('')

    setBorrowCopyId('')
    setBorrowMemberId('')
    setBorrowDueDate('')

    setReturnCopyId('')
    setFineDetails(null)
    setShowPaymentConfirm(false)
    setActiveBorrows([])

    setNewBookIsbn('')
    setNewBookTitle('')
    setNewBookPublisher('')
    setNewBookAuthors('')
    setNewBookCategory('')
    setNewBookYear('')
    setNewBookDescription('')

    setAddCopiesIsbn('')
    setAddCopiesQuantity('')

    setRemoveCopyId('')


    setMemberIdInput('')
    setMemberName('')
    setMemberEmail('')
    setMemberPhone('')
    setMemberAddress('')

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
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
      // Fallback: clear cookie manually
      document.cookie = 'user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/login')
    }
  }

  const fetchSearchResults = useCallback(async (query: string, currentFilters: { category: string; availability: string }, showErrors: boolean) => {
    // If no query and no filters, don't search (unless user explicitly cleared everything)
    if ((!query || query.length < 2) && !currentFilters.category && !currentFilters.availability) {
      if (showErrors && query.length > 0 && query.length < 2) {
        alert('Please enter at least 2 characters to search')
      }
      return
    }

    setSearchLoading(true)

    try {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (currentFilters.category) params.append('category', currentFilters.category)
      if (currentFilters.availability) params.append('available', currentFilters.availability)

      const response = await fetch(`/api/librarian/search?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.results || [])
      } else {
        if (showErrors) alert(`Search error: ${data.error}`)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      if (showErrors) alert('Failed to search books')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Dynamic search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      // Trigger search if query is valid OR if there are filters applied
      if (searchQuery.trim().length >= 2 || filters.category || filters.availability) {
        fetchSearchResults(searchQuery.trim(), filters, false)
      } else if (searchQuery.trim().length === 0 && !filters.category && !filters.availability) {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filters, fetchSearchResults])

  // Initial load of filters
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories()
    }
  }, [categories.length])

  // Update filters when they change in the UI
  const handleFilterChange = (type: 'category' | 'availability', value: string) => {
    const newFilters = { ...filters, [type]: value }
    setFilters(newFilters)
    setPendingFilter({ ...pendingFilter, [type]: value }) // Keep pending in sync for UI
  }

  const handleSearch = () => {
    fetchSearchResults(searchQuery.trim(), filters, true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleBorrowBook = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    // Validate due date
    const selectedDate = new Date(borrowDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for accurate comparison

    if (selectedDate < today) {
      toast.error('Due date cannot be in the past')
      return
    }

    setBorrowLoading(true)

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
        toast.success('Book borrowed successfully!')
        setBorrowCopyId('')
        setBorrowMemberId('')
        setBorrowDueDate('')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('An error occurred')
      console.error(error)
    } finally {
      setBorrowLoading(false)
    }
  }

  const handleReturnBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setFineDetails(null)
    setShowPaymentConfirm(false)

    if (!user) return

    setReturnLoading(true)

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
        toast.success(data.message || 'Book returned successfully!')
        setReturnCopyId('')
        setFineDetails(null)
        setShowPaymentConfirm(false)
      } else if (response.status === 402) {
        // Payment required
        setFineDetails(data.fine_details)
        setShowPaymentConfirm(true)
        toast(data.message, { icon: '⚠️' })
      } else {
        toast.error(data.error || data.message)
      }
    } catch (error) {
      toast.error('An error occurred')
      console.error(error)
    } finally {
      setReturnLoading(false)
    }
  }

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddBookLoading(true)

    // Validate inputs
    if (!newBookIsbn.trim() || !newBookTitle.trim() || !newBookAuthors.trim()) {
      toast.error('ISBN, Title, and Authors are required')
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
        toast.success(`${data.message} (Copy ID: ${data.copy_id})`)
        // Clear form
        setNewBookIsbn('')
        setNewBookTitle('')
        setNewBookPublisher('')
        setNewBookAuthors('')
        setNewBookCategory('')
        setNewBookYear('')
        setNewBookDescription('')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Add book error:', error)
      toast.error('Failed to add book')
    } finally {
      setAddBookLoading(false)
    }
  }

  const handleRemoveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setRemoveBookLoading(true)

    if (!removeCopyId.trim()) {
      toast.error('Copy ID is required')
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
        toast.success(`${data.message} (ISBN: ${data.isbn})`)
        setRemoveCopyId('')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Remove book error:', error)
      toast.error('Failed to remove book copy')
    } finally {
      setRemoveBookLoading(false)
    }
  }

  const handleAddCopies = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddCopiesLoading(true)

    if (!addCopiesIsbn.trim()) {
      toast.error('ISBN is required')
      setAddCopiesLoading(false)
      return
    }

    if (!addCopiesQuantity.trim() || parseInt(addCopiesQuantity) < 1) {
      toast.error('Quantity must be at least 1')
      setAddCopiesLoading(false)
      return
    }

    try {
      const response = await fetch('/api/librarian/add-copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbn: addCopiesIsbn.trim(),
          quantity: parseInt(addCopiesQuantity)
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${data.message} (Copy IDs: ${data.copy_ids.join(', ')})`)
        setAddCopiesIsbn('')
        setAddCopiesQuantity('')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Add copies error:', error)
      toast.error('Failed to add book copies')
    } finally {
      setAddCopiesLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddMemberLoading(true)

    // Validate Student ID is required
    if (!memberIdInput.trim()) {
      toast.error('Student ID is required')
      setAddMemberLoading(false)
      return
    }

    const memberId = parseInt(memberIdInput.trim())
    if (isNaN(memberId) || memberId < 1) {
      toast.error('Student ID must be a positive number')
      setAddMemberLoading(false)
      return
    }

    // Validate all other required fields
    if (!memberName.trim() || !memberEmail.trim() || !memberPhone.trim() || !memberAddress.trim()) {
      toast.error('All fields are required')
      setAddMemberLoading(false)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(memberEmail.trim())) {
      toast.error('Please enter a valid email address')
      setAddMemberLoading(false)
      return
    }

    try {
      const response = await fetch('/api/librarian/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberName.trim(),
          email: memberEmail.trim(),
          phone: memberPhone.trim(),
          address: memberAddress.trim(),
          member_id: parseInt(memberIdInput.trim())
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${data.message} (Member ID: ${data.member_id})`)
        setMemberIdInput('')
        setMemberName('')
        setMemberEmail('')
        setMemberPhone('')
        setMemberAddress('')
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Add member error:', error)
      toast.error('Failed to add member')
    } finally {
      setAddMemberLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!user || !fineDetails) return

    setReturnLoading(true)

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
        toast.success(data.message)
        setReturnCopyId('')
        setFineDetails(null)
        setShowPaymentConfirm(false)
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || data.message)
        toast.error(errorMsg)
        console.error('Return error:', data)
      }
    } catch (error) {
      toast.error('An error occurred while confirming payment')
      console.error(error)
    } finally {
      setReturnLoading(false)
    }
  }

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckResult(null)

    if (!checkCopyId.trim()) {
      toast.error('Please enter a copy ID')
      return
    }

    setCheckLoading(true)

    try {
      const response = await fetch(`/api/librarian/check-status?copy_id=${checkCopyId}`)
      const data = await response.json()

      if (response.ok) {
        setCheckResult(data)
      } else {
        toast.error(data.error)
        setCheckResult(null)
      }
    } catch (error) {
      toast.error('An error occurred while checking status')
      setCheckResult(null)
      console.error(error)
    } finally {
      setCheckLoading(false)
    }
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading Dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search & Header Section */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-emerald-500/20 text-xl font-bold">
                L
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Librarian Portal</h1>
                <p className="text-xs text-gray-500 font-medium w-full">Welcome back, {user.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Search Bar */}
              <div className="flex-1 md:w-96 relative group">
                <input
                  type="text"
                  placeholder="Search books, ISBN, authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 transition-colors group-hover:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchLoading && (
                  <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filters & Navigation */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
            <div className="flex gap-2">
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-gray-700"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.availability}
                onChange={(e) => handleFilterChange('availability', e.target.value)}
                className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-gray-700"
              >
                <option value="">Status: All</option>
                <option value="true">Available</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>

            <nav className="flex bg-gray-100/50 p-1 rounded-xl overflow-x-auto max-w-full">
              {[
                { id: 'check', label: 'Check Status' },
                { id: 'borrow', label: 'Borrow' },
                { id: 'return', label: 'Return' },
                { id: 'manage', label: 'Books' },
                { id: 'addMember', label: 'New Member' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeSection === item.id
                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8 bg-white border border-gray-100 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-900">Search Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Book Info</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ISBN</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Availability</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchResults.map((book, index) => (
                    <tr key={`${book.isbn}-${index}`} className="hover:bg-emerald-50/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{book.title}</div>
                        <div className="text-xs text-gray-500 mb-1">by {book.authors}</div>
                        <div className="text-xs text-gray-400">{book.publisher} ({book.publication_year})</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded-md text-xs">{book.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">{book.isbn}</td>
                      <td className="px-6 py-4">
                        {book.is_available ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
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
          <div className="mb-8 text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500">No books found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}

        {/* Action Sections */}
        <div className="max-w-2xl mx-auto">
          {/* Check Status Section */}
          {activeSection === 'check' && (
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Verify Book Status</h2>

              <form onSubmit={handleCheckStatus} className="space-y-6">
                <div className="relative">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Book Copy ID</label>
                  <input
                    type="number"
                    required
                    value={checkCopyId}
                    onChange={(e) => setCheckCopyId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-2xl text-center tracking-widest font-mono transition-all"
                    placeholder="e.g. 1042"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20 font-bold transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {checkLoading ? 'Scanning Database...' : 'Check Status'}
                </button>
              </form>

              {/* Status Result */}
              {checkResult && (
                <div className="mt-8 pt-8 border-t border-gray-100 animate-in slide-in-from-bottom-2 fade-in">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{checkResult.title}</h3>
                      <p className="text-sm text-gray-500">{checkResult.authors}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${checkResult.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                      checkResult.status === 'Lost' ? 'bg-gray-100 text-gray-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                      {checkResult.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl mb-6">
                    <div><span className="text-gray-500 block text-xs uppercase">ISBN</span><span className="font-mono text-gray-900">{checkResult.isbn}</span></div>
                    <div><span className="text-gray-500 block text-xs uppercase">Copy ID</span><span className="font-mono text-gray-900">{checkResult.copy_id}</span></div>
                    <div><span className="text-gray-500 block text-xs uppercase">Location</span><span className="text-gray-900">{checkResult.category}</span></div>
                    <div><span className="text-gray-500 block text-xs uppercase">Publisher</span><span className="text-gray-900">{checkResult.publisher}</span></div>
                  </div>

                  {checkResult.borrow_info && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                      <h4 className="text-rose-900 font-bold mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Current Borrower
                      </h4>
                      <div className="space-y-2 text-sm text-rose-800">
                        <div className="flex justify-between"><span className="text-rose-600">Name:</span> <strong>{checkResult.borrow_info.member_name}</strong></div>
                        <div className="flex justify-between"><span className="text-rose-600">Email:</span> {checkResult.borrow_info.member_email}</div>
                        <div className="h-px bg-rose-200 my-2"></div>
                        <div className="flex justify-between"><span className="text-rose-600">Borrowed:</span> {new Date(checkResult.borrow_info.borrow_date).toLocaleDateString()}</div>
                        <div className="flex justify-between"><span className="text-rose-600">Due Date:</span> <strong>{new Date(checkResult.borrow_info.due_date).toLocaleDateString()}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Borrow Book Section */}
          {activeSection === 'borrow' && (
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center text-emerald-700">Issue Book</h2>
              <form onSubmit={handleBorrowBook} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Copy ID</label>
                    <input
                      type="number"
                      required
                      value={borrowCopyId}
                      onChange={(e) => setBorrowCopyId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Copy ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member ID</label>
                    <input
                      type="number"
                      required
                      value={borrowMemberId}
                      onChange={(e) => setBorrowMemberId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Student ID"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    required
                    value={borrowDueDate}
                    onChange={(e) => setBorrowDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={borrowLoading}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-bold transition-all active:scale-95 mt-4"
                >
                  {borrowLoading ? 'Processing...' : 'Confirm Borrow'}
                </button>
              </form>
            </div>
          )}

          {/* Return Book Section */}
          {activeSection === 'return' && (
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center text-blue-700">Return Book</h2>
              <form onSubmit={handleReturnBook} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Book Copy ID</label>
                  <input
                    type="number"
                    required
                    value={returnCopyId}
                    onChange={(e) => setReturnCopyId(e.target.value)}
                    disabled={showPaymentConfirm}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-xl tracking-wide transition-all"
                    placeholder="Enter copy ID"
                  />
                </div>
                <button
                  type="submit"
                  disabled={showPaymentConfirm || returnLoading}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                >
                  {returnLoading && !showPaymentConfirm ? 'Processing...' : 'Process Return'}
                </button>
              </form>

              {/* Fine Details and Payment Confirmation */}
              {fineDetails && showPaymentConfirm && (
                <div className="mt-8 animate-in zoom-in-95 duration-200">
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-lg font-bold text-red-900">Fine Payment Required</h3>
                    </div>

                    <div className="bg-white/60 rounded-xl p-4 space-y-3 text-sm mb-4">
                      <div className="flex justify-between"><span className="text-red-700">Member:</span> <span className="font-medium">{fineDetails.member_name}</span></div>
                      <div className="flex justify-between"><span className="text-red-700">Days Overdue:</span> <span className="font-bold">{fineDetails.days_overdue} days</span></div>
                      <div className="h-px bg-red-200"></div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-red-800 font-bold">Total Amount Due:</span>
                        <span className="text-2xl font-extrabold text-red-600">৳{fineDetails.fine_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-red-500 text-center mb-4">
                      Please collect the amount above before confirming.
                    </p>

                    <button
                      onClick={handleConfirmPayment}
                      disabled={returnLoading}
                      className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {returnLoading ? 'Processing...' : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Confirm Payment Received
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manage Books Section */}
          {activeSection === 'manage' && (
            <div className="space-y-8">
              {/* Add New Book */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /></svg>
                </div>
                <h2 className="text-xl font-bold mb-6 text-emerald-800 flex items-center gap-2">
                  <span className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></span>
                  Catalog New Book
                </h2>
                <form onSubmit={handleAddBook} className="space-y-5 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ISBN <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        required
                        value={newBookIsbn}
                        onChange={(e) => setNewBookIsbn(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        required
                        value={newBookTitle}
                        onChange={(e) => setNewBookTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Authors <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      value={newBookAuthors}
                      onChange={(e) => setNewBookAuthors(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Comma separated, e.g. J.K. Rowling, Stephen King"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Publisher</label>
                      <input
                        type="text"
                        value={newBookPublisher}
                        onChange={(e) => setNewBookPublisher(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                      <select
                        value={newBookCategory}
                        onChange={(e) => setNewBookCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">Select...</option>
                        {categories.map((cat) => (
                          <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</label>
                      <input
                        type="number"
                        value={newBookYear}
                        onChange={(e) => setNewBookYear(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="YYYY"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addBookLoading}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black shadow-lg shadow-gray-500/20 font-bold transition-all active:scale-95"
                  >
                    {addBookLoading ? 'Adding to Catalog...' : 'Add Book to Catalog'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Add Copies */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
                  <h2 className="text-lg font-bold mb-4 text-blue-700 flex items-center gap-2">
                    <span className="bg-blue-50 p-1.5 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></span>
                    Restock Copies
                  </h2>
                  <form onSubmit={handleAddCopies} className="space-y-4">
                    <input
                      type="text"
                      required
                      value={addCopiesIsbn}
                      onChange={(e) => setAddCopiesIsbn(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="ISBN"
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={addCopiesQuantity}
                      onChange={(e) => setAddCopiesQuantity(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="Quantity"
                    />
                    <button
                      type="submit"
                      disabled={addCopiesLoading}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm shadow-md shadow-blue-500/20"
                    >
                      {addCopiesLoading ? 'Adding...' : 'Add Copies'}
                    </button>
                  </form>
                </div>

                {/* Remove Copy */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
                  <h2 className="text-lg font-bold mb-4 text-red-700 flex items-center gap-2">
                    <span className="bg-red-50 p-1.5 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></span>
                    Archive Copy
                  </h2>
                  <form onSubmit={handleRemoveBook} className="space-y-4">
                    <input
                      type="number"
                      required
                      value={removeCopyId}
                      onChange={(e) => setRemoveCopyId(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                      placeholder="Copy ID"
                    />
                    <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-700 border border-orange-100">
                      Marks copy as 'Lost'. Cannot check out.
                    </div>
                    <button
                      type="submit"
                      disabled={removeBookLoading}
                      className="w-full py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold text-sm shadow-md shadow-red-500/20"
                    >
                      {removeBookLoading ? 'Processing...' : 'Mark Unavailable'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Add Member Section */}
          {activeSection === 'addMember' && (
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
              <h2 className="text-xl font-bold mb-8 text-gray-900 text-center">Register New Member</h2>
              <form onSubmit={handleAddMember} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Student/Member ID <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    required
                    value={memberIdInput}
                    onChange={(e) => setMemberIdInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-mono tracking-wide"
                    placeholder="e.g. 20241050"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                    <input
                      type="text"
                      required
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      required
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                  <input
                    type="tel"
                    required
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
                  <textarea
                    required
                    value={memberAddress}
                    onChange={(e) => setMemberAddress(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl hover:bg-black font-bold shadow-xl shadow-gray-500/20 transition-all active:scale-95"
                >
                  {addMemberLoading ? 'Creating Profile...' : 'Create Member Profile'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
