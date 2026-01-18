-- =====================================================
-- SMART LIBRARY - SAMPLE DATA
-- =====================================================
-- This migration adds sample data for testing
-- OPTIONAL: Run this to populate your database with test data

-- =====================================================
-- CLEAR EXISTING SAMPLE DATA (for clean re-runs)
-- =====================================================
TRUNCATE TABLE payments, fines, return_transactions, borrow_transactions, 
             book_copies, book_author, books, authors, categories, 
             members, users, audit_log RESTART IDENTITY CASCADE;

-- =====================================================
-- SAMPLE CATEGORIES
-- =====================================================
INSERT INTO categories (name) VALUES
    ('Fiction'),
    ('Non-Fiction'),
    ('Science Fiction'),
    ('Mystery'),
    ('Biography'),
    ('History'),
    ('Technology'),
    ('Children'),
    ('Romance'),
    ('Thriller');

-- =====================================================
-- SAMPLE AUTHORS
-- =====================================================
INSERT INTO authors (name, bio) VALUES
    ('J.K. Rowling', 'British author, best known for Harry Potter series'),
    ('George R.R. Martin', 'American novelist and screenwriter'),
    ('Agatha Christie', 'English writer known for mystery novels'),
    ('Stephen King', 'American author of horror and suspense fiction'),
    ('Isaac Asimov', 'American science fiction writer'),
    ('Margaret Atwood', 'Canadian poet, novelist, and literary critic'),
    ('Dan Brown', 'American author best known for The Da Vinci Code'),
    ('Malcolm Gladwell', 'Canadian journalist and author'),
    ('Yuval Noah Harari', 'Israeli historian and author'),
    ('Michelle Obama', 'Former First Lady and author');

-- =====================================================
-- SAMPLE BOOKS
-- =====================================================
INSERT INTO books (isbn, title, category_id, publication_year) VALUES
    ('9780747532699', 'Harry Potter and the Philosopher''s Stone', 1, 1997),
    ('9780553103540', 'A Game of Thrones', 3, 1996),
    ('9780062693662', 'Murder on the Orient Express', 4, 1934),
    ('9780385121675', 'The Shining', 10, 1977),
    ('9780553293357', 'Foundation', 3, 1951),
    ('9780385490818', 'The Handmaid''s Tale', 1, 1985),
    ('9780385504201', 'The Da Vinci Code', 4, 2003),
    ('9780316017923', 'Outliers', 2, 2008),
    ('9780062316097', 'Sapiens', 6, 2011),
    ('9781524763138', 'Becoming', 5, 2018);

-- =====================================================
-- LINK BOOKS TO AUTHORS
-- =====================================================
INSERT INTO book_author (isbn, author_id) VALUES
    ('9780747532699', 1),  -- Harry Potter - J.K. Rowling
    ('9780553103540', 2),  -- Game of Thrones - George R.R. Martin
    ('9780062693662', 3),  -- Murder on Orient Express - Agatha Christie
    ('9780385121675', 4),  -- The Shining - Stephen King
    ('9780553293357', 5),  -- Foundation - Isaac Asimov
    ('9780385490818', 6),  -- Handmaid's Tale - Margaret Atwood
    ('9780385504201', 7),  -- Da Vinci Code - Dan Brown
    ('9780316017923', 8),  -- Outliers - Malcolm Gladwell
    ('9780062316097', 9),  -- Sapiens - Yuval Noah Harari
    ('9781524763138', 10); -- Becoming - Michelle Obama

-- =====================================================
-- SAMPLE BOOK COPIES
-- =====================================================
INSERT INTO book_copies (isbn, status) VALUES
    ('9780747532699', 'Available'),
    ('9780747532699', 'Available'),
    ('9780747532699', 'Borrowed'),
    ('9780553103540', 'Available'),
    ('9780553103540', 'Available'),
    ('9780062693662', 'Available'),
    ('9780385121675', 'Available'),
    ('9780385121675', 'Borrowed'),
    ('9780553293357', 'Available'),
    ('9780385490818', 'Available'),
    ('9780385504201', 'Available'),
    ('9780385504201', 'Available'),
    ('9780316017923', 'Available'),
    ('9780062316097', 'Available'),
    ('9780062316097', 'Borrowed'),
    ('9781524763138', 'Available');

-- =====================================================
-- SAMPLE USERS (Admin and Librarians)
-- =====================================================
-- Note: In production, use proper password hashing!
-- These are bcrypt hashes for 'password123'
INSERT INTO users (username, email, password_hash, role) VALUES
    ('admin', 'admin@smartlibrary.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin'),
    ('librarian1', 'librarian1@smartlibrary.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Librarian'),
    ('librarian2', 'librarian2@smartlibrary.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Librarian');

-- =====================================================
-- SAMPLE MEMBERS
-- =====================================================
INSERT INTO members (name, email, phone, address) VALUES
    ('John Smith', 'john.smith@email.com', '555-0101', '123 Main St, City'),
    ('Sarah Johnson', 'sarah.j@email.com', '555-0102', '456 Oak Ave, City'),
    ('Michael Brown', 'mbrown@email.com', '555-0103', '789 Pine Rd, City'),
    ('Emily Davis', 'emily.d@email.com', '555-0104', '321 Elm St, City'),
    ('David Wilson', 'dwilson@email.com', '555-0105', '654 Maple Dr, City');

-- =====================================================
-- SAMPLE BORROW TRANSACTIONS
-- =====================================================
INSERT INTO borrow_transactions (member_id, copy_id, librarian_id, borrow_date, due_date) VALUES
    (1, 3, 2, NOW() - INTERVAL '10 days', CURRENT_DATE + INTERVAL '4 days'),
    (2, 8, 2, NOW() - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days'),
    (3, 15, 3, NOW() - INTERVAL '20 days', CURRENT_DATE - INTERVAL '6 days'),
    (4, 1, 2, NOW() - INTERVAL '30 days', CURRENT_DATE - INTERVAL '16 days'),
    (5, 4, 3, NOW() - INTERVAL '25 days', CURRENT_DATE - INTERVAL '11 days');

-- =====================================================
-- SAMPLE RETURN TRANSACTIONS
-- =====================================================
INSERT INTO return_transactions (borrow_id, librarian_id, return_date) VALUES
    (4, 2, NOW() - INTERVAL '2 days'),
    (5, 3, NOW() - INTERVAL '1 day');

-- =====================================================
-- SAMPLE FINES
-- =====================================================
INSERT INTO fines (borrow_id, amount) VALUES
    (3, 6.00),
    (5, 11.00);

-- =====================================================
-- CONFIRMATION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Sample data inserted successfully!';
    RAISE NOTICE '📚 %s books added', (SELECT COUNT(*) FROM books);
    RAISE NOTICE '👥 %s members added', (SELECT COUNT(*) FROM members);
    RAISE NOTICE '📖 %s book copies added', (SELECT COUNT(*) FROM book_copies);
    RAISE NOTICE '🔄 %s borrows', (SELECT COUNT(*) FROM borrow_transactions);
END $$;
