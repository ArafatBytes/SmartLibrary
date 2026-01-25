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
    
    // Get book copy details with status
    const { data: copyData, error: copyError } = await supabase
      .from('book_copies')
      .select('copy_id, isbn, status')
      .eq('copy_id', parseInt(copyId))
      .single()

    if (copyError || !copyData) {
      return NextResponse.json(
        { error: 'Book copy not found' },
        { status: 404 }
      )
    }

    // Get book details
    const { data: bookData, error: bookError } = await supabase
      .from('books')
      .select('isbn, title, publisher, publication_year, category_id')
      .eq('isbn', copyData.isbn)
      .single()

    if (bookError || !bookData) {
      return NextResponse.json(
        { error: 'Book details not found' },
        { status: 404 }
      )
    }

    // Get category name
    let categoryName = 'Uncategorized'
    if (bookData.category_id) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name')
        .eq('category_id', bookData.category_id)
        .single()
      
      if (categoryData) {
        categoryName = categoryData.name
      }
    }

    // Get authors
    const { data: authorData } = await supabase
      .from('book_author')
      .select('author_id')
      .eq('isbn', copyData.isbn)

    const authorIds = authorData?.map(a => a.author_id).filter(Boolean) || []
    let authorsString = 'Unknown'
    
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('authors')
        .select('name')
        .in('author_id', authorIds)
      
      if (authors && authors.length > 0) {
        authorsString = authors.map(a => a.name).join(', ')
      }
    }

    // Check if currently borrowed
    let borrowInfo = null
    if (copyData.status === 'Borrowed') {
      const { data: borrowData } = await supabase
        .from('borrow_transactions')
        .select('borrow_id, borrow_date, due_date, member_id')
        .eq('copy_id', parseInt(copyId))
        .is('return_date', null)
        .single()

      if (borrowData) {
        const { data: memberData } = await supabase
          .from('members')
          .select('name, email')
          .eq('member_id', borrowData.member_id)
          .single()

        borrowInfo = {
          borrow_id: borrowData.borrow_id,
          borrow_date: borrowData.borrow_date,
          due_date: borrowData.due_date,
          member_name: memberData?.name || 'Unknown',
          member_email: memberData?.email || 'Unknown'
        }
      }
    }

    return NextResponse.json({
      copy_id: copyData.copy_id,
      isbn: copyData.isbn,
      title: bookData.title,
      authors: authorsString,
      publisher: bookData.publisher || 'Unknown',
      category: categoryName,
      publication_year: bookData.publication_year,
      status: copyData.status,
      is_available: copyData.status === 'Available',
      borrow_info: borrowInfo
    })

  } catch (error) {
    console.error('Check status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
