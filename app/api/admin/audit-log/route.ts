import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: logs, error } = await supabase
      .rpc('get_audit_log', {
        p_limit: 100,
        p_offset: 0
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map log_timestamp from RPC to timestamp expected by the frontend
    const mappedLogs = (logs || []).map((log: Record<string, unknown>) => ({
      ...log,
      timestamp: log.log_timestamp,
    }))

    return NextResponse.json({ logs: mappedLogs })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
