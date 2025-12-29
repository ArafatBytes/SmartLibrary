'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface AuditLogEntry {
  audit_id: number
  user_id: number | null
  action: string
  table_name: string
  record_id: number | null
  old_values: any
  new_values: any
  timestamp: string
}

export default function AuditLogPage() {
  const router = useRouter()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Activity Log</h2>

          {loading ? (
            <p>Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500">No audit log entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.audit_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.audit_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.user_id || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.table_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.record_id || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600">View</summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            {log.old_values && (
                              <div className="mb-2">
                                <strong>Old:</strong>
                                <pre className="mt-1">{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <strong>New:</strong>
                                <pre className="mt-1">{JSON.stringify(log.new_values, null, 2)}</pre>
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
      </div>
    </div>
  )
}
