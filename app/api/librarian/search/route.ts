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
    
    const searchPattern = `%${query}%`
    
    // Search books by title only
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('isbn, title, publication_year, publisher, category_id')
      .ilike('title', searchPattern)
      .order('title', { ascending: true })
      .limit(100)

    if (booksError) {
      console.error('Search error:', booksError)
      return NextResponse.json({ error: booksError.message }, { status: 500 })
    }

    if (!books || books.length === 0) {
      return NextResponse.json({ 
        query,
        count: 0,
        results: [] 
      })
    }

    const isbns = books.map(b => b.isbn)
    
    // Get categories
    const categoryIds = [...new Set(books.map(b => b.category_id).filter(Boolean))]
    const { data: categories } = await supabase
      .from('categories')
      .select('category_id, name')
      .in('category_id', categoryIds)
    
    // Get authors
    const { data: bookAuthors } = await supabase
      .from('book_author')
      .select('isbn, author_id(author_id, name)')
      .in('isbn', isbns)
    
    // Get copies
    const { data: copies } = await supabase
      .from('book_copies')
      .select('isbn, status')
      .in('isbn', isbns)

    // Transform results
    const transformedResults = books.map((book) => {
      const categoryMap = new Map(categories?.map(c => [c.category_id, c.name]) || [])
      
      const bookAuthorRecords = bookAuthors?.filter(ba => ba.isbn === book.isbn) || []
      const authors = bookAuthorRecords.map(ba => {
        const authorData = ba.author_id as { name?: string } | null
        return authorData?.name
      }).filter(Boolean)
      
      const bookCopies = copies?.filter(c => c.isbn === book.isbn) || []
      const availableCopies = bookCopies.filter(c => c.status === 'Available').length
      const totalCopies = bookCopies.length

      return {
        isbn: book.isbn,
        title: book.title,
        authors: authors.join(', ') || 'Unknown',
        publisher: book.publisher || 'Unknown',
        category: categoryMap.get(book.category_id) || 'Uncategorized',
        publication_year: book.publication_year,
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
