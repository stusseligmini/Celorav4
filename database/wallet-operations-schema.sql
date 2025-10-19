-- ================================================================
-- WALLET OPERATIONS SCHEMA (Standardized for 'wallets' table)
-- Created: October 18, 2025
-- Purpose: Additional wallet functionality using standard wallets table
-- ================================================================

-- User security table for PIN and lockout management
CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  hashed_pin TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_attempt TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet operations/transactions table (using standard wallets table)
CREATE TABLE IF NOT EXISTS public.wallet_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'stake', 'unstake', 'swap')),
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  to_address TEXT NULL,
  from_address TEXT NULL,
  transaction_hash TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-platform transaction linking (virtual cards + wallets)
CREATE TABLE IF NOT EXISTS public.cross_platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NULL REFERENCES public.virtual_cards(id),
  wallet_id UUID NULL REFERENCES public.wallets(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'cashout', 'conversion', 'payment')),
  amount DECIMAL(20,8) NOT NULL,
  source_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  exchange_rate DECIMAL(20,8) NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_user_security_user_id ON public.user_security(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_locked_until ON public.user_security(locked_until);

CREATE INDEX IF NOT EXISTS idx_wallet_operations_wallet_id ON public.wallet_operations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_status ON public.wallet_operations(status);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_created_at ON public.wallet_operations(created_at);

CREATE INDEX IF NOT EXISTS idx_cross_platform_user_id ON public.cross_platform_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_card_id ON public.cross_platform_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_wallet_id ON public.cross_platform_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_status ON public.cross_platform_transactions(status);

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_platform_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for user_security
CREATE POLICY "Users can view own security" ON public.user_security
  FOR ALL USING (auth.uid() = user_id);

-- Policies for wallet_operations
CREATE POLICY "Users can view own wallet operations" ON public.wallet_operations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.wallets w 
    WHERE w.id = wallet_operations.wallet_id 
    AND w.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own wallet operations" ON public.wallet_operations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.wallets w 
    WHERE w.id = wallet_operations.wallet_id 
    AND w.user_id = auth.uid()
  ));

-- Policies for cross_platform_transactions
CREATE POLICY "Users can view own cross-platform transactions" ON public.cross_platform_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cross-platform transactions" ON public.cross_platform_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ================================================================

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_security_updated_at 
  BEFORE UPDATE ON public.user_security 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_operations_updated_at 
  BEFORE UPDATE ON public.wallet_operations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cross_platform_updated_at 
  BEFORE UPDATE ON public.cross_platform_transactions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();