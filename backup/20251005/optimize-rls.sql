-- Database Performance Optimization for Celora Platform
-- This script optimizes RLS policies and consolidates duplicate policies

-- ==================================================
-- RLS PERFORMANCE OPTIMIZATION
-- Replace auth.uid() with (select auth.uid()) to avoid per-row re-evaluation
-- ==================================================

-- 1. USER_PROFILES TABLE OPTIMIZATION
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.user_profiles;

-- Create consolidated, optimized policies
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

-- 2. VIRTUAL_CARDS TABLE OPTIMIZATION
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON public.virtual_cards;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.virtual_cards;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.virtual_cards;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.virtual_cards;

-- Create consolidated, optimized policies
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

-- 3. WALLETS TABLE OPTIMIZATION
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.wallets;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.wallets;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.wallets;

-- Create consolidated, optimized policies
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

-- 4. TRANSACTIONS TABLE OPTIMIZATION
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "authenticated_update_policy" ON public.transactions;

-- Create consolidated, optimized policies
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

-- ==================================================
-- INDEX OPTIMIZATION
-- Monitor these indexes - drop if unused after monitoring period
-- ==================================================

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE indexname IN (
    'idx_virtual_cards_user_id',
    'idx_wallets_user_id', 
    'idx_transactions_user_id',
    'idx_transactions_card_id',
    'idx_transactions_wallet_id'
)
ORDER BY idx_scan;

-- Uncomment below lines ONLY after confirming indexes are unused over time
-- DROP INDEX IF EXISTS idx_virtual_cards_user_id;
-- DROP INDEX IF EXISTS idx_wallets_user_id;
-- DROP INDEX IF EXISTS idx_transactions_user_id;
-- DROP INDEX IF EXISTS idx_transactions_card_id;
-- DROP INDEX IF EXISTS idx_transactions_wallet_id;

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Verify all policies are created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions')
ORDER BY tablename, cmd;

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'virtual_cards', 'wallets', 'transactions');

-- Performance improvement validation
-- Run EXPLAIN ANALYZE on typical queries to confirm optimization
EXPLAIN ANALYZE SELECT * FROM user_profiles WHERE user_id = auth.uid();
EXPLAIN ANALYZE SELECT * FROM virtual_cards WHERE user_id = auth.uid();
EXPLAIN ANALYZE SELECT * FROM wallets WHERE user_id = auth.uid();
EXPLAIN ANALYZE SELECT * FROM transactions WHERE user_id = auth.uid();