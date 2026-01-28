import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    const checkQuery = query && query.trim().length >= 2
    const hasFilters = searchParams.has('category') || searchParams.has('available')

    if (!checkQuery && !hasFilters) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const category = searchParams.get('category')
    const available = searchParams.get('available')

    const supabase = await createClient()

    // Use PL/pgSQL function for search
    const { data: results, error: searchError } = await supabase
      .rpc('search_books', {
        p_search_query: query || null,
        p_category_id: category ? parseInt(category) : null,
        p_is_available: available === 'true' ? true : available === 'false' ? false : null
      })

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json({
        error: 'Search failed',
        details: searchError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      query,
      count: results?.length || 0,
      results: results || []
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
