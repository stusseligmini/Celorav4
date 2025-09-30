-- Feature Flags for Notification System
-- This script inserts the default feature flags for the notification system

-- First, ensure the feature_flags table exists
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  user_percentage INT,
  targeting_rules JSONB,
  is_sticky BOOLEAN NOT NULL DEFAULT true,
  variant_distribution JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main notification system toggle
INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications',
  'Master toggle for the entire notification system',
  true, -- Enabled by default
  100, -- 100% of users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

-- Notification channels
INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_in_app',
  'Toggle for in-app notifications',
  true, -- Enabled by default
  100, -- 100% of users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_push',
  'Toggle for push notifications',
  false, -- Disabled by default
  NULL, -- No percentage rollout yet
  '[{"attribute": "role", "operator": "equals", "value": "admin"}]', -- Only admins initially
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_email',
  'Toggle for email notifications',
  false, -- Disabled by default
  NULL, -- No percentage rollout yet
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_sms',
  'Toggle for SMS notifications',
  false, -- Disabled by default
  NULL, -- No percentage rollout yet
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

-- Browser-specific push notification flags
INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_push_chrome',
  'Toggle for push notifications in Chrome',
  true, -- Enabled by default for Chrome
  100, -- 100% of Chrome users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_push_firefox',
  'Toggle for push notifications in Firefox',
  true, -- Enabled by default for Firefox
  100, -- 100% of Firefox users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_push_safari',
  'Toggle for push notifications in Safari',
  false, -- Disabled by default for Safari (needs special configuration)
  NULL, -- No percentage rollout yet
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

-- API toggle
INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_api',
  'Toggle for the notifications API endpoints',
  true, -- Enabled by default
  100, -- 100% of users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

-- Specific notification types toggle examples
INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_type_marketing',
  'Toggle for marketing notifications',
  true, -- Enabled by default
  100, -- 100% of users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, targeting_rules, created_at, last_updated)
VALUES (
  'notifications_type_transaction',
  'Toggle for transaction notifications',
  true, -- Enabled by default
  100, -- 100% of users
  NULL, -- No targeting rules
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  targeting_rules = EXCLUDED.targeting_rules,
  last_updated = NOW();

-- Update the DEPLOY-DATABASE-NOW.sql file to include our new feature flags
INSERT INTO public.feature_flags (name, description, is_enabled, user_percentage, created_at, last_updated)
VALUES (
  'notifications_beta',
  'Access to beta notification features',
  true, 
  25, -- Only 25% of users initially
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  user_percentage = EXCLUDED.user_percentage,
  last_updated = NOW();

-- Grant permissions
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read feature flags
CREATE POLICY feature_flags_select_policy ON public.feature_flags 
  FOR SELECT TO authenticated 
  USING (true);

-- Only allow service_role or admin users to update feature flags
CREATE POLICY feature_flags_update_policy ON public.feature_flags 
  FOR UPDATE TO authenticated 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE is_admin = true));

-- Only allow service_role or admin users to insert feature flags
CREATE POLICY feature_flags_insert_policy ON public.feature_flags 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE is_admin = true));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON public.feature_flags (name);