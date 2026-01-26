-- =====================================================
-- SMART LIBRARY - FUNCTIONS AND TRIGGERS
-- =====================================================
-- This migration adds stored procedures, functions, and triggers
-- Run this AFTER all table migrations

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trg_update_copy_status_on_borrow ON borrow_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_update_copy_status_on_return ON return_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_generate_fine_on_return ON return_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_audit_users ON users CASCADE;
DROP TRIGGER IF EXISTS trg_audit_members ON members CASCADE;
DROP TRIGGER IF EXISTS trg_audit_borrows ON borrow_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_audit_returns ON return_transactions CASCADE;
DROP TRIGGER IF EXISTS trg_audit_fines ON fines CASCADE;
DROP TRIGGER IF EXISTS trg_audit_payments ON payments CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS calculate_overdue_fines() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_copy_status_on_borrow() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_copy_status_on_return() CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_fine_on_return() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_log() CASCADE;
DROP FUNCTION IF EXISTS get_active_borrows(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_member_fine_summary(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_book_return(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS record_fine_payment(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_active_borrow_with_fine(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS create_borrow_transaction(INTEGER, INTEGER, DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS search_books(TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_copy_status(INTEGER) CASCADE;

-- =====================================================
-- FUNCTION: Calculate and Update Fines (Weekly Job)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_overdue_fines()
RETURNS void AS $$
DECLARE
    overdue_borrow RECORD;
    days_overdue INTEGER;
    fine_amount DECIMAL(10, 2);
    fine_rate CONSTANT DECIMAL(10, 2) := 2.00; -- 2 BDT per day
BEGIN
    -- Find all borrows that are overdue and not returned
    FOR overdue_borrow IN
        SELECT 
            bt.borrow_id,
            bt.due_date,
            bt.member_id
        FROM borrow_transactions bt
        LEFT JOIN return_transactions rt ON bt.borrow_id = rt.borrow_id
        WHERE rt.return_id IS NULL  -- Not returned yet
          AND bt.due_date < CURRENT_DATE  -- Past due date
    LOOP
        -- Calculate days overdue
        days_overdue := CURRENT_DATE - overdue_borrow.due_date;
        fine_amount := days_overdue * fine_rate;

        -- Check if fine already exists for this borrow
        IF EXISTS (SELECT 1 FROM fines WHERE borrow_id = overdue_borrow.borrow_id) THEN
            -- Update existing fine amount
            UPDATE fines 
            SET amount = fine_amount,
                updated_at = NOW()
            WHERE borrow_id = overdue_borrow.borrow_id;
            
            RAISE NOTICE 'Updated fine for borrow_id %: $%', overdue_borrow.borrow_id, fine_amount;
        ELSE
            -- Create new fine record
            INSERT INTO fines (borrow_id, amount)
            VALUES (overdue_borrow.borrow_id, fine_amount);
            
            RAISE NOTICE 'Created fine for borrow_id %: $%', overdue_borrow.borrow_id, fine_amount;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Fine calculation completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_overdue_fines() IS 'Calculates and updates fines for overdue books. Run weekly via cron job.';

-- =====================================================
-- TRIGGER FUNCTION: Auto-update book_copy status after borrow
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_copy_status_on_borrow()
RETURNS TRIGGER AS $$
BEGIN
    -- Update book copy status to 'Borrowed'
    UPDATE book_copies
    SET status = 'Borrowed',
        updated_at = NOW()
    WHERE copy_id = NEW.copy_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_after_borrow_update_copy_status ON borrow_transactions;
CREATE TRIGGER tr_after_borrow_update_copy_status
    AFTER INSERT ON borrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_copy_status_on_borrow();

COMMENT ON FUNCTION trigger_update_copy_status_on_borrow() IS 'Automatically sets book_copy status to Borrowed when a borrow transaction is created';

-- =====================================================
-- TRIGGER FUNCTION: Auto-update book_copy status after return
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_copy_status_on_return()
RETURNS TRIGGER AS $$
DECLARE
    v_copy_id INTEGER;
BEGIN
    -- Get the copy_id from the borrow transaction
    SELECT copy_id INTO v_copy_id
    FROM borrow_transactions
    WHERE borrow_id = NEW.borrow_id;
    
    -- Update book copy status to 'Available'
    UPDATE book_copies
    SET status = 'Available',
        updated_at = NOW()
    WHERE copy_id = v_copy_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_after_return_update_copy_status ON return_transactions;
CREATE TRIGGER tr_after_return_update_copy_status
    AFTER INSERT ON return_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_copy_status_on_return();

COMMENT ON FUNCTION trigger_update_copy_status_on_return() IS 'Automatically sets book_copy status to Available when a return transaction is created';

-- =====================================================
-- FUNCTION: Process Book Return (Only if no fine or fine is paid)
-- =====================================================
CREATE OR REPLACE FUNCTION process_book_return(
    p_copy_id INTEGER,
    p_librarian_id INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    return_id INTEGER,
    fine_amount DECIMAL(10, 2),
    message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    v_borrow_id INTEGER;
    v_return_id INTEGER;
    v_fine_id INTEGER;
    v_payment_exists BOOLEAN;
BEGIN
    -- Find active borrow for this copy
    SELECT bt.borrow_id INTO v_borrow_id
    FROM borrow_transactions bt
    WHERE bt.copy_id = p_copy_id
      AND NOT EXISTS (
          SELECT 1 FROM return_transactions rt 
          WHERE rt.borrow_id = bt.borrow_id
      )
    ORDER BY bt.borrow_date DESC
    LIMIT 1;

    IF v_borrow_id IS NULL THEN
        success := FALSE;
        message := 'No active borrow found for this copy ID';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if there's a fine for this borrow
    SELECT fine_id INTO v_fine_id
    FROM fines
    WHERE borrow_id = v_borrow_id;

    -- If fine exists, check if it's paid
    IF v_fine_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM payments WHERE fine_id = v_fine_id) INTO v_payment_exists;
        
        IF NOT v_payment_exists THEN
            success := FALSE;
            message := 'Fine must be paid before completing return';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;

    -- All clear - process return
    INSERT INTO return_transactions (borrow_id, librarian_id, return_date)
    VALUES (v_borrow_id, p_librarian_id, NOW())
    RETURNING return_transactions.return_id INTO v_return_id;

    -- Update book copy status
    UPDATE book_copies
    SET status = 'Available',
        updated_at = NOW()
    WHERE copy_id = p_copy_id;

    success := TRUE;
    return_id := v_return_id;
    fine_amount := 0;
    message := 'Book returned successfully';

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Record Fine Payment
-- =====================================================
CREATE OR REPLACE FUNCTION record_fine_payment(
    p_fine_id INTEGER,
    p_librarian_id INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    payment_id INTEGER,
    message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id INTEGER;
    v_existing_payment INTEGER;
BEGIN
    -- Check if payment already exists
    SELECT payments.payment_id INTO v_existing_payment
    FROM payments
    WHERE fine_id = p_fine_id;

    IF v_existing_payment IS NOT NULL THEN
        success := FALSE;
        message := 'Payment already recorded for this fine';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Record payment
    INSERT INTO payments (fine_id, payment_date, received_by)
    VALUES (p_fine_id, NOW(), p_librarian_id)
    RETURNING payments.payment_id INTO v_payment_id;

    success := TRUE;
    payment_id := v_payment_id;
    message := 'Payment recorded successfully';

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get Active Borrow with Fine Details (Creates/Updates Fine if Overdue)
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_borrow_with_fine(
    p_copy_id INTEGER
)
RETURNS TABLE(
    borrow_id INTEGER,
    member_id INTEGER,
    member_name VARCHAR,
    member_email VARCHAR,
    borrow_date TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    days_overdue INTEGER,
    fine_amount DECIMAL(10, 2),
    fine_id INTEGER,
    payment_exists BOOLEAN
)
SECURITY DEFINER
AS $$
DECLARE
    v_borrow_id INTEGER;
    v_due_date DATE;
    v_days_overdue INTEGER;
    v_fine_amount DECIMAL(10, 2);
    v_fine_id_temp INTEGER;
BEGIN
    -- Get active borrow
    SELECT bt.borrow_id, bt.due_date INTO v_borrow_id, v_due_date
    FROM borrow_transactions bt
    WHERE bt.copy_id = p_copy_id
      AND NOT EXISTS (
          SELECT 1 FROM return_transactions rt 
          WHERE rt.borrow_id = bt.borrow_id
      )
    ORDER BY bt.borrow_date DESC
    LIMIT 1;

    IF v_borrow_id IS NULL THEN
        RETURN;
    END IF;

    -- Calculate if overdue
    v_days_overdue := CURRENT_DATE - v_due_date;
    
    IF v_days_overdue > 0 THEN
        v_fine_amount := v_days_overdue * 2; -- 2 BDT per day
        
        -- Check if fine exists
        SELECT fines.fine_id INTO v_fine_id_temp
        FROM fines
        WHERE fines.borrow_id = v_borrow_id;
        
        IF v_fine_id_temp IS NOT NULL THEN
            -- Update existing fine amount
            UPDATE fines
            SET amount = v_fine_amount,
                updated_at = NOW()
            WHERE fines.fine_id = v_fine_id_temp;
        ELSE
            -- Create new fine
            INSERT INTO fines (borrow_id, amount)
            VALUES (v_borrow_id, v_fine_amount)
            RETURNING fines.fine_id INTO v_fine_id_temp;
        END IF;
    END IF;

    -- Return full details
    RETURN QUERY
    SELECT 
        bt.borrow_id,
        bt.member_id,
        m.name,
        m.email,
        bt.borrow_date,
        bt.due_date,
        CASE 
            WHEN CURRENT_DATE > bt.due_date 
            THEN (CURRENT_DATE - bt.due_date)::INTEGER
            ELSE 0
        END as days_overdue,
        COALESCE(f.amount, 0) as fine_amount,
        f.fine_id,
        EXISTS(SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id) as payment_exists
    FROM borrow_transactions bt
    JOIN members m ON bt.member_id = m.member_id
    LEFT JOIN fines f ON bt.borrow_id = f.borrow_id
    WHERE bt.copy_id = p_copy_id
      AND NOT EXISTS (
          SELECT 1 FROM return_transactions rt 
          WHERE rt.borrow_id = bt.borrow_id
      )
    ORDER BY bt.borrow_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Create Borrow Transaction
-- =====================================================
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
BEGIN
    -- Check if copy exists and is available
    SELECT status INTO v_copy_status
    FROM book_copies
    WHERE copy_id = p_copy_id;

    IF v_copy_status IS NULL THEN
        success := FALSE;
        message := 'Book copy not found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_copy_status != 'Available' THEN
        success := FALSE;
        message := 'Book copy is not available';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Create borrow transaction
    INSERT INTO borrow_transactions (copy_id, member_id, due_date, librarian_id, borrow_date)
    VALUES (p_copy_id, p_member_id, p_due_date, p_librarian_id, NOW())
    RETURNING borrow_transactions.borrow_id INTO v_borrow_id;

    -- Update book copy status (trigger will handle this, but doing explicitly for safety)
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

-- =====================================================
-- FUNCTION: Search Books
-- =====================================================
CREATE OR REPLACE FUNCTION search_books(
    p_search_query TEXT
)
RETURNS TABLE(
    isbn VARCHAR,
    title VARCHAR,
    authors TEXT,
    publisher VARCHAR,
    category VARCHAR,
    publication_year INTEGER,
    available_copies BIGINT,
    total_copies BIGINT,
    is_available BOOLEAN
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.isbn,
        b.title,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as authors,
        b.publisher,
        c.name as category,
        b.publication_year,
        COUNT(DISTINCT CASE WHEN bc.status = 'Available' THEN bc.copy_id END) as available_copies,
        COUNT(DISTINCT bc.copy_id) as total_copies,
        COUNT(DISTINCT CASE WHEN bc.status = 'Available' THEN bc.copy_id END) > 0 as is_available
    FROM books b
    LEFT JOIN book_author ba ON b.isbn = ba.isbn
    LEFT JOIN authors a ON ba.author_id = a.author_id
    LEFT JOIN categories c ON b.category_id = c.category_id
    LEFT JOIN book_copies bc ON b.isbn = bc.isbn
    WHERE 
        b.title ILIKE '%' || p_search_query || '%'
        OR b.isbn ILIKE '%' || p_search_query || '%'
    GROUP BY b.isbn, b.title, b.publisher, c.name, b.publication_year
    ORDER BY b.title;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Check Book Copy Status
-- =====================================================
CREATE OR REPLACE FUNCTION check_copy_status(
    p_copy_id INTEGER
)
RETURNS TABLE(
    copy_id INTEGER,
    isbn VARCHAR,
    title VARCHAR,
    authors TEXT,
    publisher VARCHAR,
    category VARCHAR,
    publication_year INTEGER,
    status VARCHAR,
    is_available BOOLEAN,
    borrow_id INTEGER,
    borrow_date TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    member_name VARCHAR,
    member_email VARCHAR
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bc.copy_id,
        b.isbn,
        b.title,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as authors,
        b.publisher,
        c.name as category,
        b.publication_year,
        bc.status,
        bc.status = 'Available' as is_available,
        bt.borrow_id,
        bt.borrow_date,
        bt.due_date,
        m.name as member_name,
        m.email as member_email
    FROM book_copies bc
    JOIN books b ON bc.isbn = b.isbn
    LEFT JOIN book_author ba ON b.isbn = ba.isbn
    LEFT JOIN authors a ON ba.author_id = a.author_id
    LEFT JOIN categories c ON b.category_id = c.category_id
    LEFT JOIN borrow_transactions bt ON bc.copy_id = bt.copy_id 
        AND NOT EXISTS (SELECT 1 FROM return_transactions rt WHERE rt.borrow_id = bt.borrow_id)
    LEFT JOIN members m ON bt.member_id = m.member_id
    WHERE bc.copy_id = p_copy_id
    GROUP BY bc.copy_id, b.isbn, b.title, b.publisher, c.name, b.publication_year, 
             bc.status, bt.borrow_id, bt.borrow_date, bt.due_date, m.name, m.email;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Create fine on return if overdue
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_generate_fine_on_return()
RETURNS TRIGGER AS $$
DECLARE
    v_due_date DATE;
    v_return_date DATE;
    v_days_overdue INTEGER;
    v_fine_amount DECIMAL(10, 2);
    v_fine_rate CONSTANT DECIMAL(10, 2) := 2.00; -- 2 BDT per day
    v_fine_exists BOOLEAN;
BEGIN
    -- Get the due date from borrow transaction
    SELECT due_date INTO v_due_date
    FROM borrow_transactions
    WHERE borrow_id = NEW.borrow_id;
    
    v_return_date := NEW.return_date::DATE;
    
    -- Check if book is overdue
    IF v_return_date > v_due_date THEN
        v_days_overdue := v_return_date - v_due_date;
        v_fine_amount := v_days_overdue * v_fine_rate;
        
        -- Check if fine already exists (from weekly calculation)
        SELECT EXISTS(SELECT 1 FROM fines WHERE borrow_id = NEW.borrow_id) INTO v_fine_exists;
        
        IF v_fine_exists THEN
            -- Update existing fine to final amount
            UPDATE fines
            SET amount = v_fine_amount,
                updated_at = NOW()
            WHERE borrow_id = NEW.borrow_id;
            
            RAISE NOTICE 'Updated fine for borrow_id % to final amount: $%', NEW.borrow_id, v_fine_amount;
        ELSE
            -- Create new fine
            INSERT INTO fines (borrow_id, amount)
            VALUES (NEW.borrow_id, v_fine_amount);
            
            RAISE NOTICE 'Created fine for borrow_id %: $% (% days overdue)', NEW.borrow_id, v_fine_amount, v_days_overdue;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_after_return_generate_fine ON return_transactions;
CREATE TRIGGER tr_after_return_generate_fine
    AFTER INSERT ON return_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_fine_on_return();

COMMENT ON FUNCTION trigger_generate_fine_on_return() IS 'Automatically creates or updates fine if book is returned late';

-- =====================================================
-- TRIGGER FUNCTION: Audit log for all table changes
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INTEGER;
    v_action VARCHAR(20);
BEGIN
    -- Try to get user_id from session (if available)
    BEGIN
        v_user_id := current_setting('app.current_user_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Determine action type
    IF (TG_OP = 'INSERT') THEN
        v_action := 'INSERT';
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
        VALUES (v_user_id, v_action, TG_TABLE_NAME, 
                (to_jsonb(NEW)->>(TG_TABLE_NAME || '_id'))::INTEGER,
                to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (v_user_id, v_action, TG_TABLE_NAME,
                (to_jsonb(NEW)->>(TG_TABLE_NAME || '_id'))::INTEGER,
                to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
        VALUES (v_user_id, v_action, TG_TABLE_NAME,
                (to_jsonb(OLD)->>(TG_TABLE_NAME || '_id'))::INTEGER,
                to_jsonb(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
DROP TRIGGER IF EXISTS tr_audit_users ON users;
CREATE TRIGGER tr_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS tr_audit_members ON members;
CREATE TRIGGER tr_audit_members
    AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS tr_audit_borrow ON borrow_transactions;
CREATE TRIGGER tr_audit_borrow
    AFTER INSERT OR UPDATE OR DELETE ON borrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS tr_audit_return ON return_transactions;
CREATE TRIGGER tr_audit_return
    AFTER INSERT OR UPDATE OR DELETE ON return_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS tr_audit_fines ON fines;
CREATE TRIGGER tr_audit_fines
    AFTER INSERT OR UPDATE OR DELETE ON fines
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

DROP TRIGGER IF EXISTS tr_audit_payments ON payments;
CREATE TRIGGER tr_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

COMMENT ON FUNCTION trigger_audit_log() IS 'Logs all INSERT/UPDATE/DELETE operations to audit_log table';

-- =====================================================
-- HELPER FUNCTION: Get active borrows for a member
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_borrows(p_member_id INTEGER)
RETURNS TABLE (
    borrow_id INTEGER,
    copy_id INTEGER,
    book_title VARCHAR,
    borrow_date TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    days_until_due INTEGER,
    is_overdue BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.borrow_id,
        bt.copy_id,
        b.title,
        bt.borrow_date,
        bt.due_date,
        (bt.due_date - CURRENT_DATE)::INTEGER as days_until_due,
        (CURRENT_DATE > bt.due_date) as is_overdue
    FROM borrow_transactions bt
    JOIN book_copies bc ON bt.copy_id = bc.copy_id
    JOIN books b ON bc.isbn = b.isbn
    LEFT JOIN return_transactions rt ON bt.borrow_id = rt.borrow_id
    WHERE bt.member_id = p_member_id
      AND rt.return_id IS NULL  -- Not returned yet
    ORDER BY bt.due_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_borrows(INTEGER) IS 'Returns all active (unreturned) borrows for a member';

-- =====================================================
-- HELPER FUNCTION: Get member fine summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_member_fine_summary(p_member_id INTEGER)
RETURNS TABLE (
    total_fines INTEGER,
    total_amount DECIMAL(10, 2),
    paid_fines INTEGER,
    unpaid_fines INTEGER,
    unpaid_amount DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT f.fine_id)::INTEGER as total_fines,
        COALESCE(SUM(f.amount), 0) as total_amount,
        COUNT(DISTINCT p.payment_id)::INTEGER as paid_fines,
        COUNT(DISTINCT f.fine_id) FILTER (WHERE p.payment_id IS NULL)::INTEGER as unpaid_fines,
        COALESCE(SUM(f.amount) FILTER (WHERE p.payment_id IS NULL), 0) as unpaid_amount
    FROM borrow_transactions bt
    JOIN fines f ON bt.borrow_id = f.borrow_id
    LEFT JOIN payments p ON f.fine_id = p.fine_id
    WHERE bt.member_id = p_member_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_member_fine_summary(INTEGER) IS 'Returns summary of all fines for a member';

-- =====================================================
-- CONFIRMATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Functions and triggers created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '  • calculate_overdue_fines() - Weekly fine calculation function';
    RAISE NOTICE '  • Trigger: Auto-update copy status on borrow';
    RAISE NOTICE '  • Trigger: Auto-update copy status on return';
    RAISE NOTICE '  • Trigger: Generate fine on overdue return';
    RAISE NOTICE '  • Trigger: Audit log for all operations';
    RAISE NOTICE '  • Helper: get_active_borrows(member_id)';
    RAISE NOTICE '  • Helper: get_member_fine_summary(member_id)';
    RAISE NOTICE '';
    RAISE NOTICE '⏰ TO SCHEDULE WEEKLY FINE CALCULATION:';
    RAISE NOTICE '   Use pg_cron extension or external cron job to run:';
    RAISE NOTICE '   SELECT calculate_overdue_fines();';
END $$;
