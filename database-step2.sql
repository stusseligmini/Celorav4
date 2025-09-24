-- STEP 2: Create main tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  wallet_type account_type DEFAULT 'email',
  public_email TEXT,
  phone TEXT,
  avatar_url TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_name TEXT NOT NULL DEFAULT 'Main Wallet',
  wallet_type TEXT NOT NULL DEFAULT 'seed_phrase',
  balance DECIMAL(20, 8) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS virtual_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  card_number TEXT NOT NULL UNIQUE,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  cvv TEXT NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  spending_limit DECIMAL(10, 2) DEFAULT 1000.00,
  status card_status DEFAULT 'active',
  is_frozen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);