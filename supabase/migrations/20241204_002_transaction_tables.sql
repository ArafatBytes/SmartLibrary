-- =====================================================
-- SMART LIBRARY - TRANSACTION TABLES MIGRATION
-- =====================================================
-- This migration creates tables for book copies, borrowing, returns, fines, and payments
-- Run this AFTER the core tables migration

-- =====================================================
-- DROP EXISTING TABLES AND FUNCTIONS (if they exist)
-- =====================================================
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS fines CASCADE;
DROP TABLE IF EXISTS return_transactions CASCADE;
DROP TABLE IF EXISTS borrow_transactions CASCADE;
DROP TABLE IF EXISTS book_copies CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

DROP FUNCTION IF EXISTS update_copy_status_on_borrow CASCADE;
DROP FUNCTION IF EXISTS update_status_on_return CASCADE;
DROP FUNCTION IF EXISTS check_overdue_and_create_fine CASCADE;
DROP FUNCTION IF EXISTS update_fine_status_on_payment CASCADE;

-- =====================================================
-- TABLE: book_copies
-- =====================================================
-- Stores physical copies of books (one book can have multiple copies)
CREATE TABLE book_copies (
    copy_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL REFERENCES books(isbn) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Borrowed', 'Lost')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: borrow_transactions
-- =====================================================
-- Records when members borrow book copies
CREATE TABLE borrow_transactions (
    borrow_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    copy_id INTEGER NOT NULL REFERENCES book_copies(copy_id) ON DELETE CASCADE,
    librarian_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    borrow_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: return_transactions
-- =====================================================
-- Records when borrowed books are returned
CREATE TABLE return_transactions (
    return_id SERIAL PRIMARY KEY,
    borrow_id INTEGER NOT NULL REFERENCES borrow_transactions(borrow_id) ON DELETE CASCADE,
    librarian_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    return_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: fines
-- =====================================================
-- Records fines for overdue or damaged books

CREATE TABLE fines (
    fine_id SERIAL PRIMARY KEY,
    borrow_id INTEGER REFERENCES borrow_transactions(borrow_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: payments
-- =====================================================
-- Records fine payments
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    fine_id INTEGER NOT NULL REFERENCES fines(fine_id) ON DELETE CASCADE,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: audit_log
-- =====================================================
-- Tracks all important actions in the system
CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'BORROW', 'RETURN'
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Transaction Tables
-- =====================================================
CREATE INDEX idx_book_copies_isbn ON book_copies(isbn);
CREATE INDEX idx_book_copies_status ON book_copies(status);

CREATE INDEX idx_borrow_member ON borrow_transactions(member_id);
CREATE INDEX idx_borrow_copy ON borrow_transactions(copy_id);
CREATE INDEX idx_borrow_status ON borrow_transactions(status);
CREATE INDEX idx_borrow_due_date ON borrow_transactions(due_date);
CREATE INDEX idx_borrow_date ON borrow_transactions(borrow_date);

CREATE INDEX idx_return_borrow ON return_transactions(borrow_id);
CREATE INDEX idx_return_date ON return_transactions(return_date);

CREATE INDEX idx_fines_member ON fines(member_id);
CREATE INDEX idx_fines_borrow ON fines(borrow_id);
CREATE INDEX idx_fines_status ON fines(status);

CREATE INDEX idx_payments_fine ON payments(fine_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- =====================================================
-- TRIGGERS for updated_at timestamps
-- =====================================================
CREATE TRIGGER update_book_copies_updated_at BEFORE UPDATE ON book_copies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_borrow_transactions_updated_at BEFORE UPDATE ON borrow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fines_updated_at BEFORE UPDATE ON fines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTOMATIC STATUS UPDATES
-- =====================================================

-- Trigger: Update book_copy status when borrowed
CREATE OR REPLACE FUNCTION update_copy_status_on_borrow()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE book_copies 
    SET status = 'Borrowed' 
    WHERE copy_id = NEW.copy_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_copy_status_on_borrow
AFTER INSERT ON borrow_transactions
FOR EACH ROW
EXECUTE FUNCTION update_copy_status_on_borrow();

-- Trigger: Update book_copy status and borrow status when returned
CREATE OR REPLACE FUNCTION update_status_on_return()
RETURNS TRIGGER AS $$
BEGIN
    -- Update book copy status to Available
    UPDATE book_copies 
    SET status = 'Available' 
    WHERE copy_id = (SELECT copy_id FROM borrow_transactions WHERE borrow_id = NEW.borrow_id);
    
    -- Update borrow transaction status to Returned
    UPDATE borrow_transactions 
    SET status = 'Returned' 
    WHERE borrow_id = NEW.borrow_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_status_on_return
AFTER INSERT ON return_transactions
FOR EACH ROW
EXECUTE FUNCTION update_status_on_return();

-- Trigger: Auto-calculate overdue fines
CREATE OR REPLACE FUNCTION check_overdue_and_create_fine()
RETURNS TRIGGER AS $$
DECLARE
    days_overdue INTEGER;
    fine_amount DECIMAL(10, 2);
BEGIN
    -- Check if return is overdue
    IF NEW.return_date::DATE > (SELECT due_date FROM borrow_transactions WHERE borrow_id = NEW.borrow_id) THEN
        days_overdue := NEW.return_date::DATE - (SELECT due_date FROM borrow_transactions WHERE borrow_id = NEW.borrow_id);
        fine_amount := days_overdue * 1.00; -- $1 per day overdue (adjust as needed)
        
        -- Create fine record
        INSERT INTO fines (borrow_id, member_id, amount, reason, status)
        SELECT NEW.borrow_id, member_id, fine_amount, 'Overdue', 'Unpaid'
        FROM borrow_transactions
        WHERE borrow_id = NEW.borrow_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_overdue_fine
AFTER INSERT ON return_transactions
FOR EACH ROW
EXECUTE FUNCTION check_overdue_and_create_fine();

-- Trigger: Update fine status when payment is made
CREATE OR REPLACE FUNCTION update_fine_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10, 2);
    fine_amount DECIMAL(10, 2);
BEGIN
    -- Calculate total paid for this fine
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE fine_id = NEW.fine_id;
    
    -- Get fine amount
    SELECT amount INTO fine_amount
    FROM fines
    WHERE fine_id = NEW.fine_id;
    
    -- Update fine status if fully paid
    IF total_paid >= fine_amount THEN
        UPDATE fines
        SET status = 'Paid', paid_date = NOW()
        WHERE fine_id = NEW.fine_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fine_status
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_fine_status_on_payment();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE book_copies IS 'Physical copies of books in the library';
COMMENT ON TABLE borrow_transactions IS 'Records of book borrowing transactions';
COMMENT ON TABLE return_transactions IS 'Records of book returns';
COMMENT ON TABLE fines IS 'Fines for overdue, damaged, or lost books';
COMMENT ON TABLE payments IS 'Payment records for fines';
COMMENT ON TABLE audit_log IS 'System audit trail for all important actions';
