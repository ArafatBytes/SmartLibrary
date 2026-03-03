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

const PK_MAP: Record<string, string> = {
    users: 'user_id',
    members: 'member_id',
    fines: 'fine_id',
    payments: 'payment_id',
    borrow_transactions: 'borrow_id',
    return_transactions: 'return_id',
    book_copies: 'copy_id',
    authors: 'author_id',
    categories: 'category_id',
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

    const formatTableName = (name: string) =>
        name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    const getRecordId = (log: AuditLogEntry) => {
        if (log.record_id) return log.record_id
        const values = log.new_values || log.old_values
        if (!values) return null
        const pk = PK_MAP[log.table_name]
        return pk && values[pk] !== undefined ? values[pk] : null
    }

    const getUserId = (log: AuditLogEntry) => {
        if (log.user_id) return log.user_id
        const values = log.new_values || log.old_values
        if (!values) return null
        return (values.librarian_id as number) || (values.received_by as number) || null
    }

    const formatKey = (key: string) =>
        key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '\u2014'
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return new Date(value).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
        }
        if (typeof value === 'boolean') return value ? 'Yes' : 'No'
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
    }

    const formatTimestamp = (ts: string) => {
        if (!ts) return 'N/A'
        const d = new Date(ts)
        if (isNaN(d.getTime())) return 'N/A'
        return d.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    }

    const getChangedKeys = (o: Record<string, unknown>, n: Record<string, unknown>) =>
        Object.keys(n).filter(k => JSON.stringify(o[k]) !== JSON.stringify(n[k]))

    const renderPayload = (log: AuditLogEntry) => {
        if (log.action === 'UPDATE' && log.old_values && log.new_values) {
            const changed = getChangedKeys(log.old_values, log.new_values)
            if (changed.length === 0) return <p className="text-gray-400 italic text-xs">No visible changes</p>
            return (
                <div className="space-y-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Changed Fields</div>
                    {changed.map(key => (
                        <div key={key} className="text-xs">
                            <span className="text-gray-400 font-medium">{formatKey(key)}</span>
                            <div className="flex items-center gap-2 ml-2 mt-0.5 flex-wrap">
                                <span className="text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded line-through break-all">
                                    {formatValue(log.old_values![key])}
                                </span>
                                <span className="text-gray-500">&rarr;</span>
                                <span className="text-green-400 bg-green-950/30 px-1.5 py-0.5 rounded break-all">
                                    {formatValue(log.new_values![key])}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }
        const values = log.new_values || log.old_values
        if (!values) return <p className="text-gray-400 italic text-xs">No data</p>
        const label = log.action === 'DELETE' ? 'Deleted Record' : 'Record Data'
        const accent = log.action === 'DELETE' ? 'text-red-400' : 'text-green-400'
        return (
            <div className="space-y-1.5">
                <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${accent}`}>{label}</div>
                {Object.entries(values).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs">
                        <span className="text-gray-400 font-medium shrink-0">{formatKey(k)}:</span>
                        <span className="text-gray-200 break-all">{formatValue(v)}</span>
                    </div>
                ))}
            </div>
        )
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
                            {logs.map((log) => {
                                const recordId = getRecordId(log)
                                const userId = getUserId(log)
                                return (
                                    <tr key={log.audit_id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{formatTableName(log.table_name)}</div>
                                            <div className="text-xs text-gray-400">
                                                ID: {recordId != null ? (
                                                    <span className="font-mono text-gray-600">{String(recordId)}</span>
                                                ) : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {userId ? (
                                                <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">#{userId}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">System</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatTimestamp(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <details className="group cursor-pointer relative">
                                                <summary className="text-blue-600 font-medium text-xs hover:text-blue-800 list-none flex items-center gap-1 w-fit">
                                                    <span>Payload</span>
                                                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </summary>
                                                <div className="absolute z-20 right-0 mt-2 p-4 bg-gray-900 text-gray-100 rounded-xl shadow-2xl text-xs max-w-md overflow-auto max-h-72 border border-gray-700/50 animate-in zoom-in-95 duration-100 origin-top-right">
                                                    {renderPayload(log)}
                                                </div>
                                            </details>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
