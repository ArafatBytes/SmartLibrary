'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Librarian {
  user_id: number
  username: string
  email: string
  phone: string | null
  created_at: string
}

export default function LibrariansManagement() {
  const router = useRouter()
  const [librarians, setLibrarians] = useState<Librarian[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  })

  useEffect(() => {
    fetchLibrarians()
  }, [])

  const fetchLibrarians = async () => {
    try {
      const response = await fetch('/api/admin/librarians')
      const data = await response.json()
      setLibrarians(data.librarians || [])
    } catch (error) {
      console.error('Error fetching librarians:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingId 
        ? `/api/admin/librarians/${editingId}` 
        : '/api/admin/librarians'
      
      const method = editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchLibrarians()
        setShowAddForm(false)
        setEditingId(null)
        setFormData({ username: '', email: '', phone: '', password: '' })
      }
    } catch (error) {
      console.error('Error saving librarian:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this librarian?')) return

    try {
      const response = await fetch(`/api/admin/librarians/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchLibrarians()
      }
    } catch (error) {
      console.error('Error deleting librarian:', error)
    }
  }

  const handleEdit = (librarian: Librarian) => {
    setEditingId(librarian.user_id)
    setFormData({
      username: librarian.username,
      email: librarian.email,
      phone: librarian.phone || '',
      password: ''
    })
    setShowAddForm(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Manage Librarians</h1>
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Librarian Accounts</h2>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm)
                setEditingId(null)
                setFormData({ username: '', email: '', phone: '', password: '' })
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showAddForm ? 'Cancel' : '+ Add New Librarian'}
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <h3 className="font-semibold">{editingId ? 'Edit Librarian' : 'Add New Librarian'}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingId && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {editingId ? 'Update Librarian' : 'Create Librarian'}
              </button>
            </form>
          )}

          {/* Librarians Table */}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {librarians.map((librarian) => (
                  <tr key={librarian.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{librarian.user_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{librarian.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{librarian.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{librarian.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(librarian.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleEdit(librarian)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(librarian.user_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
