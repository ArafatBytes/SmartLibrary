-- Update create_borrow_transaction to block borrowing when member has unpaid fines
CREATE OR REPLACE FUNCTION create_borrow_transaction(
    p_copy_id INTEGER,
    p_member_id INTEGER,
    p_due_date DATE,
    p_librarian_id INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    borrow_id INTEGER,
    message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    v_borrow_id INTEGER;
    v_copy_status VARCHAR(20);
    v_member_exists BOOLEAN;
    v_unpaid_fine_count INTEGER;
    v_unpaid_fine_total DECIMAL(10,2);
    v_active_borrows INTEGER;
    v_max_borrows CONSTANT INTEGER := 5;
BEGIN
    -- Check if member exists
    SELECT EXISTS(SELECT 1 FROM members WHERE member_id = p_member_id) INTO v_member_exists;
    
    IF NOT v_member_exists THEN
        success := FALSE;
        message := 'Member ID ' || p_member_id || ' does not exist';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Ensure all overdue fines are calculated and up-to-date before checking
    PERFORM calculate_overdue_fines();

    -- Check if member has unpaid fines
    SELECT COUNT(*), COALESCE(SUM(f.amount), 0)
    INTO v_unpaid_fine_count, v_unpaid_fine_total
    FROM fines f
    INNER JOIN borrow_transactions bt ON f.borrow_id = bt.borrow_id
    WHERE bt.member_id = p_member_id
    AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id
    );

    IF v_unpaid_fine_count > 0 THEN
        success := FALSE;
        message := 'Member has ' || v_unpaid_fine_count || ' unpaid fine(s) totalling BDT ' || v_unpaid_fine_total || '. Please clear all fines before borrowing.';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check active borrow limit (max 5 books at a time)
    SELECT COUNT(*) INTO v_active_borrows
    FROM borrow_transactions bt
    WHERE bt.member_id = p_member_id
    AND NOT EXISTS (
        SELECT 1 FROM return_transactions rt WHERE rt.borrow_id = bt.borrow_id
    );

    IF v_active_borrows >= v_max_borrows THEN
        success := FALSE;
        message := 'Member already has ' || v_active_borrows || ' book(s) borrowed. Maximum limit is ' || v_max_borrows || '. Please return a book before borrowing another.';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if copy exists and is available
    SELECT status INTO v_copy_status
    FROM book_copies
    WHERE copy_id = p_copy_id;

    IF v_copy_status IS NULL THEN
        success := FALSE;
        message := 'Book copy ID ' || p_copy_id || ' does not exist';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_copy_status != 'Available' THEN
        success := FALSE;
        message := 'Book copy ID ' || p_copy_id || ' is not available (Status: ' || v_copy_status || ')';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Create borrow transaction
    INSERT INTO borrow_transactions (copy_id, member_id, due_date, librarian_id, borrow_date)
    VALUES (p_copy_id, p_member_id, p_due_date, p_librarian_id, NOW())
    RETURNING borrow_transactions.borrow_id INTO v_borrow_id;

    -- Update book copy status
    UPDATE book_copies
    SET status = 'Borrowed',
        updated_at = NOW()
    WHERE copy_id = p_copy_id;

    success := TRUE;
    borrow_id := v_borrow_id;
    message := 'Book borrowed successfully';

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
