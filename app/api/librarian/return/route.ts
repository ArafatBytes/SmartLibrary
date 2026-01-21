import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { copy_id, librarian_id } = await request.json()

    if (!copy_id) {
      return NextResponse.json(
        { error: 'Copy ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find active borrow for this copy (no return transaction yet)
    const { data: activeBorrows, error: borrowError } = await supabase
      .from('borrow_transactions')
      .select('*')
      .eq('copy_id', copy_id)
      .order('borrow_date', { ascending: false })

    if (borrowError) {
      return NextResponse.json({ error: borrowError.message }, { status: 500 })
    }

    if (!activeBorrows || activeBorrows.length === 0) {
      return NextResponse.json(
        { error: 'No active borrow found for this copy ID' },
        { status: 404 }
      )
    }

    // Get the most recent active borrow
    const activeBorrow = activeBorrows[0]

    // Check if return already exists
    const { data: existingReturn } = await supabase
      .from('return_transactions')
      .select('return_id')
      .eq('borrow_id', activeBorrow.borrow_id)
      .single()

    if (existingReturn) {
      return NextResponse.json(
        { error: 'This borrow has already been returned' },
        { status: 400 }
      )
    }

    // *** CHECK FOR UNPAID FINES BEFORE ALLOWING RETURN ***
    const { data: unpaidFine, error: fineError } = await supabase
      .from('fines')
      .select(`
        fine_id,
        amount,
        payments (payment_id)
      `)
      .eq('borrow_id', activeBorrow.borrow_id)
      .maybeSingle()

    if (fineError && fineError.code !== 'PGRST116') {
      return NextResponse.json({ error: fineError.message }, { status: 500 })
    }

    // If fine exists and has no payment, block the return
    if (unpaidFine && (!unpaidFine.payments || unpaidFine.payments.length === 0)) {
      return NextResponse.json({
        error: 'Cannot return book with unpaid fine',
        fine_id: unpaidFine.fine_id,
        fine_amount: unpaidFine.amount,
        message: `Member must pay fine of $${unpaidFine.amount} before returning the book.`
      }, { status: 400 })
    }

    // Create return transaction
    const { data: returnTransaction, error: returnError } = await supabase
      .from('return_transactions')
      .insert({
        borrow_id: activeBorrow.borrow_id,
        librarian_id: librarian_id || null,
        return_date: new Date().toISOString()
      })
      .select()
      .single()

    if (returnError) {
      return NextResponse.json({ error: returnError.message }, { status: 500 })
    }

    // Update book copy status to Available
    await supabase
      .from('book_copies')
      .update({ status: 'Available' })
      .eq('copy_id', copy_id)

    return NextResponse.json({
      success: true,
      return: returnTransaction,
      message: 'Book returned successfully'
    })
  } catch (error) {
    console.error('Return error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
