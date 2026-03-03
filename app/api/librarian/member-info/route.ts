import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Use PL/pgSQL function to get member info
    const { data: results, error } = await supabase
      .rpc('get_member_info', { p_member_id: parseInt(memberId) })

    if (error) {
      console.error('Member info error:', error)

      // Check if it's a "member not found" error from our RAISE EXCEPTION
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          error: error.message
        }, { status: 404 })
      }

      return NextResponse.json({
        error: 'Failed to fetch member info',
        details: error.message
      }, { status: 500 })
    }

    // Extract member details from first row (if any)
    const memberDetails = results && results.length > 0
      ? {
          name: results[0].member_name,
          email: results[0].member_email,
          phone: results[0].member_phone
        }
      : null

    // Separate borrowed books and fines (exclude the member-only row with no borrow data)
    const borrowedBooks = (results || [])
      .filter((row: any) => row.record_type === 'borrow')
      .map((row: any) => ({
        copy_id: row.copy_id,
        isbn: row.isbn,
        title: row.book_title,
        authors: row.authors,
        borrow_date: row.borrow_date,
        due_date: row.due_date,
        days_overdue: row.days_overdue,
        fine_id: row.fine_id,
        fine_amount: row.fine_amount,
        is_paid: row.is_paid
      }))

    return NextResponse.json({
      member: memberDetails,
      borrowed_books: borrowedBooks,
      total_borrowed: borrowedBooks.length,
      total_unpaid_fines: borrowedBooks
        .filter((b: any) => b.fine_amount > 0 && !b.is_paid)
        .reduce((sum: number, b: any) => sum + parseFloat(b.fine_amount), 0)
    })

  } catch (error) {
    console.error('Member info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
