-- Add status column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update existing users to active
UPDATE users SET status = 'active' WHERE status IS NULL;

-- 1. Drop existing function to allow return type change
DROP FUNCTION IF EXISTS get_all_librarians();

-- 2. Re-create function with new return type (including status)
CREATE OR REPLACE FUNCTION get_all_librarians()
RETURNS TABLE(
    user_id INT,
    username VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ,
    status VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.username,
        u.email,
        u.phone,
        u.created_at,
        u.status
    FROM users u
    WHERE u.role = 'Librarian' 
    AND u.status = 'active'
    ORDER BY u.created_at DESC;
END;
$$;

-- Function: delete_librarian
-- Purpose: Delete a librarian user (Soft delete if history exists, Hard delete otherwise)
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
    SELECT EXISTS(
        SELECT 1 FROM borrow_transactions WHERE librarian_id = p_user_id
        UNION
        SELECT 1 FROM return_transactions WHERE librarian_id = p_user_id
    ) INTO v_has_activity;
    
    IF v_has_activity THEN
        -- Soft Delete (Deactivate)
        UPDATE users 
        SET status = 'inactive',
            updated_at = NOW()
        WHERE users.user_id = p_user_id;
        
        RETURN QUERY SELECT TRUE, 'Librarian deactivated (preserved history)'::TEXT;
    ELSE
        -- Hard Delete
        DELETE FROM users WHERE users.user_id = p_user_id;
        
        RETURN QUERY SELECT TRUE, 'Librarian deleted successfully'::TEXT;
    END IF;
END;
$$;
