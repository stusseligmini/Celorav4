-- ================================================================
-- CELORA UNIFIED SCHEMA v2 - Production Ready
-- Created: October 5, 2025
-- Purpose: Single source of truth resolving all schema conflicts
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ================================================================
-- CORE USER MANAGEMENT
-- ================================================================

-- User profiles (extends Supabase auth.users)
-- Decision: Use 'user_profiles' (not 'profiles') for consistency
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status TEXT CHECK (kyc_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    preferred_currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- MULTI-CURRENCY SUPPORT
-- ================================================================

-- Supported currencies
CREATE TABLE IF NOT EXISTS public.supported_currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE, -- ISO 4217 for fiat, symbol for crypto
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimals INT NOT NULL DEFAULT 2,
    type VARCHAR(10) NOT NULL CHECK (type IN ('fiat', 'crypto')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    country VARCHAR(2), -- ISO 3166-1 alpha-2 country code
    region VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10) NOT NULL,
    rate DECIMAL(20,10) NOT NULL,
    bid DECIMAL(20,10), -- Bid price for trading
    ask DECIMAL(20,10), -- Ask price for trading
    spread DECIMAL(10,6), -- Bid-ask spread percentage
    source VARCHAR(50) NOT NULL, -- Exchange or data source
    volume_24h DECIMAL(20,2), -- 24h trading volume
    change_24h DECIMAL(10,6), -- 24h price change percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(base_currency, target_currency, source)
);

-- ================================================================
-- WALLET SYSTEM (Aligned with API expectations)
-- ================================================================

-- Wallets table (matches API route expectations)
-- Decision: Use API field names as source of truth
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    wallet_name TEXT NOT NULL, -- API expects 'wallet_name'
    wallet_type TEXT NOT NULL CHECK (wallet_type IN ('ethereum', 'solana', 'bitcoin', 'fiat')), -- API expects 'wallet_type'
    public_key TEXT NOT NULL, -- API expects 'public_key' (was wallet_address)
    encrypted_private_key TEXT, -- API expects this field
    encrypted_mnemonic TEXT, -- API expects 'mnemonic_encrypted' -> standardize to this
    network TEXT NOT NULL, -- API expects 'network'
    currency TEXT NOT NULL DEFAULT 'USD',
    balance DECIMAL(25,8) DEFAULT 0.00000000,
    usd_balance DECIMAL(15,2) DEFAULT 0.00,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    derivation_path TEXT, -- For HD wallets
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-currency balances per wallet
CREATE TABLE IF NOT EXISTS public.multi_currency_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    available_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
    frozen_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
    total_balance DECIMAL(20,8) GENERATED ALWAYS AS (available_balance + frozen_balance) STORED,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, wallet_id, currency)
);

-- ================================================================
-- VIRTUAL CARDS SYSTEM
-- ================================================================

CREATE TABLE IF NOT EXISTS public.virtual_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    masked_pan TEXT NOT NULL DEFAULT '**** **** **** ****',
    encrypted_payload TEXT, -- Encrypted card details (PAN, CVV, etc.)
    card_type TEXT CHECK (card_type IN ('virtual', 'physical')) DEFAULT 'virtual',
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    spending_limit DECIMAL(15,2) DEFAULT 1000.00,
    daily_limit DECIMAL(15,2) DEFAULT 500.00,
    monthly_limit DECIMAL(15,2) DEFAULT 5000.00,
    status TEXT CHECK (status IN ('active', 'suspended', 'closed', 'pending')) DEFAULT 'active',
    pin_hash TEXT, -- Hashed PIN for card verification
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMP WITH TIME ZONE,
    is_primary BOOLEAN DEFAULT FALSE,
    is_frozen BOOLEAN DEFAULT FALSE,
    freeze_reason TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE,
    fraud_score NUMERIC(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- TRANSACTION SYSTEM (Unified for all transaction types)
-- ================================================================

-- Decision: Use single 'transactions' table (not separate wallet_transactions)
-- This serves both card transactions and wallet transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Source references (one of these will be set)
    card_id UUID REFERENCES public.virtual_cards(id),
    wallet_id UUID REFERENCES public.wallets(id),
    
    -- Transaction details
    transaction_type TEXT CHECK (transaction_type IN (
        'purchase', 'transfer', 'deposit', 'withdrawal', 'refund', 'fee', 
        'crypto_swap', 'topup', 'send', 'receive'
    )) NOT NULL,
    
    amount DECIMAL(25,8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    fee_amount DECIMAL(25,8) DEFAULT 0.00,
    exchange_rate DECIMAL(25,10),
    
    -- Transaction status and lifecycle
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'processing')) DEFAULT 'pending',
    
    -- Merchant and description
    description TEXT,
    merchant_name TEXT,
    merchant_category TEXT,
    
    -- Blockchain specific
    tx_hash TEXT, -- Blockchain transaction hash
    block_number BIGINT, -- Block number when confirmed
    confirmations INTEGER DEFAULT 0, -- Number of confirmations
    gas_used BIGINT, -- Gas used (Ethereum)
    gas_price DECIMAL(25,8), -- Gas price used
    
    -- Cross-platform references
    reference_id TEXT UNIQUE, -- Internal reference
    external_id TEXT, -- External system reference
    related_transaction_id UUID, -- Link to related transaction
    
    -- Risk and compliance
    risk_score NUMERIC(3,2) DEFAULT 0.0,
    
    -- Geographic and device info
    location_data JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- Flexible metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- AUDIT AND SECURITY
-- ================================================================

-- Audit log (singular: audit_log, not audit_logs)
-- Decision: Use singular form, create view for backward compatibility
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_user_id UUID REFERENCES auth.users(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backward compatibility view (for code expecting 'audit_logs')
CREATE OR REPLACE VIEW public.audit_logs AS SELECT * FROM public.audit_log;

-- Security events
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- NOTIFICATIONS SYSTEM
-- ================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('transaction', 'security', 'system', 'marketing', 'crypto')) DEFAULT 'system',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- CRYPTO MARKET DATA
-- ================================================================

CREATE TABLE IF NOT EXISTS public.crypto_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_usd DECIMAL(20,8) NOT NULL,
    market_cap DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    change_1h DECIMAL(10,6),
    change_24h DECIMAL(10,6),
    change_7d DECIMAL(10,6),
    circulating_supply DECIMAL(30,8),
    total_supply DECIMAL(30,8),
    max_supply DECIMAL(30,8),
    data_source VARCHAR(50) NOT NULL DEFAULT 'coingecko',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, data_source)
);

-- Crypto holdings per wallet
CREATE TABLE IF NOT EXISTS public.crypto_holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    wallet_id UUID REFERENCES public.wallets(id),
    symbol TEXT NOT NULL,
    contract_address TEXT, -- For tokens
    amount DECIMAL(25,8) NOT NULL,
    average_buy_price DECIMAL(15,8),
    current_price DECIMAL(15,8),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- FEATURE FLAGS & CONFIGURATION
-- ================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- ANALYTICS & INSIGHTS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.spending_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    category TEXT,
    total_spent DECIMAL(15,2),
    transaction_count INTEGER,
    average_amount DECIMAL(15,2),
    trend_percentage DECIMAL(5,2),
    insights JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction categories for smart insights
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================

-- User and authentication indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_kyc_status ON public.user_profiles(kyc_status);

-- Wallet indexes (optimized for API queries)
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON public.wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_network ON public.wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_is_primary ON public.wallets(is_primary);
CREATE INDEX IF NOT EXISTS idx_wallets_public_key ON public.wallets(public_key);

-- Virtual cards indexes
CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_id ON public.virtual_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_status ON public.virtual_cards(status);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_is_primary ON public.virtual_cards(is_primary);

-- Transaction indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON public.transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON public.transactions(reference_id);

-- Audit and security indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Currency and market data indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_base_target ON public.exchange_rates(base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated_at ON public.exchange_rates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_market_data_symbol ON public.crypto_market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user_id ON public.crypto_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_wallet_id ON public.crypto_holdings(wallet_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_symbol ON public.crypto_holdings(symbol);

-- Multi-currency indexes
CREATE INDEX IF NOT EXISTS idx_multi_currency_balances_user_id ON public.multi_currency_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_currency_balances_wallet_id ON public.multi_currency_balances(wallet_id);
CREATE INDEX IF NOT EXISTS idx_multi_currency_balances_currency ON public.multi_currency_balances(currency);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_spending_insights_user_id ON public.spending_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_insights_period ON public.spending_insights(period_start, period_end);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all user tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_insights ENABLE ROW LEVEL SECURITY;

-- Read-only tables (public data)
ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- User profiles policies (optimized for performance)
CREATE POLICY "user_profiles_select" ON public.user_profiles
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = id);

CREATE POLICY "user_profiles_insert" ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "user_profiles_update" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id);

-- Wallets policies
CREATE POLICY "wallets_select" ON public.wallets
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "wallets_insert" ON public.wallets
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "wallets_update" ON public.wallets
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Virtual cards policies
CREATE POLICY "virtual_cards_select" ON public.virtual_cards
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "virtual_cards_insert" ON public.virtual_cards
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "virtual_cards_update" ON public.virtual_cards
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Transactions policies
CREATE POLICY "transactions_select" ON public.transactions
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_insert" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_update" ON public.transactions
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Audit log policies (users can see their own actions)
CREATE POLICY "audit_log_select" ON public.audit_log
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = actor_user_id);

-- Security events policies
CREATE POLICY "security_events_select" ON public.security_events
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "security_events_insert" ON public.security_events
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Notifications policies
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_update" ON public.notifications
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Crypto holdings policies
CREATE POLICY "crypto_holdings_select" ON public.crypto_holdings
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "crypto_holdings_insert" ON public.crypto_holdings
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "crypto_holdings_update" ON public.crypto_holdings
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Multi-currency balances policies
CREATE POLICY "multi_currency_balances_select" ON public.multi_currency_balances
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "multi_currency_balances_insert" ON public.multi_currency_balances
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "multi_currency_balances_update" ON public.multi_currency_balances
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Spending insights policies
CREATE POLICY "spending_insights_select" ON public.spending_insights
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Public data policies (read-only for authenticated users)
CREATE POLICY "supported_currencies_select" ON public.supported_currencies
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "exchange_rates_select" ON public.exchange_rates
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "crypto_market_data_select" ON public.crypto_market_data
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "transaction_categories_select" ON public.transaction_categories
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "feature_flags_select" ON public.feature_flags
    FOR SELECT TO authenticated
    USING (true);

-- ================================================================
-- TRIGGERS AND FUNCTIONS
-- ================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_virtual_cards_updated_at BEFORE UPDATE ON public.virtual_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supported_currencies_updated_at BEFORE UPDATE ON public.supported_currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crypto_market_data_updated_at BEFORE UPDATE ON public.crypto_market_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_currency_balances_updated_at BEFORE UPDATE ON public.multi_currency_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatic profile creation on user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Balance update trigger for transactions
CREATE OR REPLACE FUNCTION update_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update card balance if card transaction
    IF NEW.card_id IS NOT NULL AND NEW.status = 'completed' THEN
        UPDATE public.virtual_cards
        SET 
            balance = balance + NEW.amount,
            updated_at = NOW(),
            last_used_at = NOW()
        WHERE id = NEW.card_id;
    END IF;
    
    -- Update wallet balance if wallet transaction
    IF NEW.wallet_id IS NOT NULL AND NEW.status = 'completed' THEN
        UPDATE public.wallets
        SET 
            balance = balance + NEW.amount,
            updated_at = NOW(),
            last_sync_at = NOW()
        WHERE id = NEW.wallet_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_status_change ON public.transactions;
CREATE TRIGGER on_transaction_status_change
    AFTER INSERT OR UPDATE OF status ON public.transactions
    FOR EACH ROW 
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_balance_on_transaction();

-- ================================================================
-- SEED DATA
-- ================================================================

-- Insert default supported currencies
INSERT INTO public.supported_currencies (code, name, symbol, decimals, type, is_active, country, region) VALUES
    -- Major Fiat Currencies
    ('USD', 'US Dollar', '$', 2, 'fiat', true, 'US', 'Americas'),
    ('EUR', 'Euro', '€', 2, 'fiat', true, NULL, 'Europe'),
    ('GBP', 'British Pound', '£', 2, 'fiat', true, 'GB', 'Europe'),
    ('JPY', 'Japanese Yen', '¥', 0, 'fiat', true, 'JP', 'Asia'),
    ('CAD', 'Canadian Dollar', 'C$', 2, 'fiat', true, 'CA', 'Americas'),
    ('AUD', 'Australian Dollar', 'A$', 2, 'fiat', true, 'AU', 'Oceania'),
    ('NOK', 'Norwegian Krone', 'kr', 2, 'fiat', true, 'NO', 'Europe'),
    
    -- Major Cryptocurrencies  
    ('BTC', 'Bitcoin', '₿', 8, 'crypto', true, NULL, NULL),
    ('ETH', 'Ethereum', 'Ξ', 18, 'crypto', true, NULL, NULL),
    ('SOL', 'Solana', 'SOL', 9, 'crypto', true, NULL, NULL),
    ('USDC', 'USD Coin', 'USDC', 6, 'crypto', true, NULL, NULL),
    ('USDT', 'Tether', 'USDT', 6, 'crypto', true, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- Insert default transaction categories
INSERT INTO public.transaction_categories (name, icon, color, description, is_default) VALUES
    ('Shopping', '🛍️', '#FF6B6B', 'Retail purchases and online shopping', true),
    ('Food & Dining', '🍕', '#4ECDC4', 'Restaurants, groceries, and food delivery', true),
    ('Transportation', '🚗', '#45B7D1', 'Gas, public transit, rideshare, and travel', true),
    ('Entertainment', '🎮', '#96CEB4', 'Movies, games, streaming services', true),
    ('Bills & Utilities', '⚡', '#FFEAA7', 'Electricity, water, internet, phone bills', true),
    ('Health & Fitness', '💊', '#DDA0DD', 'Medical, pharmacy, gym memberships', true),
    ('Education', '📚', '#98D8C8', 'Books, courses, tuition, and learning', true),
    ('Crypto', '₿', '#F7931A', 'Cryptocurrency purchases and trades', true),
    ('Transfer', '💸', '#74B9FF', 'Money transfers and P2P payments', true),
    ('Other', '📝', '#A29BFE', 'Miscellaneous expenses', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default feature flags
INSERT INTO public.feature_flags (name, description, is_enabled) VALUES
    ('virtual_cards_enabled', 'Enable virtual card creation and management', true),
    ('crypto_wallets_enabled', 'Enable cryptocurrency wallet features', true),
    ('multi_chain_support', 'Enable multi-chain wallet support (ETH/SOL/BTC)', true),
    ('cross_platform_transfers', 'Enable transfers between cards and wallets', true),
    ('risk_scoring_enabled', 'Enable real-time risk scoring for transactions', true),
    ('pin_protection_enabled', 'Enable PIN protection for card operations', true),
    ('audit_logging_enabled', 'Enable comprehensive audit logging', true),
    ('multi_currency', 'Enable multi-currency support across the platform', true),
    ('currency_conversion', 'Enable currency conversion features', true),
    ('real_time_rates', 'Enable real-time exchange rate updates', true),
    ('notifications_enabled', 'Enable push notifications system', true),
    ('analytics_enabled', 'Enable spending insights and analytics', true)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- SECURITY FUNCTIONS
-- ================================================================

-- Secure PIN verification for cards
CREATE OR REPLACE FUNCTION verify_card_pin(card_uuid UUID, pin_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_hash TEXT;
    current_attempts INTEGER;
    locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current PIN data
    SELECT pin_hash, pin_attempts, pin_locked_until
    INTO stored_hash, current_attempts, locked_until
    FROM public.virtual_cards
    WHERE id = card_uuid AND user_id = (SELECT auth.uid());
    
    -- Check if card exists and belongs to user
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if card is locked
    IF locked_until IS NOT NULL AND locked_until > NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Check if too many attempts
    IF current_attempts >= 3 THEN
        -- Lock for 15 minutes
        UPDATE public.virtual_cards
        SET pin_locked_until = NOW() + INTERVAL '15 minutes'
        WHERE id = card_uuid;
        RETURN FALSE;
    END IF;
    
    -- Verify PIN
    IF stored_hash IS NOT NULL AND crypt(pin_input, stored_hash) = stored_hash THEN
        -- Reset attempts on successful verification
        UPDATE public.virtual_cards
        SET pin_attempts = 0, pin_locked_until = NULL
        WHERE id = card_uuid;
        RETURN TRUE;
    ELSE
        -- Increment failed attempts
        UPDATE public.virtual_cards
        SET pin_attempts = pin_attempts + 1
        WHERE id = card_uuid;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_card_pin TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;

-- ================================================================
-- REALTIME SUBSCRIPTIONS
-- ================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_holdings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.multi_currency_balances;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- Log successful schema creation
DO $$
BEGIN
    RAISE NOTICE 'CELORA Unified Schema v2 deployed successfully - %', NOW();
    RAISE NOTICE 'Schema created with:';
    RAISE NOTICE '- Unified wallet model (matches API expectations)';
    RAISE NOTICE '- Single transactions table (no separate wallet_transactions)'; 
    RAISE NOTICE '- Audit_log table (with audit_logs view for compatibility)';
    RAISE NOTICE '- Optimized RLS policies for performance';
    RAISE NOTICE '- Complete indexing for production scale';
    RAISE NOTICE '- Multi-currency and crypto support';
    RAISE NOTICE '- Security functions and triggers';
    RAISE NOTICE '- Ready for production deployment';
END $$;

-- ================================================================
-- END OF UNIFIED SCHEMA v2
-- ================================================================