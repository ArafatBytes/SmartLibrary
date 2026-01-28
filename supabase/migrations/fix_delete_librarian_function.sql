CREATE OR REPLACE FUNCTION delete_librarian(
    p_user_id INT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
    v_has_activity BOOLEAN;
BEGIN
    -- Check if user exists and is a librarian
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE users.user_id = p_user_id AND users.role = 'Librarian'
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN QUERY SELECT FALSE, 'Librarian not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if librarian has any activity (facilitated any borrows or returns)
    -- Corrected from non-existent 'borrowed_by'/'returned_by' columns to 'librarian_id'
    SELECT EXISTS(
        SELECT 1 FROM borrow_transactions WHERE librarian_id = p_user_id
        UNION
        SELECT 1 FROM return_transactions WHERE librarian_id = p_user_id
    ) INTO v_has_activity;
    
    IF v_has_activity THEN
        RETURN QUERY SELECT FALSE, 'Cannot delete librarian with transaction history. Consider deactivating instead.'::TEXT;
        RETURN;
    END IF;
    
    -- Delete the librarian
    DELETE FROM users WHERE users.user_id = p_user_id AND users.role = 'Librarian';
    
    RETURN QUERY SELECT TRUE, 'Librarian deleted successfully'::TEXT;
END;
$$;
