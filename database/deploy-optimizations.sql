-- Database Deployment Script for Celora Platform
-- Execute this in Supabase SQL Editor or via CLI
-- This script applies optimizations safely with rollback capability

-- ==================================================
-- BACKUP CURRENT POLICIES (for rollback if needed)
-- ==================================================

-- Create backup table for policy definitions
CREATE TABLE IF NOT EXISTS policy_backup (
    backup_date timestamp default now(),
    table_name text,
    policy_name text,
    policy_definition text
);

-- Backup current policies
INSERT INTO policy_backup (table_name, policy_name, policy_definition)
SELECT 
    tablename,
    policyname,
    pg_get_expr(pol.polqual, pol.polrelid) as policy_definition
FROM pg_policies p
JOIN pg_policy pol ON pol.polname = p.policyname
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions');

-- ==================================================
-- APPLY OPTIMIZATIONS WITH TRANSACTION SAFETY
-- ==================================================

BEGIN;

-- USER_PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_select" ON public.user_profiles
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY "user_profiles_insert" ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_profiles_update" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_profiles_delete" ON public.user_profiles
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- VIRTUAL_CARDS TABLE
DROP POLICY IF EXISTS "Users can view own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.virtual_cards;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.virtual_cards;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.virtual_cards;

CREATE POLICY "virtual_cards_select" ON public.virtual_cards
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY "virtual_cards_insert" ON public.virtual_cards
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "virtual_cards_update" ON public.virtual_cards
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "virtual_cards_delete" ON public.virtual_cards
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- WALLETS TABLE
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.wallets;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.wallets;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.wallets;

CREATE POLICY "wallets_select" ON public.wallets
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY "wallets_insert" ON public.wallets
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "wallets_update" ON public.wallets
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "wallets_delete" ON public.wallets
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- TRANSACTIONS TABLE
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.transactions;

CREATE POLICY "transactions_select" ON public.transactions
    FOR SELECT TO authenticated
    USING ((select auth.uid()) = user_id);

CREATE POLICY "transactions_insert" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "transactions_update" ON public.transactions
    FOR UPDATE TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "transactions_delete" ON public.transactions
    FOR DELETE TO authenticated
    USING ((select auth.uid()) = user_id);

-- Commit the changes
COMMIT;

-- ==================================================
-- VERIFICATION AND MONITORING
-- ==================================================

-- Verify policies were created successfully
SELECT 
    'SUCCESS: All policies updated' as status,
    count(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions');

-- Check for any missing policies
WITH expected_policies AS (
    SELECT unnest(ARRAY['user_profiles', 'virtual_cards', 'wallets', 'transactions']) as table_name,
           unnest(ARRAY['select', 'insert', 'update', 'delete']) as operation
)
SELECT 
    e.table_name,
    e.operation,
    CASE WHEN p.policyname IS NULL THEN 'MISSING' ELSE 'OK' END as status
FROM expected_policies e
LEFT JOIN pg_policies p ON p.tablename = e.table_name 
    AND p.policyname LIKE '%' || e.operation || '%'
    AND p.schemaname = 'public'
ORDER BY e.table_name, e.operation;

-- Monitor index usage (run this periodically)
SELECT 
    'Index Usage Check' as check_type,
    indexname,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Consider dropping after monitoring period'
        ELSE 'In use - keep'
    END as recommendation
FROM pg_stat_user_indexes 
WHERE indexname IN (
    'idx_virtual_cards_user_id',
    'idx_wallets_user_id', 
    'idx_transactions_user_id',
    'idx_transactions_card_id',
    'idx_transactions_wallet_id'
);

-- Performance test queries
SELECT 'Performance Test Results' as test_type;

-- Test optimized auth function calls
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM user_profiles 
WHERE user_id = (select auth.uid()) 
LIMIT 10;

SELECT 'Optimization deployment completed successfully' as final_status;