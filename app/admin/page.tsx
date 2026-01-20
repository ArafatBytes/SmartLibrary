'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, startTransition } from 'react'

interface UserSession {
  id: number
  role: string
  username: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'librarians' | 'audit'>('librarians')
  const [user, setUser] = useState<UserSession | null>(null)

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

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('librarians')}
              className={`${
                activeTab === 'librarians'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Manage Librarians
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Audit Log
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'librarians' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Librarian Management</h2>
            <div className="space-y-4">
              <a
                href="/admin/librarians"
                className="block text-blue-600 hover:text-blue-800"
              >
                → Go to Librarian Management Page
              </a>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Audit Log</h2>
            <div className="space-y-4">
              <a
                href="/admin/audit-log"
                className="block text-blue-600 hover:text-blue-800"
              >
                → Go to Audit Log Page
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
