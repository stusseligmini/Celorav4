-- ================================================================
-- MIGRATION: Add networks table and foreign key constraint
-- Date: October 9, 2025
-- Purpose: Create proper networks reference table for wallets
-- ================================================================

BEGIN;

-- Step 1: Create networks table
CREATE TABLE IF NOT EXISTS public.networks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    chain_id TEXT,
    native_currency TEXT NOT NULL,
    rpc_url TEXT,
    wss_url TEXT,
    explorer_url TEXT,
    is_testnet BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    decimals INTEGER DEFAULT 18,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies
DROP POLICY IF EXISTS "Anyone can view networks" ON public.networks;
CREATE POLICY "Anyone can view networks" ON public.networks
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Only admins can modify networks" ON public.networks;
CREATE POLICY "Only admins can modify networks" ON public.networks
    FOR ALL USING (false);

-- Step 4: Insert network data
INSERT INTO public.networks (code, name, chain_id, native_currency, rpc_url, wss_url, explorer_url, is_testnet, is_active, decimals, description) VALUES
    ('solana', 'Solana', NULL, 'SOL', 
     'https://api.mainnet-beta.solana.com', 
     'wss://api.mainnet-beta.solana.com',
     'https://solscan.io', 
     false, true, 9, 
     'High-performance blockchain for DeFi, NFTs, and Web3 applications'),
    
    ('ethereum', 'Ethereum', '1', 'ETH', 
     'https://eth-mainnet.g.alchemy.com/v2', 
     'wss://eth-mainnet.g.alchemy.com/v2',
     'https://etherscan.io', 
     false, true, 18, 
     'Leading smart contract platform and decentralized ecosystem'),
    
    ('bitcoin', 'Bitcoin', NULL, 'BTC', 
     'https://blockstream.info/api', 
     NULL,
     'https://blockstream.info', 
     false, true, 8, 
     'Original cryptocurrency and store of value'),
    
    ('polygon', 'Polygon', '137', 'MATIC', 
     'https://polygon-rpc.com', 
     'wss://polygon-rpc.com',
     'https://polygonscan.com', 
     false, true, 18, 
     'Ethereum Layer 2 scaling solution with low fees'),
    
    ('fiat', 'Fiat Currency', NULL, 'USD', 
     NULL, 
     NULL,
     NULL, 
     false, true, 2, 
     'Traditional fiat currency wallets (USD, EUR, etc.)'),
    
    ('solana-devnet', 'Solana Devnet', NULL, 'SOL', 
     'https://api.devnet.solana.com', 
     'wss://api.devnet.solana.com',
     'https://solscan.io/?cluster=devnet', 
     true, true, 9, 
     'Solana development and testing network'),
    
    ('ethereum-sepolia', 'Ethereum Sepolia', '11155111', 'ETH', 
     'https://eth-sepolia.g.alchemy.com/v2', 
     'wss://eth-sepolia.g.alchemy.com/v2',
     'https://sepolia.etherscan.io', 
     true, true, 18, 
     'Ethereum Sepolia testnet for development'),
    
    ('polygon-mumbai', 'Polygon Mumbai', '80001', 'MATIC', 
     'https://rpc-mumbai.maticvigil.com', 
     'wss://rpc-mumbai.maticvigil.com',
     'https://mumbai.polygonscan.com', 
     true, true, 18, 
     'Polygon Mumbai testnet for development')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    chain_id = EXCLUDED.chain_id,
    native_currency = EXCLUDED.native_currency,
    rpc_url = EXCLUDED.rpc_url,
    wss_url = EXCLUDED.wss_url,
    explorer_url = EXCLUDED.explorer_url,
    is_testnet = EXCLUDED.is_testnet,
    is_active = EXCLUDED.is_active,
    decimals = EXCLUDED.decimals,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_networks_code ON public.networks(code);
CREATE INDEX IF NOT EXISTS idx_networks_is_active ON public.networks(is_active);
CREATE INDEX IF NOT EXISTS idx_networks_is_testnet ON public.networks(is_testnet);

-- Step 6: Clean up invalid wallet network values
UPDATE public.wallets 
SET network = 'fiat' 
WHERE network IS NOT NULL 
  AND network NOT IN ('solana', 'ethereum', 'bitcoin', 'polygon', 'fiat', 'solana-devnet', 'ethereum-sepolia', 'polygon-mumbai');

-- Step 7: Add foreign key constraint
ALTER TABLE public.wallets 
    DROP CONSTRAINT IF EXISTS wallets_network_fk;

ALTER TABLE public.wallets 
    ADD CONSTRAINT wallets_network_fk 
    FOREIGN KEY (network) 
    REFERENCES public.networks(code) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;

-- Step 8: Create index on wallets.network
CREATE INDEX IF NOT EXISTS idx_wallets_network ON public.wallets(network);

-- Step 9: Create helper functions
CREATE OR REPLACE FUNCTION public.get_network_info(network_code TEXT)
RETURNS TABLE (
    name TEXT,
    chain_id TEXT,
    native_currency TEXT,
    explorer_url TEXT,
    decimals INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.name,
        n.chain_id,
        n.native_currency,
        n.explorer_url,
        n.decimals
    FROM public.networks n
    WHERE n.code = network_code AND n.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.is_network_supported(network_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.networks 
        WHERE code = network_code AND is_active = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 10: Add comments
COMMENT ON TABLE public.networks IS 'Supported blockchain networks for wallet creation';
COMMENT ON COLUMN public.networks.code IS 'Unique network identifier used as foreign key';
COMMENT ON COLUMN public.networks.chain_id IS 'EVM chain ID (null for non-EVM chains)';
COMMENT ON COLUMN public.networks.is_testnet IS 'True if this is a testnet/devnet environment';

COMMIT;

-- Verify migration
DO $$
DECLARE
    network_count INTEGER;
    fk_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO network_count FROM public.networks;
    RAISE NOTICE 'Networks table has % rows', network_count;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'wallets_network_fk'
    ) INTO fk_exists;
    
    IF fk_exists THEN
        RAISE NOTICE '✅ Foreign key wallets_network_fk created successfully';
    ELSE
        RAISE WARNING '⚠️ Foreign key wallets_network_fk was not created';
    END IF;
END $$;
