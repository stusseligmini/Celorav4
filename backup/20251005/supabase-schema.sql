-- Celora Supabase Database Schema - Enhanced Cyberpunk Fintech Platform
-- Run this in your Supabase SQL editor to set up tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Users table (Supabase auth.users is used, this extends it)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  kyc_status TEXT CHECK (kyc_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  two_factor_enabled BOOLEAN DEFAULT false,
  preferred_currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for profiles - users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Virtual Cards table - Enhanced
CREATE TABLE public.virtual_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  masked_pan TEXT NOT NULL DEFAULT '**** **** **** ****',
  encrypted_payload TEXT NOT NULL DEFAULT '',
  card_type TEXT CHECK (card_type IN ('virtual', 'physical')) DEFAULT 'virtual',
  balance NUMERIC(15,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  spending_limit NUMERIC(15,2) DEFAULT 1000.00,
  daily_limit NUMERIC(15,2) DEFAULT 500.00,
  status TEXT CHECK (status IN ('active', 'suspended', 'closed', 'pending')) DEFAULT 'active',
  pin_hash TEXT,
  is_primary BOOLEAN DEFAULT false,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  fraud_score NUMERIC(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on virtual_cards
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;

-- Policies for virtual_cards
CREATE POLICY "Users can view own cards" ON public.virtual_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON public.virtual_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON public.virtual_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Transactions table for card activity - Enhanced
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  card_id UUID REFERENCES public.virtual_cards,
  wallet_id UUID REFERENCES public.wallets,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'transfer', 'deposit', 'withdrawal', 'refund', 'fee', 'crypto_swap', 'topup')) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  fee_amount NUMERIC(15,2) DEFAULT 0.00,
  exchange_rate NUMERIC(15,8),
  description TEXT,
  merchant_name TEXT,
  merchant_category TEXT,
  reference_id TEXT UNIQUE,
  external_id TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'processing')) DEFAULT 'pending',
  risk_score NUMERIC(3,2) DEFAULT 0.0,
  location_data JSONB,
  metadata JSONB DEFAULT '{}',
  merchant_category TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  external_transaction_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets table - Enhanced for Multi-Chain Support
CREATE TABLE public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Wallet',
  wallet_type TEXT CHECK (wallet_type IN ('fiat', 'crypto', 'hybrid')) DEFAULT 'hybrid',
  address TEXT NOT NULL,
  blockchain TEXT CHECK (blockchain IN ('solana', 'ethereum', 'bitcoin', 'polygon', 'fiat')) NOT NULL,
  balance NUMERIC(25,8) DEFAULT 0.0,
  usd_balance NUMERIC(15,2) DEFAULT 0.0,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  private_key_encrypted TEXT,
  public_key TEXT,
  derivation_path TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Policies for wallets
CREATE POLICY "Users can view own wallets" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_virtual_cards_user_id ON public.virtual_cards(user_id);
CREATE INDEX idx_virtual_cards_status ON public.virtual_cards(status);
CREATE INDEX idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

-- NEW: Real-time Market Data
CREATE TABLE public.market_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  price_usd NUMERIC(15,8) NOT NULL,
  price_change_24h NUMERIC(10,4),
  market_cap NUMERIC(20,2),
  volume_24h NUMERIC(20,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NEW: Transaction Categories for Smart Insights
CREATE TABLE public.transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NEW: User Security Events
CREATE TABLE public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NEW: Crypto Portfolio Tracking
CREATE TABLE public.crypto_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  wallet_id UUID REFERENCES public.wallets,
  symbol TEXT NOT NULL,
  amount NUMERIC(25,8) NOT NULL,
  average_buy_price NUMERIC(15,8),
  current_price NUMERIC(15,8),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NEW: Real-time Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
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

-- NEW: Transaction Insights & Analytics
CREATE TABLE public.spending_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  category TEXT,
  total_spent NUMERIC(15,2),
  transaction_count INTEGER,
  average_amount NUMERIC(15,2),
  trend_percentage NUMERIC(5,2),
  insights JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_virtual_cards_user_id ON public.virtual_cards(user_id);
CREATE INDEX idx_virtual_cards_status ON public.virtual_cards(status);
CREATE INDEX idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_blockchain ON public.wallets(blockchain);
CREATE INDEX idx_market_data_symbol ON public.market_data(symbol);
CREATE INDEX idx_market_data_updated ON public.market_data(last_updated DESC);
CREATE INDEX idx_crypto_holdings_user_id ON public.crypto_holdings(user_id);
CREATE INDEX idx_crypto_holdings_symbol ON public.crypto_holdings(symbol);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_spending_insights_user_id ON public.spending_insights(user_id);
CREATE INDEX idx_spending_insights_period ON public.spending_insights(period_start, period_end);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_virtual_cards
  BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security Policies for new tables
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_insights ENABLE ROW LEVEL SECURITY;

-- Market data is public read-only
CREATE POLICY "Market data is public" ON public.market_data
  FOR SELECT TO authenticated USING (true);

-- Transaction categories are public read-only
CREATE POLICY "Transaction categories are public" ON public.transaction_categories
  FOR SELECT TO authenticated USING (true);

-- Security events - users can only see their own
CREATE POLICY "Users can view own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own security events" ON public.security_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Crypto holdings - users can only see their own
CREATE POLICY "Users can view own crypto holdings" ON public.crypto_holdings
  FOR ALL USING (auth.uid() = user_id);

-- Notifications - users can only see their own
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Spending insights - users can only see their own
CREATE POLICY "Users can view own spending insights" ON public.spending_insights
  FOR SELECT USING (auth.uid() = user_id);

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
('Other', '📝', '#A29BFE', 'Miscellaneous expenses', true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_holdings;