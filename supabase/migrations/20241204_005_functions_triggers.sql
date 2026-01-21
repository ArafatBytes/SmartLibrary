-- =====================================================
-- SMART LIBRARY - FUNCTIONS AND TRIGGERS
-- =====================================================
-- This migration adds stored procedures, functions, and triggers
-- Run this AFTER all table migrations

-- =====================================================
-- FUNCTION: Calculate and Update Fines (Weekly Job)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_overdue_fines()
RETURNS void AS $$
DECLARE
    overdue_borrow RECORD;
    days_overdue INTEGER;
    fine_amount DECIMAL(10, 2);
    fine_rate CONSTANT DECIMAL(10, 2) := 1.00; -- $1 per day
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
-- TRIGGER FUNCTION: Create fine on return if overdue
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_generate_fine_on_return()
RETURNS TRIGGER AS $$
DECLARE
    v_due_date DATE;
    v_return_date DATE;
    v_days_overdue INTEGER;
    v_fine_amount DECIMAL(10, 2);
    v_fine_rate CONSTANT DECIMAL(10, 2) := 1.00; -- $1 per day
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
