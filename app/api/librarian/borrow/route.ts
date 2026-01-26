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

    // Calculate due_date: Default 4 months from today, or use provided date
    let calculatedDueDate: string
    
    if (due_date) {
      calculatedDueDate = due_date
    } else {
      // Add 4 months to today
      const dueDateObj = new Date()
      dueDateObj.setMonth(dueDateObj.getMonth() + 4)
      calculatedDueDate = dueDateObj.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Use PL/pgSQL function to create borrow transaction
    const { data: result, error: borrowError } = await supabase
      .rpc('create_borrow_transaction', {
        p_copy_id: copy_id,
        p_member_id: member_id,
        p_due_date: calculatedDueDate,
        p_librarian_id: librarian_id || null
      })

    if (borrowError) {
      console.error('Borrow error:', borrowError)
      return NextResponse.json({
        error: 'Failed to create borrow transaction',
        details: borrowError.message
      }, { status: 500 })
    }

    if (result && result.length > 0) {
      const borrowResult = result[0]
      if (!borrowResult.success) {
        return NextResponse.json({
          error: borrowResult.message
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        borrow_id: borrowResult.borrow_id,
        message: `${borrowResult.message}. Due date: ${calculatedDueDate}`
      })
    }

    return NextResponse.json({
      error: 'Unexpected error during borrow processing'
    }, { status: 500 })

  } catch (error) {
    console.error('Borrow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
