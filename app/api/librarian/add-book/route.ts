import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { isbn, title, publisher, authors, category_id, publication_year, description } = await request.json()

    // Validation
    if (!isbn || !title || !authors || authors.length === 0) {
      return NextResponse.json({
        error: 'ISBN, title, and at least one author are required'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Call PL/pgSQL function
    const { data, error } = await supabase.rpc('add_new_book', {
      p_isbn: isbn,
      p_title: title,
      p_publisher: publisher || 'Unknown',
      p_author_names: authors,
      p_category_id: category_id || null,
      p_publication_year: publication_year || null,
      p_description: description || null
    })

    if (error) {
      console.error('Add book error:', error)
      return NextResponse.json({
        error: 'Failed to add book',
        details: error.message
      }, { status: 500 })
    }

    if (data && data.length > 0) {
      const result = data[0]
      
      if (!result.success) {
        return NextResponse.json({
          error: result.message
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        isbn: result.isbn,
        copy_id: result.copy_id,
        new_authors_created: result.new_authors_created
      })
    }

    return NextResponse.json({
      error: 'Unexpected error during book addition'
    }, { status: 500 })

  } catch (error) {
    console.error('Add book error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
