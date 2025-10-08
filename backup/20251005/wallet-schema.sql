-- Enhanced database schema for CeloraV2 wallet integration
-- Adds crypto wallet and security tables to existing Supabase setup

-- Crypto wallets table
CREATE TABLE IF NOT EXISTS crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('solana', 'ethereum', 'bitcoin')),
  address TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  balance DECIMAL(20,8) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, address)
);

-- User security table for PIN and lockout management
CREATE TABLE IF NOT EXISTS user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  hashed_pin TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_attempt TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wallet operations/transactions table
CREATE TABLE IF NOT EXISTS wallet_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES crypto_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'stake', 'unstake', 'swap')),
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  to_address TEXT NULL,
  from_address TEXT NULL,
  transaction_hash TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cross-platform transaction linking (virtual cards + crypto wallets)
CREATE TABLE IF NOT EXISTS cross_platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NULL REFERENCES virtual_cards(id),
  wallet_id UUID NULL REFERENCES crypto_wallets(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'cashout', 'conversion', 'payment')),
  amount DECIMAL(20,8) NOT NULL,
  source_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  exchange_rate DECIMAL(20,8) NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced virtual_cards table (if modifications needed)
-- Adding encrypted_payload column for encrypted card data storage
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'virtual_cards' AND column_name = 'encrypted_payload'
  ) THEN
    ALTER TABLE virtual_cards ADD COLUMN encrypted_payload TEXT NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_address ON crypto_wallets(address);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_type ON crypto_wallets(type);

CREATE INDEX IF NOT EXISTS idx_user_security_user_id ON user_security(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_locked_until ON user_security(locked_until);

CREATE INDEX IF NOT EXISTS idx_wallet_operations_wallet_id ON wallet_operations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_status ON wallet_operations(status);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_created_at ON wallet_operations(created_at);

CREATE INDEX IF NOT EXISTS idx_cross_platform_user_id ON cross_platform_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_card_id ON cross_platform_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_wallet_id ON cross_platform_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_status ON cross_platform_transactions(status);

-- Row Level Security (RLS) policies
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_transactions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their own data)
CREATE POLICY "Users can view own wallets" ON crypto_wallets
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own wallets" ON crypto_wallets
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own wallets" ON crypto_wallets
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own security" ON user_security
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own wallet operations" ON wallet_operations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM crypto_wallets cw 
    WHERE cw.id = wallet_operations.wallet_id 
    AND cw.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert own wallet operations" ON wallet_operations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM crypto_wallets cw 
    WHERE cw.id = wallet_operations.wallet_id 
    AND cw.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can view own cross-platform transactions" ON cross_platform_transactions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own cross-platform transactions" ON cross_platform_transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_crypto_wallets_updated_at 
  BEFORE UPDATE ON crypto_wallets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_security_updated_at 
  BEFORE UPDATE ON user_security 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_operations_updated_at 
  BEFORE UPDATE ON wallet_operations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_platform_updated_at 
  BEFORE UPDATE ON cross_platform_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data types for reference (commented out)
/*
-- Example crypto wallet
INSERT INTO crypto_wallets (user_id, type, address, encrypted_private_key, balance) VALUES
('123e4567-e89b-12d3-a456-426614174000', 'solana', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', '{"data":"encrypted_key_data","iv":"iv_data","tag":"tag_data"}', 100.50);

-- Example user security
INSERT INTO user_security (user_id, hashed_pin, salt, failed_attempts) VALUES
('123e4567-e89b-12d3-a456-426614174000', 'hashed_pin_value', 'salt_value', 0);

-- Example wallet operation
INSERT INTO wallet_operations (wallet_id, type, amount, currency, to_address, status) VALUES
('wallet_uuid_here', 'send', 50.25, 'SOL', '5fNfvyp5czQVX77yoACa3JJVEhdRaWjPuazuWgjhXqFX', 'confirmed');
*/