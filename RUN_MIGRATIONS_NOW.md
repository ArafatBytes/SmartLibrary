# 🚨 URGENT: Run Database Migrations to Fix Return Error

## Error You're Seeing
```
POST /api/librarian/return 500 in 222ms
Error: Failed to retrieve borrow information
```

## Root Cause
The PL/pgSQL functions haven't been deployed to Supabase yet. Your local code is trying to call `get_active_borrow_with_fine()` function which doesn't exist in the database.

## Solution: Run Migration Files in Supabase SQL Editor

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `kdjznrpfmpslvzhhdxga`
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run Migration Files in Order

⚠️ **IMPORTANT**: Run these files **IN THIS EXACT ORDER**:

#### 1. Core Tables (if not already run)
Copy and paste the entire content of:
```
supabase/migrations/20241204_001_core_tables.sql
```
Click **RUN** (Ctrl+Enter)

#### 2. Transaction Tables (if not already run)
Copy and paste the entire content of:
```
supabase/migrations/20241204_002_transaction_tables.sql
```
Click **RUN**

#### 3. RLS Policies (if not already run)
Copy and paste the entire content of:
```
supabase/migrations/20241204_003_rls_policies.sql
```
Click **RUN**

#### 4. **Functions and Triggers (CRITICAL - JUST UPDATED)**
Copy and paste the entire content of:
```
supabase/migrations/20241204_005_functions_triggers.sql
```
Click **RUN**

This file now includes:
- ✅ `SECURITY DEFINER` clause on all functions (bypasses RLS)
- ✅ `get_active_borrow_with_fine()` - retrieves borrow info and creates fines
- ✅ `process_book_return()` - completes return only if fine is paid
- ✅ `record_fine_payment()` - records payment confirmation
- ✅ `create_borrow_transaction()` - creates new borrows
- ✅ `search_books()` - searches by title/ISBN
- ✅ `check_copy_status()` - checks copy availability

#### 5. Sample Data (if not already run)
Copy and paste the entire content of:
```
supabase/migrations/20241204_004_sample_data.sql
```
Click **RUN**

### Step 3: Verify Functions Are Created

In Supabase SQL Editor, run this query to verify:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND routine_schema = 'public'
  AND routine_name IN (
    'get_active_borrow_with_fine',
    'process_book_return',
    'record_fine_payment',
    'create_borrow_transaction',
    'search_books',
    'check_copy_status'
  );
```

You should see all 6 functions listed.

### Step 4: Test the Return Process

1. Go to your app: http://localhost:3000/librarian
2. In the **Return Book** tab:
   - Enter a `copy_id` that is currently borrowed
   - Click **Process Return**
3. If the book is overdue, you should see:
   - ✅ Red alert with fine details (member name, days overdue, amount)
   - ✅ "Confirm Payment - Complete Return" button
   - ✅ Click the button → Return completes successfully

## What Changed

The migration file `20241204_005_functions_triggers.sql` was updated with:

```sql
SECURITY DEFINER
```

This clause ensures that PL/pgSQL functions execute with the permissions of the function creator (which has full access) rather than the calling user. This is essential for:
- Bypassing Row Level Security (RLS) policies
- Allowing API routes to access database functions
- Ensuring consistent behavior across all users

## Expected Behavior After Migration

### Return Without Fine:
```
Copy ID: 123
Status: ✅ Available
Message: "Book returned successfully"
```

### Return With Fine:
```
Step 1: Shows fine details
  Member: John Doe
  Days Overdue: 5
  Fine Amount: 10 BDT

Step 2: Confirm payment
  Click "Confirm Payment - Complete Return"

Step 3: Return completed
  Status: ✅ Available
  Message: "Book returned successfully"
```

## Troubleshooting

### If you still get the error after running migrations:

1. **Check if functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
   ```

2. **Check function permissions:**
   ```sql
   SELECT routine_name, security_type 
   FROM information_schema.routines 
   WHERE routine_name = 'get_active_borrow_with_fine';
   ```
   Should return: `security_type = 'DEFINER'`

3. **Verify environment variables** in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://kdjznrpfmpslvzhhdxga.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

4. **Restart your Next.js dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Summary

✅ **What was wrong**: Functions didn't exist in Supabase
✅ **What we fixed**: Added `SECURITY DEFINER` to all functions
✅ **What you need to do**: Run migration file `20241204_005_functions_triggers.sql` in Supabase SQL Editor
✅ **Expected result**: Return process works perfectly with fine detection and payment confirmation

---

**Next Step**: Go to Supabase SQL Editor and run the migration file NOW! 🚀
