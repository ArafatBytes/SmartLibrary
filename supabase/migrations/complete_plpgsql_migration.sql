-- =============================================
-- Complete PL/pgSQL Migration
-- Migrates all remaining operations to PL/pgSQL
-- =============================================

-- =============================================
-- DROP EXISTING FUNCTIONS (if they exist)
-- =============================================

DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS get_all_librarians CASCADE;
DROP FUNCTION IF EXISTS create_librarian CASCADE;
DROP FUNCTION IF EXISTS update_librarian CASCADE;
DROP FUNCTION IF EXISTS delete_librarian CASCADE;
DROP FUNCTION IF EXISTS get_audit_log CASCADE;
DROP FUNCTION IF EXISTS get_member_unpaid_fines CASCADE;
DROP FUNCTION IF EXISTS record_fine_payment CASCADE;
DROP FUNCTION IF EXISTS count_total_books CASCADE;
DROP FUNCTION IF EXISTS count_total_book_copies CASCADE;
DROP FUNCTION IF EXISTS count_available_copies CASCADE;
DROP FUNCTION IF EXISTS count_total_members CASCADE;
DROP FUNCTION IF EXISTS get_total_fines_amount CASCADE;
DROP FUNCTION IF EXISTS get_total_revenue CASCADE;

-- =============================================
-- 1. AUTHENTICATION FUNCTION
-- =============================================

-- Function: authenticate_user
-- Purpose: Authenticate user login (replaces direct query + bcrypt in Node.js)
-- Note: Password verification must still happen in Node.js due to bcrypt
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username TEXT
)
RETURNS TABLE(
    user_id INT,
    username VARCHAR(100),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(20),
    success BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists
    RETURN QUERY
    SELECT 
        u.user_id,
        u.username,
        u.email,
        u.password_hash,
        u.role,
        TRUE as success,
        'User found'::TEXT as message
    FROM users u
    WHERE u.username = p_username;
    
    -- If no rows returned, user doesn't exist
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::INT,
            NULL::VARCHAR(100),
            NULL::VARCHAR(255),
            NULL::VARCHAR(255),
            NULL::VARCHAR(20),
            FALSE,
            'Invalid username or password'::TEXT;
    END IF;
END;
$$;

-- =============================================
-- 2. LIBRARIAN MANAGEMENT FUNCTIONS
-- =============================================

-- Function: get_all_librarians
-- Purpose: Retrieve all librarian users
CREATE OR REPLACE FUNCTION get_all_librarians()
RETURNS TABLE(
    user_id INT,
    username VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ
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
        u.created_at
    FROM users u
    WHERE u.role = 'Librarian'
    ORDER BY u.created_at DESC;
END;
$$;

-- Function: create_librarian
-- Purpose: Create new librarian with hashed password
-- Note: Password hashing must still happen in Node.js with bcrypt
CREATE OR REPLACE FUNCTION create_librarian(
    p_username VARCHAR(100),
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_password_hash VARCHAR(255)
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id INT,
    username VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id INT;
    v_username_exists BOOLEAN;
    v_email_exists BOOLEAN;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- Check if username already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE users.username = p_username) INTO v_username_exists;
    
    IF v_username_exists THEN
        RETURN QUERY SELECT FALSE, 'Username already exists'::TEXT, NULL::INT, NULL::VARCHAR(100), NULL::VARCHAR(255), NULL::VARCHAR(20), NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Check if email already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE users.email = p_email) INTO v_email_exists;
    
    IF v_email_exists THEN
        RETURN QUERY SELECT FALSE, 'Email already exists'::TEXT, NULL::INT, NULL::VARCHAR(100), NULL::VARCHAR(255), NULL::VARCHAR(20), NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Insert new librarian
    INSERT INTO users (username, email, phone, password_hash, role)
    VALUES (p_username, p_email, p_phone, p_password_hash, 'Librarian')
    RETURNING users.user_id, users.created_at INTO v_user_id, v_created_at;
    
    -- Return success with user data
    RETURN QUERY SELECT 
        TRUE, 
        'Librarian created successfully'::TEXT, 
        v_user_id, 
        p_username, 
        p_email, 
        p_phone,
        v_created_at;
END;
$$;

-- Function: update_librarian
-- Purpose: Update librarian information
CREATE OR REPLACE FUNCTION update_librarian(
    p_user_id INT,
    p_username VARCHAR(100),
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_password_hash VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id INT,
    username VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
    v_username_conflict BOOLEAN;
    v_email_conflict BOOLEAN;
BEGIN
    -- Check if user exists and is a librarian
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE users.user_id = p_user_id AND users.role = 'Librarian'
    ) INTO v_exists;
    
    IF NOT v_exists THEN
        RETURN QUERY SELECT FALSE, 'Librarian not found'::TEXT, NULL::INT, NULL::VARCHAR(100), NULL::VARCHAR(255), NULL::VARCHAR(20);
        RETURN;
    END IF;
    
    -- Check for username conflict (excluding current user)
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE users.username = p_username AND users.user_id != p_user_id
    ) INTO v_username_conflict;
    
    IF v_username_conflict THEN
        RETURN QUERY SELECT FALSE, 'Username already exists'::TEXT, NULL::INT, NULL::VARCHAR(100), NULL::VARCHAR(255), NULL::VARCHAR(20);
        RETURN;
    END IF;
    
    -- Check for email conflict (excluding current user)
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE users.email = p_email AND users.user_id != p_user_id
    ) INTO v_email_conflict;
    
    IF v_email_conflict THEN
        RETURN QUERY SELECT FALSE, 'Email already exists'::TEXT, NULL::INT, NULL::VARCHAR(100), NULL::VARCHAR(255), NULL::VARCHAR(20);
        RETURN;
    END IF;
    
    -- Update with or without password
    IF p_password_hash IS NOT NULL THEN
        UPDATE users
        SET username = p_username,
            email = p_email,
            phone = p_phone,
            password_hash = p_password_hash
        WHERE users.user_id = p_user_id AND users.role = 'Librarian';
    ELSE
        UPDATE users
        SET username = p_username,
            email = p_email,
            phone = p_phone
        WHERE users.user_id = p_user_id AND users.role = 'Librarian';
    END IF;
    
    -- Return success
    RETURN QUERY SELECT TRUE, 'Librarian updated successfully'::TEXT, p_user_id, p_username, p_email, p_phone;
END;
$$;

-- Function: delete_librarian
-- Purpose: Delete a librarian user
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
    
    -- Check if librarian has any activity (borrowed/returned books)
    SELECT EXISTS(
        SELECT 1 FROM borrow_transactions 
        WHERE borrowed_by = p_user_id OR returned_by = p_user_id
        LIMIT 1
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

-- =============================================
-- 3. AUDIT LOG FUNCTION
-- =============================================

-- Function: get_audit_log
-- Purpose: Retrieve audit log entries with optional filtering
CREATE OR REPLACE FUNCTION get_audit_log(
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(
    audit_id INT,
    user_id INT,
    action VARCHAR(100),
    table_name VARCHAR(100),
    record_id INT,
    old_values JSONB,
    new_values JSONB,
    log_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.audit_id,
        a.user_id,
        a.action,
        a.table_name,
        a.record_id,
        a.old_values,
        a.new_values,
        a.timestamp as log_timestamp
    FROM audit_log a
    ORDER BY a.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- =============================================
-- 4. PAYMENT FUNCTIONS
-- =============================================

-- Function: get_member_unpaid_fines
-- Purpose: Get all unpaid fines for a member with book details
CREATE OR REPLACE FUNCTION get_member_unpaid_fines(
    p_member_id INT
)
RETURNS TABLE(
    fine_id INT,
    amount DECIMAL(10,2),
    created_at TIMESTAMPTZ,
    borrow_id INT,
    borrow_date TIMESTAMPTZ,
    due_date DATE,
    copy_id INT,
    isbn VARCHAR(20),
    title VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.fine_id,
        f.amount,
        f.created_at,
        bt.borrow_id,
        bt.borrow_date,
        bt.due_date,
        bc.copy_id,
        b.isbn,
        b.title
    FROM fines f
    INNER JOIN borrow_transactions bt ON f.borrow_id = bt.borrow_id
    INNER JOIN book_copies bc ON bt.copy_id = bc.copy_id
    INNER JOIN books b ON bc.isbn = b.isbn
    WHERE bt.member_id = p_member_id
    AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id
    )
    ORDER BY f.created_at DESC;
END;
$$;

-- Function: record_fine_payment
-- Purpose: Record a payment for a fine
CREATE OR REPLACE FUNCTION record_fine_payment(
    p_fine_id INT,
    p_librarian_id INT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    payment_id INT,
    fine_amount DECIMAL(10,2),
    payment_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fine_exists BOOLEAN;
    v_payment_exists BOOLEAN;
    v_fine_amount DECIMAL(10,2);
    v_payment_id INT;
    v_payment_date TIMESTAMPTZ;
BEGIN
    -- Check if fine exists
    SELECT EXISTS(SELECT 1 FROM fines WHERE fines.fine_id = p_fine_id) INTO v_fine_exists;
    
    IF NOT v_fine_exists THEN
        RETURN QUERY SELECT FALSE, 'Fine not found'::TEXT, NULL::INT, NULL::DECIMAL(10,2), NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Check if payment already exists
    SELECT EXISTS(SELECT 1 FROM payments WHERE payments.fine_id = p_fine_id) INTO v_payment_exists;
    
    IF v_payment_exists THEN
        RETURN QUERY SELECT FALSE, 'Fine has already been paid'::TEXT, NULL::INT, NULL::DECIMAL(10,2), NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Get fine amount
    SELECT amount INTO v_fine_amount FROM fines WHERE fines.fine_id = p_fine_id;
    
    -- Create payment record
    INSERT INTO payments (fine_id, received_by, payment_date)
    VALUES (p_fine_id, p_librarian_id, CURRENT_TIMESTAMP)
    RETURNING payments.payment_id, payments.payment_date INTO v_payment_id, v_payment_date;
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE, 
        'Fine of ' || v_fine_amount || ' BDT paid successfully'::TEXT, 
        v_payment_id, 
        v_fine_amount,
        v_payment_date;
END;
$$;

-- =============================================
-- 5. ANALYTICS COUNT FUNCTIONS
-- =============================================

-- Function: count_total_books
-- Purpose: Count total books in catalog
CREATE OR REPLACE FUNCTION count_total_books()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(DISTINCT isbn) INTO v_count FROM books;
    RETURN v_count;
END;
$$;

-- Function: count_total_book_copies
-- Purpose: Count total book copies
CREATE OR REPLACE FUNCTION count_total_book_copies()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM book_copies;
    RETURN v_count;
END;
$$;

-- Function: count_available_copies
-- Purpose: Count available book copies
CREATE OR REPLACE FUNCTION count_available_copies()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM book_copies 
    WHERE status = 'Available';
    RETURN v_count;
END;
$$;

-- Function: count_total_members
-- Purpose: Count total registered members
CREATE OR REPLACE FUNCTION count_total_members()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM members;
    RETURN v_count;
END;
$$;

-- Function: get_total_fines_amount
-- Purpose: Calculate total unpaid fines amount
CREATE OR REPLACE FUNCTION get_total_fines_amount()
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(f.amount), 0) INTO v_total
    FROM fines f
    WHERE NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id
    );
    RETURN v_total;
END;
$$;

-- Function: get_total_revenue
-- Purpose: Calculate total revenue from paid fines
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(f.amount), 0) INTO v_total
    FROM fines f
    INNER JOIN payments p ON f.fine_id = p.fine_id;
    RETURN v_total;
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION authenticate_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_librarians TO authenticated;
GRANT EXECUTE ON FUNCTION create_librarian TO authenticated;
GRANT EXECUTE ON FUNCTION update_librarian TO authenticated;
GRANT EXECUTE ON FUNCTION delete_librarian TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_unpaid_fines TO authenticated;
GRANT EXECUTE ON FUNCTION record_fine_payment TO authenticated;
GRANT EXECUTE ON FUNCTION count_total_books TO authenticated;
GRANT EXECUTE ON FUNCTION count_total_book_copies TO authenticated;
GRANT EXECUTE ON FUNCTION count_available_copies TO authenticated;
GRANT EXECUTE ON FUNCTION count_total_members TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_fines_amount TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_revenue TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- All database operations now use PL/pgSQL functions
-- Remaining operations still require Node.js:
-- - bcrypt password hashing/verification
-- - Session cookie management
-- =============================================
