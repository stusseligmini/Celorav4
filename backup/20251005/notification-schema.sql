-- Notification System Database Schema
-- Run this script to create the necessary tables for the notification system

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  payload JSONB NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  sent BOOLEAN NOT NULL DEFAULT true,
  delivered BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  preferences JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Push notification keys table
CREATE TABLE IF NOT EXISTS public.push_notification_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

-- RLS Policies for security
-- Notifications: Users can only access their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT id FROM auth.users WHERE is_admin = true
    )
  );

CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification Preferences: Users can only access their own preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_policy ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_insert_policy ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_update_policy ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Push Subscriptions: Users can only access their own subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select_policy ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY push_subscriptions_insert_policy ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_update_policy ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Push Notification Keys: Only accessible by service role or admins
ALTER TABLE public.push_notification_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_notification_keys_select_policy ON public.push_notification_keys
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE is_admin = true
    )
  );

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET 
    read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE 
    id = notification_id AND
    user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET 
    read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE 
    user_id = auth.uid() AND
    read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_channel VARCHAR,
  p_priority VARCHAR,
  p_payload JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check if the user has opted out of this type of notification
  IF EXISTS (
    SELECT 1 
    FROM public.notification_preferences 
    WHERE 
      user_id = p_user_id AND
      preferences->p_type->p_channel = 'false'
  ) THEN
    RETURN NULL;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    type,
    channel,
    priority,
    payload,
    read,
    sent,
    delivered,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_type,
    p_channel,
    p_priority,
    p_payload,
    false,
    true,
    p_channel = 'in_app', -- In-app notifications are delivered immediately
    NOW(),
    NOW()
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;