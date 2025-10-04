-- Celora DB Hotfix (2025-10-04)
-- Purpose:
--  1) Enforce non-negative balance on virtual_cards
--  2) Enforce positive fee semantics for fee transactions
--  3) Ensure only one primary wallet per user
--  4) Tighten RLS policies from public -> authenticated on backup tables
--  5) Create helpful composite index for txn filtering (idempotent)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- 1) Prevent negative balances on virtual cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'prevent_negative_balance'
      AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.prevent_negative_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Balance cannot be negative';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_balance ON public.virtual_cards;
CREATE TRIGGER trg_prevent_negative_balance
  BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION public.prevent_negative_balance();

-- 2) Fee amount semantics: keep fees positive when transaction_type = 'fee'
--    This does not force fees on non-fee txns and remains backward compatible.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS chk_fee_positive_when_fee;
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_fee_positive_when_fee
  CHECK (
    transaction_type <> 'fee'::public.transaction_type
    OR fee IS NULL
    OR fee > 0
  );

-- 3) Ensure a single primary wallet per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wallet_primary_per_user
  ON public.wallets (user_id)
  WHERE is_primary = true;

-- 4) Tighten RLS policy roles (public -> authenticated) for backup tables
--    Note: These keep the existing USING/WITH CHECK predicates intact.
-- wallet_backups
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backups' AND policyname = 'Users can create their own backups';
  IF FOUND THEN
    ALTER POLICY "Users can create their own backups" ON public.wallet_backups TO authenticated;
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backups' AND policyname = 'Users can delete their own backups';
  IF FOUND THEN
    ALTER POLICY "Users can delete their own backups" ON public.wallet_backups TO authenticated;
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backups' AND policyname = 'Users can view their own backups';
  IF FOUND THEN
    ALTER POLICY "Users can view their own backups" ON public.wallet_backups TO authenticated;
  END IF;
END$$;

-- wallet_backup_schedules
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backup_schedules' AND policyname = 'Users can create their own backup schedules';
  IF FOUND THEN
    ALTER POLICY "Users can create their own backup schedules" ON public.wallet_backup_schedules TO authenticated;
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backup_schedules' AND policyname = 'Users can delete their own backup schedules';
  IF FOUND THEN
    ALTER POLICY "Users can delete their own backup schedules" ON public.wallet_backup_schedules TO authenticated;
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backup_schedules' AND policyname = 'Users can update their own backup schedules';
  IF FOUND THEN
    ALTER POLICY "Users can update their own backup schedules" ON public.wallet_backup_schedules TO authenticated;
  END IF;

  PERFORM 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_backup_schedules' AND policyname = 'Users can view their own backup schedules';
  IF FOUND THEN
    ALTER POLICY "Users can view their own backup schedules" ON public.wallet_backup_schedules TO authenticated;
  END IF;
END$$;

-- 5) Helpful composite index for combined filters (idempotent)
CREATE INDEX IF NOT EXISTS idx_transactions_user_status_created
  ON public.transactions(user_id, status, created_at DESC);

-- NOTE: Supabase Auth UI rate limits are configured in Dashboard (not via SQL).
-- Recommended changes:
--   - Increase "Rate limit for sending emails" from 2/h to at least 60/h in Production.
--   - Keep sign-in/sign-up at 30/5min unless you see 429s, then tune gradually.

-- NOTE: Deprecated extension pgjwt can be removed if unused:
--   DROP EXTENSION IF EXISTS pgjwt;
-- Only run after verifying no functions depend on it.

-- Storage RLS (template):
-- If you introduce user-upload buckets (e.g., 'avatars'), use policies like:
--
-- CREATE POLICY "Users read own files" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'avatars' AND owner = auth.uid());
--
-- CREATE POLICY "Users write own files" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
--
-- CREATE POLICY "Users update own files" ON storage.objects
--   FOR UPDATE TO authenticated
--   USING (bucket_id = 'avatars' AND owner = auth.uid())
--   WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
--
-- CREATE POLICY "Users delete own files" ON storage.objects
--   FOR DELETE TO authenticated
--   USING (bucket_id = 'avatars' AND owner = auth.uid());
