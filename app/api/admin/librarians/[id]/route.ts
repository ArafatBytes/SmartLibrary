import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// PUT - Update librarian
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { username, email, phone, password } = await request.json()
    const supabase = await createClient()

    const updateData: {
      username: string
      email: string
      phone: string | null
      password_hash?: string
    } = {
      username,
      email,
      phone: phone || null
    }

    // Only update password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', id)
      .eq('role', 'Librarian') // Only update librarians
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

// DELETE - Delete librarian
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', id)
      .eq('role', 'Librarian') // Only delete librarians

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
