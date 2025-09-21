-- SQL-skjema for Celora Wallet Platform
-- Komplett wallet-løsning med egen nøkkelgenerering og RPC-integrasjon

-- Brukerprofiler med wallet-info
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Wallets-tabell for å lagre krypterte wallet-data
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_name TEXT NOT NULL DEFAULT 'Main Wallet',
  blockchain TEXT NOT NULL CHECK (blockchain IN ('solana', 'ethereum')),
  public_address TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL, -- Kryptert med brukerens master password
  encrypted_seed_phrase TEXT, -- Optional, for generated wallets
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('generated', 'imported')),
  derivation_path TEXT, -- For HD wallets
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(user_id, public_address)
);

-- RPC node konfigurasjon
CREATE TABLE IF NOT EXISTS public.rpc_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blockchain TEXT NOT NULL CHECK (blockchain IN ('solana', 'ethereum')),
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- Lower number = higher priority
  rate_limit INTEGER DEFAULT 100, -- Requests per minute
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaksjoner med multi-chain support
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  tx_hash TEXT UNIQUE NOT NULL,
  blockchain TEXT NOT NULL CHECK (blockchain IN ('solana', 'ethereum')),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT 'ETH',
  token_contract_address TEXT,
  fee DECIMAL,
  gas_used BIGINT,
  gas_price DECIMAL,
  block_number BIGINT,
  confirmations INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  transaction_type TEXT CHECK (transaction_type IN ('send', 'receive', 'swap', 'stake')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Token balances med multi-chain support
CREATE TABLE IF NOT EXISTS public.token_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  blockchain TEXT NOT NULL CHECK (blockchain IN ('solana', 'ethereum')),
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  token_contract_address TEXT,
  balance DECIMAL NOT NULL DEFAULT 0,
  usd_value DECIMAL,
  decimals INTEGER DEFAULT 18,
  logo_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_id, blockchain, token_symbol, token_contract_address)
);

-- Sikker lagring av krypterte master passwords (kun hasher)
CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  password_hash TEXT NOT NULL, -- Hashed master password for wallet encryption
  salt TEXT NOT NULL,
  encryption_key_hint TEXT, -- Hint for password recovery
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PWA installation tracking
CREATE TABLE IF NOT EXISTS public.pwa_installs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT, -- 'ios', 'android', 'desktop'
  user_agent TEXT,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indekser for ytelse
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON public.wallets (blockchain);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain ON public.transactions (blockchain);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON public.transactions (tx_hash);
CREATE INDEX IF NOT EXISTS idx_token_balances_wallet_id ON public.token_balances (wallet_id);
CREATE INDEX IF NOT EXISTS idx_token_balances_blockchain ON public.token_balances (blockchain);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpc_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_installs ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own wallets" ON public.wallets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own wallets" ON public.wallets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own wallets" ON public.wallets FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Anyone can view active RPC nodes" ON public.rpc_nodes FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own token balances" ON public.token_balances FOR SELECT USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own token balances" ON public.token_balances FOR ALL USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own security settings" ON public.user_security FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own security settings" ON public.user_security FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own PWA installs" ON public.pwa_installs FOR ALL USING (user_id = auth.uid());

-- Default RPC nodes
INSERT INTO public.rpc_nodes (blockchain, name, endpoint_url, priority) VALUES
  ('solana', 'QuickNode Mainnet', 'https://your-quicknode-solana-endpoint.com', 1),
  ('solana', 'Jito RPC', 'https://mainnet.block-engine.jito.wtf/api/v1/bundles', 2),
  ('ethereum', 'Infura Mainnet', 'https://mainnet.infura.io/v3/your-project-id', 1),
  ('ethereum', 'Alchemy Mainnet', 'https://eth-mainnet.alchemyapi.io/v2/your-api-key', 2)
ON CONFLICT DO NOTHING;

-- Opprett funksjoner
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_security_updated_at BEFORE UPDATE ON public.user_security FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();