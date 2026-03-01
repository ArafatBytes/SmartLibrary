CREATE OR REPLACE FUNCTION count_total_books()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM book_copies;
    RETURN v_count;
END;
$$;
