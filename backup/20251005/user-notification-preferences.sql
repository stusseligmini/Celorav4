-- User Notification Preferences Table
-- This table stores user-specific preferences for different notification types and channels

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(255) NOT NULL,
    channel VARCHAR(255) NOT NULL CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, notification_type, channel)
);

-- Add RLS policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own notification preferences
CREATE POLICY user_notification_preferences_select_policy ON user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY user_notification_preferences_update_policy ON user_notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own notification preferences
CREATE POLICY user_notification_preferences_insert_policy ON user_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notification preferences
CREATE POLICY user_notification_preferences_delete_policy ON user_notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can do anything with notification preferences
CREATE POLICY admin_notification_preferences_policy ON user_notification_preferences
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_type ON user_notification_preferences(notification_type);

-- Function to update the last_updated timestamp
CREATE OR REPLACE FUNCTION update_user_notification_preferences_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_updated on update
DROP TRIGGER IF EXISTS update_user_notification_preferences_last_updated_trigger ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_last_updated_trigger
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_notification_preferences_last_updated();

-- Add notification type validation function (optional)
CREATE OR REPLACE FUNCTION validate_notification_type()
RETURNS TRIGGER AS $$
DECLARE
    valid_type BOOLEAN;
BEGIN
    -- Check if the notification_type matches any feature flag of type notification_type_*
    SELECT EXISTS (
        SELECT 1 FROM feature_flags 
        WHERE name = 'notifications_type_' || NEW.notification_type
        OR name = 'notifications_type_' || REPLACE(NEW.notification_type, '_', '')
    ) INTO valid_type;
    
    IF NOT valid_type THEN
        RAISE EXCEPTION 'Invalid notification_type: %', NEW.notification_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification type validation (commented out by default)
-- Uncomment if you want strict validation against feature flags
/*
DROP TRIGGER IF EXISTS validate_notification_type_trigger ON user_notification_preferences;
CREATE TRIGGER validate_notification_type_trigger
BEFORE INSERT OR UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION validate_notification_type();
*/

-- Insert default preferences for system notifications for all existing users
-- This will ensure that critical notifications are enabled by default
INSERT INTO user_notification_preferences (user_id, notification_type, channel, is_enabled)
SELECT 
    u.id as user_id, 
    'security' as notification_type,
    'in_app' as channel,
    true as is_enabled
FROM 
    auth.users u
ON CONFLICT (user_id, notification_type, channel) DO NOTHING;