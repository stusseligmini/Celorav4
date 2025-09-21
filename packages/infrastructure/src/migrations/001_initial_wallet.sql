-- 001_initial_wallet.sql
-- Idempotent creation of wallet-related tables

-- crypto_wallets
CREATE TABLE IF NOT EXISTS crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('solana','ethereum','bitcoin')),
  address TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  balance NUMERIC(20,8) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, address)
);

-- user_security
CREATE TABLE IF NOT EXISTS user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  hashed_pin TEXT NOT NULL,
  salt TEXT NOT NULL,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_attempt TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- wallet_operations
CREATE TABLE IF NOT EXISTS wallet_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES crypto_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('send','receive','stake','unstake','swap')),
  amount NUMERIC(20,8) NOT NULL,
  currency TEXT NOT NULL,
  to_address TEXT NULL,
  from_address TEXT NULL,
  transaction_hash TEXT NULL,
  fee NUMERIC(20,8) DEFAULT 0,
  fee_currency TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- cross_platform_transactions
CREATE TABLE IF NOT EXISTS cross_platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NULL REFERENCES virtual_cards(id),
  wallet_id UUID NULL REFERENCES crypto_wallets(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup','cashout','conversion','payment')),
  amount NUMERIC(20,8) NOT NULL,
  source_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  exchange_rate NUMERIC(20,8) NULL,
  fee NUMERIC(20,8) DEFAULT 0,
  fee_currency TEXT DEFAULT NULL,
  provider_ref TEXT NULL,
  failure_reason TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add encrypted_payload to virtual_cards if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='virtual_cards' AND column_name='encrypted_payload'
  ) THEN
    ALTER TABLE virtual_cards ADD COLUMN encrypted_payload TEXT NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_address ON crypto_wallets(address);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_type ON crypto_wallets(type);
CREATE INDEX IF NOT EXISTS idx_user_security_user_id ON user_security(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_wallet_id ON wallet_operations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_operations_status ON wallet_operations(status);
CREATE INDEX IF NOT EXISTS idx_cross_platform_user_id ON cross_platform_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_card_id ON cross_platform_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_wallet_id ON cross_platform_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_status ON cross_platform_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cross_platform_provider_ref ON cross_platform_transactions(provider_ref) WHERE provider_ref IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ language 'plpgsql';

CREATE TRIGGER trg_crypto_wallets_updated
  BEFORE UPDATE ON crypto_wallets FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_security_updated
  BEFORE UPDATE ON user_security FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_wallet_operations_updated
  BEFORE UPDATE ON wallet_operations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cross_platform_updated
  BEFORE UPDATE ON cross_platform_transactions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
