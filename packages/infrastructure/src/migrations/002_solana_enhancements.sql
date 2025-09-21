-- 002_solana_enhancements.sql
-- Add Solana-specific augmentation columns and fee tracking.

ALTER TABLE crypto_wallets
  ADD COLUMN IF NOT EXISTS last_balance_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_known_slot BIGINT;

-- Solana-specific fee tracking (in addition to general fee column)
ALTER TABLE wallet_operations
  ADD COLUMN IF NOT EXISTS fee_lamports BIGINT;

-- Optional future index if sync lookups become frequent
-- CREATE INDEX IF NOT EXISTS idx_crypto_wallets_last_sync ON crypto_wallets(last_balance_sync_at);
