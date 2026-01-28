'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, startTransition } from 'react'
import { toast } from 'react-hot-toast'

import LibrariansManager from './components/LibrariansManager'
import AuditLogViewer from './components/AuditLogViewer'
import AnalyticsDashboard from './components/AnalyticsDashboard'

interface UserSession {
  id: number
  role: string
  username: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'librarians' | 'audit' | 'analytics'>('librarians')
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

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading Dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Premium Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/20 text-xl font-bold transform group-hover:scale-105 transition-transform duration-200">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">Admin Portal</h1>
              <p className="text-xs text-gray-500 font-medium">System Management</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-gray-800">{user.username}</span>
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full capitalize border border-blue-100">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="group p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 border border-transparent hover:border-red-100"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 transition-transform group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-1.5 flex gap-2 w-fit mx-auto overflow-x-auto max-w-full">
            {[
              { id: 'librarians', label: 'Manage Librarians', icon: '👥' },
              { id: 'audit', label: 'Audit Logs', icon: '📋' },
              { id: 'analytics', label: 'Analytics & Reports', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-out whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-white text-blue-700 shadow-md ring-1 ring-black/5 scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area with Animation */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform">
          {activeTab === 'librarians' && <LibrariansManager />}
          {activeTab === 'audit' && <AuditLogViewer />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </div>
      </div>
    </div>
  )
}
