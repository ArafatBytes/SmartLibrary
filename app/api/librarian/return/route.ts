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

    // TODO: Calculate and create fine if overdue
    const dueDate = new Date(activeBorrow.due_date)
    const returnDate = new Date()
    
    if (returnDate > dueDate) {
      const daysOverdue = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const fineAmount = daysOverdue * 1.00 // $1 per day
      
      // Create fine record
      await supabase
        .from('fines')
        .insert({
          borrow_id: activeBorrow.borrow_id,
          amount: fineAmount
        })
    }

    return NextResponse.json({
      success: true,
      return: returnTransaction,
      active_borrows: activeBorrows
    })
  } catch (error) {
    console.error('Return error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
