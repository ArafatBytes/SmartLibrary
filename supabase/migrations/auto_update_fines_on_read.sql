-- Function: get_total_fines_amount
-- Purpose: Calculate total unpaid fines amount
-- UPDATED: Now runs calculate_overdue_fines() first to ensure data is up-to-date
CREATE OR REPLACE FUNCTION get_total_fines_amount()
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    -- Ensure fines are up to date for all currently overdue books
    PERFORM calculate_overdue_fines();

    -- Calculate total
    SELECT COALESCE(SUM(f.amount), 0) INTO v_total
    FROM fines f
    WHERE NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.fine_id = f.fine_id
    );
    RETURN v_total;
END;
$$;
