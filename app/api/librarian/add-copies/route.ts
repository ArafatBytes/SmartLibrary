import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { isbn, quantity } = body

    // Validate inputs
    if (!isbn || isbn.trim() === '') {
      return NextResponse.json(
        { error: 'ISBN is required' },
        { status: 400 }
      )
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      )
    }

    if (quantity > 100) {
      return NextResponse.json(
        { error: 'Cannot add more than 100 copies at once' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call PL/pgSQL function to add copies
    const { data, error } = await supabase
      .rpc('add_book_copies', {
        p_isbn: isbn.trim(),
        p_quantity: parseInt(quantity)
      })
      .single()

    if (error) {
      console.error('Add copies error:', error)
      return NextResponse.json({
        error: 'Failed to add book copies',
        details: error.message
      }, { status: 500 })
    }

    const result = data as {
      success: boolean
      message: string
      isbn: string
      copies_added: number
      copy_ids: number[]
    }

    if (!result.success) {
      return NextResponse.json({
        error: result.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      isbn: result.isbn,
      copies_added: result.copies_added,
      copy_ids: result.copy_ids
    })

  } catch (error) {
    console.error('Add copies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
