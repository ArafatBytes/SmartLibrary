import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { copy_id, librarian_id, confirm_payment, fine_id } = await request.json()

    if (!copy_id) {
      return NextResponse.json(
        { error: 'Copy ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // If confirming payment, record it first
    if (confirm_payment && fine_id) {
      const { data: paymentResult, error: paymentError } = await supabase
        .rpc('record_fine_payment', {
          p_fine_id: fine_id,
          p_librarian_id: librarian_id || null
        })

      if (paymentError) {
        console.error('Payment recording error:', paymentError)
        return NextResponse.json({
          error: 'Failed to record payment',
          details: paymentError.message
        }, { status: 500 })
      }

      if (paymentResult && paymentResult.length > 0 && !paymentResult[0].success) {
        return NextResponse.json({
          error: paymentResult[0].message
        }, { status: 400 })
      }
    }

    // Check for active borrow and fine details
    const { data: borrowInfo, error: borrowError } = await supabase
      .rpc('get_active_borrow_with_fine', {
        p_copy_id: copy_id
      })

    if (borrowError) {
      console.error('Borrow info error:', borrowError)
      return NextResponse.json({
        error: 'Failed to retrieve borrow information',
        details: borrowError.message
      }, { status: 500 })
    }

    if (!borrowInfo || borrowInfo.length === 0) {
      return NextResponse.json({
        error: 'No active borrow found for this copy ID'
      }, { status: 404 })
    }

    const activeBorrow = borrowInfo[0]

    // If there's a fine and payment hasn't been made, require payment
    if (activeBorrow.fine_amount > 0 && !activeBorrow.payment_exists) {
      return NextResponse.json({
        requires_payment: true,
        fine_details: {
          fine_id: activeBorrow.fine_id,
          borrow_id: activeBorrow.borrow_id,
          member_name: activeBorrow.member_name,
          member_email: activeBorrow.member_email,
          borrow_date: activeBorrow.borrow_date,
          due_date: activeBorrow.due_date,
          days_overdue: activeBorrow.days_overdue,
          fine_amount: activeBorrow.fine_amount
        },
        message: `Book is ${activeBorrow.days_overdue} days overdue. Fine: ${activeBorrow.fine_amount} BDT. Payment required before return.`
      }, { status: 402 })
    }

    // Process the return using database function
    const { data: returnResult, error: returnError } = await supabase
      .rpc('process_book_return', {
        p_copy_id: copy_id,
        p_librarian_id: librarian_id || null
      })

    if (returnError) {
      console.error('Return processing error:', returnError)
      return NextResponse.json({
        error: 'Failed to process return',
        details: returnError.message
      }, { status: 500 })
    }

    if (returnResult && returnResult.length > 0) {
      const result = returnResult[0]
      if (!result.success) {
        return NextResponse.json({
          error: result.message
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        return_id: result.return_id,
        fine_paid: result.fine_amount,
        message: result.message
      })
    }

    return NextResponse.json({
      error: 'Unexpected error during return processing'
    }, { status: 500 })

  } catch (error) {
    console.error('Return error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
