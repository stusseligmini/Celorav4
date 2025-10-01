-- ========================================
-- CELORA WALLET BACKUP TILLEGG
-- Integreres med eksisterende Celora database
-- Kjør ETTER hovedsetup-skriptet
-- ========================================

-- Aktiver nødvendige utvidelser
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Start transaksjon for atomisk installasjon
BEGIN;

-- Schema versjonskontroll (bruker eksisterende struktur hvis den finnes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations' AND table_schema = 'public') THEN
        CREATE TABLE public.schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
    
    -- Registrerer denne migrasjonen
    INSERT INTO public.schema_migrations (version) 
    VALUES ('20240930_wallet_backup_system')
    ON CONFLICT (version) DO NOTHING;
END$$;

-- 1. Wallet Backup Tables

-- Table for storing wallet backups
CREATE TABLE IF NOT EXISTS public.wallet_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  wallet_count INTEGER NOT NULL,
  transaction_count INTEGER NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for backup schedules
CREATE TABLE IF NOT EXISTS public.wallet_backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  options JSONB,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_backup_schedules_user_id_key UNIQUE (user_id)
);

-- 2. INTEGRASJON MED EKSISTERENDE WALLETS-TABELL
-- Legger til nødvendige kolonner til eksisterende wallets-tabell for backup-støtte
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS backup_frequency TEXT DEFAULT 'weekly' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly', 'manual')),
ADD COLUMN IF NOT EXISTS last_backup_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_backup_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS backup_encryption_enabled BOOLEAN DEFAULT TRUE;

-- 3. INTEGRASJON MED EKSISTERENDE TRANSACTIONS-TABELL  
-- Legger til backup-relaterte metadata til eksisterende transactions-tabell
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS included_in_backup UUID REFERENCES wallet_backups(id),
ADD COLUMN IF NOT EXISTS backup_metadata JSONB DEFAULT '{}'::jsonb;

-- 4. YTELSES-INDEKSER FOR BACKUP-FUNKSJONER
-- Backup-spesifikke indekser
CREATE INDEX IF NOT EXISTS idx_wallet_backups_user_id ON public.wallet_backups (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_backups_created_at ON public.wallet_backups (created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_backup_schedules_user_id ON public.wallet_backup_schedules (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_backup_schedules_next_run ON public.wallet_backup_schedules (next_run);

-- Indekser på eksisterende tabeller for backup-ytelse
CREATE INDEX IF NOT EXISTS idx_wallets_user_backup_freq ON public.wallets(user_id, backup_frequency);
CREATE INDEX IF NOT EXISTS idx_wallets_last_backup ON public.wallets(last_backup_at);
CREATE INDEX IF NOT EXISTS idx_transactions_backup_ref ON public.transactions(included_in_backup);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at);

-- 5. AKTIVER ROW LEVEL SECURITY FOR BACKUP-TABELLER
ALTER TABLE public.wallet_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_backup_schedules ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for wallet backups
CREATE POLICY "Users can view their own backups" 
  ON public.wallet_backups FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backups" 
  ON public.wallet_backups FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backups" 
  ON public.wallet_backups FOR DELETE 
  USING (auth.uid() = user_id);

-- 7. Create RLS policies for backup schedules
CREATE POLICY "Users can view their own backup schedules" 
  ON public.wallet_backup_schedules FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backup schedules" 
  ON public.wallet_backup_schedules FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup schedules" 
  ON public.wallet_backup_schedules FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup schedules" 
  ON public.wallet_backup_schedules FOR DELETE 
  USING (auth.uid() = user_id);

-- 8. INGEN EKSTRA RLS-POLICYER NØDVENDIG
-- Eksisterende wallets- og transactions-tabeller har allerede RLS satt opp
-- i hovedsetup-skriptet, så vi trenger ikke å duplisere dem her

-- 9. BRUK EKSISTERENDE UPDATE-TRIGGER FUNKSJON
-- Funksjonen update_updated_at_column() eksisterer allerede fra hovedsetup-skriptet
-- så vi bruker den direkte uten å opprette den på nytt

-- 10. OPPRETT TRIGGERE FOR BACKUP-TABELLER
CREATE TRIGGER update_wallet_backups_updated_at 
  BEFORE UPDATE ON public.wallet_backups 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_backup_schedules_updated_at 
  BEFORE UPDATE ON public.wallet_backup_schedules 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. WALLET BACKUP FORRETNINGSLOGIKK-FUNKSJONER

-- Funksjon for å opprette ny wallet backup
CREATE OR REPLACE FUNCTION create_wallet_backup_v2(
  p_encrypted_data TEXT,
  p_wallet_count INTEGER,
  p_transaction_count INTEGER,
  p_size INTEGER,
  p_checksum TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
  v_backup_id UUID;
BEGIN
  -- Bruk innlogget bruker fra Supabase auth
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Opprett backup
  INSERT INTO public.wallet_backups (
    id, user_id, encrypted_data, wallet_count, 
    transaction_count, size, checksum, metadata
  )
  VALUES (
    uuid_generate_v4(), user_id, p_encrypted_data, p_wallet_count,
    p_transaction_count, p_size, p_checksum, p_metadata
  )
  RETURNING id INTO v_backup_id;
  
  -- Oppdater siste backup-tidspunkt på alle brukerens wallets
  UPDATE public.wallets
  SET last_backup_at = NOW()
  WHERE user_id = user_id;
  
  -- Logg i audit
  INSERT INTO public.audit_log (
    actor_user_id, action, entity_type, entity_id, metadata
  )
  VALUES (
    user_id, 'create_backup', 'wallet_backups', v_backup_id,
    jsonb_build_object('wallet_count', p_wallet_count, 'transaction_count', p_transaction_count)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'backup_id', v_backup_id,
    'wallet_count', p_wallet_count,
    'transaction_count', p_transaction_count,
    'size', p_size
  );
END;
$$;

-- Funksjon for å hente brukerens backups
CREATE OR REPLACE FUNCTION get_wallet_backups(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
  backup_data jsonb;
  total_count integer;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Hent antall totale backups
  SELECT COUNT(*) INTO total_count
  FROM wallet_backups
  WHERE user_id = user_id;
  
  -- Hent backup-data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', wb.id,
      'created_at', wb.created_at,
      'wallet_count', wb.wallet_count,
      'transaction_count', wb.transaction_count,
      'size', wb.size,
      'checksum', wb.checksum,
      'metadata', wb.metadata,
      'created_at', wb.created_at
    )
  ) INTO backup_data
  FROM wallet_backups wb
  WHERE wb.user_id = user_id
  ORDER BY wb.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
  
  RETURN jsonb_build_object(
    'success', true,
    'backups', COALESCE(backup_data, '[]'::jsonb),
    'total_count', total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Funksjon for å slette gamle backups
CREATE OR REPLACE FUNCTION cleanup_old_wallet_backups(
  p_keep_count INTEGER DEFAULT 5
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
  v_deleted_count INTEGER;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Slett gamle backups, behold kun de nyeste
  WITH backups_to_delete AS (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM wallet_backups
      WHERE user_id = user_id
    ) ranked
    WHERE ranked.rn > p_keep_count
  )
  DELETE FROM wallet_backups
  WHERE id IN (SELECT id FROM backups_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Logg cleanup
  INSERT INTO public.audit_log (
    actor_user_id, action, entity_type, metadata
  )
  VALUES (
    user_id, 'cleanup_backups', 'wallet_backups',
    jsonb_build_object('deleted_count', v_deleted_count, 'kept_count', p_keep_count)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'kept_count', p_keep_count
  );
END;
$$;

-- 12. AUTOMATISERTE BACKUP-FUNKSJONER
-- Funksjon for å konfigurere automatiske backups
CREATE OR REPLACE FUNCTION configure_wallet_auto_backup(
  p_frequency TEXT,
  p_options JSONB DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
  v_schedule_id uuid;
  next_backup_time timestamptz;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  IF p_frequency NOT IN ('daily', 'weekly', 'monthly') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid frequency');
  END IF;
  
  -- Beregn neste backup-tid
  next_backup_time := CASE
    WHEN p_frequency = 'daily' THEN NOW() + INTERVAL '1 day'
    WHEN p_frequency = 'weekly' THEN NOW() + INTERVAL '1 week'
    WHEN p_frequency = 'monthly' THEN NOW() + INTERVAL '1 month'
  END;
  
  -- Opprett eller oppdater schedule
  INSERT INTO public.wallet_backup_schedules (
    user_id, schedule, options, next_run, is_active
  )
  VALUES (
    user_id, p_frequency, p_options, next_backup_time, true
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    schedule = EXCLUDED.schedule,
    options = EXCLUDED.options,
    next_run = EXCLUDED.next_run,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_schedule_id;
  
  -- Oppdater wallet-innstillinger
  UPDATE public.wallets
  SET 
    backup_frequency = p_frequency,
    auto_backup_enabled = true
  WHERE user_id = user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'schedule_id', v_schedule_id,
    'frequency', p_frequency,
    'next_backup', next_backup_time
  );
END;
$$;

-- 13. TILGANGSKONTROLL
-- Gi tilgang til backup-funksjoner for innloggede brukere
GRANT EXECUTE ON FUNCTION create_wallet_backup_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_backups TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_wallet_backups TO authenticated;
GRANT EXECUTE ON FUNCTION configure_wallet_auto_backup TO authenticated;

-- Gi tilgang til tabeller
GRANT SELECT, INSERT, DELETE ON public.wallet_backups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_backup_schedules TO authenticated;

-- 14. SUKSESSMELDING
SELECT 
  'Celora Wallet Backup System er installert!' as status,
  'Integrert med eksisterende database-struktur' as note,
  'Kjør dette skriptet ETTER hovedsetup-skriptet' as important;

-- Commit transaksjonen
COMMIT;