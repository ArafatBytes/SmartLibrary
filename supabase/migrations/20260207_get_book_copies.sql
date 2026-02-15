-- PL/pgSQL function to get all copies of a book by ISBN
CREATE OR REPLACE FUNCTION get_book_copies(p_isbn VARCHAR)
RETURNS TABLE(
    copy_id INTEGER,
    status VARCHAR
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bc.copy_id,
        bc.status
    FROM book_copies bc
    WHERE bc.isbn = p_isbn
    ORDER BY bc.copy_id ASC;
END;
$$ LANGUAGE plpgsql;
