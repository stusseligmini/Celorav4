-- ================================================================
-- SOLANA REALTIME & BROADCAST SETUP
-- Created: October 18, 2025
-- Purpose: Enable realtime subscriptions and broadcast channels
-- ================================================================

-- ================================================================
-- ENABLE REALTIME FOR SOLANA TABLES
-- ================================================================

DO $$
BEGIN
    -- Add solana_transaction_stream to realtime
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.solana_transaction_stream;
        RAISE NOTICE '✅ Added solana_transaction_stream to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ solana_transaction_stream already in realtime publication';
    END;
    
    -- Add solana_notification_queue to realtime
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.solana_notification_queue;
        RAISE NOTICE '✅ Added solana_notification_queue to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ solana_notification_queue already in realtime publication';
    END;
    
    -- Add pending_transfer_links to realtime
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_transfer_links;
        RAISE NOTICE '✅ Added pending_transfer_links to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ pending_transfer_links already in realtime publication';
    END;
    
    -- Add websocket_subscriptions to realtime (if not already)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.websocket_subscriptions;
        RAISE NOTICE '✅ Added websocket_subscriptions to realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ websocket_subscriptions already in realtime publication';
    END;
END $$;

-- ================================================================
-- BROADCAST FUNCTIONS FOR REALTIME MESSAGING
-- ================================================================

-- Function to broadcast transaction updates to user channels
CREATE OR REPLACE FUNCTION public.broadcast_transaction_update(
    user_uuid UUID,
    transaction_data JSONB
)
RETURNS VOID AS $$
DECLARE
    channel_name TEXT;
BEGIN
    -- Create user-specific channel name
    channel_name := 'user:' || user_uuid::TEXT || ':transactions';
    
    -- Broadcast to realtime channel
    PERFORM pg_notify(channel_name, transaction_data::TEXT);
    
    RAISE NOTICE 'Broadcasting transaction to channel: %', channel_name;
END;
$$ LANGUAGE plpgsql;

-- Function to broadcast auto-link updates
CREATE OR REPLACE FUNCTION public.broadcast_auto_link_update(
    user_uuid UUID,
    link_data JSONB
)
RETURNS VOID AS $$
DECLARE
    channel_name TEXT;
BEGIN
    -- Create user-specific channel name
    channel_name := 'user:' || user_uuid::TEXT || ':auto_links';
    
    -- Broadcast to realtime channel
    PERFORM pg_notify(channel_name, link_data::TEXT);
    
    RAISE NOTICE 'Broadcasting auto-link update to channel: %', channel_name;
END;
$$ LANGUAGE plpgsql;

-- Function to broadcast push notifications
CREATE OR REPLACE FUNCTION public.broadcast_push_notification(
    user_uuid UUID,
    notification_data JSONB
)
RETURNS VOID AS $$
DECLARE
    channel_name TEXT;
BEGIN
    -- Create user-specific channel name
    channel_name := 'user:' || user_uuid::TEXT || ':notifications';
    
    -- Broadcast to realtime channel
    PERFORM pg_notify(channel_name, notification_data::TEXT);
    
    RAISE NOTICE 'Broadcasting notification to channel: %', channel_name;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS FOR AUTO-BROADCAST
-- ================================================================

-- Trigger function for new transactions
CREATE OR REPLACE FUNCTION trigger_broadcast_transaction()
RETURNS TRIGGER AS $$
DECLARE
    user_uuid UUID;
    transaction_json JSONB;
BEGIN
    -- Get user_id from wallet address
    SELECT w.user_id INTO user_uuid
    FROM public.wallets w
    WHERE w.public_key = NEW.wallet_address
    LIMIT 1;
    
    IF user_uuid IS NOT NULL THEN
        -- Create JSON payload
        transaction_json := jsonb_build_object(
            'type', 'transaction_update',
            'signature', NEW.signature,
            'wallet_address', NEW.wallet_address,
            'amount', NEW.amount,
            'token_mint', NEW.token_mint,
            'transaction_type', NEW.transaction_type,
            'block_time', NEW.block_time,
            'created_at', NEW.created_at
        );
        
        -- Broadcast update
        PERFORM public.broadcast_transaction_update(user_uuid, transaction_json);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for auto-link updates
CREATE OR REPLACE FUNCTION trigger_broadcast_auto_link()
RETURNS TRIGGER AS $$
DECLARE
    link_json JSONB;
BEGIN
    IF NEW.linked_user_id IS NOT NULL AND (OLD.linked_user_id IS NULL OR OLD.auto_link_status != NEW.auto_link_status) THEN
        -- Create JSON payload
        link_json := jsonb_build_object(
            'type', 'auto_link_update',
            'signature', NEW.signature,
            'wallet_address', NEW.wallet_address,
            'amount', NEW.amount,
            'confidence_score', NEW.confidence_score,
            'auto_link_status', NEW.auto_link_status,
            'linked_user_id', NEW.linked_user_id
        );
        
        -- Broadcast update
        PERFORM public.broadcast_auto_link_update(NEW.linked_user_id, link_json);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- CREATE TRIGGERS
-- ================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS broadcast_new_transaction ON public.solana_transaction_stream;
DROP TRIGGER IF EXISTS broadcast_auto_link_update ON public.pending_transfer_links;

-- Create new triggers
CREATE TRIGGER broadcast_new_transaction
    AFTER INSERT ON public.solana_transaction_stream
    FOR EACH ROW EXECUTE FUNCTION trigger_broadcast_transaction();

CREATE TRIGGER broadcast_auto_link_update
    AFTER UPDATE ON public.pending_transfer_links
    FOR EACH ROW EXECUTE FUNCTION trigger_broadcast_auto_link();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT EXECUTE ON FUNCTION public.broadcast_transaction_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_auto_link_update TO authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_push_notification TO authenticated;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎊 REALTIME & BROADCAST SETUP COMPLETE! 🎊';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Realtime publications enabled for all Solana tables';
    RAISE NOTICE '✅ User-specific broadcast channels created';
    RAISE NOTICE '✅ Auto-broadcast triggers for transactions and auto-links';
    RAISE NOTICE '✅ Channel naming: user:{uuid}:transactions, user:{uuid}:auto_links, user:{uuid}:notifications';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for real-time Edge Function integration!';
    RAISE NOTICE '';
END $$;