'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent: string;
  is_active: boolean;
  created_at: string;
}

interface NotificationPreferences {
  user_id: string;
  solana_transaction: boolean;
  auto_link_success: boolean;
  auto_link_failed: boolean;
  price_alert: boolean;
  security_alert: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  updated_at: string;
}

interface UserNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'sent' | 'failed' | 'read';
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
}

interface SolanaTransactionNotification {
  user_id: string;
  transaction_data: {
    signature: string;
    amount: string;
    token?: string;
    from_address?: string;
    to_address?: string;
    transaction_type: 'incoming' | 'outgoing' | 'swap' | 'stake';
    network: 'mainnet' | 'devnet' | 'testnet';
  };
}

interface AutoLinkNotification {
  user_id: string;
  auto_link_data: {
    signature: string;
    confidence_score: number;
    matched_wallet: string;
    amount: string;
    status: 'success' | 'failed' | 'manual_review';
  };
}

interface PriceAlertNotification {
  user_id: string;
  price_data: {
    token: string;
    price: number;
    change: number;
    threshold: number;
    direction: 'up' | 'down';
  };
}

interface SecurityAlertNotification {
  user_id: string;
  security_data: {
    type: 'new_device' | 'suspicious';
    location?: string;
    wallet_name?: string;
    details?: string;
  };
}

export const usePushNotifications = () => {
  const { supabase, user } = useSupabase();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (!supported) {
        setError('Push notifications are not supported in this browser');
        setLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Load existing subscription
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user || !isSupported) {
        setLoading(false);
        return;
      }

      try {
        if (!supabase) {
          console.error('Supabase client not available');
          setError('Database connection not available');
          setLoading(false);
          return;
        }

        // Check for existing subscription in database
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') { // Not found is OK
          throw error;
        }

        if (data) {
          setSubscription(data);
          setIsSubscribed(true);
        }

        // Check actual browser subscription status
        const registration = await navigator.serviceWorker.ready;
        const browserSubscription = await registration.pushManager.getSubscription();
        
        if (!browserSubscription && data) {
          // Database says subscribed but browser doesn't have subscription
          await unsubscribeFromPush();
        }

      } catch (err) {
        console.error('Failed to load push subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user, isSupported, supabase]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupported || !supabase) {
      setError('Push notifications not supported or user not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Push notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push manager
      const browserSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Convert to our format
      const subscriptionData = {
        user_id: user.id,
        endpoint: browserSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(browserSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(browserSubscription.getKey('auth')!)
        },
        user_agent: navigator.userAgent,
        is_active: true
      };

      // Save to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      setIsSubscribed(true);
      
      return true;

    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, isSupported, supabase]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!user || !supabase) return false;

    setLoading(true);
    setError(null);

    try {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.ready;
      const browserSubscription = await registration.pushManager.getSubscription();
      
      if (browserSubscription) {
        await browserSubscription.unsubscribe();
      }

      // Mark as inactive in database
      if (subscription) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ 
            is_active: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', subscription.id);

        if (error) throw error;
      }

      setSubscription(null);
      setIsSubscribed(false);
      
      return true;

    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, subscription, supabase]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    subscription,
    isSupported,
    isSubscribed,
    loading,
    error,
    subscribeToPush,
    unsubscribeFromPush,
    clearError
  };
};

export const useNotificationPreferences = () => {
  const { supabase, user } = useSupabase();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (!supabase) {
          console.error('Supabase client not available');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setPreferences(data);
        } else {
          // Create default preferences
          const defaultPrefs = {
            user_id: user.id,
            solana_transaction: true,
            auto_link_success: true,
            auto_link_failed: true,
            price_alert: true,
            security_alert: true,
            push_enabled: true,
            quiet_hours_start: null,
            quiet_hours_end: null
          };

          if (!supabase) {
            console.error('Supabase client not available for insert');
            return;
          }

          const { data: newData, error: insertError } = await supabase
            .from('user_notification_preferences')
            .insert(defaultPrefs)
            .select()
            .single();

          if (insertError) throw insertError;
          setPreferences(newData);
        }

      } catch (err) {
        console.error('Failed to load notification preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, supabase]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!user || !preferences || !supabase) return false;

    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      return true;

    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, preferences, supabase]);

  const toggleNotificationType = useCallback(async (
    type: keyof Omit<NotificationPreferences, 'user_id' | 'updated_at' | 'quiet_hours_start' | 'quiet_hours_end'>,
    enabled: boolean
  ): Promise<boolean> => {
    return updatePreferences({ [type]: enabled });
  }, [updatePreferences]);

  const setQuietHours = useCallback(async (
    startHour: number | null,
    endHour: number | null
  ): Promise<boolean> => {
    const formatHour = (hour: number | null) => 
      hour !== null ? hour.toString().padStart(2, '0') + ':00' : null;

    return updatePreferences({
      quiet_hours_start: formatHour(startHour),
      quiet_hours_end: formatHour(endHour)
    });
  }, [updatePreferences]);

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreferences,
    toggleNotificationType,
    setQuietHours
  };
};

export const useSolanaNotifications = () => {
  const { supabase } = useSupabase();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSolanaTransactionNotification = useCallback(async (
    notification: SolanaTransactionNotification
  ): Promise<boolean> => {
    if (!supabase) return false;
    
    setSending(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'solana-push-notifications',
        {
          body: {
            action: 'send_solana_transaction',
            data: notification
          }
        }
      );

      if (error) throw error;

      return data.success;

    } catch (err) {
      console.error('Failed to send Solana transaction notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
      return false;
    } finally {
      setSending(false);
    }
  }, [supabase]);

  const sendAutoLinkNotification = useCallback(async (
    notification: AutoLinkNotification
  ): Promise<boolean> => {
    if (!supabase) return false;
    
    setSending(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'solana-push-notifications',
        {
          body: {
            action: 'send_auto_link',
            data: notification
          }
        }
      );

      if (error) throw error;

      return data.success;

    } catch (err) {
      console.error('Failed to send auto-link notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
      return false;
    } finally {
      setSending(false);
    }
  }, [supabase]);

  const sendPriceAlertNotification = useCallback(async (
    notification: PriceAlertNotification
  ): Promise<boolean> => {
    if (!supabase) return false;
    
    setSending(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'solana-push-notifications',
        {
          body: {
            action: 'send_price_alert',
            data: notification
          }
        }
      );

      if (error) throw error;

      return data.success;

    } catch (err) {
      console.error('Failed to send price alert notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
      return false;
    } finally {
      setSending(false);
    }
  }, [supabase]);

  const sendSecurityAlertNotification = useCallback(async (
    notification: SecurityAlertNotification
  ): Promise<boolean> => {
    if (!supabase) return false;
    
    setSending(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'solana-push-notifications',
        {
          body: {
            action: 'send_security_alert',
            data: notification
          }
        }
      );

      if (error) throw error;

      return data.success;

    } catch (err) {
      console.error('Failed to send security alert notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
      return false;
    } finally {
      setSending(false);
    }
  }, [supabase]);

  return {
    sending,
    error,
    sendSolanaTransactionNotification,
    sendAutoLinkNotification,
    sendPriceAlertNotification,
    sendSecurityAlertNotification
  };
};

export const useUserNotifications = () => {
  const { supabase, user } = useSupabase();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user || !supabase) {
        setLoading(false);
        return;
      }

      try {
        // Load recent notifications (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        setNotifications(data || []);
        
        // Count unread notifications
        const unread = (data || []).filter(n => n.status !== 'read').length;
        setUnreadCount(unread);

      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Set up real-time subscription for new notifications
    if (user && supabase) {
      const subscription = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as UserNotification;
            setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, supabase]);

  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;

    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user || !supabase) return false;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .neq('status', 'read');

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          status: 'read' as const, 
          read_at: n.read_at || new Date().toISOString() 
        }))
      );
      
      setUnreadCount(0);

      return true;

    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  }, [user, supabase]);

  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      const wasUnread = notifications.find(n => n.id === notificationId)?.status !== 'read';
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      return true;

    } catch (err) {
      console.error('Failed to delete notification:', err);
      return false;
    }
  }, [supabase, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};

// Utility function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}