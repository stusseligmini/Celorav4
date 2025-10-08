-- Wallet Backup Tables

-- Table for storing wallet backups
CREATE TABLE wallet_backups (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encrypted_data TEXT NOT NULL,
  wallet_count INTEGER NOT NULL,
  transaction_count INTEGER NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE wallet_backups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own backups" 
  ON wallet_backups FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backups" 
  ON wallet_backups FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Table for backup schedules
CREATE TABLE wallet_backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  options JSONB,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE wallet_backup_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own backup schedules" 
  ON wallet_backup_schedules FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backup schedules" 
  ON wallet_backup_schedules FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup schedules" 
  ON wallet_backup_schedules FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup schedules" 
  ON wallet_backup_schedules FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_wallet_backups_user_id ON wallet_backups (user_id);
CREATE INDEX idx_wallet_backups_timestamp ON wallet_backups (timestamp);

CREATE INDEX idx_wallet_backup_schedules_user_id ON wallet_backup_schedules (user_id);
CREATE INDEX idx_wallet_backup_schedules_next_run ON wallet_backup_schedules (next_run);

-- Add functions for transaction handling in wallet backup operations
CREATE OR REPLACE FUNCTION begin_transaction() RETURNS void AS $$
BEGIN
  -- Start a new transaction
  -- This is just a placeholder for Supabase Edge Functions to handle transactions
  NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION commit_transaction() RETURNS void AS $$
BEGIN
  -- Commit the current transaction
  -- This is just a placeholder for Supabase Edge Functions to handle transactions
  NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rollback_transaction() RETURNS void AS $$
BEGIN
  -- Rollback the current transaction
  -- This is just a placeholder for Supabase Edge Functions to handle transactions
  NULL;
END;
$$ LANGUAGE plpgsql;