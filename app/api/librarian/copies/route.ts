import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const isbn = searchParams.get('isbn')

    if (!isbn) {
      return NextResponse.json(
        { error: 'ISBN is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Use PL/pgSQL function to get book copies
    const { data: copies, error } = await supabase
      .rpc('get_book_copies', { p_isbn: isbn })

    if (error) {
      console.error('Fetch copies error:', error)
      return NextResponse.json({
        error: 'Failed to fetch copies',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      isbn,
      copies: copies || []
    })

  } catch (error) {
    console.error('Copies fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
