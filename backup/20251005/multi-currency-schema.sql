-- Multi-Currency System Database Schema
-- Adds comprehensive multi-currency support to Celora

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Market data table for cryptocurrencies
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(symbol, data_source)
);

-- Multi-currency wallet balances
CREATE TABLE IF NOT EXISTS public.multi_currency_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL,
  available_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  frozen_balance DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_balance DECIMAL(20,8) GENERATED ALWAYS AS (available_balance + frozen_balance) STORED,
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, wallet_id, currency)
);

-- Insert default supported currencies
INSERT INTO public.supported_currencies (code, name, symbol, decimals, type, is_active, country, region) VALUES
  -- Major Fiat Currencies
  ('USD', 'US Dollar', '$', 2, 'fiat', true, 'US', 'Americas'),
  ('EUR', 'Euro', '€', 2, 'fiat', true, NULL, 'Europe'),
  ('GBP', 'British Pound', '£', 2, 'fiat', true, 'GB', 'Europe'),
  ('JPY', 'Japanese Yen', '¥', 0, 'fiat', true, 'JP', 'Asia'),
  ('CAD', 'Canadian Dollar', 'C$', 2, 'fiat', true, 'CA', 'Americas'),
  ('AUD', 'Australian Dollar', 'A$', 2, 'fiat', true, 'AU', 'Oceania'),
  ('CHF', 'Swiss Franc', 'Fr', 2, 'fiat', true, 'CH', 'Europe'),
  ('CNY', 'Chinese Yuan', '¥', 2, 'fiat', true, 'CN', 'Asia'),
  ('SEK', 'Swedish Krona', 'kr', 2, 'fiat', true, 'SE', 'Europe'),
  ('NOK', 'Norwegian Krone', 'kr', 2, 'fiat', true, 'NO', 'Europe'),
  ('DKK', 'Danish Krone', 'kr', 2, 'fiat', true, 'DK', 'Europe'),
  ('PLN', 'Polish Zloty', 'zł', 2, 'fiat', true, 'PL', 'Europe'),
  ('CZK', 'Czech Koruna', 'Kč', 2, 'fiat', true, 'CZ', 'Europe'),
  ('HUF', 'Hungarian Forint', 'Ft', 0, 'fiat', true, 'HU', 'Europe'),
  ('RUB', 'Russian Ruble', '₽', 2, 'fiat', true, 'RU', 'Europe'),
  ('INR', 'Indian Rupee', '₹', 2, 'fiat', true, 'IN', 'Asia'),
  ('KRW', 'South Korean Won', '₩', 0, 'fiat', true, 'KR', 'Asia'),
  ('SGD', 'Singapore Dollar', 'S$', 2, 'fiat', true, 'SG', 'Asia'),
  ('HKD', 'Hong Kong Dollar', 'HK$', 2, 'fiat', true, 'HK', 'Asia'),
  ('MXN', 'Mexican Peso', '$', 2, 'fiat', true, 'MX', 'Americas'),
  ('BRL', 'Brazilian Real', 'R$', 2, 'fiat', true, 'BR', 'Americas'),
  
  -- Major Cryptocurrencies
  ('BTC', 'Bitcoin', '₿', 8, 'crypto', true, NULL, NULL),
  ('ETH', 'Ethereum', 'Ξ', 18, 'crypto', true, NULL, NULL),
  ('USDC', 'USD Coin', 'USDC', 6, 'crypto', true, NULL, NULL),
  ('USDT', 'Tether', 'USDT', 6, 'crypto', true, NULL, NULL),
  ('BNB', 'Binance Coin', 'BNB', 18, 'crypto', true, NULL, NULL),
  ('ADA', 'Cardano', 'ADA', 6, 'crypto', true, NULL, NULL),
  ('SOL', 'Solana', 'SOL', 9, 'crypto', true, NULL, NULL),
  ('MATIC', 'Polygon', 'MATIC', 18, 'crypto', true, NULL, NULL),
  ('DOT', 'Polkadot', 'DOT', 10, 'crypto', true, NULL, NULL),
  ('AVAX', 'Avalanche', 'AVAX', 18, 'crypto', true, NULL, NULL),
  ('LINK', 'Chainlink', 'LINK', 18, 'crypto', true, NULL, NULL),
  ('UNI', 'Uniswap', 'UNI', 18, 'crypto', true, NULL, NULL),
  ('LTC', 'Litecoin', 'LTC', 8, 'crypto', true, NULL, NULL),
  ('BCH', 'Bitcoin Cash', 'BCH', 8, 'crypto', true, NULL, NULL),
  ('XRP', 'Ripple', 'XRP', 6, 'crypto', true, NULL, NULL),
  ('DOGE', 'Dogecoin', 'DOGE', 8, 'crypto', true, NULL, NULL),
  ('SHIB', 'Shiba Inu', 'SHIB', 18, 'crypto', true, NULL, NULL),
  ('ATOM', 'Cosmos', 'ATOM', 6, 'crypto', true, NULL, NULL),
  ('FTM', 'Fantom', 'FTM', 18, 'crypto', true, NULL, NULL),
  ('ALGO', 'Algorand', 'ALGO', 6, 'crypto', true, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- Insert some sample exchange rates (these would normally be updated by external APIs)
INSERT INTO public.exchange_rates (base_currency, target_currency, rate, source) VALUES
  -- USD base rates
  ('USD', 'EUR', 0.85, 'forex'),
  ('USD', 'GBP', 0.73, 'forex'),
  ('USD', 'JPY', 110.0, 'forex'),
  ('USD', 'CAD', 1.25, 'forex'),
  ('USD', 'AUD', 1.35, 'forex'),
  ('USD', 'CHF', 0.92, 'forex'),
  ('USD', 'CNY', 6.45, 'forex'),
  
  -- Crypto rates (sample)
  ('USD', 'BTC', 0.000025, 'binance'),
  ('USD', 'ETH', 0.0005, 'binance'),
  ('USD', 'USDC', 1.0, 'binance'),
  ('USD', 'USDT', 1.0, 'binance'),
  ('BTC', 'ETH', 20.0, 'binance'),
  ('ETH', 'USDC', 2000.0, 'binance')
ON CONFLICT (base_currency, target_currency, source) DO NOTHING;

-- Add feature flags for multi-currency system
INSERT INTO public.feature_flags (name, description, is_enabled, created_at, last_updated) VALUES
  ('multi_currency', 'Enable multi-currency support across the platform', true, NOW(), NOW()),
  ('currency_conversion', 'Enable currency conversion features', true, NOW(), NOW()),
  ('crypto_currencies', 'Enable cryptocurrency support', true, NOW(), NOW()),
  ('real_time_rates', 'Enable real-time exchange rate updates', true, NOW(), NOW()),
  ('exchange_rate_updates', 'Enable automatic exchange rate updates', true, NOW(), NOW()),
  ('currency_auto_convert', 'Allow automatic currency conversion for users', false, NOW(), NOW()),
  ('multi_currency_wallets', 'Enable wallets to hold multiple currencies', true, NOW(), NOW()),
  ('currency_trading', 'Enable currency trading features', false, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  last_updated = NOW();

-- Create indexes for better performance
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

-- Row Level Security policies
ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_currency_balances ENABLE ROW LEVEL SECURITY;

-- Supported currencies - read-only for all authenticated users
CREATE POLICY "supported_currencies_select" ON public.supported_currencies 
  FOR SELECT TO authenticated USING (true);

-- Exchange rates - read-only for all authenticated users  
CREATE POLICY "exchange_rates_select" ON public.exchange_rates 
  FOR SELECT TO authenticated USING (true);

-- Currency preferences - users can only access their own
CREATE POLICY "currency_preferences_select" ON public.currency_preferences 
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "currency_preferences_insert" ON public.currency_preferences 
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "currency_preferences_update" ON public.currency_preferences 
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- Currency conversions - users can only access their own
CREATE POLICY "currency_conversions_select" ON public.currency_conversions 
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "currency_conversions_insert" ON public.currency_conversions 
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "currency_conversions_update" ON public.currency_conversions 
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- Crypto market data - read-only for all authenticated users
CREATE POLICY "crypto_market_data_select" ON public.crypto_market_data 
  FOR SELECT TO authenticated USING (true);

-- Multi-currency balances - users can only access their own
CREATE POLICY "multi_currency_balances_select" ON public.multi_currency_balances 
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "multi_currency_balances_insert" ON public.multi_currency_balances 
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "multi_currency_balances_update" ON public.multi_currency_balances 
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- Triggers for updating timestamps
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