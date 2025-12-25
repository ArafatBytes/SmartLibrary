-- =====================================================
-- SMART LIBRARY - CORE TABLES MIGRATION
-- =====================================================
-- This migration creates the foundational tables for the library system
-- Run this first before other migrations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP EXISTING TABLES (if they exist)
-- =====================================================
DROP TABLE IF EXISTS book_author CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS authors CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS check_membership_expiry CASCADE;

-- =====================================================
-- TABLE: categories
-- =====================================================
-- Stores book categories (Fiction, Non-Fiction, Science, etc.)
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: authors
-- =====================================================
-- Stores author information
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: books
-- =====================================================
-- Stores book information
CREATE TABLE books (
    isbn VARCHAR(20) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    publication_year INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: book_author (Junction Table)
-- =====================================================
-- Many-to-many relationship between books and authors
CREATE TABLE book_author (
    isbn VARCHAR(20) REFERENCES books(isbn) ON DELETE CASCADE,
    author_id INTEGER REFERENCES authors(author_id) ON DELETE CASCADE,
    PRIMARY KEY (isbn, author_id)
);

-- =====================================================
-- TABLE: users
-- =====================================================
-- Stores system users (Admin, Librarian)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Librarian')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: members
-- =====================================================
-- Stores library members who can borrow books
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    membership_expiry_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    membership_status VARCHAR(20) DEFAULT 'Active' CHECK (membership_status IN ('Active', 'Suspended', 'Expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Core Tables
-- =====================================================
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_book_author_isbn ON book_author(isbn);
CREATE INDEX idx_book_author_author ON book_author(author_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_expiry ON members(membership_expiry_date);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- TRIGGERS for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON authors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-update membership status based on expiry date
-- =====================================================
CREATE OR REPLACE FUNCTION check_membership_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-update status to 'Expired' if expiry date has passed
    IF NEW.membership_expiry_date < CURRENT_DATE AND NEW.membership_status != 'Suspended' THEN
        NEW.membership_status = 'Expired';
    -- Auto-update status to 'Active' if expiry date is in the future and not suspended
    ELSIF NEW.membership_expiry_date >= CURRENT_DATE AND NEW.membership_status = 'Expired' THEN
        NEW.membership_status = 'Active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_membership_expiry
BEFORE INSERT OR UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION check_membership_expiry();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE categories IS 'Book categories and genres';
COMMENT ON TABLE authors IS 'Book authors information';
COMMENT ON TABLE books IS 'Book catalog with metadata';
COMMENT ON TABLE book_author IS 'Many-to-many relationship between books and authors';
COMMENT ON TABLE users IS 'System users (Admin and Librarian roles)';
COMMENT ON TABLE members IS 'Library members who can borrow books';
