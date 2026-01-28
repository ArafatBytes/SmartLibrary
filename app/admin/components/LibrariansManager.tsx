'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface Librarian {
    user_id: number
    username: string
    email: string
    phone: string | null
    created_at: string
}

export default function LibrariansManager() {
    const [librarians, setLibrarians] = useState<Librarian[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
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

            const data = await response.json()

            if (response.ok) {
                toast.success(editingId ? 'Librarian updated successfully' : 'Librarian created successfully')
                await fetchLibrarians()
                closeForm()
            } else {
                toast.error(data.error || 'Operation failed')
            }
        } catch (error) {
            console.error('Error saving librarian:', error)
            toast.error('An error occurred')
        }
    }

    const confirmDelete = async () => {
        if (!deleteId) return

        try {
            const response = await fetch(`/api/admin/librarians/${deleteId}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(data.message || 'Librarian deleted successfully')
                await fetchLibrarians()
                setShowDeleteModal(false)
                setDeleteId(null)
            } else {
                toast.error(data.error || 'Failed to delete')
            }
        } catch (error) {
            console.error('Error deleting librarian:', error)
            toast.error('An error occurred')
        }
    }

    const handleDeleteClick = (id: number) => {
        setDeleteId(id)
        setShowDeleteModal(true)
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

    const closeForm = () => {
        setShowAddForm(false)
        setEditingId(null)
        setFormData({ username: '', email: '', phone: '', password: '' })
    }

    return (
        <div className="bg-white border border-gray-100 shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gray-50/30">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Librarian Team</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage system access and librarian profiles</p>
                </div>
                <button
                    onClick={() => {
                        setShowAddForm(true)
                        setEditingId(null)
                        setFormData({ username: '', email: '', phone: '', password: '' })
                    }}
                    className="mt-4 sm:mt-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 text-sm font-semibold"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Librarian
                </button>
            </div>

            {/* Add/Edit Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingId ? 'Edit Profile' : 'New Librarian'}
                            </h3>
                            <button
                                onClick={closeForm}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="e.g. john_doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="john@library.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                                    <input
                                        value={formData.phone}
                                        required
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="+880..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Password {editingId && <span className="text-gray-400 font-normal normal-case">(optional)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingId}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 font-medium transition-all active:scale-95"
                                >
                                    {editingId ? 'Save Changes' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Removal</h3>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                            Are you sure you want to remove this librarian? This action is irreversible.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Librarians Table */}
            {loading ? (
                <div className="p-8 text-center text-gray-500 animate-pulse">Loading profiles...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Librarian</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Added</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {librarians.map((librarian) => (
                                <tr key={librarian.user_id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-8 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-lg mr-4 border border-blue-50">
                                                {librarian.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{librarian.username}</div>
                                                <div className="text-xs text-gray-500">ID: #{librarian.user_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-600 mb-0.5 flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" /><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" /></svg>
                                            {librarian.email}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" /></svg>
                                            {librarian.phone || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {new Date(librarian.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleEdit(librarian)}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(librarian.user_id)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {librarians.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-gray-500">
                                        No librarians found. Add one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
