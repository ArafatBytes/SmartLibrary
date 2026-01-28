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

    // Hash password if provided
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    const { data, error } = await supabase
      .rpc('update_librarian', {
        p_user_id: parseInt(id),
        p_username: username,
        p_email: email,
        p_phone: phone || null,
        p_password_hash: hashedPassword
      })
      .single() as { data: { success: boolean; message: string; user_id: number; username: string; email: string; phone: string } | null; error: Error | null }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || !data.success) {
      return NextResponse.json({ error: data?.message || 'Failed to update librarian' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        user_id: data.user_id,
        username: data.username,
        email: data.email,
        phone: data.phone
      }
    })
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

    const { data, error } = await supabase
      .rpc('delete_librarian', {
        p_user_id: parseInt(id)
      })
      .single() as { data: { success: boolean; message: string } | null; error: Error | null }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || !data.success) {
      return NextResponse.json({ error: data?.message || 'Failed to delete librarian' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: data.message })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
