'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { featureFlags } from '@/lib/featureFlags';
import { createLogger } from '../lib/logger';

// Create component-specific logger
const logger = createLogger('PushNotificationRegistration');

export default function PushNotificationRegistration() {
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function registerPushNotifications() {
      try {
        // Initialize feature flags with user context
        const user = (await getSupabaseClient().auth.getUser()).data.user;
        await featureFlags.initialize({
          userId: user?.id,
          email: user?.email,
          userAgent: navigator.userAgent,
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });
        
        // Check master notification flag
        const notificationsEnabled = featureFlags.isEnabled('notifications', { defaultValue: true });
        if (!notificationsEnabled) {
          logger.info('Notifications are disabled by master feature flag');
          return;
        }
        
        // Check push notification specific flag
        const pushEnabled = featureFlags.isEnabled('notifications_push', { defaultValue: false });
        
        if (!pushEnabled) {
          logger.info('Push notifications are disabled by feature flag');
          return;
        }
        
        // Check browser-specific push notification flags
        if (navigator.userAgent.indexOf('Chrome') > -1 && !featureFlags.isEnabled('notifications_push_chrome', { defaultValue: true })) {
          logger.info('Push notifications are disabled for Chrome by feature flag');
          return;
        }
        
        if (navigator.userAgent.indexOf('Firefox') > -1 && !featureFlags.isEnabled('notifications_push_firefox', { defaultValue: true })) {
          logger.info('Push notifications are disabled for Firefox by feature flag');
          return;
        }
        
        if (navigator.userAgent.indexOf('Safari') > -1 && !featureFlags.isEnabled('notifications_push_safari', { defaultValue: false })) {
          logger.info('Push notifications are disabled for Safari by feature flag');
          return;
        }
        
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          logger.warn('Push notifications are not supported by this browser');
          return;
        }

        // Wait for the main service worker to be ready
        const reg = await navigator.serviceWorker.ready;
        
        logger.info('Push Notification Service Worker registered', {}, { scope: reg.scope });
        
        setRegistration(reg);
        setIsRegistered(true);
        setPushSupported(true);
        
        // Get the VAPID public key from the server
        try {
          const { data, error } = await getSupabaseClient()
            .from('push_notification_keys')
            .select('public_key')
            .limit(1)
            .single();

          if (error) throw error;
          if (!data) throw new Error('No VAPID public key found');
          
          // Send the VAPID public key to the service worker
          if (reg.active) {
            reg.active.postMessage({
              type: 'SET_VAPID_PUBLIC_KEY',
              key: data.public_key
            });
          }

          // Check if already subscribed
          const subscription = await reg.pushManager.getSubscription();
          if (!subscription) {
            // Request permission and subscribe if not already subscribed
            await subscribeUser(reg, data.public_key);
          } else {
            logger.info('Already subscribed to push notifications');
            // Make sure the subscription is saved to the server
            await saveSubscription(subscription);
          }
        } catch (err) {
          logger.error('Error setting up push notifications:', {}, { error: err });
        }
      } catch (err: any) {
        logger.error('Push notification registration failed:', {}, { error: err });
        setError(err.message);
      }
    }

    // Only register push notifications after a short delay to ensure
    // the main service worker is properly registered first
    const timer = setTimeout(() => {
      registerPushNotifications();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Function to subscribe to push notifications
  async function subscribeUser(reg: ServiceWorkerRegistration, publicKey: string) {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        logger.info('Notification permission not granted');
        return;
      }
      
      // Subscribe to push notifications
      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to proper type for PushSubscriptionOptions
        applicationServerKey: convertedKey.buffer as ArrayBuffer
      });
      
      logger.info('Push subscription successful');
      
      // Send the subscription to the server
      await saveSubscription(subscription);
    } catch (err) {
      logger.error('Failed to subscribe to push notifications:', {}, { error: err });
    }
  }

  // Function to save the subscription to the server
  async function saveSubscription(subscription: PushSubscription) {
    try {
      const user = (await getSupabaseClient().auth.getUser()).data.user;
      
      if (!user) {
        logger.warn('User not authenticated, skipping push subscription save');
        return;
      }
      
      const { error } = await getSupabaseClient()
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscription.toJSON(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      logger.info('Push subscription saved to server');
    } catch (err) {
      logger.error('Error saving push subscription:', {}, { error: err });
    }
  }

  // Helper function to convert URL-safe base64 to Uint8Array
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return null; // This component doesn't render anything
}
