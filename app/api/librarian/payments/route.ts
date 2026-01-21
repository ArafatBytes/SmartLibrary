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

    // Get all fines for this member that haven't been paid
    const { data: unpaidFines, error } = await supabase
      .from('fines')
      .select(`
        fine_id,
        amount,
        created_at,
        borrow_transactions!inner (
          borrow_id,
          member_id,
          borrow_date,
          due_date,
          book_copies (
            copy_id,
            books (
              isbn,
              title
            )
          )
        ),
        payments (payment_id)
      `)
      .eq('borrow_transactions.member_id', memberId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter out fines that have payments
    const unpaid = unpaidFines?.filter((fine: any) => 
      !fine.payments || fine.payments.length === 0
    ) || []

    return NextResponse.json({ 
      member_id: memberId,
      unpaid_fines: unpaid 
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

    // Check if fine exists
    const { data: fine, error: fineError } = await supabase
      .from('fines')
      .select('fine_id, amount, borrow_id')
      .eq('fine_id', fine_id)
      .single()

    if (fineError || !fine) {
      return NextResponse.json({ error: 'Fine not found' }, { status: 404 })
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('payment_id')
      .eq('fine_id', fine_id)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Fine has already been paid' },
        { status: 400 }
      )
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        fine_id,
        received_by: librarian_id || null,
        payment_date: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      payment,
      message: `Fine of $${fine.amount} paid successfully`
    })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
