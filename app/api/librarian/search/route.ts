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

    // Use PL/pgSQL function for search
    const { data: results, error: searchError } = await supabase
      .rpc('search_books', {
        p_search_query: query
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
