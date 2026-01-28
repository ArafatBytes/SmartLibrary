-- =============================================
-- COMPREHENSIVE TEST VERIFICATION FOR PL/pgSQL MIGRATION
-- Execute this script to verify all functions work correctly
-- =============================================

\echo '========================================='
\echo 'STARTING COMPREHENSIVE PL/pgSQL TESTS'
\echo '========================================='

-- =============================================
-- TEST 1: AUTHENTICATION FUNCTIONS
-- =============================================
\echo '\n>>> TEST 1: Authentication Functions'

-- Test authenticate_user with existing user (admin)
\echo '\n--- Test 1.1: Authenticate existing user (admin)'
SELECT 
    success,
    message,
    username,
    role
FROM authenticate_user('admin');

-- Test authenticate_user with non-existing user
\echo '\n--- Test 1.2: Authenticate non-existing user'
SELECT 
    success,
    message
FROM authenticate_user('nonexistentuser123');

-- =============================================
-- TEST 2: LIBRARIAN MANAGEMENT FUNCTIONS
-- =============================================
\echo '\n>>> TEST 2: Librarian Management Functions'

-- Test get_all_librarians
\echo '\n--- Test 2.1: Get all librarians'
SELECT 
    user_id,
    username,
    email,
    phone
FROM get_all_librarians()
LIMIT 5;

-- Test create_librarian (will create a test librarian)
\echo '\n--- Test 2.2: Create new librarian'
SELECT 
    success,
    message,
    user_id,
    username,
    email
FROM create_librarian(
    'test_librarian_' || floor(random() * 10000)::text,
    'testlib' || floor(random() * 10000)::text || '@test.com',
    '1234567890',
    '$2a$10$testhashedpasswordhere123456789012'
);

-- Test create_librarian with duplicate username
\echo '\n--- Test 2.3: Create librarian with duplicate username (should fail)'
SELECT 
    success,
    message
FROM create_librarian(
    'admin',  -- This should already exist
    'duplicate@test.com',
    '1234567890',
    '$2a$10$testhashedpasswordhere123456789012'
);

-- Test update_librarian (get a librarian ID first)
\echo '\n--- Test 2.4: Update librarian'
DO $$
DECLARE
    v_librarian_id INT;
BEGIN
    -- Get first librarian ID
    SELECT user_id INTO v_librarian_id 
    FROM users 
    WHERE role = 'Librarian' 
    LIMIT 1;
    
    IF v_librarian_id IS NOT NULL THEN
        RAISE NOTICE 'Testing update for librarian ID: %', v_librarian_id;
        PERFORM * FROM update_librarian(
            v_librarian_id,
            'updated_username_' || v_librarian_id,
            'updated_' || v_librarian_id || '@test.com',
            '9876543210',
            NULL  -- No password change
        );
    END IF;
END $$;

-- =============================================
-- TEST 3: AUDIT LOG FUNCTION
-- =============================================
\echo '\n>>> TEST 3: Audit Log Function'

-- Test get_audit_log
\echo '\n--- Test 3.1: Get recent audit log entries'
SELECT 
    log_id,
    user_id,
    action,
    entity_type,
    timestamp
FROM get_audit_log(10, 0)
ORDER BY timestamp DESC;

-- =============================================
-- TEST 4: PAYMENT FUNCTIONS
-- =============================================
\echo '\n>>> TEST 4: Payment Functions'

-- Test get_member_unpaid_fines
\echo '\n--- Test 4.1: Get unpaid fines for member 1'
SELECT 
    fine_id,
    amount,
    borrow_date,
    due_date,
    title
FROM get_member_unpaid_fines(1);

-- Test get_member_unpaid_fines for member with no fines
\echo '\n--- Test 4.2: Get unpaid fines for member 999 (should return empty)'
SELECT 
    fine_id,
    amount
FROM get_member_unpaid_fines(999);

-- =============================================
-- TEST 5: ANALYTICS COUNT FUNCTIONS
-- =============================================
\echo '\n>>> TEST 5: Analytics Count Functions'

-- Test count_total_books
\echo '\n--- Test 5.1: Count total books'
SELECT count_total_books() as total_books;

-- Test count_total_book_copies
\echo '\n--- Test 5.2: Count total book copies'
SELECT count_total_book_copies() as total_copies;

-- Test count_available_copies
\echo '\n--- Test 5.3: Count available copies'
SELECT count_available_copies() as available_copies;

-- Test count_total_members
\echo '\n--- Test 5.4: Count total members'
SELECT count_total_members() as total_members;

-- Test get_total_fines_amount
\echo '\n--- Test 5.5: Get total unpaid fines amount'
SELECT get_total_fines_amount() as total_unpaid_fines;

-- Test get_total_revenue
\echo '\n--- Test 5.6: Get total revenue from paid fines'
SELECT get_total_revenue() as total_revenue;

-- =============================================
-- TEST 6: BOOK MANAGEMENT FUNCTIONS (Previously Created)
-- =============================================
\echo '\n>>> TEST 6: Book Management Functions'

-- Test get_all_categories
\echo '\n--- Test 6.1: Get all categories'
SELECT 
    category_id,
    category_name
FROM get_all_categories()
LIMIT 5;

-- =============================================
-- TEST 7: TRANSACTION FUNCTIONS (Previously Created)
-- =============================================
\echo '\n>>> TEST 7: Transaction Functions'

-- Test count_active_borrows
\echo '\n--- Test 7.1: Count active borrows'
SELECT count_active_borrows() as active_borrows;

-- Test count_overdue_books
\echo '\n--- Test 7.2: Count overdue books'
SELECT count_overdue_books() as overdue_books;

-- =============================================
-- SUMMARY REPORT
-- =============================================
\echo '\n========================================='
\echo 'TEST SUMMARY'
\echo '========================================='

SELECT 
    'Total Books' as metric,
    count_total_books()::text as value
UNION ALL
SELECT 
    'Total Copies' as metric,
    count_total_book_copies()::text as value
UNION ALL
SELECT 
    'Available Copies' as metric,
    count_available_copies()::text as value
UNION ALL
SELECT 
    'Total Members' as metric,
    count_total_members()::text as value
UNION ALL
SELECT 
    'Active Borrows' as metric,
    count_active_borrows()::text as value
UNION ALL
SELECT 
    'Overdue Books' as metric,
    count_overdue_books()::text as value
UNION ALL
SELECT 
    'Unpaid Fines (BDT)' as metric,
    get_total_fines_amount()::text as value
UNION ALL
SELECT 
    'Total Revenue (BDT)' as metric,
    get_total_revenue()::text as value;

\echo '\n========================================='
\echo 'ALL TESTS COMPLETED'
\echo '========================================='

-- =============================================
-- FUNCTION LIST VERIFICATION
-- =============================================
\echo '\n>>> Verifying all PL/pgSQL functions exist:'

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
    'get_total_revenue',
    'get_all_categories',
    'add_new_book',
    'add_book_copies',
    'remove_book_copy',
    'add_member',
    'create_borrow_transaction',
    'create_return_transaction',
    'search_books',
    'check_book_status',
    'count_active_borrows',
    'count_overdue_books'
)
ORDER BY proname;

\echo '\n>>> Migration verification complete!'
