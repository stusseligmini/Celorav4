-- Feature Flags System Migration
-- This file creates the feature_flags table and related functions

-- Feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    name TEXT PRIMARY KEY,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    user_percentage INTEGER,
    targeting_rules JSONB,
    is_sticky BOOLEAN DEFAULT false,
    variant_distribution JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on feature flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Feature flags policies
CREATE POLICY "Authenticated users can view feature flags" ON public.feature_flags
    FOR SELECT USING (auth.role() IS NOT NULL);

-- Only admins can modify feature flags
CREATE POLICY "Only admins can modify feature flags" ON public.feature_flags
    FOR ALL USING (auth.role() = 'admin');

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_feature_flag_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on changes
CREATE TRIGGER update_feature_flags_timestamp
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION update_feature_flag_last_updated();

-- Function to log feature flag changes
CREATE TABLE IF NOT EXISTS public.feature_flag_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flag_name TEXT REFERENCES public.feature_flags(name),
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO public.feature_flags (name, description, is_enabled)
VALUES 
    ('new_dashboard', 'Enable the new dashboard interface', false),
    ('advanced_analytics', 'Enable advanced analytics features', false),
    ('beta_features', 'Enable beta features', false),
    ('mfa_required', 'Require MFA for all users', false),
    ('dark_mode', 'Enable dark mode UI theme', true),
    ('new_card_management', 'Enable the new card management interface', false)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policy for audit log
ALTER TABLE public.feature_flag_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log
CREATE POLICY "Only admins can view audit log" ON public.feature_flag_audit_log
    FOR SELECT USING (auth.role() = 'admin');

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION log_feature_flag_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.feature_flag_audit_log (flag_name, action, new_value, changed_by)
        VALUES (NEW.name, 'create', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.feature_flag_audit_log (flag_name, action, old_value, new_value, changed_by)
        VALUES (NEW.name, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.feature_flag_audit_log (flag_name, action, old_value, changed_by)
        VALUES (OLD.name, 'delete', to_jsonb(OLD), auth.uid());
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER feature_flags_audit_insert
AFTER INSERT ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION log_feature_flag_changes();

CREATE TRIGGER feature_flags_audit_update
AFTER UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION log_feature_flag_changes();

CREATE TRIGGER feature_flags_audit_delete
AFTER DELETE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION log_feature_flag_changes();