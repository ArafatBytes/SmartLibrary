import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET - Fetch all librarians
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: librarians, error } = await supabase
      .from('users')
      .select('user_id, username, email, phone, created_at')
      .eq('role', 'Librarian')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ librarians })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new librarian
export async function POST(request: Request) {
  try {
    const { username, email, phone, password } = await request.json()

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        phone: phone || null,
        password_hash: hashedPassword,
        role: 'Librarian'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
