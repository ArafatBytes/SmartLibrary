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
  const { data, error } = await supabase.rpc('get_fines_collected_per_month')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert to object format for backward compatibility
  const monthlyData = data?.reduce((acc: MonthlyData, row: { month: string; total_amount: number }) => {
    acc[row.month] = row.total_amount
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
  const { data, error } = await supabase.rpc('get_top_borrowed_books', { p_limit: limit })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'top_borrowed_books',
    generated_at: new Date().toISOString(),
    limit,
    data: data || []
  })
}

// Category-wise borrow counts
async function getCategoryWiseBorrows(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_category_wise_borrows')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert to object format for backward compatibility
  const categoryCounts = data?.reduce((acc: CategoryCount, row: { category: string; borrow_count: number }) => {
    acc[row.category] = row.borrow_count
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
  const { data, error } = await supabase.rpc('get_most_active_members', { p_limit: limit })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'most_active_members',
    generated_at: new Date().toISOString(),
    limit,
    data: data || []
  })
}

// Book availability report
async function getBookAvailability(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_book_availability')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'book_availability',
    generated_at: new Date().toISOString(),
    data: data || []
  })
}

// Books that have never been borrowed
async function getNeverBorrowedBooks(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_never_borrowed_books')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'never_borrowed_books',
    generated_at: new Date().toISOString(),
    count: data?.length || 0,
    data: data || []
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
  const { data, error } = await supabase.rpc('get_overdue_books_today')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'overdue_books_today',
    generated_at: new Date().toISOString(),
    count: data?.length || 0,
    data: data || []
  })
}

// Librarian activity monitoring
async function getLibrarianActivity(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_librarian_activity')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    report_type: 'librarian_activity',
    generated_at: new Date().toISOString(),
    data: data || []
  })
}
