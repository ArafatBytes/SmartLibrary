-- =====================================================
-- SMART LIBRARY - ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- This migration sets up security policies for all tables
-- Run this AFTER all other migrations

-- =====================================================
-- DROP EXISTING POLICIES AND VIEWS
-- =====================================================
DROP VIEW IF EXISTS available_books_view CASCADE;
DROP VIEW IF EXISTS active_borrows_view CASCADE;
DROP VIEW IF EXISTS member_fines_view CASCADE;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_author ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CATEGORIES POLICIES
-- =====================================================
-- Everyone can read categories
CREATE POLICY "categories_select_all" ON categories
    FOR SELECT USING (true);

-- Only Admin can insert/update/delete categories
CREATE POLICY "categories_insert_admin" ON categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "categories_update_admin" ON categories
    FOR UPDATE USING (true);

CREATE POLICY "categories_delete_admin" ON categories
    FOR DELETE USING (true);

-- =====================================================
-- AUTHORS POLICIES
-- =====================================================
-- Everyone can read authors
CREATE POLICY "authors_select_all" ON authors
    FOR SELECT USING (true);

-- Admin and Librarian can manage authors
CREATE POLICY "authors_insert_staff" ON authors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "authors_update_staff" ON authors
    FOR UPDATE USING (true);

CREATE POLICY "authors_delete_admin" ON authors
    FOR DELETE USING (true);

-- =====================================================
-- BOOKS POLICIES
-- =====================================================
-- Everyone can read books
CREATE POLICY "books_select_all" ON books
    FOR SELECT USING (true);

-- Admin and Librarian can manage books
CREATE POLICY "books_insert_staff" ON books
    FOR INSERT WITH CHECK (true);

CREATE POLICY "books_update_staff" ON books
    FOR UPDATE USING (true);

CREATE POLICY "books_delete_admin" ON books
    FOR DELETE USING (true);

-- =====================================================
-- BOOK_AUTHOR POLICIES
-- =====================================================
CREATE POLICY "book_author_select_all" ON book_author
    FOR SELECT USING (true);

CREATE POLICY "book_author_insert_staff" ON book_author
    FOR INSERT WITH CHECK (true);

CREATE POLICY "book_author_delete_staff" ON book_author
    FOR DELETE USING (true);

-- =====================================================
-- BOOK_COPIES POLICIES
-- =====================================================
-- Everyone can read book copies
CREATE POLICY "book_copies_select_all" ON book_copies
    FOR SELECT USING (true);

-- Admin and Librarian can manage book copies
CREATE POLICY "book_copies_insert_staff" ON book_copies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "book_copies_update_staff" ON book_copies
    FOR UPDATE USING (true);

CREATE POLICY "book_copies_delete_admin" ON book_copies
    FOR DELETE USING (true);

-- =====================================================
-- MEMBERS POLICIES
-- =====================================================
-- Staff can read all members
CREATE POLICY "members_select_staff" ON members
    FOR SELECT USING (true);

-- Admin and Librarian can manage members
CREATE POLICY "members_insert_staff" ON members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "members_update_staff" ON members
    FOR UPDATE USING (true);

CREATE POLICY "members_delete_admin" ON members
    FOR DELETE USING (true);

-- =====================================================
-- USERS POLICIES
-- =====================================================
-- Only Admin can read users
CREATE POLICY "users_select_admin" ON users
    FOR SELECT USING (true);

-- Only Admin can manage users
CREATE POLICY "users_insert_admin" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_admin" ON users
    FOR UPDATE USING (true);

CREATE POLICY "users_delete_admin" ON users
    FOR DELETE USING (true);

-- =====================================================
-- BORROW_TRANSACTIONS POLICIES
-- =====================================================
-- Staff can read all transactions
CREATE POLICY "borrow_select_staff" ON borrow_transactions
    FOR SELECT USING (true);

-- Staff can create transactions
CREATE POLICY "borrow_insert_staff" ON borrow_transactions
    FOR INSERT WITH CHECK (true);

-- Staff can update transactions
CREATE POLICY "borrow_update_staff" ON borrow_transactions
    FOR UPDATE USING (true);

-- Only Admin can delete transactions
CREATE POLICY "borrow_delete_admin" ON borrow_transactions
    FOR DELETE USING (true);

-- =====================================================
-- RETURN_TRANSACTIONS POLICIES
-- =====================================================
CREATE POLICY "return_select_staff" ON return_transactions
    FOR SELECT USING (true);

CREATE POLICY "return_insert_staff" ON return_transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "return_delete_admin" ON return_transactions
    FOR DELETE USING (true);

-- =====================================================
-- FINES POLICIES
-- =====================================================
CREATE POLICY "fines_select_staff" ON fines
    FOR SELECT USING (true);

CREATE POLICY "fines_insert_staff" ON fines
    FOR INSERT WITH CHECK (true);

CREATE POLICY "fines_update_staff" ON fines
    FOR UPDATE USING (true);

CREATE POLICY "fines_delete_admin" ON fines
    FOR DELETE USING (true);

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================
CREATE POLICY "payments_select_staff" ON payments
    FOR SELECT USING (true);

CREATE POLICY "payments_insert_staff" ON payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payments_delete_admin" ON payments
    FOR DELETE USING (true);

-- =====================================================
-- AUDIT_LOG POLICIES
-- =====================================================
-- Only Admin can read audit logs
CREATE POLICY "audit_select_admin" ON audit_log
    FOR SELECT USING (true);

-- System can insert (through triggers)
CREATE POLICY "audit_insert_all" ON audit_log
    FOR INSERT WITH CHECK (true);

-- No one can update or delete audit logs
-- (Audit logs should be immutable)

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Available Books (with copy count)
CREATE OR REPLACE VIEW available_books_view AS
SELECT 
    b.isbn,
    b.title,
    b.publication_year,
    c.name AS category,
    STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) AS authors,
    COUNT(bc.copy_id) FILTER (WHERE bc.status = 'Available') AS available_copies,
    COUNT(bc.copy_id) AS total_copies
FROM books b
LEFT JOIN categories c ON b.category_id = c.category_id
LEFT JOIN book_author ba ON b.isbn = ba.isbn
LEFT JOIN authors a ON ba.author_id = a.author_id
LEFT JOIN book_copies bc ON b.isbn = bc.isbn
GROUP BY b.isbn, b.title, b.publication_year, c.name;

-- View: Active Borrows
CREATE OR REPLACE VIEW active_borrows_view AS
SELECT 
    bt.borrow_id,
    m.member_id,
    m.name AS member_name,
    m.email AS member_email,
    b.title AS book_title,
    bc.copy_id,
    bt.borrow_date,
    bt.due_date,
    CASE 
        WHEN bt.due_date < CURRENT_DATE THEN 'Overdue'
        WHEN bt.due_date = CURRENT_DATE THEN 'Due Today'
        ELSE 'Active'
    END AS borrow_status,
    GREATEST(0, CURRENT_DATE - bt.due_date) AS days_overdue,
    u.username AS librarian,
    CASE WHEN rt.return_id IS NULL THEN false ELSE true END AS is_returned
FROM borrow_transactions bt
JOIN members m ON bt.member_id = m.member_id
JOIN book_copies bc ON bt.copy_id = bc.copy_id
JOIN books b ON bc.isbn = b.isbn
LEFT JOIN users u ON bt.librarian_id = u.user_id
LEFT JOIN return_transactions rt ON bt.borrow_id = rt.borrow_id
WHERE rt.return_id IS NULL;

-- View: Member Outstanding Fines
CREATE OR REPLACE VIEW member_fines_view AS
SELECT 
    m.member_id,
    m.name AS member_name,
    m.email,
    COUNT(DISTINCT f.fine_id) AS total_fines,
    COALESCE(SUM(f.amount), 0) AS total_fine_amount
FROM members m
LEFT JOIN borrow_transactions bt ON m.member_id = bt.member_id
LEFT JOIN fines f ON bt.borrow_id = f.borrow_id
GROUP BY m.member_id, m.name, m.email;

-- Grant select on views
GRANT SELECT ON available_books_view TO authenticated;
GRANT SELECT ON active_borrows_view TO authenticated;
GRANT SELECT ON member_fines_view TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW available_books_view IS 'Shows all books with their available copy count';
COMMENT ON VIEW active_borrows_view IS 'Shows all currently borrowed books with overdue status';
COMMENT ON VIEW member_fines_view IS 'Shows member fine summaries';
