-- TEST QUERY - Run this AFTER all migrations to verify everything works
-- Copy and paste this into Supabase SQL Editor to test

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show: audit_log, authors, book_author, book_copies, books, 
-- borrow_transactions, categories, fines, members, payments, 
-- return_transactions, users

-- Check sample data loaded
SELECT 'Categories' AS table_name, COUNT(*)::TEXT AS count FROM categories
UNION ALL
SELECT 'Authors', COUNT(*)::TEXT FROM authors
UNION ALL
SELECT 'Books', COUNT(*)::TEXT FROM books
UNION ALL
SELECT 'Book Copies', COUNT(*)::TEXT FROM book_copies
UNION ALL
SELECT 'Members', COUNT(*)::TEXT FROM members
UNION ALL
SELECT 'Users', COUNT(*)::TEXT FROM users
UNION ALL
SELECT 'Borrow Transactions', COUNT(*)::TEXT FROM borrow_transactions;

-- Check available books view
SELECT * FROM available_books_view LIMIT 5;

-- Check active borrows
SELECT * FROM active_borrows_view;

-- Check member fines
SELECT * FROM member_fines_view;

-- If all queries run successfully, your database is ready! ✅
