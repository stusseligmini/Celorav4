-- ================================================================
-- SOLANA INTEGRATION SCHEMA - Missing Components
-- Created: October 18, 2025
-- Purpose: Add missing tables for SPL token cache, WebSocket streaming, 
--          auto-link transfers, and enhanced push notifications
-- ================================================================

-- ================================================================
-- SPL TOKEN CACHE SYSTEM
-- ================================================================

-- SPL Token metadata cache (Jupiter/Solana token lists)
CREATE TABLE IF NOT EXISTS public.spl_token_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mint_address TEXT NOT NULL UNIQUE, -- SPL token mint address
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    logo_uri TEXT,
    coingecko_id TEXT,
    verified BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- ['community', 'lst', 'old-registry']
    daily_volume DECIMAL(20,2),
    freeze_authority TEXT,
    mint_authority TEXT,
    supply DECIMAL(30,0), -- Current supply with full precision
    source TEXT NOT NULL DEFAULT 'jupiter', -- 'jupiter', 'solana-token-list'
    metadata JSONB DEFAULT '{}', -- Additional metadata
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SPL Token price cache (real-time pricing)
CREATE TABLE IF NOT EXISTS public.spl_token_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mint_address TEXT NOT NULL REFERENCES public.spl_token_cache(mint_address),
    price_usd DECIMAL(20,8) NOT NULL,
    price_sol DECIMAL(20,8), -- Price in SOL
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    change_1h DECIMAL(10,6), -- Percentage change
    change_24h DECIMAL(10,6),
    change_7d DECIMAL(10,6),
    last_trade_at TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'jupiter', -- Price source
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mint_address, created_at)
);

-- ================================================================
-- WEBSOCKET STREAMING SYSTEM
-- ================================================================

-- WebSocket subscriptions tracking
CREATE TABLE IF NOT EXISTS public.websocket_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    subscription_type TEXT CHECK (subscription_type IN ('account', 'program', 'logs', 'signature')) DEFAULT 'account',
    program_id TEXT, -- For program subscriptions
    is_active BOOLEAN DEFAULT TRUE,
    last_notification_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time transaction stream (WebSocket captured data)
CREATE TABLE IF NOT EXISTS public.solana_transaction_stream (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signature TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    block_time BIGINT, -- Unix timestamp
    slot BIGINT, -- Solana slot number
    transaction_type TEXT CHECK (transaction_type IN ('transfer', 'swap', 'stake', 'unstake', 'nft', 'unknown')) DEFAULT 'unknown',
    amount DECIMAL(25,8), -- SOL amount
    token_mint TEXT, -- SPL token mint if applicable
    token_amount DECIMAL(25,8), -- Token amount if SPL transfer
    from_address TEXT,
    to_address TEXT,
    fee DECIMAL(25,8), -- Transaction fee in SOL
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    raw_transaction JSONB, -- Full transaction data from RPC
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- AUTO-LINK TRANSFER SYSTEM
-- ================================================================

-- Pending transfers waiting to be linked to users
CREATE TABLE IF NOT EXISTS public.pending_transfer_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signature TEXT NOT NULL REFERENCES public.solana_transaction_stream(signature),
    wallet_address TEXT NOT NULL,
    amount DECIMAL(25,8) NOT NULL,
    token_mint TEXT, -- NULL for SOL transfers
    transfer_type TEXT CHECK (transfer_type IN ('incoming', 'outgoing')) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    auto_link_status TEXT CHECK (auto_link_status IN ('pending', 'linked', 'ignored', 'manual_review')) DEFAULT 'pending',
    linked_user_id UUID REFERENCES auth.users(id),
    linked_wallet_id UUID REFERENCES public.wallets(id),
    linked_transaction_id UUID REFERENCES public.transactions(id),
    time_window_hours INTEGER DEFAULT 24, -- How long to keep trying to link
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-link configuration per user/wallet
CREATE TABLE IF NOT EXISTS public.auto_link_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    min_confidence_score DECIMAL(3,2) DEFAULT 0.8, -- Minimum confidence to auto-link
    time_window_hours INTEGER DEFAULT 6, -- How long to scan for matching transactions
    notification_enabled BOOLEAN DEFAULT TRUE,
    auto_confirm_enabled BOOLEAN DEFAULT FALSE, -- Automatically confirm high-confidence matches
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, wallet_id)
);

-- ================================================================
-- ENHANCED PUSH NOTIFICATIONS FOR SOLANA
-- ================================================================

-- Push notification templates for Solana events
CREATE TABLE IF NOT EXISTS public.solana_notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL UNIQUE, -- 'solana_received', 'solana_sent', 'spl_received', etc.
    title_template TEXT NOT NULL, -- 'SOL Received: {{amount}} SOL'
    body_template TEXT NOT NULL, -- 'You received {{amount}} SOL from {{from_address}}'
    icon_url TEXT,
    action_url_template TEXT, -- '/wallet/{{wallet_id}}/transaction/{{signature}}'
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    requires_confirmation BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push notification queue for Solana transactions
CREATE TABLE IF NOT EXISTS public.solana_notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.solana_notification_templates(id),
    signature TEXT REFERENCES public.solana_transaction_stream(signature),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    variables JSONB DEFAULT '{}', -- Template variables
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- SPL Token cache indexes
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_mint_address ON public.spl_token_cache(mint_address);
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_symbol ON public.spl_token_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_verified ON public.spl_token_cache(verified);
CREATE INDEX IF NOT EXISTS idx_spl_token_cache_last_updated ON public.spl_token_cache(last_updated_at DESC);

-- SPL Token price indexes
CREATE INDEX IF NOT EXISTS idx_spl_token_prices_mint_address ON public.spl_token_prices(mint_address);
CREATE INDEX IF NOT EXISTS idx_spl_token_prices_created_at ON public.spl_token_prices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spl_token_prices_mint_created ON public.spl_token_prices(mint_address, created_at DESC);

-- WebSocket subscription indexes
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_user_id ON public.websocket_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_wallet_address ON public.websocket_subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_websocket_subscriptions_active ON public.websocket_subscriptions(is_active);

-- Transaction stream indexes
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_signature ON public.solana_transaction_stream(signature);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_wallet ON public.solana_transaction_stream(wallet_address);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_block_time ON public.solana_transaction_stream(block_time DESC);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_processed_at ON public.solana_transaction_stream(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_solana_transaction_stream_token_mint ON public.solana_transaction_stream(token_mint);

-- Auto-link indexes
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_signature ON public.pending_transfer_links(signature);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_wallet ON public.pending_transfer_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_status ON public.pending_transfer_links(auto_link_status);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_expires_at ON public.pending_transfer_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_transfer_links_user_wallet ON public.pending_transfer_links(linked_user_id, linked_wallet_id);

-- Auto-link settings indexes
CREATE INDEX IF NOT EXISTS idx_auto_link_settings_user_id ON public.auto_link_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_link_settings_wallet_id ON public.auto_link_settings(wallet_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_user_id ON public.solana_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_status ON public.solana_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_solana_notification_queue_created_at ON public.solana_notification_queue(created_at DESC);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all new tables
ALTER TABLE public.spl_token_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spl_token_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websocket_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_transaction_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_transfer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_link_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_notification_queue ENABLE ROW LEVEL SECURITY;

-- SPL Token cache policies (public read access)
CREATE POLICY "Anyone can read SPL token cache" ON public.spl_token_cache
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read SPL token prices" ON public.spl_token_prices
    FOR SELECT TO authenticated USING (true);

-- WebSocket subscriptions policies (user-owned)
CREATE POLICY "Users can manage their WebSocket subscriptions" ON public.websocket_subscriptions
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Transaction stream policies (users can see their wallet transactions)
CREATE POLICY "Users can see transactions for their wallets" ON public.solana_transaction_stream
    FOR SELECT TO authenticated
    USING (
        wallet_address IN (
            SELECT public_key FROM public.wallets 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- Pending transfer links policies
CREATE POLICY "Users can see pending links for their wallets" ON public.pending_transfer_links
    FOR SELECT TO authenticated
    USING (
        wallet_address IN (
            SELECT public_key FROM public.wallets 
            WHERE user_id = (SELECT auth.uid())
        ) OR linked_user_id = (SELECT auth.uid())
    );

-- Auto-link settings policies
CREATE POLICY "Users can manage their auto-link settings" ON public.auto_link_settings
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Notification template policies (public read)
CREATE POLICY "Anyone can read notification templates" ON public.solana_notification_templates
    FOR SELECT TO authenticated USING (is_active = true);

-- Notification queue policies (user-owned)
CREATE POLICY "Users can see their notification queue" ON public.solana_notification_queue
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ================================================================
-- FUNCTIONS FOR SOLANA INTEGRATION
-- ================================================================

-- Function to get or create SPL token info
CREATE OR REPLACE FUNCTION public.get_spl_token_info(mint_addr TEXT)
RETURNS TABLE (
    mint_address TEXT,
    symbol TEXT,
    name TEXT,
    decimals INTEGER,
    logo_uri TEXT,
    verified BOOLEAN,
    current_price_usd DECIMAL(20,8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        stc.mint_address,
        stc.symbol,
        stc.name,
        stc.decimals,
        stc.logo_uri,
        stc.verified,
        stp.price_usd
    FROM public.spl_token_cache stc
    LEFT JOIN public.spl_token_prices stp ON stc.mint_address = stp.mint_address
    WHERE stc.mint_address = mint_addr
    ORDER BY stp.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if auto-linking is enabled for a wallet
CREATE OR REPLACE FUNCTION public.is_auto_link_enabled(wallet_addr TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    enabled BOOLEAN := FALSE;
BEGIN
    SELECT als.enabled INTO enabled
    FROM public.auto_link_settings als
    JOIN public.wallets w ON w.id = als.wallet_id
    WHERE w.public_key = wallet_addr 
    AND w.user_id = (SELECT auth.uid());
    
    -- Default to enabled if no settings found
    RETURN COALESCE(enabled, TRUE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create pending transfer link
CREATE OR REPLACE FUNCTION public.create_pending_transfer_link(
    tx_signature TEXT,
    wallet_addr TEXT,
    transfer_amt DECIMAL(25,8),
    token_mint_addr TEXT DEFAULT NULL,
    direction TEXT DEFAULT 'incoming'
)
RETURNS UUID AS $$
DECLARE
    link_id UUID;
BEGIN
    INSERT INTO public.pending_transfer_links (
        signature,
        wallet_address,
        amount,
        token_mint,
        transfer_type,
        confidence_score
    ) VALUES (
        tx_signature,
        wallet_addr,
        transfer_amt,
        token_mint_addr,
        direction,
        0.5 -- Initial confidence score
    ) RETURNING id INTO link_id;
    
    RETURN link_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Trigger to update timestamps
CREATE TRIGGER update_websocket_subscriptions_updated_at 
    BEFORE UPDATE ON public.websocket_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_link_settings_updated_at 
    BEFORE UPDATE ON public.auto_link_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SEED DATA
-- ================================================================

-- Insert default Solana notification templates
INSERT INTO public.solana_notification_templates (event_type, title_template, body_template, priority) VALUES
    ('solana_received', '💰 SOL Received', 'You received {{amount}} SOL from {{from_address}}', 'normal'),
    ('solana_sent', '📤 SOL Sent', 'You sent {{amount}} SOL to {{to_address}}', 'normal'),
    ('spl_received', '🪙 {{token_symbol}} Received', 'You received {{amount}} {{token_symbol}} tokens', 'normal'),
    ('spl_sent', '📤 {{token_symbol}} Sent', 'You sent {{amount}} {{token_symbol}} tokens', 'normal'),
    ('stake_reward', '🎁 Staking Reward', 'You earned {{amount}} SOL from staking rewards', 'normal'),
    ('large_transaction', '🚨 Large Transaction Alert', 'Large transaction detected: {{amount}} {{currency}}', 'high'),
    ('auto_link_success', '✅ Transaction Linked', 'Transaction automatically linked to your wallet', 'low'),
    ('auto_link_failed', '❓ Transaction Needs Review', 'A transaction requires manual review and linking', 'normal')
ON CONFLICT (event_type) DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_spl_token_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_auto_link_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_transfer_link TO authenticated;

-- Enable realtime for key Solana tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.solana_transaction_stream;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_transfer_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.solana_notification_queue;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE 'SOLANA INTEGRATION SCHEMA deployed successfully - %', NOW();
    RAISE NOTICE 'Created tables for:';
    RAISE NOTICE '- SPL Token Cache System (metadata + prices)';
    RAISE NOTICE '- WebSocket Streaming Service (subscriptions + transaction stream)'; 
    RAISE NOTICE '- Auto-Link Transfer System (pending links + settings)';
    RAISE NOTICE '- Enhanced Push Notifications (templates + queue)';
    RAISE NOTICE 'Ready for Edge Functions deployment';
END $$;