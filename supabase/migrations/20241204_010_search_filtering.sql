-- Update search_books function to include filtering by category and availability
-- Drop previous function to change signature (adding parameters)
DROP FUNCTION IF EXISTS search_books(TEXT);

CREATE OR REPLACE FUNCTION search_books(
    p_search_query TEXT,
    p_category_id INTEGER DEFAULT NULL,
    p_is_available BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
    isbn VARCHAR,
    title VARCHAR,
    authors TEXT,
    publisher VARCHAR,
    category VARCHAR,
    category_id INTEGER,
    publication_year INTEGER,
    available_copies BIGINT,
    total_copies BIGINT,
    is_available BOOLEAN
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH book_stats AS (
        SELECT 
            b_inner.isbn,
            COUNT(DISTINCT CASE WHEN bc_inner.status = 'Available' THEN bc_inner.copy_id END) as avail_copies,
            COUNT(DISTINCT bc_inner.copy_id) as tot_copies
        FROM books b_inner
        LEFT JOIN book_copies bc_inner ON b_inner.isbn = bc_inner.isbn
        GROUP BY b_inner.isbn
    )
    SELECT 
        b.isbn,
        b.title,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as authors,
        b.publisher,
        c.name as category,
        c.category_id,
        b.publication_year,
        bs.avail_copies as available_copies,
        bs.tot_copies as total_copies,
        bs.avail_copies > 0 as is_available
    FROM books b
    JOIN book_stats bs ON b.isbn = bs.isbn
    LEFT JOIN book_author ba ON b.isbn = ba.isbn
    LEFT JOIN authors a ON ba.author_id = a.author_id
    LEFT JOIN categories c ON b.category_id = c.category_id
    WHERE 
        (
            p_search_query IS NULL 
            OR p_search_query = '' 
            OR b.title ILIKE '%' || p_search_query || '%'
            OR b.isbn ILIKE '%' || p_search_query || '%'
            OR EXISTS (
                SELECT 1 
                FROM book_author ba_sub
                JOIN authors a_sub ON ba_sub.author_id = a_sub.author_id
                WHERE ba_sub.isbn = b.isbn 
                AND a_sub.name ILIKE '%' || p_search_query || '%'
            )
        )
        AND (p_category_id IS NULL OR b.category_id = p_category_id)
        AND (
            p_is_available IS NULL 
            OR (p_is_available = TRUE AND bs.avail_copies > 0)
            OR (p_is_available = FALSE AND bs.avail_copies = 0)
        )
    GROUP BY b.isbn, b.title, b.publisher, c.name, c.category_id, b.publication_year, bs.avail_copies, bs.tot_copies
    ORDER BY b.title;
END;
$$ LANGUAGE plpgsql;
