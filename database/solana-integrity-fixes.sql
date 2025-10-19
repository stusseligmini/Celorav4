-- ================================================================
-- SOLANA INTEGRATION - DATABASE INTEGRITY FIXES
-- Created: October 19, 2025
-- Purpose: Add foreign keys and missing RLS policies for production
-- ================================================================

-- ================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ================================================================

-- Auto-link settings should reference existing users and wallets
DO $$
BEGIN
    -- Add foreign key for user_id (if users table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_auto_link_settings_user_id'
        ) THEN
            ALTER TABLE public.auto_link_settings 
            ADD CONSTRAINT fk_auto_link_settings_user_id 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- Add foreign key for wallet_id (if wallets table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_auto_link_settings_wallet_id'
        ) THEN
            ALTER TABLE public.auto_link_settings 
            ADD CONSTRAINT fk_auto_link_settings_wallet_id 
            FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Pending transfer links should reference users and wallets when linked
DO $$
BEGIN
    -- Add foreign key for linked_user_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_pending_transfer_links_user_id'
        ) THEN
            ALTER TABLE public.pending_transfer_links 
            ADD CONSTRAINT fk_pending_transfer_links_user_id 
            FOREIGN KEY (linked_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Add foreign key for linked_wallet_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_pending_transfer_links_wallet_id'
        ) THEN
            ALTER TABLE public.pending_transfer_links 
            ADD CONSTRAINT fk_pending_transfer_links_wallet_id 
            FOREIGN KEY (linked_wallet_id) REFERENCES public.wallets(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Add foreign key for linked_transaction_id (if transactions table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_pending_transfer_links_transaction_id'
        ) THEN
            ALTER TABLE public.pending_transfer_links 
            ADD CONSTRAINT fk_pending_transfer_links_transaction_id 
            FOREIGN KEY (linked_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Notification queue should reference users and templates
DO $$
BEGIN
    -- Add foreign key for user_id in notification queue
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_solana_notification_queue_user_id'
    ) THEN
        ALTER TABLE public.solana_notification_queue 
        ADD CONSTRAINT fk_solana_notification_queue_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for template_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_solana_notification_queue_template_id'
    ) THEN
        ALTER TABLE public.solana_notification_queue 
        ADD CONSTRAINT fk_solana_notification_queue_template_id 
        FOREIGN KEY (template_id) REFERENCES public.solana_notification_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- SPL token prices should reference token cache
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_spl_token_prices_mint_address'
    ) THEN
        ALTER TABLE public.spl_token_prices 
        ADD CONSTRAINT fk_spl_token_prices_mint_address 
        FOREIGN KEY (mint_address) REFERENCES public.spl_token_cache(mint_address) ON DELETE CASCADE;
    END IF;
END $$;

-- ================================================================
-- ADD MISSING RLS POLICIES
-- ================================================================

-- Enhanced policy for pending_transfer_links - users can only see their own
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_transfer_links' AND policyname = 'Users can see their pending transfers') THEN
        CREATE POLICY "Users can see their pending transfers" ON public.pending_transfer_links
            FOR SELECT TO authenticated
            USING (
                linked_user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.wallets 
                    WHERE public_key = pending_transfer_links.wallet_address 
                    AND user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy for users to update their pending transfers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_transfer_links' AND policyname = 'Users can update their pending transfers') THEN
        CREATE POLICY "Users can update their pending transfers" ON public.pending_transfer_links
            FOR UPDATE TO authenticated
            USING (
                linked_user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.wallets 
                    WHERE public_key = pending_transfer_links.wallet_address 
                    AND user_id = auth.uid()
                )
            )
            WITH CHECK (
                linked_user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.wallets 
                    WHERE public_key = pending_transfer_links.wallet_address 
                    AND user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy for service role to insert pending transfers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_transfer_links' AND policyname = 'Service role can insert pending transfers') THEN
        CREATE POLICY "Service role can insert pending transfers" ON public.pending_transfer_links
            FOR INSERT TO service_role
            WITH CHECK (true);
    END IF;
END $$;

-- Enhanced policy for solana_transaction_stream - more granular access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solana_transaction_stream' AND policyname = 'Service role can insert transactions') THEN
        CREATE POLICY "Service role can insert transactions" ON public.solana_transaction_stream
            FOR INSERT TO service_role
            WITH CHECK (true);
    END IF;
END $$;

-- Policy for users to update their notification queue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solana_notification_queue' AND policyname = 'Users can update their notifications') THEN
        CREATE POLICY "Users can update their notifications" ON public.solana_notification_queue
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Policy for service role to manage notification queue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'solana_notification_queue' AND policyname = 'Service role can manage notification queue') THEN
        CREATE POLICY "Service role can manage notification queue" ON public.solana_notification_queue
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ================================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ================================================================

-- Additional indexes for foreign key performance
CREATE INDEX IF NOT EXISTS idx_auto_link_settings_user_id ON public.auto_link_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_link_settings_wallet_id ON public.auto_link_settings(wallet_id);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_user_id ON public.pending_transfer_links(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_wallet_id ON public.pending_transfer_links(linked_wallet_id);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_expires_at ON public.pending_transfer_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_user_id ON public.solana_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_status ON public.solana_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_created_at ON public.solana_notification_queue(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_status_user ON public.pending_transfer_links(auto_link_status, linked_user_id);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_user_status ON public.solana_notification_queue(user_id, status);

-- ================================================================
-- ADD DATA VALIDATION CONSTRAINTS
-- ================================================================

-- Ensure confidence scores are within valid range
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_confidence_score_range'
    ) THEN
        ALTER TABLE public.pending_transfer_links 
        ADD CONSTRAINT chk_confidence_score_range 
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);
    END IF;
END $$;

-- Ensure auto_link_settings confidence score is valid
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_auto_link_min_confidence_range'
    ) THEN
        ALTER TABLE public.auto_link_settings 
        ADD CONSTRAINT chk_auto_link_min_confidence_range 
        CHECK (min_confidence_score >= 0.0 AND min_confidence_score <= 1.0);
    END IF;
END $$;

-- Ensure time window is reasonable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_time_window_reasonable'
    ) THEN
        ALTER TABLE public.auto_link_settings 
        ADD CONSTRAINT chk_time_window_reasonable 
        CHECK (time_window_hours >= 1 AND time_window_hours <= 168); -- 1 hour to 1 week
    END IF;
END $$;

-- ================================================================
-- CREATE UTILITY FUNCTIONS FOR DATA INTEGRITY
-- ================================================================

-- Function to cleanup expired pending transfers
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_transfers()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.pending_transfer_links 
    WHERE expires_at < NOW() 
    AND auto_link_status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's auto-link statistics
CREATE OR REPLACE FUNCTION public.get_user_autolink_stats(user_uuid UUID)
RETURNS TABLE (
    total_transfers INTEGER,
    auto_linked INTEGER,
    manual_review INTEGER,
    success_rate DECIMAL(5,2),
    avg_confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_transfers,
        COUNT(CASE WHEN auto_link_status = 'linked' THEN 1 END)::INTEGER as auto_linked,
        COUNT(CASE WHEN auto_link_status = 'manual_review' THEN 1 END)::INTEGER as manual_review,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN auto_link_status = 'linked' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100)
            ELSE 0 
        END as success_rate,
        COALESCE(AVG(confidence_score), 0)::DECIMAL(3,2) as avg_confidence
    FROM public.pending_transfer_links 
    WHERE linked_user_id = user_uuid
    OR EXISTS (
        SELECT 1 FROM public.wallets 
        WHERE public_key = pending_transfer_links.wallet_address 
        AND wallets.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_transfers TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_autolink_stats TO authenticated;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 DATABASE INTEGRITY FIXES APPLIED SUCCESSFULLY! 🔧';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Foreign key constraints added for data integrity';
    RAISE NOTICE '✅ Enhanced RLS policies for security';
    RAISE NOTICE '✅ Performance indexes optimized';
    RAISE NOTICE '✅ Data validation constraints added';
    RAISE NOTICE '✅ Utility functions for maintenance created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your database is now production-ready with full integrity!';
    RAISE NOTICE '';
END $$;