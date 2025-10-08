-- CELORA PLATFORM - MFA DATABASE DEPLOYMENT SCRIPT
-- Run this in your Supabase SQL Editor to set up MFA functionality

-- Add MFA fields to profiles table (if they don't exist already)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_recovery_codes TEXT[]; -- Array of recovery codes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_last_verified TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_verified_devices JSONB DEFAULT '[]';

-- Create MFA verification attempt log table for security audit
CREATE TABLE IF NOT EXISTS mfa_verification_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on MFA table
ALTER TABLE mfa_verification_log ENABLE ROW LEVEL SECURITY;

-- MFA verification log policies
CREATE POLICY "Users can view their own MFA verification logs" ON mfa_verification_log
    FOR SELECT USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_mfa_verification_log_user_id ON mfa_verification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_enabled ON profiles(mfa_enabled);

-- Function to generate random recovery codes
CREATE OR REPLACE FUNCTION generate_recovery_codes(num_codes INTEGER DEFAULT 10)
RETURNS TEXT[] AS $$
DECLARE
    codes TEXT[] := '{}';
    new_code TEXT;
BEGIN
    FOR i IN 1..num_codes LOOP
        -- Generate a random code (8 characters, alphanumeric)
        new_code := '';
        FOR j IN 1..4 LOOP
            new_code := new_code || encode(gen_random_bytes(2), 'hex');
            IF j < 4 THEN
                new_code := new_code || '-';
            END IF;
        END LOOP;
        codes := array_append(codes, new_code);
    END LOOP;
    RETURN codes;
END;
$$ LANGUAGE plpgsql;

-- Function to verify a recovery code and consume it
CREATE OR REPLACE FUNCTION verify_recovery_code(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_codes TEXT[];
    code_index INTEGER;
BEGIN
    -- Get current recovery codes for the user
    SELECT mfa_recovery_codes INTO user_codes
    FROM profiles
    WHERE id = p_user_id;
    
    -- If no recovery codes or empty array, return false
    IF user_codes IS NULL OR array_length(user_codes, 1) IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if the provided code exists in the array
    code_index := array_position(user_codes, p_code);
    
    -- If code found, remove it from the array (consume it)
    IF code_index IS NOT NULL THEN
        -- Remove the used code
        UPDATE profiles
        SET mfa_recovery_codes = array_remove(mfa_recovery_codes, p_code),
            mfa_last_verified = NOW()
        WHERE id = p_user_id;
        
        -- Log the successful verification
        INSERT INTO mfa_verification_log (user_id, success, ip_address, user_agent)
        VALUES (p_user_id, TRUE, inet_client_addr(), current_setting('request.headers')::json->>'user-agent');
        
        RETURN TRUE;
    END IF;
    
    -- Code not found
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 CELORA MFA DATABASE SETUP COMPLETE! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '✅ MFA fields added to profiles table';
    RAISE NOTICE '✅ MFA verification log table created';
    RAISE NOTICE '✅ Recovery code generation function added';
    RAISE NOTICE '✅ Recovery code verification function added';
    RAISE NOTICE '';
    RAISE NOTICE 'Your Celora platform is now ready for MFA!';
END $$;