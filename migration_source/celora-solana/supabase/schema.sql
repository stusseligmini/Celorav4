-- SQL-skjema for Celora Platform
-- Dette kan brukes for å sette opp databasen i Supabase

-- Profiler-tabell for brukerinformasjon
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  nickname TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaksjoner-tabell for å lagre transaksjonsdata
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash TEXT UNIQUE NOT NULL,
  sender_address TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  token_symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'completed',
  metadata JSONB
);

-- Token-tabell for å lagre token-informasjon
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mint_address TEXT NOT NULL UNIQUE,
  decimals INTEGER NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opprett indekser for rask søk
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON public.transactions (sender_address);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON public.transactions (receiver_address);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON public.transactions (timestamp);

-- RLS (Row Level Security) for sikker tilgang
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Policies for profiles-tabellen
CREATE POLICY "Profiles kan ses av alle autentiserte brukere"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Brukere kan oppdatere sin egen profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = wallet_address);

-- Policies for transactions-tabellen
CREATE POLICY "Transaksjoner kan ses av avsender og mottaker"
  ON public.transactions FOR SELECT
  USING (auth.uid() IN (sender_address, receiver_address));

-- Policies for tokens-tabellen
CREATE POLICY "Tokens kan ses av alle"
  ON public.tokens FOR SELECT
  USING (true);

-- Seed data for tokens
INSERT INTO public.tokens (symbol, name, mint_address, decimals, logo_url)
VALUES
  ('SOL', 'Solana', 'So11111111111111111111111111111111111111112', 9, 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'),
  ('USDC', 'USD Coin', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 6, 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'),
  ('USDT', 'Tether USD', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 6, 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png')
ON CONFLICT (symbol) DO NOTHING;

-- Opprett en funksjon for å oppdatere timestamp ved oppdateringer
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Opprett trigger for å automatisk oppdatere updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();