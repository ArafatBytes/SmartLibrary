-- Drop the existing authentication function to allow for logic updates
DROP FUNCTION IF EXISTS authenticate_user(TEXT);

-- Recreate the function with inactive account check
CREATE OR REPLACE FUNCTION authenticate_user(
    p_username TEXT
)
RETURNS TABLE(
    user_id INT,
    username VARCHAR(100),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(20),
    success BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Get user details including status
    SELECT * INTO v_user
    FROM users 
    WHERE users.username = p_username;
    
    -- If no user found
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::INT,
            NULL::VARCHAR(100),
            NULL::VARCHAR(255),
            NULL::VARCHAR(255),
            NULL::VARCHAR(20),
            FALSE,
            'Invalid username or password'::TEXT;
        RETURN;
    END IF;

    -- Check if account is inactive
    IF v_user.status != 'active' THEN
        RETURN QUERY
        SELECT 
            NULL::INT,
            NULL::VARCHAR(100),
            NULL::VARCHAR(255),
            NULL::VARCHAR(255),
            NULL::VARCHAR(20),
            FALSE,
            'Account is deactivated. Please contact administrator.'::TEXT;
        RETURN;
    END IF;

    -- Return user details for successful lookup (password check happens in App)
    RETURN QUERY
    SELECT 
        v_user.user_id,
        v_user.username,
        v_user.email,
        v_user.password_hash,
        v_user.role,
        TRUE as success,
        'User found'::TEXT as message;
END;
$$;

-- Grant functionality to anonymous and authenticated users (needed for login)
GRANT EXECUTE ON FUNCTION authenticate_user TO authenticated, anon;
