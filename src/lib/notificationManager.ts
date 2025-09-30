/**
 * Notification System for Celora V2
 * 
 * This module provides a comprehensive notification system that allows for:
 * - In-app notifications
 * - Push notifications
 * - Email notifications
 * - SMS notifications
 * - Different notification channels with customizable templates
 * - User preferences for notification types
 */

import { getSupabaseClient } from './supabaseSingleton';
import { featureFlags } from './featureFlags';

export type NotificationType = 
  | 'transaction' 
  | 'security' 
  | 'account' 
  | 'marketing' 
  | 'system'
  | 'card'
  | 'wallet'
  | 'transfer'
  | 'reward'
  | 'promotion';

export type NotificationChannel = 
  | 'in_app' 
  | 'push' 
  | 'email' 
  | 'sms';

export type NotificationPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface NotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationType]?: {
      in_app: boolean;
      push: boolean;
      email: boolean;
      sms: boolean;
    };
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  link?: string;
  action?: {
    label: string;
    url: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  payload: NotificationPayload;
  read: boolean;
  sent: boolean;
  delivered: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

class NotificationManager {
  private static instance: NotificationManager;
  private initialized: boolean = false;
  private subscriptions: any[] = [];
  private pendingNotifications: Map<string, Notification> = new Map();

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Initialize the notification system
   * @param userContext Optional user context for feature flag evaluation
   */
  async initialize(userContext?: any): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize feature flags with user context
      await featureFlags.initialize(userContext);
      
      // Master toggle for the entire notification system
      const notificationsEnabled = featureFlags.isEnabled('notifications', { 
        defaultValue: true,
        useLocalStorage: true
      });
      
      if (!notificationsEnabled) {
        console.log('Notification system is disabled via feature flag');
        return;
      }

      // Check individual notification channel feature flags
      const inAppEnabled = featureFlags.isEnabled('notifications_in_app', { defaultValue: true });
      const pushEnabled = featureFlags.isEnabled('notifications_push', { defaultValue: false });
      const emailEnabled = featureFlags.isEnabled('notifications_email', { defaultValue: false });
      const smsEnabled = featureFlags.isEnabled('notifications_sms', { defaultValue: false });
      
      console.log(`Notification channels enabled - In-app: ${inAppEnabled}, Push: ${pushEnabled}, Email: ${emailEnabled}, SMS: ${smsEnabled}`);

      // Register for push notifications if in browser and enabled
      if (pushEnabled && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        this.registerForPushNotifications();
      }

      // Subscribe to real-time notifications if in-app enabled
      if (inAppEnabled) {
        this.subscribeToNotifications();
      }

      this.initialized = true;
      console.log('Notification system initialized');
    } catch (error) {
      console.error('Failed to initialize notification system:', error);
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<void> {
    try {
      const pushEnabled = featureFlags.isEnabled('push_notifications', { defaultValue: false });
      
      if (!pushEnabled) {
        console.log('Push notifications are disabled via feature flag');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        // Already subscribed
        return;
      }

      // Get the server's public key
      const { data, error } = await getSupabaseClient()
        .from('push_notification_keys')
        .select('public_key')
        .limit(1)
        .single();

      if (error || !data) {
        throw new Error('Failed to get push notification public key');
      }

      const publicKey = data.public_key;

      // Request permission and subscribe
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const convertedKey = this.urlBase64ToUint8Array(publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey.buffer as ArrayBuffer
        });

        // Send the subscription to the server
        await this.savePushSubscription(subscription);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }

  /**
   * Save push subscription to the server
   */
  private async savePushSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const user = (await getSupabaseClient().auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await getSupabaseClient()
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscription.toJSON(),
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  private subscribeToNotifications(): void {
    const supabase = getSupabaseClient();
    
    // Clean up any existing subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // Listen for new notifications
    this.subscriptions.push(
      supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          this.handleNewNotification.bind(this)
        )
        .subscribe()
    );
  }

  /**
   * Handle new notification from server
   */
  private async handleNewNotification(payload: any): Promise<void> {
    const notification = payload.new as Notification;
    
    // Check if this notification is for the current user
    const user = (await getSupabaseClient().auth.getUser()).data.user;
    
    if (!user || user.id !== notification.userId) {
      return;
    }

    // Store notification in memory
    this.pendingNotifications.set(notification.id, notification);

    // Trigger notification event
    this.triggerNotificationEvent(notification);

    // Show notification if needed
    if (notification.channel === 'in_app' && typeof window !== 'undefined') {
      this.showBrowserNotification(notification);
    }
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    // Check if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(notification.payload.title, {
        body: notification.payload.body,
        icon: '/logo.png',
        // image is not in standard NotificationOptions
        data: {
          notificationId: notification.id,
          image: notification.payload.image, // Include image in data
          ...notification.payload.data
        }
      });
    }
  }

  /**
   * Trigger notification event
   */
  private triggerNotificationEvent(notification: Notification): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('celora:notification', {
        detail: notification
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Send a notification
   * @param userId User ID to send notification to
   * @param type Notification type
   * @param channel Notification channel
   * @param payload Notification payload
   * @param priority Notification priority
   * @returns The created notification or null if failed
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    payload: NotificationPayload,
    priority: NotificationPriority = 'medium'
  ): Promise<Notification | null> {
    try {
      // Check master notification feature flag
      if (!featureFlags.isEnabled('notifications', { defaultValue: true })) {
        console.log('Notifications are disabled by feature flag');
        return null;
      }

      // Check channel-specific feature flag
      const channelFlag = `notifications_${channel}`;
      if (!featureFlags.isEnabled(channelFlag, { 
        defaultValue: channel === 'in_app' // Only in_app enabled by default
      })) {
        console.log(`${channel} notifications are disabled by feature flag`);
        return null;
      }

      // Check type-specific feature flag if it exists
      const typeFlag = `notifications_type_${type}`;
      if (featureFlags.getAllFlags().some(flag => flag.name === typeFlag) && 
          !featureFlags.isEnabled(typeFlag, { defaultValue: true })) {
        console.log(`${type} notifications are disabled by feature flag`);
        return null;
      }
      
      // Check user preferences
      const preferences = await this.getUserPreferences(userId);
      
      if (preferences && 
          preferences.channels[type] && 
          preferences.channels[type]![channel] === false) {
        // User has opted out of this notification type/channel
        return null;
      }

      // Create notification in database
      const { data, error } = await getSupabaseClient()
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          channel,
          priority,
          payload,
          read: false,
          sent: true,
          delivered: channel === 'in_app', // In-app notifications are delivered immediately
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Format notification to match our interface
      const notification: Notification = {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        channel: data.channel,
        priority: data.priority,
        payload: data.payload,
        read: data.read,
        sent: data.sent,
        delivered: data.delivered,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        readAt: data.read_at
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Get user notification preferences
   * @param userId User ID
   * @returns User notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('notification_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences found, return default preferences
        if (error.code === 'PGRST116') {
          return this.createDefaultPreferences(userId);
        }
        throw error;
      }

      return {
        userId,
        channels: data.preferences
      };
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return null;
    }
  }

  /**
   * Create default notification preferences for a user
   * @param userId User ID
   * @returns Default notification preferences
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPreferences: NotificationPreferences = {
      userId,
      channels: {
        transaction: { in_app: true, push: true, email: true, sms: false },
        security: { in_app: true, push: true, email: true, sms: true },
        account: { in_app: true, push: true, email: true, sms: false },
        marketing: { in_app: true, push: false, email: true, sms: false },
        system: { in_app: true, push: true, email: true, sms: false },
        card: { in_app: true, push: true, email: true, sms: false },
        wallet: { in_app: true, push: true, email: true, sms: false },
        transfer: { in_app: true, push: true, email: true, sms: false },
        reward: { in_app: true, push: true, email: true, sms: false },
        promotion: { in_app: true, push: false, email: true, sms: false }
      }
    };

    try {
      await getSupabaseClient()
        .from('notification_preferences')
        .insert({
          user_id: userId,
          preferences: defaultPreferences.channels,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      return defaultPreferences;
    } catch (error) {
      console.error('Error creating default notification preferences:', error);
      return defaultPreferences;
    }
  }

  /**
   * Update user notification preferences
   * @param userId User ID
   * @param preferences New preferences
   * @returns Whether the update was successful
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences['channels']>
  ): Promise<boolean> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      
      if (!currentPrefs) {
        return false;
      }

      const updatedPrefs = {
        ...currentPrefs.channels,
        ...preferences
      };

      const { error } = await getSupabaseClient()
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preferences: updatedPrefs,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   * @returns Whether the update was successful
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      // Update local cache if we have it
      if (this.pendingNotifications.has(notificationId)) {
        const notification = this.pendingNotifications.get(notificationId)!;
        notification.read = true;
        notification.readAt = new Date().toISOString();
        this.pendingNotifications.set(notificationId, notification);
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get all notifications for a user
   * @param userId User ID
   * @param limit Maximum number of notifications to return
   * @param offset Offset for pagination
   * @param includeRead Whether to include read notifications
   * @returns Array of notifications
   */
  async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    includeRead: boolean = true
  ): Promise<Notification[]> {
    try {
      let query = getSupabaseClient()
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!includeRead) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Format notifications to match our interface
      return data.map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        channel: item.channel,
        priority: item.priority,
        payload: item.payload,
        read: item.read,
        sent: item.sent,
        delivered: item.delivered,
        error: item.error,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        readAt: item.read_at
      }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Get count of unread notifications for a user
   * @param userId User ID
   * @returns Count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await getSupabaseClient()
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Convert URL-safe base64 to Uint8Array for Web Push
   * @param base64String Base64 string
   * @returns Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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

  /**
   * Save push subscription to the database
   * @param userId User ID
   * @param subscription Push subscription object
   * @returns Whether the save was successful
   */
  async savePushSubscriptionForUser(userId: string, subscription: any): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: subscription,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error saving push subscription:', error);
      return false;
    }
  }

  /**
   * Delete push subscription from the database
   * @param userId User ID
   * @param endpoint Optional endpoint URL to identify specific subscription
   * @returns Whether the delete was successful
   */
  async deletePushSubscriptionForUser(userId: string, endpoint?: string): Promise<boolean> {
    try {
      let query = getSupabaseClient()
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
      
      if (endpoint) {
        query = query.filter('subscription->endpoint', 'eq', endpoint);
      }
      
      const { error } = await query;

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting push subscription:', error);
      return false;
    }
  }

  /**
   * Clean up resources when the manager is no longer needed
   */
  cleanup(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
    
    // Clear pending notifications
    this.pendingNotifications.clear();
    
    this.initialized = false;
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Client-side React hook is moved to a separate file to avoid server-side issues