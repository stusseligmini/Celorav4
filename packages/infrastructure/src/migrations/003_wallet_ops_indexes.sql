-- 003_wallet_ops_indexes.sql
-- Add partial unique index to prevent duplicate transaction hashes
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_operations_txhash
  ON wallet_operations(transaction_hash)
  WHERE transaction_hash IS NOT NULL;
