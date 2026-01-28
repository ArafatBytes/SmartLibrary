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

export default function AnalyticsDashboard() {
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

    const StatCard = ({ title, value, color, icon }: { title: string, value: string | number, color: string, icon: React.ReactNode }) => (
        <div className={`p-6 rounded-2xl border bg-white shadow-lg transition-transform hover:scale-[1.02] duration-300 ${color}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('border-', 'bg-')}`}>
                    {icon}
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header / Filter Section */}
            <div className="bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Analytics Dashboard</h2>
                    <p className="text-sm text-gray-500">Visualize system performance and trends</p>
                </div>
                <div className="w-full sm:w-72">
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 outline-none transition-all cursor-pointer font-medium"
                    >
                        <option value="overview">Overview Statistics</option>
                        <optgroup label="Trends">
                            <option value="monthly-borrowing">Monthly Borrowing Trend</option>
                            <option value="fines-collected">Fines Collected Per Month</option>
                        </optgroup>
                        <optgroup label="Library Assets">
                            <option value="top-borrowed-books">Top Borrowed Books</option>
                            <option value="category-wise-borrows">Category-wise Borrows</option>
                            <option value="book-availability">Book Availability</option>
                            <option value="never-borrowed">Never Borrowed Books</option>
                        </optgroup>
                        <optgroup label="Members">
                            <option value="most-active-members">Most Active Members</option>
                            <option value="highest-overdue">Members with Highest Overdue</option>
                            <option value="overdue-today">Overdue Today</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-medium">Crunching numbers...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <p className="text-red-800 font-semibold">{error}</p>
                    <button onClick={() => fetchReport(reportType)} className="mt-2 text-red-600 underline text-sm">Try Again</button>
                </div>
            ) : data ? (
                <div className="space-y-6">
                    {/* Timestamp Badge */}
                    <div className="flex justify-end">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            Generated: {new Date(data.generated_at).toLocaleString()}
                        </span>
                    </div>

                    {/* Overview Cards */}
                    {reportType === 'overview' && data.stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            <StatCard
                                title="Total Copies"
                                value={data.stats.total_books}
                                color="border-blue-100"
                                icon={<span className="text-2xl">📚</span>}
                            />
                            <StatCard
                                title="Members"
                                value={data.stats.total_members}
                                color="border-green-100"
                                icon={<span className="text-2xl">👥</span>}
                            />
                            <StatCard
                                title="Active Borrows"
                                value={data.stats.active_borrows}
                                color="border-purple-100"
                                icon={<span className="text-2xl">🔄</span>}
                            />
                            <StatCard
                                title="Overdue"
                                value={data.stats.overdue_books}
                                color="border-orange-100"
                                icon={<span className="text-2xl">⚠️</span>}
                            />
                            <StatCard
                                title="Fines"
                                value={`৳${data.stats.total_fines.toFixed(2)}`}
                                color="border-red-100"
                                icon={<span className="text-2xl">💰</span>}
                            />
                        </div>
                    )}

                    {/* Visual Reports (Tables/Lists) */}
                    <div className="bg-white border border-gray-100 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden">
                        {Array.isArray(data.data) && data.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            {Object.keys(data.data[0]).map((key) => (
                                                <th key={key} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    {key.replace(/_/g, ' ')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.data.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                {Object.values(row).map((value: any, i) => (
                                                    <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                                        {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : typeof data.data === 'object' && Object.keys(data.data || {}).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                {Object.entries(data.data || {}).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                        <span className="font-medium text-gray-600">{key}</span>
                                        <span className="text-xl font-bold text-gray-900">
                                            {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <div className="text-6xl mb-4">📉</div>
                                <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
                                <p className="text-gray-500">There are no records to display for this report yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
