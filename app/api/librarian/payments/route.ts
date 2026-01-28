import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get all unpaid fines for a member
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get all unpaid fines for this member using PL/pgSQL function
    const { data: unpaidFines, error } = await supabase
      .rpc('get_member_unpaid_fines', {
        p_member_id: parseInt(memberId)
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      member_id: memberId,
      unpaid_fines: unpaidFines || []
    })

  } catch (error) {
    console.error('Get fines error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Record a fine payment
export async function POST(request: Request) {
  try {
    const { fine_id, librarian_id } = await request.json()

    if (!fine_id) {
      return NextResponse.json(
        { error: 'Fine ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Record payment using PL/pgSQL function
    const { data, error } = await supabase
      .rpc('record_fine_payment', {
        p_fine_id: parseInt(fine_id),
        p_librarian_id: librarian_id ? parseInt(librarian_id) : null
      })
      .single() as { data: { success: boolean; message: string; payment_id: number; fine_amount: number; payment_date: string } | null; error: Error | null }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || !data.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to record payment' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      payment: {
        payment_id: data.payment_id,
        fine_id: parseInt(fine_id),
        amount: data.fine_amount,
        payment_date: data.payment_date
      },
      message: data.message
    })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
