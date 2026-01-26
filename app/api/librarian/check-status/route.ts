import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const copyId = searchParams.get('copy_id')

    if (!copyId) {
      return NextResponse.json(
        { error: 'Copy ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use PL/pgSQL function to check copy status
    const { data: result, error: statusError } = await supabase
      .rpc('check_copy_status', {
        p_copy_id: parseInt(copyId)
      })

    if (statusError) {
      console.error('Check status error:', statusError)
      return NextResponse.json({
        error: 'Failed to check status',
        details: statusError.message
      }, { status: 500 })
    }

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Book copy not found' },
        { status: 404 }
      )
    }

    const copyData = result[0]

    return NextResponse.json({
      copy_id: copyData.copy_id,
      isbn: copyData.isbn,
      title: copyData.title,
      authors: copyData.authors || 'Unknown',
      publisher: copyData.publisher || 'Unknown',
      category: copyData.category || 'Uncategorized',
      publication_year: copyData.publication_year,
      status: copyData.status,
      is_available: copyData.is_available,
      borrow_info: copyData.borrow_id ? {
        borrow_id: copyData.borrow_id,
        borrow_date: copyData.borrow_date,
        due_date: copyData.due_date,
        member_name: copyData.member_name || 'Unknown',
        member_email: copyData.member_email || 'Unknown'
      } : null
    })

  } catch (error) {
    console.error('Check status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
