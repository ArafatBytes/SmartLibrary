
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SupabaseTest() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [message, setMessage] = useState('Testing connection...')

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        
        // Test connection by checking available tables
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .limit(1)

        if (error) {
          // If table doesn't exist yet, that's okay - connection works
          if (error.code === '42P01') {
            setStatus('success')
            setMessage('✅ Supabase connected! (Tables not created yet - run migrations)')
          } else {
            throw error
          }
        } else {
          setStatus('success')
          setMessage(`✅ Supabase connected successfully! Found ${data?.length || 0} categories.`)
        }
      } catch (err) {
        setStatus('error')
        setMessage(`❌ Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        console.error('Supabase connection error:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>🗄️ Supabase Connection Test</h1>
      
      <div style={{
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '1rem',
        backgroundColor: status === 'testing' ? '#f3f4f6' : status === 'success' ? '#d1fae5' : '#fee2e2',
        border: `2px solid ${status === 'testing' ? '#d1d5db' : status === 'success' ? '#10b981' : '#ef4444'}`
      }}>
        <p style={{ fontSize: '1.125rem', margin: 0 }}>{message}</p>
      </div>

      {status === 'success' && (
        <div style={{ marginTop: '2rem' }}>
          <h2>✅ Configuration Complete!</h2>
          <p>Your Supabase integration is set up correctly. Next steps:</p>
          <ol>
            <li>Go to your Supabase Dashboard</li>
            <li>Navigate to SQL Editor</li>
            <li>Run the migration files from <code>supabase/migrations/</code></li>
            <li>Start building your library management features!</li>
          </ol>
        </div>
      )}

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#f9fafb', 
        borderRadius: '6px',
        fontSize: '0.875rem'
      }}>
        <h3 style={{ marginTop: 0 }}>Environment Variables:</h3>
        <ul style={{ fontFamily: 'monospace' }}>
          <li>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
        </ul>
      </div>
    </div>
  )
}
