-- Feature Flag Tables and Initial Data
-- This script defines the database schema for the feature flag system
-- and populates it with initial notification-related feature flags

-- Feature Flag Table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    user_percentage INT,
    targeting_rules JSONB,
    is_sticky BOOLEAN DEFAULT false,
    variant_distribution JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS Policies for Feature Flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can modify feature flags
CREATE POLICY feature_flags_admin_policy ON feature_flags
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- All authenticated users can read feature flags
CREATE POLICY feature_flags_read_policy ON feature_flags
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert notification system feature flags
INSERT INTO feature_flags (name, description, is_enabled, created_at, last_updated)
VALUES
    -- Master feature flags
    ('notifications', 'Master toggle for the entire notification system', true, now(), now()),
    ('notifications_api', 'Controls access to the notifications API endpoints', true, now(), now()),
    
    -- Notification channels
    ('notifications_in_app', 'Controls in-app notification functionality', true, now(), now()),
    ('notifications_push', 'Controls browser push notification functionality', false, now(), now()),
    ('notifications_email', 'Controls email notification functionality', false, now(), now()),
    ('notifications_sms', 'Controls SMS notification functionality', false, now(), now()),
    
    -- Browser-specific push notification flags
    ('notifications_push_chrome', 'Controls push notifications for Chrome browsers', true, now(), now()),
    ('notifications_push_firefox', 'Controls push notifications for Firefox browsers', true, now(), now()),
    ('notifications_push_safari', 'Controls push notifications for Safari browsers', false, now(), now()),
    ('notifications_push_edge', 'Controls push notifications for Edge browsers', true, now(), now()),
    
    -- Notification type flags
    ('notifications_type_transaction', 'Controls transaction notifications', true, now(), now()),
    ('notifications_type_security', 'Controls security notifications', true, now(), now()),
    ('notifications_type_account', 'Controls account notifications', true, now(), now()),
    ('notifications_type_marketing', 'Controls marketing notifications', true, now(), now()),
    ('notifications_type_system', 'Controls system notifications', true, now(), now()),
    ('notifications_type_card', 'Controls payment card notifications', true, now(), now()),
    ('notifications_type_wallet', 'Controls wallet notifications', true, now(), now()),
    ('notifications_type_transfer', 'Controls transfer notifications', true, now(), now()),
    ('notifications_type_reward', 'Controls reward notifications', true, now(), now()),
    ('notifications_type_promotion', 'Controls promotion notifications', true, now(), now())
ON CONFLICT (name) 
DO UPDATE SET 
    description = EXCLUDED.description,
    last_updated = now();

-- Feature Flag User Overrides Table (for A/B testing or gradual rollouts)
CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_name VARCHAR(255) NOT NULL REFERENCES feature_flags(name) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, flag_name)
);

-- Add RLS Policies for Feature Flag User Overrides
ALTER TABLE feature_flag_user_overrides ENABLE ROW LEVEL SECURITY;

-- Users can read their own overrides
CREATE POLICY feature_flag_user_overrides_select_policy ON feature_flag_user_overrides
    FOR SELECT USING (auth.uid() = user_id);

-- Only admins can insert/update/delete overrides
CREATE POLICY feature_flag_user_overrides_admin_policy ON feature_flag_user_overrides
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_feature_flag_user_overrides_user_id ON feature_flag_user_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_user_overrides_flag_name ON feature_flag_user_overrides(flag_name);