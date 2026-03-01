-- Analytics helper functions for admin dashboard
-- Run this after 20241204_005_functions_triggers.sql

-- Drop existing analytics functions if they exist
DROP FUNCTION IF EXISTS count_active_borrows() CASCADE;
DROP FUNCTION IF EXISTS count_overdue_books() CASCADE;
DROP FUNCTION IF EXISTS get_monthly_borrowing_trend() CASCADE;
DROP FUNCTION IF EXISTS get_members_highest_overdue() CASCADE;
DROP FUNCTION IF EXISTS get_circulation_stats(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_inventory_health() CASCADE;
DROP FUNCTION IF EXISTS get_fine_collection_summary(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_fines_collected_per_month() CASCADE;
DROP FUNCTION IF EXISTS get_top_borrowed_books(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_category_wise_borrows() CASCADE;
DROP FUNCTION IF EXISTS get_most_active_members(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_book_availability() CASCADE;
DROP FUNCTION IF EXISTS get_never_borrowed_books() CASCADE;
DROP FUNCTION IF EXISTS get_overdue_books_today() CASCADE;
DROP FUNCTION IF EXISTS get_librarian_activity() CASCADE;

-- Function to count active borrows
CREATE OR REPLACE FUNCTION count_active_borrows()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO active_count
    FROM borrow_transactions bt
    WHERE NOT EXISTS (
        SELECT 1 FROM return_transactions rt
        WHERE rt.borrow_id = bt.borrow_id
    );
    
    RETURN active_count;
END;
$$;

-- Function to count overdue books
CREATE OR REPLACE FUNCTION count_overdue_books()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO overdue_count
    FROM borrow_transactions bt
    WHERE NOT EXISTS (
        SELECT 1 FROM return_transactions rt
        WHERE rt.borrow_id = bt.borrow_id
    )
    AND bt.due_date < CURRENT_DATE;
    
    RETURN overdue_count;
END;
$$;

-- Function to get monthly borrowing trend (last 12 months)
CREATE OR REPLACE FUNCTION get_monthly_borrowing_trend()
RETURNS TABLE (
    month TEXT,
    total_borrows BIGINT,
    unique_members BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(bt.borrow_date, 'YYYY-MM')::TEXT AS month,
        COUNT(bt.borrow_id)::BIGINT AS total_borrows,
        COUNT(DISTINCT bt.member_id)::BIGINT AS unique_members
    FROM borrow_transactions bt
    WHERE bt.borrow_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(bt.borrow_date, 'YYYY-MM')
    ORDER BY month DESC;
END;
$$;

-- Function to get members with highest total overdue days
CREATE OR REPLACE FUNCTION get_members_highest_overdue()
RETURNS TABLE (
    member_id INTEGER,
    member_name TEXT,
    email TEXT,
    total_overdue_days NUMERIC,
    books_currently_overdue BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.member_id::INTEGER,
        m.name::TEXT AS member_name,
        m.email::TEXT,
        COALESCE(SUM(GREATEST(0, CURRENT_DATE - bt.due_date)), 0)::NUMERIC AS total_overdue_days,
        COUNT(CASE 
            WHEN bt.due_date < CURRENT_DATE 
            AND NOT EXISTS (
                SELECT 1 FROM return_transactions rt 
                WHERE rt.borrow_id = bt.borrow_id
            )
            THEN 1 
        END)::BIGINT AS books_currently_overdue
    FROM members m
    LEFT JOIN borrow_transactions bt ON m.member_id = bt.member_id
    GROUP BY m.member_id, m.name, m.email
    HAVING SUM(GREATEST(0, CURRENT_DATE - bt.due_date)) > 0
    ORDER BY total_overdue_days DESC
    LIMIT 20;
END;
$$;

-- Function to get circulation statistics by date range
CREATE OR REPLACE FUNCTION get_circulation_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_borrows BIGINT,
    total_returns BIGINT,
    unique_borrowers BIGINT,
    popular_category VARCHAR,
    avg_borrow_duration NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    pop_category VARCHAR;
BEGIN
    -- Get most popular category
    SELECT c.name INTO pop_category
    FROM borrow_transactions bt
    JOIN book_copies bc ON bt.copy_id = bc.copy_id
    JOIN books b ON bc.isbn = b.isbn
    JOIN categories c ON b.category_id = c.category_id
    WHERE bt.borrow_date BETWEEN start_date AND end_date
    GROUP BY c.name
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM borrow_transactions WHERE borrow_date BETWEEN start_date AND end_date) AS total_borrows,
        (SELECT COUNT(*) FROM return_transactions WHERE return_date BETWEEN start_date AND end_date) AS total_returns,
        (SELECT COUNT(DISTINCT member_id) FROM borrow_transactions WHERE borrow_date BETWEEN start_date AND end_date) AS unique_borrowers,
        COALESCE(pop_category, 'N/A') AS popular_category,
        (SELECT AVG(rt.return_date - bt.borrow_date)
         FROM return_transactions rt
         JOIN borrow_transactions bt ON rt.borrow_id = bt.borrow_id
         WHERE rt.return_date BETWEEN start_date AND end_date) AS avg_borrow_duration;
END;
$$;

-- Function to get inventory health report
CREATE OR REPLACE FUNCTION get_inventory_health()
RETURNS TABLE (
    total_books BIGINT,
    total_copies BIGINT,
    available_copies BIGINT,
    borrowed_copies BIGINT,
    lost_copies BIGINT,
    books_out_of_stock BIGINT,
    utilization_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM books) AS total_books,
        (SELECT COUNT(*) FROM book_copies) AS total_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'Available') AS available_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'Borrowed') AS borrowed_copies,
        (SELECT COUNT(*) FROM book_copies WHERE status = 'Lost') AS lost_copies,
        (SELECT COUNT(DISTINCT isbn) FROM books b 
         WHERE NOT EXISTS (
             SELECT 1 FROM book_copies bc 
             WHERE bc.isbn = b.isbn AND bc.status = 'Available'
         )) AS books_out_of_stock,
        CASE 
            WHEN (SELECT COUNT(*) FROM book_copies) > 0 THEN
                ROUND(
                    (SELECT COUNT(*) FROM book_copies WHERE status = 'Borrowed')::NUMERIC / 
                    (SELECT COUNT(*) FROM book_copies)::NUMERIC * 100, 
                    2
                )
            ELSE 0
        END AS utilization_rate;
END;
$$;

-- Function to get fine collection summary
CREATE OR REPLACE FUNCTION get_fine_collection_summary(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_fines_generated NUMERIC,
    total_fines_collected NUMERIC,
    pending_fines NUMERIC,
    total_fine_records BIGINT,
    paid_fine_records BIGINT,
    unpaid_fine_records BIGINT,
    collection_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM fines WHERE fine_date BETWEEN start_date AND end_date) AS total_fines_generated,
        (SELECT COALESCE(SUM(f.amount), 0) FROM fines f
         JOIN payments p ON f.fine_id = p.fine_id
         WHERE p.payment_date BETWEEN start_date AND end_date) AS total_fines_collected,
        (SELECT COALESCE(SUM(f.amount), 0) FROM fines f
         WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id)
         AND f.fine_date >= start_date) AS pending_fines,
        (SELECT COUNT(*) FROM fines WHERE fine_date BETWEEN start_date AND end_date) AS total_fine_records,
        (SELECT COUNT(DISTINCT f.fine_id) FROM fines f
         JOIN payments p ON f.fine_id = p.fine_id
         WHERE f.fine_date BETWEEN start_date AND end_date) AS paid_fine_records,
        (SELECT COUNT(*) FROM fines f
         WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id)
         AND f.fine_date BETWEEN start_date AND end_date) AS unpaid_fine_records,
        CASE 
            WHEN (SELECT COALESCE(SUM(amount), 0) FROM fines WHERE fine_date BETWEEN start_date AND end_date) > 0 THEN
                ROUND(
                    (SELECT COALESCE(SUM(f.amount), 0) FROM fines f
                     JOIN payments p ON f.fine_id = p.fine_id
                     WHERE p.payment_date BETWEEN start_date AND end_date)::NUMERIC /
                    (SELECT SUM(amount) FROM fines WHERE fine_date BETWEEN start_date AND end_date)::NUMERIC * 100,
                    2
                )
            ELSE 0
        END AS collection_rate;
END;
$$;

-- =====================================================
-- FUNCTION: Get Fines Collected Per Month
-- =====================================================
CREATE OR REPLACE FUNCTION get_fines_collected_per_month()
RETURNS TABLE (
    month TEXT,
    total_amount NUMERIC
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(p.payment_date, 'YYYY-MM')::TEXT AS month,
        SUM(f.amount)::NUMERIC AS total_amount
    FROM payments p
    JOIN fines f ON p.fine_id = f.fine_id
    WHERE p.payment_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(p.payment_date, 'YYYY-MM')
    ORDER BY month DESC;
END;
$$;

-- =====================================================
-- FUNCTION: Get Top K Borrowed Books
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_borrowed_books(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    isbn VARCHAR,
    title VARCHAR,
    category VARCHAR,
    borrow_count BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.isbn,
        b.title,
        COALESCE(c.name, 'Unknown')::VARCHAR AS category,
        COUNT(bt.borrow_id)::BIGINT AS borrow_count
    FROM borrow_transactions bt
    JOIN book_copies bc ON bt.copy_id = bc.copy_id
    JOIN books b ON bc.isbn = b.isbn
    LEFT JOIN categories c ON b.category_id = c.category_id
    GROUP BY b.isbn, b.title, c.name
    ORDER BY borrow_count DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- FUNCTION: Get Category-Wise Borrow Counts
-- =====================================================
CREATE OR REPLACE FUNCTION get_category_wise_borrows()
RETURNS TABLE (
    category VARCHAR,
    borrow_count BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(c.name, 'Unknown')::VARCHAR AS category,
        COUNT(bt.borrow_id)::BIGINT AS borrow_count
    FROM borrow_transactions bt
    JOIN book_copies bc ON bt.copy_id = bc.copy_id
    JOIN books b ON bc.isbn = b.isbn
    LEFT JOIN categories c ON b.category_id = c.category_id
    GROUP BY c.name
    ORDER BY borrow_count DESC;
END;
$$;

-- =====================================================
-- FUNCTION: Get Most Active Members
-- =====================================================
CREATE OR REPLACE FUNCTION get_most_active_members(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    member_id INTEGER,
    name VARCHAR,
    email VARCHAR,
    total_borrows BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.member_id,
        m.name,
        m.email,
        COUNT(bt.borrow_id)::BIGINT AS total_borrows
    FROM members m
    JOIN borrow_transactions bt ON m.member_id = bt.member_id
    GROUP BY m.member_id, m.name, m.email
    ORDER BY total_borrows DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- FUNCTION: Get Book Availability Report
-- =====================================================
CREATE OR REPLACE FUNCTION get_book_availability()
RETURNS TABLE (
    isbn VARCHAR,
    title VARCHAR,
    total_copies BIGINT,
    available BIGINT,
    borrowed BIGINT,
    lost BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.isbn,
        b.title,
        COUNT(bc.copy_id)::BIGINT AS total_copies,
        COUNT(bc.copy_id) FILTER (WHERE bc.status = 'Available')::BIGINT AS available,
        COUNT(bc.copy_id) FILTER (WHERE bc.status = 'Borrowed')::BIGINT AS borrowed,
        COUNT(bc.copy_id) FILTER (WHERE bc.status = 'Lost')::BIGINT AS lost
    FROM books b
    LEFT JOIN book_copies bc ON b.isbn = bc.isbn
    GROUP BY b.isbn, b.title
    ORDER BY b.title;
END;
$$;

-- =====================================================
-- FUNCTION: Get Books Never Borrowed
-- =====================================================
CREATE OR REPLACE FUNCTION get_never_borrowed_books()
RETURNS TABLE (
    isbn VARCHAR,
    title VARCHAR,
    publication_year INTEGER,
    category VARCHAR,
    total_copies BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.isbn,
        b.title,
        b.publication_year,
        COALESCE(c.name, 'Unknown')::VARCHAR AS category,
        COUNT(bc.copy_id)::BIGINT AS total_copies
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.category_id
    LEFT JOIN book_copies bc ON b.isbn = bc.isbn
    WHERE NOT EXISTS (
        SELECT 1 
        FROM book_copies bc2
        JOIN borrow_transactions bt ON bc2.copy_id = bt.copy_id
        WHERE bc2.isbn = b.isbn
    )
    GROUP BY b.isbn, b.title, b.publication_year, c.name
    ORDER BY b.title;
END;
$$;

-- =====================================================
-- FUNCTION: Get Overdue Books Today
-- =====================================================
CREATE OR REPLACE FUNCTION get_overdue_books_today()
RETURNS TABLE (
    borrow_id INTEGER,
    member_name VARCHAR,
    member_email VARCHAR,
    book_title VARCHAR,
    isbn VARCHAR,
    copy_id INTEGER,
    borrow_date TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    days_overdue INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.borrow_id,
        m.name AS member_name,
        m.email AS member_email,
        b.title AS book_title,
        b.isbn,
        bt.copy_id,
        bt.borrow_date,
        bt.due_date,
        (CURRENT_DATE - bt.due_date)::INTEGER AS days_overdue
    FROM borrow_transactions bt
    JOIN members m ON bt.member_id = m.member_id
    JOIN book_copies bc ON bt.copy_id = bc.copy_id
    JOIN books b ON bc.isbn = b.isbn
    WHERE NOT EXISTS (
        SELECT 1 FROM return_transactions rt 
        WHERE rt.borrow_id = bt.borrow_id
    )
    AND bt.due_date < CURRENT_DATE
    ORDER BY days_overdue DESC;
END;
$$;

-- =====================================================
-- FUNCTION: Get Librarian Activity Report
-- =====================================================
CREATE OR REPLACE FUNCTION get_librarian_activity()
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    email VARCHAR,
    borrows_handled BIGINT,
    returns_handled BIGINT,
    payments_received BIGINT,
    total_transactions BIGINT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.username,
        u.email,
        COUNT(DISTINCT bt.borrow_id)::BIGINT AS borrows_handled,
        COUNT(DISTINCT rt.return_id)::BIGINT AS returns_handled,
        COUNT(DISTINCT p.payment_id)::BIGINT AS payments_received,
        (COUNT(DISTINCT bt.borrow_id) + COUNT(DISTINCT rt.return_id) + COUNT(DISTINCT p.payment_id))::BIGINT AS total_transactions
    FROM users u
    LEFT JOIN borrow_transactions bt ON u.user_id = bt.librarian_id
    LEFT JOIN return_transactions rt ON u.user_id = rt.librarian_id
    LEFT JOIN payments p ON u.user_id = p.received_by
    WHERE u.role = 'Librarian'
    GROUP BY u.user_id, u.username, u.email
    ORDER BY total_transactions DESC;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION count_active_borrows() TO authenticated;
GRANT EXECUTE ON FUNCTION count_overdue_books() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_borrowing_trend() TO authenticated;
GRANT EXECUTE ON FUNCTION get_members_highest_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION get_circulation_stats(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_fine_collection_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fines_collected_per_month() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_borrowed_books(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_wise_borrows() TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_active_members(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_book_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION get_never_borrowed_books() TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_books_today() TO authenticated;
GRANT EXECUTE ON FUNCTION get_librarian_activity() TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION count_active_borrows() IS 'Returns count of books currently borrowed (not yet returned)';
COMMENT ON FUNCTION count_overdue_books() IS 'Returns count of books past their due date and not returned';
COMMENT ON FUNCTION get_monthly_borrowing_trend() IS 'Returns borrowing statistics per month for the last 12 months';
COMMENT ON FUNCTION get_members_highest_overdue() IS 'Returns top 20 members with highest total overdue days';
COMMENT ON FUNCTION get_circulation_stats(DATE, DATE) IS 'Returns circulation statistics for a date range';
COMMENT ON FUNCTION get_inventory_health() IS 'Returns overall inventory health metrics';
COMMENT ON FUNCTION get_fine_collection_summary(DATE, DATE) IS 'Returns fine generation and collection summary for a date range';
COMMENT ON FUNCTION get_fines_collected_per_month() IS 'Returns fines collected grouped by month for last 12 months';
COMMENT ON FUNCTION get_top_borrowed_books(INTEGER) IS 'Returns top K most borrowed books';
COMMENT ON FUNCTION get_category_wise_borrows() IS 'Returns borrow counts grouped by category';
COMMENT ON FUNCTION get_most_active_members(INTEGER) IS 'Returns top K most active members by borrow count';
COMMENT ON FUNCTION get_book_availability() IS 'Returns availability status for all books';
COMMENT ON FUNCTION get_never_borrowed_books() IS 'Returns books that have never been borrowed';
COMMENT ON FUNCTION get_overdue_books_today() IS 'Returns all currently overdue books';
COMMENT ON FUNCTION get_librarian_activity() IS 'Returns activity statistics for all librarians';
