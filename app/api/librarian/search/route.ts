import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Search across books, authors, categories with JOIN
    const { data: results, error } = await supabase
      .from('books')
      .select(`
        isbn,
        title,
        publication_year,
        description,
        categories:category_id (
          category_id,
          name
        ),
        book_author!inner (
          authors:author_id (
            author_id,
            name
          )
        ),
        book_copies (
          copy_id,
          status
        )
      `)
      .or(`title.ilike.%${query}%,isbn.ilike.%${query}%,description.ilike.%${query}%`)
      .order('title', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the results to include author names and availability
    const transformedResults = results.map((book: any) => {
      const authors = book.book_author?.map((ba: any) => ba.authors?.name).filter(Boolean) || []
      const availableCopies = book.book_copies?.filter((c: any) => c.status === 'Available').length || 0
      const totalCopies = book.book_copies?.length || 0

      return {
        isbn: book.isbn,
        title: book.title,
        publication_year: book.publication_year,
        description: book.description,
        category: book.categories?.name || 'Uncategorized',
        authors: authors.join(', '),
        available_copies: availableCopies,
        total_copies: totalCopies,
        is_available: availableCopies > 0
      }
    })

    return NextResponse.json({ 
      query,
      count: transformedResults.length,
      results: transformedResults 
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
