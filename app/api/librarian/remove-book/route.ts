import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { copy_id } = await request.json()

    if (!copy_id) {
      return NextResponse.json({
        error: 'Copy ID is required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Call PL/pgSQL function
    const { data, error } = await supabase.rpc('remove_book_copy', {
      p_copy_id: copy_id
    })

    if (error) {
      console.error('Remove book error:', error)
      return NextResponse.json({
        error: 'Failed to remove book copy',
        details: error.message
      }, { status: 500 })
    }

    if (data && data.length > 0) {
      const result = data[0]
      
      if (!result.success) {
        return NextResponse.json({
          error: result.message,
          previous_status: result.previous_status,
          isbn: result.isbn
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        isbn: result.isbn,
        previous_status: result.previous_status
      })
    }

    return NextResponse.json({
      error: 'Unexpected error during book removal'
    }, { status: 500 })

  } catch (error) {
    console.error('Remove book error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
