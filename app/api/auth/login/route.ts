import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Query user from database using PL/pgSQL function
    const { data, error } = await supabase
      .rpc('authenticate_user', { p_username: username })
      .single() as { data: { user_id: number; username: string; email: string; password_hash: string; role: string; success: boolean; message: string } | null; error: Error | null }

    if (error || !data || !data.success) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, data.password_hash)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Create session (simplified version)
    const response = NextResponse.json({
      success: true,
      role: data.role,
      user: {
        id: data.user_id,
        username: data.username,
        email: data.email,
        role: data.role
      }
    })

    // Set cookie for session
    response.cookies.set('user_session', JSON.stringify({
      id: data.user_id,
      role: data.role,
      username: data.username
    }), {
      httpOnly: false, // Allow client-side JavaScript to read for role checks
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
