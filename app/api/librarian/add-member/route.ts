import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, address, member_id } = body

    // Validate member_id first (required)
    if (member_id === undefined || member_id === null || member_id === '') {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const memberId = parseInt(member_id)
    if (isNaN(memberId) || memberId < 1) {
      return NextResponse.json(
        { error: 'Student ID must be a positive number' },
        { status: 400 }
      )
    }

    // Validate other inputs
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!address || address.trim() === '') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call PL/pgSQL function to add member
    const { data, error } = await supabase
      .rpc('add_member', {
        p_name: name.trim(),
        p_email: email.trim(),
        p_phone: phone.trim(),
        p_address: address.trim(),
        p_member_id: parseInt(member_id)
      })
      .single()

    if (error) {
      console.error('Add member RPC error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({
        error: 'Failed to add member',
        details: error.message
      }, { status: 500 })
    }

    if (!data) {
      console.error('No data returned from add_member function')
      return NextResponse.json({
        error: 'Failed to add member - no data returned'
      }, { status: 500 })
    }

    const result = data as {
      success: boolean
      message: string
      member_id: number | null
    }

    console.log('Add member result:', result)

    if (!result.success) {
      return NextResponse.json({
        error: result.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      member_id: result.member_id
    })

  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
