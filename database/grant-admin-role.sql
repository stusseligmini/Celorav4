-- Grant admin role to user
-- First, check if role column exists in user_profiles
DO $$
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN role TEXT DEFAULT 'user';
        RAISE NOTICE 'Added role column to user_profiles';
    END IF;
END $$;

-- Grant admin role to the specific user
UPDATE user_profiles 
SET role = 'admin' 
WHERE id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- Verify the update
SELECT id, email, role 
FROM user_profiles 
WHERE id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';
