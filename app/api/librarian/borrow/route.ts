import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { copy_id, member_id, due_date, librarian_id } = await request.json()

    if (!copy_id || !member_id) {
      return NextResponse.json(
        { error: 'Copy ID and Member ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if copy is available
    const { data: copy, error: copyError } = await supabase
      .from('book_copies')
      .select('status')
      .eq('copy_id', copy_id)
      .single()

    if (copyError || !copy) {
      return NextResponse.json({ error: 'Book copy not found' }, { status: 404 })
    }

    if (copy.status !== 'Available') {
      return NextResponse.json(
        { error: 'Book copy is not available' },
        { status: 400 }
      )
    }

    // Calculate due_date: Default 4 months from today, or use provided date
    const borrowDate = new Date()
    let calculatedDueDate: string
    
    if (due_date) {
      calculatedDueDate = due_date
    } else {
      // Add 4 months to borrow date
      const dueDateObj = new Date(borrowDate)
      dueDateObj.setMonth(dueDateObj.getMonth() + 4)
      calculatedDueDate = dueDateObj.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Create borrow transaction
    const { data: borrow, error: borrowError } = await supabase
      .from('borrow_transactions')
      .insert({
        member_id,
        copy_id,
        librarian_id: librarian_id || null,
        due_date: calculatedDueDate,
        borrow_date: borrowDate.toISOString()
      })
      .select()
      .single()

    if (borrowError) {
      return NextResponse.json({ error: borrowError.message }, { status: 500 })
    }

    // Update book copy status to Borrowed
    await supabase
      .from('book_copies')
      .update({ status: 'Borrowed' })
      .eq('copy_id', copy_id)

    return NextResponse.json({
      success: true,
      borrow,
      message: `Book borrowed successfully. Due date: ${calculatedDueDate}`
    })
  } catch (error) {
    console.error('Borrow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
