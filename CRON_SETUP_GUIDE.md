# Weekly Fine Calculation Setup Guide

This guide explains how to set up automatic weekly fine calculation for overdue books.

## Option 1: Supabase pg_cron Extension (Recommended)

### Prerequisites
- Supabase project with pg_cron extension enabled

### Steps

1. **Enable pg_cron extension in Supabase**
   - Go to your Supabase Dashboard
   - Navigate to Database → Extensions
   - Search for "pg_cron" and enable it

2. **Schedule the weekly job**
   Run this SQL in the Supabase SQL Editor:

```sql
-- Schedule calculate_overdue_fines() to run every Sunday at 11:00 PM
SELECT cron.schedule(
    'weekly-fine-calculation',  -- job name
    '0 23 * * 0',                -- cron expression: 11 PM every Sunday
    $$SELECT calculate_overdue_fines();$$
);
```

3. **Verify the scheduled job**
```sql
SELECT * FROM cron.job;
```

4. **Check job execution history**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'weekly-fine-calculation'
ORDER BY start_time DESC 
LIMIT 10;
```

5. **Manual execution (for testing)**
```sql
SELECT calculate_overdue_fines();
```

### Manage Scheduled Jobs

**List all cron jobs:**
```sql
SELECT * FROM cron.job;
```

**Unschedule a job:**
```sql
SELECT cron.unschedule('weekly-fine-calculation');
```

**Update schedule:**
```sql
-- First unschedule, then reschedule
SELECT cron.unschedule('weekly-fine-calculation');
SELECT cron.schedule(
    'weekly-fine-calculation',
    '0 23 * * 0',  -- Adjust timing as needed
    $$SELECT calculate_overdue_fines();$$
);
```

---

## Option 2: GitHub Actions (Alternative)

If you want to trigger from outside Supabase:

### Create `.github/workflows/weekly-fines.yml`:

```yaml
name: Calculate Weekly Fines

on:
  schedule:
    # Runs every Sunday at 23:00 UTC
    - cron: '0 23 * * 0'
  workflow_dispatch: # Allows manual trigger

jobs:
  calculate-fines:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Fine Calculation
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          curl -X POST "$SUPABASE_URL/rest/v1/rpc/calculate_overdue_fines" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json"
```

**Note:** You'll need to:
1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to GitHub Secrets
2. Enable RPC access in Supabase RLS policies

---

## Option 3: Next.js API Cron (Vercel)

If deployed on Vercel, use Vercel Cron Jobs:

### Create `app/api/cron/calculate-fines/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('calculate_overdue_fines')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Fines calculated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/calculate-fines",
    "schedule": "0 23 * * 0"
  }]
}
```

### Set environment variable:
Add `CRON_SECRET` to your Vercel environment variables (generate a random string).

---

## Option 4: External Cron Service

Use services like:
- **cron-job.org**: Free web-based cron service
- **EasyCron**: Reliable cron service with monitoring
- **AWS EventBridge**: For AWS-hosted solutions

Configure them to call:
```
POST https://your-domain.com/api/cron/calculate-fines
Headers:
  Authorization: Bearer YOUR_CRON_SECRET
```

---

## Cron Expression Reference

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
 │ │ │ │ │
 * * * * *
```

**Common Schedules:**
- `0 23 * * 0` - Every Sunday at 11:00 PM
- `0 0 * * 1` - Every Monday at midnight
- `0 2 * * *` - Every day at 2:00 AM
- `0 12 * * 1-5` - Weekdays at noon

---

## Testing

### Test the function manually:
```sql
-- Run in Supabase SQL Editor
SELECT calculate_overdue_fines();

-- Check results
SELECT * FROM fines 
WHERE fine_date >= CURRENT_DATE 
ORDER BY fine_date DESC;
```

### Check audit logs:
```sql
SELECT * FROM audit_log 
WHERE table_name = 'fines' 
AND action IN ('INSERT', 'UPDATE')
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Monitoring

### Create a monitoring query:
```sql
-- Check when fines were last calculated
SELECT 
    MAX(fine_date) as last_fine_generated,
    COUNT(*) as fines_this_week
FROM fines
WHERE fine_date >= CURRENT_DATE - INTERVAL '7 days';
```

### Set up alerts (optional):
- Monitor cron.job_run_details for failures
- Set up email notifications in Supabase dashboard
- Use monitoring services like Sentry or Datadog

---

## Recommended Setup

For production, we recommend **Option 1 (pg_cron)** because:
- ✅ Runs directly in the database
- ✅ No external dependencies
- ✅ Reliable and built into PostgreSQL
- ✅ Easy to monitor with cron.job_run_details
- ✅ No cold start issues

Run this now to set it up:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly fine calculation
SELECT cron.schedule(
    'weekly-fine-calculation',
    '0 23 * * 0',
    $$SELECT calculate_overdue_fines();$$
);

-- Verify
SELECT * FROM cron.job;
```
