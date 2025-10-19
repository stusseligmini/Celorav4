-- Complete Admin Setup for user 44f830a6-cde0-4b96-b61c-f2e6ff50a7ae
-- This script does:
-- 1. Creates user_roles table if it doesn't exist
-- 2. Inserts admin role into user_roles
-- 3. Updates app_metadata with roles
-- 4. Creates RLS policies that check user_profiles.role

-- ============================================================================
-- STEP 1: Create user_roles table if it doesn't exist
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator', 'support')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY IF NOT EXISTS "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only admins can insert/update roles
CREATE POLICY IF NOT EXISTS "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- STEP 2: Insert admin role for the user
-- ============================================================================
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
    '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae',
    'admin',
    '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae'  -- Self-granted for bootstrap
)
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- STEP 3: Create function to sync roles to app_metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's app_metadata with their roles
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'roles', 
            (
                SELECT jsonb_agg(role)
                FROM public.user_roles
                WHERE user_id = NEW.user_id
            ),
            'role',
            (
                SELECT role
                FROM public.user_profiles
                WHERE id = NEW.user_id
            )
        )
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_roles
DROP TRIGGER IF EXISTS sync_roles_on_change ON public.user_roles;
CREATE TRIGGER sync_roles_on_change
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_roles_to_metadata();

-- ============================================================================
-- STEP 4: Manually sync current user's roles to app_metadata
-- ============================================================================
UPDATE auth.users
SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'roles', 
        (
            SELECT jsonb_agg(role)
            FROM public.user_roles
            WHERE user_id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae'
        ),
        'role', 'admin'
    )
WHERE id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- ============================================================================
-- STEP 5: Create helper function to check if user is admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id AND role = 'admin'
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = is_admin.user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Add admin check policies to key tables
-- ============================================================================

-- Allow admins to view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        public.is_admin() OR auth.uid() = id
    );

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles" ON public.user_profiles
    FOR UPDATE USING (
        public.is_admin() OR auth.uid() = id
    );

-- Allow admins to view all transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (
        public.is_admin() OR auth.uid() = user_id
    );

-- Allow admins to view all cards
DROP POLICY IF EXISTS "Admins can view all cards" ON public.virtual_cards;
CREATE POLICY "Admins can view all cards" ON public.virtual_cards
    FOR SELECT USING (
        public.is_admin() OR auth.uid() = user_id
    );

-- Allow admins to view all wallets
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets" ON public.wallets
    FOR SELECT USING (
        public.is_admin() OR auth.uid() = user_id
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check user_profiles role
SELECT 'user_profiles.role' AS source, id, email, role 
FROM public.user_profiles 
WHERE id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- Check user_roles table
SELECT 'user_roles' AS source, user_id, role, granted_at
FROM public.user_roles
WHERE user_id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- Check app_metadata
SELECT 
    'auth.users.app_metadata' AS source,
    id,
    email,
    raw_app_meta_data->'role' AS role,
    raw_app_meta_data->'roles' AS roles
FROM auth.users
WHERE id = '44f830a6-cde0-4b96-b61c-f2e6ff50a7ae';

-- Test is_admin function
SELECT 'is_admin()' AS test, public.is_admin('44f830a6-cde0-4b96-b61c-f2e6ff50a7ae') AS result;
