-- =====================================================
-- BOOK MANAGEMENT FUNCTIONS
-- =====================================================
-- Add this to your migrations after 20241204_006_analytics_functions.sql
-- Or create as: 20241204_007_book_management_functions.sql

-- Drop existing functions
DROP FUNCTION IF EXISTS add_new_book(VARCHAR, VARCHAR, VARCHAR, VARCHAR[], INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS remove_book_copy(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_all_categories() CASCADE;

-- =====================================================
-- FUNCTION: Get All Categories
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_categories()
RETURNS TABLE (
    category_id INTEGER,
    name VARCHAR
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.category_id,
        c.name
    FROM categories c
    ORDER BY c.name;
END;
$$;

-- =====================================================
-- FUNCTION: Add New Book with Auto-Author Creation
-- =====================================================
CREATE OR REPLACE FUNCTION add_new_book(
    p_isbn VARCHAR,
    p_title VARCHAR,
    p_publisher VARCHAR,
    p_author_names VARCHAR[],
    p_category_id INTEGER,
    p_publication_year INTEGER,
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    isbn VARCHAR,
    copy_id INTEGER,
    new_authors_created INTEGER
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_book_exists BOOLEAN;
    v_author_name VARCHAR;
    v_author_id INTEGER;
    v_new_authors_count INTEGER := 0;
    v_copy_id INTEGER;
BEGIN
    -- Validate inputs
    IF p_isbn IS NULL OR p_isbn = '' THEN
        success := FALSE;
        message := 'ISBN is required';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_title IS NULL OR p_title = '' THEN
        success := FALSE;
        message := 'Title is required';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_author_names IS NULL OR array_length(p_author_names, 1) IS NULL THEN
        success := FALSE;
        message := 'At least one author is required';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if book already exists
    SELECT EXISTS(SELECT 1 FROM books WHERE books.isbn = p_isbn) INTO v_book_exists;

    IF NOT v_book_exists THEN
        -- Insert new book
        INSERT INTO books (isbn, title, publisher, category_id, publication_year, description)
        VALUES (p_isbn, p_title, p_publisher, p_category_id, p_publication_year, p_description);
        
        -- Process authors
        FOREACH v_author_name IN ARRAY p_author_names
        LOOP
            -- Trim whitespace
            v_author_name := TRIM(v_author_name);
            
            IF v_author_name != '' THEN
                -- Check if author exists (case-insensitive)
                SELECT author_id INTO v_author_id
                FROM authors
                WHERE LOWER(name) = LOWER(v_author_name)
                LIMIT 1;
                
                -- Create author if doesn't exist
                IF v_author_id IS NULL THEN
                    INSERT INTO authors (name, bio)
                    VALUES (v_author_name, NULL)
                    RETURNING authors.author_id INTO v_author_id;
                    
                    v_new_authors_count := v_new_authors_count + 1;
                END IF;
                
                -- Link book to author
                INSERT INTO book_author (isbn, author_id)
                VALUES (p_isbn, v_author_id)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Create book copy
    INSERT INTO book_copies (isbn, status)
    VALUES (p_isbn, 'Available')
    RETURNING book_copies.copy_id INTO v_copy_id;

    success := TRUE;
    IF v_book_exists THEN
        message := 'Book already exists in catalog. Added new copy.';
    ELSE
        message := 'New book added to catalog with ' || v_new_authors_count || ' new author(s).';
    END IF;
    isbn := p_isbn;
    copy_id := v_copy_id;
    new_authors_created := v_new_authors_count;

    RETURN NEXT;
END;
$$;

-- =====================================================
-- FUNCTION: Remove Book Copy (Mark as Unavailable)
-- =====================================================
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

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_all_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION add_new_book(VARCHAR, VARCHAR, VARCHAR, VARCHAR[], INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_book_copy(INTEGER) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_all_categories() IS 'Returns all book categories for dropdown selection';
COMMENT ON FUNCTION add_new_book(VARCHAR, VARCHAR, VARCHAR, VARCHAR[], INTEGER, INTEGER, TEXT) IS 'Adds a new book to catalog. Creates authors if they do not exist. Always creates a new book copy.';
COMMENT ON FUNCTION remove_book_copy(INTEGER) IS 'Marks a book copy as Lost (unavailable). Prevents removal if currently borrowed.';

-- =====================================================
-- CONFIRMATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Book management functions created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Functions:';
    RAISE NOTICE '  • get_all_categories() - Get category list';
    RAISE NOTICE '  • add_new_book() - Add book with auto-author creation';
    RAISE NOTICE '  • remove_book_copy() - Mark copy as unavailable';
END $$;
