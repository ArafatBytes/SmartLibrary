'use client'

import { useEffect, useState } from 'react'

interface OverviewStats {
  total_books: number
  total_members: number
  active_borrows: number
  overdue_books: number
  total_fines: number
}

interface AnalyticsData {
  report_type: string
  generated_at: string
  stats?: OverviewStats
  data?: Record<string, unknown>[] | Record<string, number>
  count?: number
  limit?: number
}

export default function AdminAnalyticsPage() {
  const [reportType, setReportType] = useState('overview')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReport(reportType)
  }, [reportType])

  const fetchReport = async (type: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/analytics?type=${type}`)
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Failed to fetch report')
      } else {
        setData(result)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/admin'}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Back to Dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Analytics & Reports
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Report Type Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="overview">Overview Statistics</option>
            <option value="monthly-borrowing">Monthly Borrowing Trend</option>
            <option value="fines-collected">Fines Collected Per Month</option>
            <option value="top-borrowed-books">Top Borrowed Books</option>
            <option value="category-wise-borrows">Category-wise Borrows</option>
            <option value="most-active-members">Most Active Members</option>
            <option value="book-availability">Book Availability</option>
            <option value="never-borrowed">Never Borrowed Books</option>
            <option value="highest-overdue">Members with Highest Overdue</option>
            <option value="overdue-today">Books Overdue Today</option>
            <option value="librarian-activity">Librarian Activity</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading report...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Data Display */}
        {!loading && !error && data && (
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">{data.report_type?.replace(/_/g, ' ').toUpperCase()}</h2>
              <p className="text-sm text-gray-500 mt-1">Generated at: {new Date(data.generated_at).toLocaleString()}</p>
            </div>

            <div className="p-6">
              {/* Overview Stats */}
              {reportType === 'overview' && data.stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Copies</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{data.stats.total_books}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Total Members</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{data.stats.total_members}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">Active Borrows</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{data.stats.active_borrows}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">Overdue Books</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">{data.stats.overdue_books}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-red-600 font-medium">Total Fines</p>
                    <p className="text-3xl font-bold text-red-900 mt-2">৳{data.stats.total_fines.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Array Data (most reports) */}
              {Array.isArray(data.data) && data.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(data.data[0]).map((key) => (
                          <th
                            key={key}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.data.map((row: Record<string, unknown>, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {typeof value === 'number' && !Number.isInteger(value)
                                ? value.toFixed(2)
                                : value?.toString() || 'N/A'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Object Data (e.g., monthly aggregates) */}
              {typeof data.data === 'object' && !Array.isArray(data.data) && Object.keys(data.data).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(data.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{key}</span>
                      <span className="text-lg font-bold text-gray-900">
                        {typeof value === 'number' && !Number.isInteger(value)
                          ? value.toFixed(2)
                          : value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {((Array.isArray(data.data) && data.data.length === 0) ||
                (typeof data.data === 'object' && !Array.isArray(data.data) && Object.keys(data.data).length === 0)) && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No data available for this report</p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
