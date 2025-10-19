-- ================================================================
-- MASTER WALLETS TABLE - STANDARDIZED DEFINITION
-- Created: October 19, 2025
-- Purpose: Unified wallets table combining ALL API requirements
-- ================================================================

-- Drop any existing wallets table to ensure clean state
DROP TABLE IF EXISTS public.wallets CASCADE;

-- Master wallets table with ALL required fields from API analysis
CREATE TABLE public.wallets (
    -- Core identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Wallet naming (multiple API patterns)
    wallet_name TEXT NOT NULL DEFAULT 'My Wallet',
    name TEXT GENERATED ALWAYS AS (wallet_name) STORED, -- Legacy compatibility
    
    -- Wallet type (comprehensive enum)
    wallet_type TEXT NOT NULL CHECK (wallet_type IN (
        'personal', 'business', 'savings',           -- API /wallet route expects
        'ethereum', 'solana', 'bitcoin', 'fiat',     -- API /wallets route expects 
        'crypto', 'hybrid'                           -- supabase-schema expects
    )) DEFAULT 'personal',
    
    -- Address fields (multiple patterns)
    public_key TEXT, -- Primary address field for crypto wallets
    address TEXT GENERATED ALWAYS AS (public_key) STORED, -- Legacy compatibility
    wallet_address TEXT GENERATED ALWAYS AS (public_key) STORED, -- Legacy compatibility
    
    -- Private key storage
    encrypted_private_key TEXT,
    private_key_encrypted TEXT GENERATED ALWAYS AS (encrypted_private_key) STORED, -- Legacy compatibility
    encrypted_mnemonic TEXT,
    
    -- Network and blockchain
    network TEXT NOT NULL DEFAULT 'mainnet',
    blockchain TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN wallet_type IN ('ethereum') THEN 'ethereum'
            WHEN wallet_type IN ('solana') THEN 'solana'
            WHEN wallet_type IN ('bitcoin') THEN 'bitcoin'
            WHEN wallet_type IN ('fiat') THEN 'fiat'
            ELSE 'fiat'
        END
    ) STORED,
    
    -- Currency and balance
    currency TEXT NOT NULL DEFAULT 'USD',
    balance DECIMAL(25,8) DEFAULT 0.00000000,
    usd_balance DECIMAL(15,2) DEFAULT 0.00,
    
    -- Wallet properties
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- HD wallet support
    derivation_path TEXT,
    
    -- Sync and timestamps
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_wallet_type ON public.wallets(wallet_type);
CREATE INDEX idx_wallets_network ON public.wallets(network);
CREATE INDEX idx_wallets_is_primary ON public.wallets(is_primary);
CREATE INDEX idx_wallets_public_key ON public.wallets(public_key);
CREATE INDEX idx_wallets_is_active ON public.wallets(is_active);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wallets
CREATE POLICY "Users can view own wallets" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own wallets
CREATE POLICY "Users can insert own wallets" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own wallets
CREATE POLICY "Users can update own wallets" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own wallets
CREATE POLICY "Users can delete own wallets" ON public.wallets
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.update_wallets_updated_at();

-- Function to ensure only one primary wallet per user
CREATE OR REPLACE FUNCTION public.ensure_single_primary_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a wallet as primary, unset all other primary wallets for this user
    IF NEW.is_primary = TRUE THEN
        UPDATE public.wallets 
        SET is_primary = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_primary = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single primary wallet
CREATE TRIGGER ensure_single_primary_wallet
    BEFORE INSERT OR UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_wallet();

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE public.wallets IS 'Master wallets table supporting all API patterns and requirements';
COMMENT ON COLUMN public.wallets.wallet_name IS 'Primary wallet name field - APIs expect this';
COMMENT ON COLUMN public.wallets.name IS 'Generated legacy compatibility field';
COMMENT ON COLUMN public.wallets.wallet_type IS 'Comprehensive wallet type supporting all API patterns';
COMMENT ON COLUMN public.wallets.public_key IS 'Primary address field for crypto wallets';
COMMENT ON COLUMN public.wallets.address IS 'Generated legacy compatibility field';
COMMENT ON COLUMN public.wallets.wallet_address IS 'Generated legacy compatibility field';
COMMENT ON COLUMN public.wallets.blockchain IS 'Generated field based on wallet_type for legacy compatibility';