-- Update search_books function to include authors in search
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
        -- Added author name search
        OR EXISTS (
            SELECT 1 
            FROM book_author ba_sub
            JOIN authors a_sub ON ba_sub.author_id = a_sub.author_id
            WHERE ba_sub.isbn = b.isbn 
            AND a_sub.name ILIKE '%' || p_search_query || '%'
        )
    GROUP BY b.isbn, b.title, b.publisher, c.name, b.publication_year
    ORDER BY b.title;
END;
$$ LANGUAGE plpgsql;
