-- Additional Notification Feature Flags for Enhanced Management
-- This script adds additional, more granular notification types and settings
-- to the existing feature flag system

-- Transaction Detail Notification Types
INSERT INTO feature_flags (name, description, is_enabled, created_at, last_updated)
VALUES 
    -- Transaction sub-types
    ('notifications_type_transaction_deposit', 'Notifications for deposit transactions', true, now(), now()),
    ('notifications_type_transaction_withdrawal', 'Notifications for withdrawal transactions', true, now(), now()),
    ('notifications_type_transaction_transfer', 'Notifications for transfer transactions', true, now(), now()),
    ('notifications_type_transaction_recurring', 'Notifications for recurring transactions', true, now(), now()),
    ('notifications_type_transaction_failed', 'Notifications for failed transactions', true, now(), now()),
    
    -- Card-related notification sub-types
    ('notifications_type_card_activation', 'Notifications for card activation', true, now(), now()),
    ('notifications_type_card_transaction', 'Notifications for card transactions', true, now(), now()),
    ('notifications_type_card_limit', 'Notifications for approaching card limits', true, now(), now()),
    ('notifications_type_card_expiry', 'Notifications for card expiration', true, now(), now()),
    
    -- Security notification sub-types
    ('notifications_type_security_login', 'Notifications for login events', true, now(), now()),
    ('notifications_type_security_device', 'Notifications for new device detection', true, now(), now()),
    ('notifications_type_security_password', 'Notifications for password changes', true, now(), now()),
    ('notifications_type_security_2fa', 'Notifications for 2FA events', true, now(), now()),
    
    -- Push notification settings
    ('notifications_push_sound', 'Enable sound for push notifications', true, now(), now()),
    ('notifications_push_vibration', 'Enable vibration for push notifications', true, now(), now()),
    ('notifications_push_action_buttons', 'Enable action buttons in push notifications', true, now(), now()),
    ('notifications_push_priority', 'Use high priority for push notifications', false, now(), now()),
    
    -- Time-sensitive notifications
    ('notifications_time_sensitive', 'Allow time-sensitive critical notifications', true, now(), now()),
    ('notifications_after_hours', 'Allow notifications outside business hours', false, now(), now()),
    
    -- Email notification settings
    ('notifications_email_html', 'Use HTML-formatted emails for notifications', true, now(), now()),
    ('notifications_email_digest', 'Enable daily notification digest emails', false, now(), now()),
    
    -- Analytics and tracking
    ('notifications_analytics', 'Enable notification analytics tracking', true, now(), now()),
    ('notifications_click_tracking', 'Track notification open and click rates', true, now(), now()),
    
    -- Custom notification preferences
    ('notifications_user_preferences', 'Allow users to set custom notification preferences', true, now(), now()),
    ('notifications_frequency_control', 'Enable notification frequency controls', true, now(), now()),
    ('notifications_quiet_hours', 'Enable quiet hours for notifications', false, now(), now())
ON CONFLICT (name) 
DO UPDATE SET 
    description = EXCLUDED.description,
    last_updated = now();

-- Create feature flag groups for easier management
CREATE TABLE IF NOT EXISTS feature_flag_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Feature Flag Group Memberships
CREATE TABLE IF NOT EXISTS feature_flag_group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES feature_flag_groups(id) ON DELETE CASCADE,
    flag_name VARCHAR(255) NOT NULL REFERENCES feature_flags(name) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, flag_name)
);

-- Add RLS Policies for Feature Flag Groups
ALTER TABLE feature_flag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_group_memberships ENABLE ROW LEVEL SECURITY;

-- Only admins can modify feature flag groups
CREATE POLICY feature_flag_groups_admin_policy ON feature_flag_groups
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- All authenticated users can read feature flag groups
CREATE POLICY feature_flag_groups_read_policy ON feature_flag_groups
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify feature flag group memberships
CREATE POLICY feature_flag_group_memberships_admin_policy ON feature_flag_group_memberships
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- All authenticated users can read feature flag group memberships
CREATE POLICY feature_flag_group_memberships_read_policy ON feature_flag_group_memberships
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create initial feature flag groups
INSERT INTO feature_flag_groups (name, description, created_at, last_updated)
VALUES 
    ('notification_master', 'Master notification system controls', now(), now()),
    ('notification_channels', 'Notification delivery channels', now(), now()),
    ('notification_types', 'Notification content types', now(), now()),
    ('notification_transaction', 'Transaction notification settings', now(), now()),
    ('notification_security', 'Security notification settings', now(), now()),
    ('notification_card', 'Card-related notification settings', now(), now()),
    ('notification_push_settings', 'Push notification settings', now(), now()),
    ('notification_email_settings', 'Email notification settings', now(), now()),
    ('notification_preferences', 'User preference controls', now(), now())
ON CONFLICT (name) 
DO UPDATE SET 
    description = EXCLUDED.description,
    last_updated = now();

-- Create feature flag group memberships
WITH groups AS (
    SELECT id, name FROM feature_flag_groups
)
INSERT INTO feature_flag_group_memberships (group_id, flag_name)
-- Master group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_master' AND f.name IN ('notifications', 'notifications_api')

UNION ALL

-- Channels group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_channels' AND f.name IN (
    'notifications_in_app', 'notifications_push', 
    'notifications_email', 'notifications_sms'
)

UNION ALL

-- Types group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_types' AND f.name LIKE 'notifications_type_%'

UNION ALL

-- Transaction group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_transaction' AND f.name LIKE 'notifications_type_transaction%'

UNION ALL

-- Security group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_security' AND f.name LIKE 'notifications_type_security%'

UNION ALL

-- Card group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_card' AND f.name LIKE 'notifications_type_card%'

UNION ALL

-- Push settings group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_push_settings' AND 
    (f.name LIKE 'notifications_push_%' AND f.name NOT LIKE 'notifications_push_chrome%' AND 
     f.name NOT LIKE 'notifications_push_firefox%' AND f.name NOT LIKE 'notifications_push_safari%' AND
     f.name NOT LIKE 'notifications_push_edge%')

UNION ALL

-- Email settings group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_email_settings' AND f.name LIKE 'notifications_email_%'

UNION ALL

-- Preferences group
SELECT g.id, f.name
FROM feature_flags f, groups g
WHERE g.name = 'notification_preferences' AND 
    (f.name LIKE 'notifications_user_%' OR f.name LIKE 'notifications_frequency_%' OR f.name = 'notifications_quiet_hours')

ON CONFLICT DO NOTHING;