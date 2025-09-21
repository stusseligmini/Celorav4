# Migrations (Wallet & Cross-Platform Integration)

## Overview
This directory contains idempotent SQL migrations for the wallet + security + cross-platform transaction integration.

| File | Purpose |
|------|---------|
| `001_initial_wallet.sql` | Core tables + triggers + indexes + column add for `virtual_cards` |
| `VERIFY.sql` | Simple post-apply verification queries |

## Applying (Manual via psql)
```bash
psql "$DATABASE_URL" -f packages/infrastructure/src/migrations/001_initial_wallet.sql
psql "$DATABASE_URL" -f packages/infrastructure/src/migrations/VERIFY.sql
```

## Applying (Supabase CLI)
If using Supabase locally:
```bash
supabase db remote commit   # optional baseline sync
supabase db push            # if integrated into supabase/migrations
```

## Idempotency
- `CREATE TABLE IF NOT EXISTS` ensures safe re-run.
- Column addition guarded by `information_schema` check.
- Indexes created with `IF NOT EXISTS`.
- Triggers recreated safely (uses CREATE OR REPLACE FUNCTION + unconditional trigger creation — re-running is harmless).

## Rollback Strategy (Manual)
Because data might be inserted after deployment, destructive rollback is not automated. If absolutely needed:
```sql
DROP TABLE IF EXISTS cross_platform_transactions CASCADE;
DROP TABLE IF EXISTS wallet_operations CASCADE;
DROP TABLE IF EXISTS user_security CASCADE;
DROP TABLE IF EXISTS crypto_wallets CASCADE;
ALTER TABLE virtual_cards DROP COLUMN IF EXISTS encrypted_payload;
```
Use only in non-production or coordinated maintenance windows.

## Verification Checklist
- All four new tables exist.
- `virtual_cards.encrypted_payload` column exists.
- Triggers update `updated_at` when rows change.
- RLS to be added in a follow-up migration if required here (or managed via Supabase dashboard).

## Next Steps
1. Add migration runner script (Node) for CI automation.
2. Add RLS policy migration file (002_rls_policies.sql) if managing via code.
3. Extend schema for blockchain operation metadata (nonce, fee estimates, etc.) when Solana integration is added.
