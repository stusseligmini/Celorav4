-- MFA Recovery Database Schema Extensions
-- This script sets up the tables, functions, and triggers needed for the MFA recovery process

-- Create MFA recovery requests table
CREATE TABLE IF NOT EXISTS public.mfa_recovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_data JSONB NOT NULL DEFAULT '{}',
    reviewer_id UUID REFERENCES auth.users(id),
    review_notes TEXT
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS mfa_recovery_requests_user_id_idx ON public.mfa_recovery_requests(user_id);
CREATE INDEX IF NOT EXISTS mfa_recovery_requests_email_idx ON public.mfa_recovery_requests(email);
CREATE INDEX IF NOT EXISTS mfa_recovery_requests_status_idx ON public.mfa_recovery_requests(status);

-- Set up RLS policies for mfa_recovery_requests table
ALTER TABLE public.mfa_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can see all recovery requests
CREATE POLICY admin_read_all_recovery_requests
    ON public.mfa_recovery_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );

-- Users can see their own recovery requests
CREATE POLICY user_read_own_recovery_requests
    ON public.mfa_recovery_requests
    FOR SELECT
    TO authenticated
    USING (
        email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    );

-- Only admins can update recovery requests
CREATE POLICY admin_update_recovery_requests
    ON public.mfa_recovery_requests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_mfa_recovery_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the timestamp
CREATE TRIGGER update_mfa_recovery_requests_updated_at
BEFORE UPDATE ON public.mfa_recovery_requests
FOR EACH ROW
EXECUTE PROCEDURE update_mfa_recovery_requests_updated_at();

-- Create function to get recovery request by case number
CREATE OR REPLACE FUNCTION get_recovery_request_by_case_number(p_case_number TEXT)
RETURNS TABLE (
    id UUID,
    case_number TEXT,
    user_id UUID,
    email TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    request_data JSONB,
    reviewer_id UUID,
    review_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.case_number,
        r.user_id,
        r.email,
        r.status,
        r.created_at,
        r.updated_at,
        r.request_data,
        r.reviewer_id,
        r.review_notes
    FROM 
        public.mfa_recovery_requests r
    WHERE 
        r.case_number = p_case_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update recovery request status
CREATE OR REPLACE FUNCTION update_recovery_request_status(
    p_case_number TEXT,
    p_status TEXT,
    p_reviewer_id UUID,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_user_id UUID;
BEGIN
    -- Find the recovery request
    SELECT id, user_id INTO v_request_id, v_user_id
    FROM public.mfa_recovery_requests
    WHERE case_number = p_case_number;
    
    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update the request status
    UPDATE public.mfa_recovery_requests
    SET 
        status = p_status,
        reviewer_id = p_reviewer_id,
        review_notes = COALESCE(p_review_notes, review_notes)
    WHERE id = v_request_id;
    
    -- If approved, log the event
    IF p_status = 'approved' AND v_user_id IS NOT NULL THEN
        INSERT INTO public.security_events (
            user_id,
            event,
            details
        ) VALUES (
            v_user_id,
            'mfa.recovery.approved',
            jsonb_build_object(
                'case_number', p_case_number,
                'approved_by', p_reviewer_id
            )
        );
    END IF;
    
    -- If rejected, log the event
    IF p_status = 'rejected' AND v_user_id IS NOT NULL THEN
        INSERT INTO public.security_events (
            user_id,
            event,
            details
        ) VALUES (
            v_user_id,
            'mfa.recovery.rejected',
            jsonb_build_object(
                'case_number', p_case_number,
                'rejected_by', p_reviewer_id
            )
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete the MFA recovery process
CREATE OR REPLACE FUNCTION complete_mfa_recovery(
    p_case_number TEXT,
    p_admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request_id UUID;
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- Find the recovery request
    SELECT id, user_id, email INTO v_request_id, v_user_id, v_email
    FROM public.mfa_recovery_requests
    WHERE case_number = p_case_number AND status = 'approved';
    
    IF v_request_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If no user found, we can't complete the recovery
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Disable MFA for the user
    UPDATE auth.users
    SET raw_app_meta_data = 
        raw_app_meta_data - 'mfa_enabled' || 
        jsonb_build_object('mfa_enabled', false)
    WHERE id = v_user_id;
    
    -- Delete all MFA factors
    DELETE FROM auth.mfa_factors
    WHERE user_id = v_user_id;
    
    -- Delete all recovery codes
    DELETE FROM public.mfa_recovery_codes
    WHERE user_id = v_user_id;
    
    -- Update the request status
    UPDATE public.mfa_recovery_requests
    SET 
        status = 'completed',
        updated_at = now()
    WHERE id = v_request_id;
    
    -- Log the completion
    INSERT INTO public.security_events (
        user_id,
        event,
        details
    ) VALUES (
        v_user_id,
        'mfa.recovery.completed',
        jsonb_build_object(
            'case_number', p_case_number,
            'completed_by', p_admin_id
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get MFA recovery statistics
CREATE OR REPLACE FUNCTION get_mfa_recovery_statistics()
RETURNS TABLE (
    total_requests INTEGER,
    pending_requests INTEGER,
    approved_requests INTEGER,
    rejected_requests INTEGER,
    completed_requests INTEGER,
    average_resolution_time_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_requests,
        COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_requests,
        COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS approved_requests,
        COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected_requests,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_requests,
        EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 3600 AS average_resolution_time_hours
    FROM 
        public.mfa_recovery_requests
    WHERE
        status != 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add mfa_recovery_requests table to publication for realtime
BEGIN;
  INSERT INTO supabase_realtime.subscription (subscription_id, entity, table_id, claims)
  VALUES ('all_mfa_recovery_requests', 'table', 'public.mfa_recovery_requests', '{}'::jsonb)
  ON CONFLICT DO NOTHING;
COMMIT;

-- Ensure security_events table exists (if not created previously)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS security_events_user_id_idx ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS security_events_event_idx ON public.security_events(event);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events(created_at);

-- Set up RLS policies for security_events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can see all security events
CREATE POLICY admin_read_all_security_events
    ON public.security_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );

-- Users can see their own security events
CREATE POLICY user_read_own_security_events
    ON public.security_events
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Insertion policy for security events
CREATE POLICY insert_security_events
    ON public.security_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );