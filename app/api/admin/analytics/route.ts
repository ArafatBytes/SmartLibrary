import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { 
  BookCount, 
  MemberCount, 
  MonthlyData, 
  CategoryCount,
  Fine
} from '@/lib/types/analytics.types'

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
async function getOverviewStats(supabase: SupabaseClient) {
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
    supabase.from('fines').select('amount').then((res) => 
      (res.data as Fine[] | null)?.reduce((sum: number, f: Fine) => sum + parseFloat(f.amount), 0) || 0
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
async function getMonthlyBorrowingTrend(supabase: SupabaseClient) {
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
async function getFinesCollectedPerMonth(supabase: SupabaseClient) {
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
  const monthlyData = data?.reduce((acc: MonthlyData, payment: unknown) => {
    const p = payment as { payment_date: string; fines: { amount: string } }
    const month = new Date(p.payment_date).toISOString().slice(0, 7)
    if (!acc[month]) {
      acc[month] = 0
    }
    acc[month] += parseFloat(p.fines.amount)
    return acc
  }, {} as MonthlyData)

  return NextResponse.json({
    report_type: 'fines_collected_per_month',
    generated_at: new Date().toISOString(),
    data: monthlyData || {}
  })
}

// Top K most borrowed books
async function getTopBorrowedBooks(supabase: SupabaseClient, limit: number) {
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
  const bookCounts: Record<string, BookCount> = data?.reduce((acc: Record<string, BookCount>, borrow: unknown) => {
    const b = borrow as { book_copies?: { isbn?: string; books?: { title?: string; categories?: { name?: string } } } }
    const isbn = b.book_copies?.isbn || ''
    const title = b.book_copies?.books?.title || ''
    const category = b.book_copies?.books?.categories?.name || 'Unknown'
    
    if (!acc[isbn]) {
      acc[isbn] = { isbn, title, category, borrow_count: 0 }
    }
    acc[isbn].borrow_count++
    return acc
  }, {}) || {}

  const sortedBooks = Object.values(bookCounts)
    .sort((a: BookCount, b: BookCount) => b.borrow_count - a.borrow_count)
    .slice(0, limit)

  return NextResponse.json({
    report_type: 'top_borrowed_books',
    generated_at: new Date().toISOString(),
    limit,
    data: sortedBooks
  })
}

// Category-wise borrow counts
async function getCategoryWiseBorrows(supabase: SupabaseClient) {
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
  const categoryCounts = data?.reduce((acc: CategoryCount, borrow: unknown) => {
    const b = borrow as { book_copies?: { books?: { categories?: { name?: string } } } }
    const category = b.book_copies?.books?.categories?.name || 'Unknown'
    if (!acc[category]) {
      acc[category] = 0
    }
    acc[category]++
    return acc
  }, {} as CategoryCount)

  return NextResponse.json({
    report_type: 'category_wise_borrows',
    generated_at: new Date().toISOString(),
    data: categoryCounts || {}
  })
}

// Most active members
async function getMostActiveMembers(supabase: SupabaseClient, limit: number) {
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
  const memberCounts: Record<number, MemberCount> = data?.reduce((acc: Record<number, MemberCount>, borrow: unknown) => {
    const b = borrow as { member_id: number; members?: { name?: string; email?: string } }
    const memberId = b.member_id
    const name = b.members?.name || ''
    const email = b.members?.email || ''
    
    if (!acc[memberId]) {
      acc[memberId] = { member_id: memberId, name, email, total_borrows: 0 }
    }
    acc[memberId].total_borrows++
    return acc
  }, {}) || {}

  const sortedMembers = Object.values(memberCounts)
    .sort((a: MemberCount, b: MemberCount) => b.total_borrows - a.total_borrows)
    .slice(0, limit)

  return NextResponse.json({
    report_type: 'most_active_members',
    generated_at: new Date().toISOString(),
    limit,
    data: sortedMembers
  })
}

// Book availability report
async function getBookAvailability(supabase: SupabaseClient) {
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

  const availability = data?.map((book: unknown) => {
    const b = book as { isbn: string; title: string; book_copies?: { status: string }[] }
    return {
      isbn: b.isbn,
      title: b.title,
      total_copies: b.book_copies?.length || 0,
      available: b.book_copies?.filter((c) => c.status === 'Available').length || 0,
      borrowed: b.book_copies?.filter((c) => c.status === 'Borrowed').length || 0,
      lost: b.book_copies?.filter((c) => c.status === 'Lost').length || 0
    }
  })

  return NextResponse.json({
    report_type: 'book_availability',
    generated_at: new Date().toISOString(),
    data: availability || []
  })
}

// Books that have never been borrowed
async function getNeverBorrowedBooks(supabase: SupabaseClient) {
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

  const neverBorrowed = data?.filter((book: unknown) => {
    const b = book as { book_copies?: { borrow_transactions?: unknown[] }[] }
    return b.book_copies?.every((copy) => 
      !copy.borrow_transactions || copy.borrow_transactions.length === 0
    )
  }).map((book: unknown) => {
    const b = book as { isbn: string; title: string; publication_year: number; categories?: { name?: string }; book_copies?: unknown[] }
    return {
      isbn: b.isbn,
      title: b.title,
      publication_year: b.publication_year,
      category: b.categories?.name || 'Unknown',
      total_copies: b.book_copies?.length || 0
    }
  })

  return NextResponse.json({
    report_type: 'never_borrowed_books',
    generated_at: new Date().toISOString(),
    count: neverBorrowed?.length || 0,
    data: neverBorrowed || []
  })
}

// Members with highest total overdue days
async function getMembersWithHighestOverdue(supabase: SupabaseClient) {
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
async function getOverdueBooksToday(supabase: SupabaseClient) {
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

  const overdueBooks = data?.map((borrow: unknown) => {
    const b = borrow as { 
      borrow_id: number; 
      borrow_date: string; 
      due_date: string;
      members?: { name?: string; email?: string };
      book_copies?: { copy_id?: number; books?: { title?: string; isbn?: string } }
    }
    return {
      borrow_id: b.borrow_id,
      member_name: b.members?.name || '',
      member_email: b.members?.email || '',
      book_title: b.book_copies?.books?.title || '',
      isbn: b.book_copies?.books?.isbn || '',
      copy_id: b.book_copies?.copy_id || 0,
      borrow_date: b.borrow_date,
      due_date: b.due_date,
      days_overdue: Math.floor((new Date().getTime() - new Date(b.due_date).getTime()) / (1000 * 60 * 60 * 24))
    }
  })

  return NextResponse.json({
    report_type: 'overdue_books_today',
    generated_at: new Date().toISOString(),
    count: overdueBooks?.length || 0,
    data: overdueBooks || []
  })
}

// Librarian activity monitoring
async function getLibrarianActivity(supabase: SupabaseClient) {
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

  const activity = data?.map((librarian: unknown) => {
    const l = librarian as {
      user_id: number;
      username: string;
      email: string;
      borrow_transactions?: unknown[];
      return_transactions?: unknown[];
      payments?: unknown[];
    }
    return {
      user_id: l.user_id,
      username: l.username,
      email: l.email,
      borrows_handled: l.borrow_transactions?.length || 0,
      returns_handled: l.return_transactions?.length || 0,
      payments_received: l.payments?.length || 0,
      total_transactions: (l.borrow_transactions?.length || 0) + 
                         (l.return_transactions?.length || 0) + 
                         (l.payments?.length || 0)
    }
  })

  return NextResponse.json({
    report_type: 'librarian_activity',
    generated_at: new Date().toISOString(),
    data: activity || []
  })
}
