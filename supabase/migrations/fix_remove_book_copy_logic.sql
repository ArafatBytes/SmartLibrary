-- Function: Remove Book Copy (Mark as Unavailable)
-- UPDATED: Now checks if the book is already lost/unavailable before proceeding.
CREATE OR REPLACE FUNCTION remove_book_copy(
    p_copy_id INTEGER
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    isbn VARCHAR,
    previous_status VARCHAR
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_copy_status VARCHAR;
    v_isbn VARCHAR;
    v_is_borrowed BOOLEAN;
BEGIN
    -- Check if copy exists
    SELECT bc.status, bc.isbn INTO v_copy_status, v_isbn
    FROM book_copies bc
    WHERE bc.copy_id = p_copy_id;

    IF v_copy_status IS NULL THEN
        success := FALSE;
        message := 'Book copy not found';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if book is already unavailable
    IF v_copy_status = 'Lost' OR v_copy_status = 'Unavailable' THEN
        success := FALSE;
        message := 'Book copy is already marked as ' || v_copy_status;
        previous_status := v_copy_status;
        isbn := v_isbn;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if copy is currently borrowed
    SELECT EXISTS(
        SELECT 1 
        FROM borrow_transactions bt
        WHERE bt.copy_id = p_copy_id
          AND NOT EXISTS (
              SELECT 1 FROM return_transactions rt 
              WHERE rt.borrow_id = bt.borrow_id
          )
    ) INTO v_is_borrowed;

    IF v_is_borrowed THEN
        success := FALSE;
        message := 'Cannot remove copy: Currently borrowed. Please process return first.';
        previous_status := v_copy_status;
        isbn := v_isbn;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Mark as unavailable (Lost)
    UPDATE book_copies
    SET status = 'Lost',
        updated_at = NOW()
    WHERE copy_id = p_copy_id;

    success := TRUE;
    message := 'Book copy marked as unavailable (Lost)';
    isbn := v_isbn;
    previous_status := v_copy_status;

    RETURN NEXT;
END;
$$;
