-- PL/pgSQL function to get member info: currently borrowed books and unpaid fines
CREATE OR REPLACE FUNCTION get_member_info(p_member_id INTEGER)
RETURNS TABLE(
    member_name VARCHAR,
    member_email VARCHAR,
    member_phone VARCHAR,
    record_type TEXT,
    copy_id INTEGER,
    isbn VARCHAR,
    book_title VARCHAR,
    authors TEXT,
    borrow_date TIMESTAMPTZ,
    due_date DATE,
    days_overdue INTEGER,
    fine_id INTEGER,
    fine_amount DECIMAL(10,2),
    is_paid BOOLEAN
)
SECURITY DEFINER
AS $$
DECLARE
    v_member_exists BOOLEAN;
BEGIN
    -- Check if member exists
    SELECT EXISTS(SELECT 1 FROM members WHERE members.member_id = p_member_id) INTO v_member_exists;

    IF NOT v_member_exists THEN
        RAISE EXCEPTION 'Member ID % does not exist', p_member_id;
    END IF;

    -- Ensure fines are up-to-date
    PERFORM calculate_overdue_fines();

    -- Return currently borrowed books
    RETURN QUERY
    SELECT
        m.name AS member_name,
        m.email AS member_email,
        m.phone AS member_phone,
        'borrow'::TEXT AS record_type,
        bc.copy_id,
        b.isbn,
        b.title AS book_title,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) AS authors,
        bt.borrow_date,
        bt.due_date,
        CASE
            WHEN CURRENT_DATE > bt.due_date THEN (CURRENT_DATE - bt.due_date)::INTEGER
            ELSE 0
        END AS days_overdue,
        f.fine_id,
        COALESCE(f.amount, 0) AS fine_amount,
        CASE WHEN p2.payment_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_paid
    FROM borrow_transactions bt
    JOIN members m ON bt.member_id = m.member_id
    JOIN book_copies bc ON bt.copy_id = bc.copy_id
    JOIN books b ON bc.isbn = b.isbn
    LEFT JOIN book_author ba ON b.isbn = ba.isbn
    LEFT JOIN authors a ON ba.author_id = a.author_id
    LEFT JOIN fines f ON bt.borrow_id = f.borrow_id
    LEFT JOIN payments p2 ON f.fine_id = p2.fine_id
    WHERE bt.member_id = p_member_id
    AND NOT EXISTS (
        SELECT 1 FROM return_transactions rt WHERE rt.borrow_id = bt.borrow_id
    )
    GROUP BY m.name, m.email, m.phone, bc.copy_id, b.isbn, b.title, bt.borrow_date, bt.due_date, f.fine_id, f.amount, p2.payment_id
    ORDER BY bt.borrow_date DESC;
END;
$$ LANGUAGE plpgsql;
