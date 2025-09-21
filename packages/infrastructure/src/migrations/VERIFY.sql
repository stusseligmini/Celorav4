-- VERIFY.sql
-- Lightweight verification queries to ensure schema presence

SELECT 'crypto_wallets' AS table, COUNT(*) AS rows FROM crypto_wallets;
SELECT 'user_security' AS table, COUNT(*) AS rows FROM user_security;
SELECT 'wallet_operations' AS table, COUNT(*) AS rows FROM wallet_operations;
SELECT 'cross_platform_transactions' AS table, COUNT(*) AS rows FROM cross_platform_transactions;

-- Column existence checks (should return rows = number of columns found)
SELECT COUNT(*) AS virtual_cards_encrypted_payload_exists FROM information_schema.columns 
 WHERE table_name='virtual_cards' AND column_name='encrypted_payload';
