import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET - Fetch all librarians
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: librarians, error } = await supabase
      .rpc('get_all_librarians')

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
      .rpc('create_librarian', {
        p_username: username,
        p_email: email,
        p_phone: phone || null,
        p_password_hash: hashedPassword
      })
      .single() as { data: { success: boolean; message: string; user_id: number; username: string; email: string; phone: string; created_at: string } | null; error: Error | null }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || !data.success) {
      return NextResponse.json({ error: data?.message || 'Failed to create librarian' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        user_id: data.user_id,
        username: data.username,
        email: data.email,
        phone: data.phone,
        created_at: data.created_at
      }
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
