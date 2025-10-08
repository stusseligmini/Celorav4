-- Celora Database Schema for Supabase
-- This file contains all the necessary tables and policies for the Celora platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE card_status AS ENUM ('active', 'suspended', 'closed');
CREATE TYPE transaction_type AS ENUM ('purchase', 'refund', 'fee', 'topup', 'withdrawal', 'transfer', 'conversion');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'posted');

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supported currencies table
CREATE TABLE IF NOT EXISTS public.supported_currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Exchange rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- User currency preferences table
CREATE TABLE IF NOT EXISTS public.currency_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  display_currencies TEXT[] DEFAULT ARRAY['USD', 'EUR', 'BTC', 'ETH'],
  auto_convert BOOLEAN NOT NULL DEFAULT false,
  preferred_exchange VARCHAR(50) DEFAULT 'binance',
  rounding_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Currency conversion history table
CREATE TABLE IF NOT EXISTS public.currency_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_amount DECIMAL(20,8) NOT NULL,
  from_currency VARCHAR(10) NOT NULL,
  to_amount DECIMAL(20,8) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,
  exchange_rate DECIMAL(20,10) NOT NULL,
  fee_amount DECIMAL(20,8) DEFAULT 0,
  fee_currency VARCHAR(10),
  source VARCHAR(50) NOT NULL,
  transaction_id UUID, -- Link to actual transaction if applicable
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crypto market data table
CREATE TABLE IF NOT EXISTS public.crypto_market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Multi-currency balances
CREATE TABLE IF NOT EXISTS public.multi_currency_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Virtual Cards table
CREATE TABLE IF NOT EXISTS public.virtual_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    masked_pan TEXT NOT NULL DEFAULT '**** **** **** ****',
    encrypted_payload TEXT, -- Encrypted card details (PAN, CVV, etc.)
    balance DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    spending_limit DECIMAL(10,2) DEFAULT 1000.00,
    status card_status DEFAULT 'active',
    pin_hash TEXT, -- Hashed PIN for card verification
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table (for crypto and multi-asset support)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance DECIMAL(15,8) DEFAULT 0.00000000,
    wallet_address TEXT, -- Crypto wallet address
    encrypted_private_key TEXT, -- Encrypted private key
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    card_id UUID REFERENCES public.virtual_cards(id),
    wallet_id UUID REFERENCES public.wallets(id),
    amount DECIMAL(15,8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_type transaction_type NOT NULL,
    transaction_status transaction_status DEFAULT 'pending',
    merchant_name TEXT,
    merchant_category TEXT,
    reference_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    actor_user_id UUID REFERENCES auth.users(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    before JSONB,
    after JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-platform bridge tracking
CREATE TABLE IF NOT EXISTS public.cross_platform_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    from_type TEXT NOT NULL, -- 'card' or 'wallet'
    from_id UUID NOT NULL,
    to_type TEXT NOT NULL, -- 'card' or 'wallet'
    to_id UUID NOT NULL,
    amount DECIMAL(15,8) NOT NULL,
    currency TEXT NOT NULL,
    status transaction_status DEFAULT 'pending',
    transaction_hash TEXT, -- For blockchain transactions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_id ON public.virtual_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_status ON public.virtual_cards(status);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON public.wallets(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_user_id ON public.cross_platform_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_base_target ON public.exchange_rates (base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated_at ON public.exchange_rates (updated_at);
CREATE INDEX IF NOT EXISTS idx_currency_preferences_user_id ON public.currency_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_user_id ON public.currency_conversions (user_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_status ON public.currency_conversions (status);
CREATE INDEX IF NOT EXISTS idx_multi_currency_balances_user_id ON public.multi_currency_balances (user_id);
CREATE INDEX IF NOT EXISTS idx_multi_currency_balances_currency ON public.multi_currency_balances (currency);
CREATE INDEX IF NOT EXISTS idx_crypto_market_data_symbol ON public.crypto_market_data (symbol);
CREATE INDEX IF NOT EXISTS idx_supported_currencies_type ON public.supported_currencies (type);
CREATE INDEX IF NOT EXISTS idx_supported_currencies_active ON public.supported_currencies (is_active);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_platform_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_currency_balances ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Virtual cards policies
CREATE POLICY "Users can view their own cards" ON public.virtual_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards" ON public.virtual_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON public.virtual_cards
    FOR UPDATE USING (auth.uid() = user_id);

-- Wallets policies
CREATE POLICY "Users can view their own wallets" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallets" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit log policies (read-only for users)
CREATE POLICY "Users can view their own audit logs" ON public.audit_log
    FOR SELECT USING (auth.uid() = actor_user_id);

-- Cross-platform transactions policies
CREATE POLICY "Users can view their own cross-platform transactions" ON public.cross_platform_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cross-platform transactions" ON public.cross_platform_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cross-platform transactions" ON public.cross_platform_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Feature flags policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view feature flags" ON public.feature_flags
    FOR SELECT USING (auth.role() = 'authenticated');

-- Supported currencies - read-only for all authenticated users
CREATE POLICY "supported_currencies_select" ON public.supported_currencies 
  FOR SELECT TO authenticated USING (true);

-- Exchange rates - read-only for all authenticated users  
CREATE POLICY "exchange_rates_select" ON public.exchange_rates 
  FOR SELECT TO authenticated USING (true);

-- Currency preferences - users can only access their own
CREATE POLICY "currency_preferences_select" ON public.currency_preferences 
  FOR SELECT TO authenticated USING ((auth.uid()) = user_id);
CREATE POLICY "currency_preferences_insert" ON public.currency_preferences 
  FOR INSERT TO authenticated WITH CHECK ((auth.uid()) = user_id);
CREATE POLICY "currency_preferences_update" ON public.currency_preferences 
  FOR UPDATE TO authenticated USING ((auth.uid()) = user_id);

-- Currency conversions - users can only access their own
CREATE POLICY "currency_conversions_select" ON public.currency_conversions 
  FOR SELECT TO authenticated USING ((auth.uid()) = user_id);
CREATE POLICY "currency_conversions_insert" ON public.currency_conversions 
  FOR INSERT TO authenticated WITH CHECK ((auth.uid()) = user_id);
CREATE POLICY "currency_conversions_update" ON public.currency_conversions 
  FOR UPDATE TO authenticated USING ((auth.uid()) = user_id);

-- Crypto market data - read-only for all authenticated users
CREATE POLICY "crypto_market_data_select" ON public.crypto_market_data 
  FOR SELECT TO authenticated USING (true);

-- Multi-currency balances - users can only access their own
CREATE POLICY "multi_currency_balances_select" ON public.multi_currency_balances 
  FOR SELECT TO authenticated USING ((auth.uid()) = user_id);
CREATE POLICY "multi_currency_balances_insert" ON public.multi_currency_balances 
  FOR INSERT TO authenticated WITH CHECK ((auth.uid()) = user_id);
CREATE POLICY "multi_currency_balances_update" ON public.multi_currency_balances 
  FOR UPDATE TO authenticated USING ((auth.uid()) = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_virtual_cards_updated_at BEFORE UPDATE ON public.virtual_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supported_currencies_updated_at BEFORE UPDATE ON public.supported_currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currency_preferences_updated_at BEFORE UPDATE ON public.currency_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currency_conversions_updated_at BEFORE UPDATE ON public.currency_conversions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crypto_market_data_updated_at BEFORE UPDATE ON public.crypto_market_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_currency_balances_updated_at BEFORE UPDATE ON public.multi_currency_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default feature flags
INSERT INTO public.feature_flags (name, description, is_enabled, last_updated) VALUES
    ('virtual_cards_enabled', 'Enable virtual card creation and management', true, NOW()),
    ('crypto_wallets_enabled', 'Enable cryptocurrency wallet features', true, NOW()),
    ('cross_platform_transfers', 'Enable transfers between cards and wallets', true, NOW()),
    ('risk_scoring_enabled', 'Enable real-time risk scoring for transactions', true, NOW()),
    ('pin_protection_enabled', 'Enable PIN protection for card operations', true, NOW()),
    ('audit_logging_enabled', 'Enable comprehensive audit logging', true, NOW()),
    ('multi_currency', 'Enable multi-currency support across the platform', true, NOW()),
    ('currency_conversion', 'Enable currency conversion features', true, NOW()),
    ('crypto_currencies', 'Enable cryptocurrency support', true, NOW()),
    ('real_time_rates', 'Enable real-time exchange rate updates', true, NOW()),
    ('exchange_rate_updates', 'Enable automatic exchange rate updates', true, NOW()),
    ('currency_auto_convert', 'Allow automatic currency conversion for users', false, NOW()),
    ('multi_currency_wallets', 'Enable wallets to hold multiple currencies', true, NOW()),
    ('currency_trading', 'Enable currency trading features', false, NOW())
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    last_updated = NOW();

-- Create a function for secure card PIN verification
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
    WHERE id = card_uuid AND user_id = auth.uid();
    
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

-- Insert default supported currencies
INSERT INTO public.supported_currencies (code, name, symbol, decimals, type, is_active, country, region) VALUES
  -- Major Fiat Currencies
  ('USD', 'US Dollar', '$', 2, 'fiat', true, 'US', 'Americas'),
  ('EUR', 'Euro', '€', 2, 'fiat', true, NULL, 'Europe'),
  ('GBP', 'British Pound', '£', 2, 'fiat', true, 'GB', 'Europe'),
  ('JPY', 'Japanese Yen', '¥', 0, 'fiat', true, 'JP', 'Asia'),
  ('CAD', 'Canadian Dollar', 'C$', 2, 'fiat', true, 'CA', 'Americas'),
  ('AUD', 'Australian Dollar', 'A$', 2, 'fiat', true, 'AU', 'Oceania'),
  
  -- Major Cryptocurrencies
  ('BTC', 'Bitcoin', '₿', 8, 'crypto', true, NULL, NULL),
  ('ETH', 'Ethereum', 'Ξ', 18, 'crypto', true, NULL, NULL),
  ('USDC', 'USD Coin', 'USDC', 6, 'crypto', true, NULL, NULL),
  ('USDT', 'Tether', 'USDT', 6, 'crypto', true, NULL, NULL)
ON CONFLICT (code) DO NOTHING;