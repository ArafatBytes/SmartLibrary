# PL/pgSQL Complete Migration - Deployment & Testing Guide

## Overview

This migration converts **ALL** remaining database operations to use PL/pgSQL stored procedures/functions, ensuring consistent database access patterns and improved security.

## What Was Migrated

### ✅ New PL/pgSQL Functions Created (14 functions)

#### 1. Authentication
- `authenticate_user(p_username)` - User authentication with password hash retrieval

#### 2. Librarian Management (CRUD)
- `get_all_librarians()` - Retrieve all librarian users
- `create_librarian(p_username, p_email, p_phone, p_password_hash)` - Create new librarian
- `update_librarian(p_user_id, p_username, p_email, p_phone, p_password_hash)` - Update librarian
- `delete_librarian(p_user_id)` - Delete librarian (with safety checks)

#### 3. Audit Log
- `get_audit_log(p_limit, p_offset)` - Retrieve audit log entries with pagination

#### 4. Payments
- `get_member_unpaid_fines(p_member_id)` - Get all unpaid fines for a member with book details
- `record_fine_payment(p_fine_id, p_librarian_id)` - Record payment for a fine

#### 5. Analytics Counts
- `count_total_books()` - Count unique books (ISBNs)
- `count_total_book_copies()` - Count all book copies
- `count_available_copies()` - Count available copies
- `count_total_members()` - Count registered members
- `get_total_fines_amount()` - Sum of unpaid fines
- `get_total_revenue()` - Sum of paid fines

### ✅ API Routes Updated (8 routes)

1. `/api/auth/login` - Uses `authenticate_user()`
2. `/api/admin/librarians` (GET) - Uses `get_all_librarians()`
3. `/api/admin/librarians` (POST) - Uses `create_librarian()`
4. `/api/admin/librarians/[id]` (PUT) - Uses `update_librarian()`
5. `/api/admin/librarians/[id]` (DELETE) - Uses `delete_librarian()`
6. `/api/admin/audit-log` - Uses `get_audit_log()`
7. `/api/librarian/payments` (GET) - Uses `get_member_unpaid_fines()`
8. `/api/librarian/payments` (POST) - Uses `record_fine_payment()`
9. `/api/admin/analytics` - Uses all count functions

### ✅ Previously Migrated (Already Using PL/pgSQL)

- Book Management: `add_new_book()`, `add_book_copies()`, `remove_book_copy()`
- Member Management: `add_member()`
- Transactions: `create_borrow_transaction()`, `create_return_transaction()`
- Search: `search_books()`, `check_book_status()`
- Analytics: `count_active_borrows()`, `count_overdue_books()`, various reporting functions

## Total Function Count

**28+ PL/pgSQL functions** now handle ALL database operations in the system!

---

## Deployment Steps

### Step 1: Deploy the Migration

1. **Open Supabase Dashboard**
   - Navigate to your project at https://supabase.com
   - Go to **SQL Editor**

2. **Run Migration File**
   - Copy the contents of: `supabase/migrations/20241204_008_complete_plpgsql_migration.sql`
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify No Errors**
   - Check for any error messages
   - All functions should be created successfully
   - You should see: "Grants complete" or similar success message

### Step 2: Verify Function Creation

Run this query in SQL Editor to verify all functions exist:

```sql
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'authenticate_user',
    'get_all_librarians',
    'create_librarian',
    'update_librarian',
    'delete_librarian',
    'get_audit_log',
    'get_member_unpaid_fines',
    'record_fine_payment',
    'count_total_books',
    'count_total_book_copies',
    'count_available_copies',
    'count_total_members',
    'get_total_fines_amount',
    'get_total_revenue'
)
ORDER BY proname;
```

Expected: 14 rows returned

---

## Testing Steps

### Method 1: Direct SQL Testing (Recommended First)

Run the comprehensive test file in Supabase SQL Editor:

1. Open file: `supabase/migrations/TEST_PLPGSQL_MIGRATION.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Run the script

**This will test:**
- ✓ Authentication function
- ✓ Librarian CRUD operations
- ✓ Audit log retrieval
- ✓ Payment functions
- ✓ All analytics count functions
- ✓ Summary report with all metrics

### Method 2: Node.js API Testing

Run the automated test suite:

```powershell
# From project root
node test-plpgsql-migration.mjs
```

**This will test:**
- ✓ All RPC calls from Node.js
- ✓ Error handling
- ✓ Data format validation
- ✓ Return type verification

Expected output:
```
========================================
TEST SUMMARY
========================================

Total Tests: 15+
✓ Passed: 15+
✗ Failed: 0
Success Rate: 100.0%

========================================
✓ ALL TESTS PASSED!
========================================
```

### Method 3: Manual UI Testing

#### A. Test Authentication
1. **Logout** (if logged in)
2. Go to `/login`
3. **Test Invalid Credentials**:
   - Username: `invalid_user`
   - Password: `wrongpassword`
   - Expected: "Invalid username or password"
4. **Test Valid Credentials**:
   - Username: `admin`
   - Password: `admin123`
   - Expected: Successful login, redirect to dashboard

#### B. Test Admin Dashboard - Librarians

1. Login as **admin**
2. Navigate to `/admin/librarians`

**Test GET (View Librarians):**
- Should see list of all librarians
- Check that usernames and emails are displayed

**Test POST (Create Librarian):**
- Click "Add Librarian" or similar button
- Fill form:
  - Username: `test_lib_001`
  - Email: `testlib001@test.com`
  - Phone: `1234567890`
  - Password: `test123`
- Submit
- Expected: Success message, new librarian appears in list

**Test POST with Duplicate (Should Fail):**
- Try creating another librarian with username `admin`
- Expected: "Username already exists" error

**Test PUT (Update Librarian):**
- Click "Edit" on `test_lib_001`
- Change email to `updated@test.com`
- Submit
- Expected: Success message, email updated

**Test DELETE (Delete Librarian):**
- Click "Delete" on `test_lib_001`
- Confirm deletion
- Expected: Success message, librarian removed from list

#### C. Test Analytics Dashboard

1. Navigate to `/admin/analytics`
2. Check **Overview Statistics**:
   - Total Books (should be a number)
   - Total Members (should be a number)
   - Active Borrows (should be a number)
   - Overdue Books (should be a number)
   - Total Fines (should be in BDT)

All values should load without errors.

#### D. Test Payments (Librarian Dashboard)

1. Login as **librarian** (username: `lib1`, password: `lib123`)
2. Navigate to `/librarian` → Payments tab

**Test GET Unpaid Fines:**
- Enter Member ID: `1`
- Click "View Fines"
- Expected: List of unpaid fines (or "No unpaid fines")

**Test POST Record Payment:**
- If there are unpaid fines, click "Pay" on one
- Expected: Success message, fine removed from unpaid list

#### E. Test Audit Log

1. Navigate to `/admin/audit-log`
2. Expected: List of recent actions
   - Should show borrow/return transactions
   - Should show user actions
   - Should be sorted by timestamp (newest first)

---

## Verification Checklist

Use this checklist to ensure everything works:

### Database Functions
- [ ] Migration file deployed successfully (no errors)
- [ ] All 14 new functions exist in database
- [ ] SQL test script runs without errors

### API Endpoints
- [ ] `/api/auth/login` works (valid/invalid credentials)
- [ ] `/api/admin/librarians` GET returns librarians
- [ ] `/api/admin/librarians` POST creates librarian
- [ ] `/api/admin/librarians/[id]` PUT updates librarian
- [ ] `/api/admin/librarians/[id]` DELETE removes librarian
- [ ] `/api/admin/audit-log` returns log entries
- [ ] `/api/librarian/payments` GET returns unpaid fines
- [ ] `/api/librarian/payments` POST records payment
- [ ] `/api/admin/analytics` returns all counts

### UI Functionality
- [ ] Login works with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Admin can view all librarians
- [ ] Admin can create new librarian
- [ ] Admin can update librarian
- [ ] Admin can delete librarian (with safety checks)
- [ ] Analytics dashboard loads all statistics
- [ ] Payments page shows unpaid fines
- [ ] Payments can be recorded
- [ ] Audit log displays recent actions

### Error Handling
- [ ] Duplicate username shows error
- [ ] Duplicate email shows error
- [ ] Invalid member ID shows error
- [ ] Deleting librarian with history shows error
- [ ] Non-existent fine ID shows error
- [ ] Already paid fine shows error

---

## Performance Verification

Run these queries to check performance:

```sql
-- Check average execution time of count functions
EXPLAIN ANALYZE SELECT count_total_books();
EXPLAIN ANALYZE SELECT count_total_members();
EXPLAIN ANALYZE SELECT count_active_borrows();

-- Check authentication performance
EXPLAIN ANALYZE SELECT * FROM authenticate_user('admin');

-- Check payment query performance
EXPLAIN ANALYZE SELECT * FROM get_member_unpaid_fines(1);
```

All queries should complete in < 50ms for small databases.

---

## Rollback Plan

If issues occur, you can rollback by:

1. **Drop new functions:**

```sql
DROP FUNCTION IF EXISTS authenticate_user;
DROP FUNCTION IF EXISTS get_all_librarians;
DROP FUNCTION IF EXISTS create_librarian;
DROP FUNCTION IF EXISTS update_librarian;
DROP FUNCTION IF EXISTS delete_librarian;
DROP FUNCTION IF EXISTS get_audit_log;
DROP FUNCTION IF EXISTS get_member_unpaid_fines;
DROP FUNCTION IF EXISTS record_fine_payment;
DROP FUNCTION IF EXISTS count_total_books;
DROP FUNCTION IF EXISTS count_total_book_copies;
DROP FUNCTION IF EXISTS count_available_copies;
DROP FUNCTION IF EXISTS count_total_members;
DROP FUNCTION IF EXISTS get_total_fines_amount;
DROP FUNCTION IF EXISTS get_total_revenue;
```

2. **Restore API routes to direct queries:**
   - Revert changes in `app/api/auth/login/route.ts`
   - Revert changes in `app/api/admin/librarians/route.ts`
   - Revert changes in `app/api/admin/librarians/[id]/route.ts`
   - Revert changes in `app/api/admin/audit-log/route.ts`
   - Revert changes in `app/api/librarian/payments/route.ts`
   - Revert changes in `app/api/admin/analytics/route.ts`

---

## What Remains in Node.js

The following operations **must** remain in Node.js due to technical limitations:

1. **bcrypt Password Hashing/Verification** - Requires Node.js bcrypt library
2. **Session Cookie Management** - Handled by Next.js middleware
3. **File Uploads** (if implemented) - Requires Node.js file system

These are proper separations of concerns - cryptography and session management belong in the application layer, not the database layer.

---

## Success Criteria

✅ **Migration is successful when:**

1. Build completes without errors (`npm run build`)
2. All 14 new functions exist in database
3. SQL test script runs successfully
4. Node.js test script shows 100% pass rate
5. All UI features work as expected
6. No direct `.from()` queries remain (except in auth for bcrypt)
7. Performance is acceptable (< 50ms per query)

---

## Support & Troubleshooting

### Common Issues

**Issue: "function does not exist"**
- Solution: Re-run migration file in Supabase SQL Editor

**Issue: "column reference ambiguous"**
- Solution: Check table aliases in WHERE clauses (use `table.column`)

**Issue: "permission denied"**
- Solution: Verify GRANT statements executed (check end of migration file)

**Issue: TypeScript errors**
- Solution: Ensure type assertions are correct (check `.rpc()` calls have proper return types)

**Issue: "already exists" errors during migration**
- Solution: Functions have `OR REPLACE` - this is safe to ignore or re-run

---

## Next Steps After Successful Migration

1. **Monitor Performance** - Use Supabase dashboard to track function execution times
2. **Review Audit Logs** - Ensure all operations are being logged
3. **Backup Database** - Take a snapshot now that migration is complete
4. **Document Custom Functions** - Update team documentation with new function signatures
5. **Consider Indexes** - Add indexes on frequently queried columns if performance degrades

---

## Questions?

If you encounter any issues:
1. Check the SQL Editor for error messages
2. Review Supabase logs in Dashboard
3. Run the test scripts to identify specific failures
4. Check browser console for API errors
5. Verify environment variables are set correctly

---

**Migration Complete! All database operations now use PL/pgSQL! 🎉**
