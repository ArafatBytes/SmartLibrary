import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_all_categories')

    if (error) {
      console.error('Categories fetch error:', error)
      return NextResponse.json({
        error: 'Failed to fetch categories',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories: data || []
    })
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
