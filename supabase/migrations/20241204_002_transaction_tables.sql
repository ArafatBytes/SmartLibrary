-- =====================================================
-- SMART LIBRARY - TRANSACTION TABLES MIGRATION
-- =====================================================
-- This migration creates tables for book copies, borrowing, returns, fines, and payments
-- Run this AFTER the core tables migration

-- =====================================================
-- DROP EXISTING TABLES (if they exist)
-- =====================================================
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS fines CASCADE;
DROP TABLE IF EXISTS return_transactions CASCADE;
DROP TABLE IF EXISTS borrow_transactions CASCADE;
DROP TABLE IF EXISTS book_copies CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

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
CREATE INDEX idx_borrow_due_date ON borrow_transactions(due_date);
CREATE INDEX idx_borrow_date ON borrow_transactions(borrow_date);

CREATE INDEX idx_return_borrow ON return_transactions(borrow_id);
CREATE INDEX idx_return_date ON return_transactions(return_date);

CREATE INDEX idx_fines_borrow ON fines(borrow_id);

CREATE INDEX idx_payments_fine ON payments(fine_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE book_copies IS 'Physical copies of books in the library';
COMMENT ON TABLE borrow_transactions IS 'Records of book borrowing transactions';
COMMENT ON TABLE return_transactions IS 'Records of book returns';
COMMENT ON TABLE fines IS 'Fines for overdue, damaged, or lost books';
COMMENT ON TABLE payments IS 'Payment records for fines';
COMMENT ON TABLE audit_log IS 'System audit trail for all important actions';
