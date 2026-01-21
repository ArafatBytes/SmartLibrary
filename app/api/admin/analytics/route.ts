import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'

    const supabase = await createClient()

    switch (reportType) {
      case 'overview':
        return await getOverviewStats(supabase)
      
      case 'monthly-borrowing':
        return await getMonthlyBorrowingTrend(supabase)
      
      case 'fines-collected':
        return await getFinesCollectedPerMonth(supabase)
      
      case 'top-borrowed-books':
        const limit = parseInt(searchParams.get('limit') || '10')
        return await getTopBorrowedBooks(supabase, limit)
      
      case 'category-wise-borrows':
        return await getCategoryWiseBorrows(supabase)
      
      case 'most-active-members':
        const memberLimit = parseInt(searchParams.get('limit') || '10')
        return await getMostActiveMembers(supabase, memberLimit)
      
      case 'book-availability':
        return await getBookAvailability(supabase)
      
      case 'never-borrowed':
        return await getNeverBorrowedBooks(supabase)
      
      case 'highest-overdue':
        return await getMembersWithHighestOverdue(supabase)
      
      case 'overdue-today':
        return await getOverdueBooksToday(supabase)
      
      case 'librarian-activity':
        return await getLibrarianActivity(supabase)
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Overview statistics
async function getOverviewStats(supabase: any) {
  const [
    totalBooks,
    totalMembers,
    activeBorrows,
    overdueBooks,
    totalFines
  ] = await Promise.all([
    supabase.from('books').select('isbn', { count: 'exact', head: true }),
    supabase.from('members').select('member_id', { count: 'exact', head: true }),
    supabase.rpc('count_active_borrows'),
    supabase.rpc('count_overdue_books'),
    supabase.from('fines').select('amount').then((res: any) => 
      res.data?.reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0) || 0
    )
  ])

  return NextResponse.json({
    report_type: 'overview',
    generated_at: new Date().toISOString(),
    stats: {
      total_books: totalBooks.count || 0,
      total_members: totalMembers.count || 0,
      active_borrows: activeBorrows.data || 0,
      overdue_books: overdueBooks.data || 0,
      total_fines: totalFines
    }
  })
}

// Monthly borrowing trend (last 12 months)
async function getMonthlyBorrowingTrend(supabase: any) {
  const { data, error } = await supabase.rpc('get_monthly_borrowing_trend')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'monthly_borrowing_trend',
    generated_at: new Date().toISOString(),
    data: data || []
  })
}

// Fines collected per month
async function getFinesCollectedPerMonth(supabase: any) {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      payment_date,
      fines!inner (amount)
    `)
    .order('payment_date', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by month
  const monthlyData = data?.reduce((acc: any, payment: any) => {
    const month = new Date(payment.payment_date).toISOString().slice(0, 7)
    if (!acc[month]) {
      acc[month] = 0
    }
    acc[month] += parseFloat(payment.fines.amount)
    return acc
  }, {})

  return NextResponse.json({
    report_type: 'fines_collected_per_month',
    generated_at: new Date().toISOString(),
    data: monthlyData || {}
  })
}

// Top K most borrowed books
async function getTopBorrowedBooks(supabase: any, limit: number) {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(`
      copy_id,
      book_copies!inner (
        isbn,
        books!inner (
          title,
          categories (name)
        )
      )
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Count borrows per book
  const bookCounts = data?.reduce((acc: any, borrow: any) => {
    const isbn = borrow.book_copies.isbn
    const title = borrow.book_copies.books.title
    const category = borrow.book_copies.books.categories?.name || 'Unknown'
    
    if (!acc[isbn]) {
      acc[isbn] = { isbn, title, category, borrow_count: 0 }
    }
    acc[isbn].borrow_count++
    return acc
  }, {})

  const sortedBooks = Object.values(bookCounts || {})
    .sort((a: any, b: any) => b.borrow_count - a.borrow_count)
    .slice(0, limit)

  return NextResponse.json({
    report_type: 'top_borrowed_books',
    generated_at: new Date().toISOString(),
    limit,
    data: sortedBooks
  })
}

// Category-wise borrow counts
async function getCategoryWiseBorrows(supabase: any) {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(`
      borrow_id,
      book_copies!inner (
        books!inner (
          categories!inner (
            category_id,
            name
          )
        )
      )
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Count by category
  const categoryCounts = data?.reduce((acc: any, borrow: any) => {
    const category = borrow.book_copies.books.categories.name
    if (!acc[category]) {
      acc[category] = 0
    }
    acc[category]++
    return acc
  }, {})

  return NextResponse.json({
    report_type: 'category_wise_borrows',
    generated_at: new Date().toISOString(),
    data: categoryCounts || {}
  })
}

// Most active members
async function getMostActiveMembers(supabase: any, limit: number) {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(`
      member_id,
      members!inner (
        name,
        email
      )
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Count borrows per member
  const memberCounts = data?.reduce((acc: any, borrow: any) => {
    const memberId = borrow.member_id
    const name = borrow.members.name
    const email = borrow.members.email
    
    if (!acc[memberId]) {
      acc[memberId] = { member_id: memberId, name, email, total_borrows: 0 }
    }
    acc[memberId].total_borrows++
    return acc
  }, {})

  const sortedMembers = Object.values(memberCounts || {})
    .sort((a: any, b: any) => b.total_borrows - a.total_borrows)
    .slice(0, limit)

  return NextResponse.json({
    report_type: 'most_active_members',
    generated_at: new Date().toISOString(),
    limit,
    data: sortedMembers
  })
}

// Book availability report
async function getBookAvailability(supabase: any) {
  const { data, error } = await supabase
    .from('books')
    .select(`
      isbn,
      title,
      book_copies (
        copy_id,
        status
      )
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const availability = data?.map((book: any) => ({
    isbn: book.isbn,
    title: book.title,
    total_copies: book.book_copies?.length || 0,
    available: book.book_copies?.filter((c: any) => c.status === 'Available').length || 0,
    borrowed: book.book_copies?.filter((c: any) => c.status === 'Borrowed').length || 0,
    lost: book.book_copies?.filter((c: any) => c.status === 'Lost').length || 0
  }))

  return NextResponse.json({
    report_type: 'book_availability',
    generated_at: new Date().toISOString(),
    data: availability || []
  })
}

// Books that have never been borrowed
async function getNeverBorrowedBooks(supabase: any) {
  const { data, error } = await supabase
    .from('books')
    .select(`
      isbn,
      title,
      publication_year,
      categories (name),
      book_copies (
        copy_id,
        borrow_transactions (borrow_id)
      )
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const neverBorrowed = data?.filter((book: any) => {
    return book.book_copies?.every((copy: any) => 
      !copy.borrow_transactions || copy.borrow_transactions.length === 0
    )
  }).map((book: any) => ({
    isbn: book.isbn,
    title: book.title,
    publication_year: book.publication_year,
    category: book.categories?.name || 'Unknown',
    total_copies: book.book_copies?.length || 0
  }))

  return NextResponse.json({
    report_type: 'never_borrowed_books',
    generated_at: new Date().toISOString(),
    count: neverBorrowed?.length || 0,
    data: neverBorrowed || []
  })
}

// Members with highest total overdue days
async function getMembersWithHighestOverdue(supabase: any) {
  const { data, error } = await supabase.rpc('get_members_highest_overdue')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'members_highest_overdue',
    generated_at: new Date().toISOString(),
    data: data || []
  })
}

// Books overdue today
async function getOverdueBooksToday(supabase: any) {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select(`
      borrow_id,
      borrow_date,
      due_date,
      members!inner (
        member_id,
        name,
        email
      ),
      book_copies!inner (
        copy_id,
        books!inner (
          isbn,
          title
        )
      ),
      return_transactions (return_id)
    `)
    .is('return_transactions.return_id', null)
    .lt('due_date', new Date().toISOString().split('T')[0])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const overdueBooks = data?.map((borrow: any) => ({
    borrow_id: borrow.borrow_id,
    member_name: borrow.members.name,
    member_email: borrow.members.email,
    book_title: borrow.book_copies.books.title,
    isbn: borrow.book_copies.books.isbn,
    copy_id: borrow.book_copies.copy_id,
    borrow_date: borrow.borrow_date,
    due_date: borrow.due_date,
    days_overdue: Math.floor((new Date().getTime() - new Date(borrow.due_date).getTime()) / (1000 * 60 * 60 * 24))
  }))

  return NextResponse.json({
    report_type: 'overdue_books_today',
    generated_at: new Date().toISOString(),
    count: overdueBooks?.length || 0,
    data: overdueBooks || []
  })
}

// Librarian activity monitoring
async function getLibrarianActivity(supabase: any) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id,
      username,
      email,
      borrow_transactions:borrow_transactions!librarian_id (borrow_id),
      return_transactions:return_transactions!librarian_id (return_id),
      payments:payments!received_by (payment_id)
    `)
    .eq('role', 'Librarian')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const activity = data?.map((librarian: any) => ({
    user_id: librarian.user_id,
    username: librarian.username,
    email: librarian.email,
    borrows_handled: librarian.borrow_transactions?.length || 0,
    returns_handled: librarian.return_transactions?.length || 0,
    payments_received: librarian.payments?.length || 0,
    total_transactions: (librarian.borrow_transactions?.length || 0) + 
                       (librarian.return_transactions?.length || 0) + 
                       (librarian.payments?.length || 0)
  }))

  return NextResponse.json({
    report_type: 'librarian_activity',
    generated_at: new Date().toISOString(),
    data: activity || []
  })
}
