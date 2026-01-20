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

    // Query user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, username, email, password_hash, role')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Create session (simplified version)
    const response = NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })

    // Set cookie for session
    response.cookies.set('user_session', JSON.stringify({
      id: user.user_id,
      role: user.role,
      username: user.username
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
