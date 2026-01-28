'use client'

import { useState, useEffect } from 'react'

interface AuditLogEntry {
    audit_id: number
    user_id: number | null
    action: string
    table_name: string
    record_id: number | null
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    timestamp: string
}

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAuditLogs()
    }, [])

    const fetchAuditLogs = async () => {
        try {
            const response = await fetch('/api/admin/audit-log')
            const data = await response.json()
            setLogs(data.logs || [])
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'INSERT': return 'bg-green-100 text-green-700 border-green-200'
            case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'DELETE': return 'bg-red-100 text-red-700 border-red-200'
            case 'BORROW': return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'RETURN': return 'bg-orange-100 text-orange-700 border-orange-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    return (
        <div className="bg-white border border-gray-100 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">System Audit Log</h2>
                <p className="text-sm text-gray-500 mt-1">Track comprehensive system activities and changes</p>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-500 animate-pulse flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    Loading records...
                </div>
            ) : logs.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-gray-50 m-4 rounded-xl border border-gray-100 border-dashed">
                    No activity recorded yet.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/60 backdrop-blur-sm sticky top-0">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entity</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {logs.map((log) => (
                                <tr key={log.audit_id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 capitalize">{log.table_name}</div>
                                        <div className="text-xs text-gray-400">ID: {log.record_id || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.user_id ? (
                                            <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">#{log.user_id}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">System</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(log.timestamp).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <details className="group cursor-pointer">
                                            <summary className="text-blue-600 font-medium text-xs hover:text-blue-800 list-none flex items-center gap-1 w-fit">
                                                <span>Payload</span>
                                                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </summary>
                                            <div className="absolute z-10 mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg shadow-xl text-xs font-mono max-w-sm overflow-auto max-h-60 border border-gray-700 animate-in zoom-in-95 duration-100 origin-top-left">
                                                {log.old_values && (
                                                    <div className="mb-3 border-l-2 border-red-500 pl-2">
                                                        <div className="text-red-400 font-bold mb-1">Old State:</div>
                                                        <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                                                    </div>
                                                )}
                                                {log.new_values && (
                                                    <div className="border-l-2 border-green-500 pl-2">
                                                        <div className="text-green-400 font-bold mb-1">New State:</div>
                                                        <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
