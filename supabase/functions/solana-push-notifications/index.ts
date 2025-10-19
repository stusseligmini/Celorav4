import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface PushNotificationRequest {
  user_id: string;
  notification_type: 'solana_transaction' | 'auto_link_success' | 'auto_link_failed' | 'price_alert' | 'security_alert';
  title: string;
  message: string;
  data?: {
    signature?: string;
    amount?: string;
    token?: string;
    wallet_id?: string;
    confidence_score?: number;
    [key: string]: any;
  };
  priority?: 'low' | 'normal' | 'high';
}

interface SolanaNotificationData {
  signature: string;
  amount: string;
  token?: string;
  from_address?: string;
  to_address?: string;
  transaction_type: 'incoming' | 'outgoing' | 'swap' | 'stake';
  network: 'mainnet' | 'devnet' | 'testnet';
}

interface AutoLinkNotificationData {
  signature: string;
  confidence_score: number;
  matched_wallet: string;
  amount: string;
  status: 'success' | 'failed' | 'manual_review';
}

const PUSH_NOTIFICATION_TEMPLATES = {
  // Solana Transaction Notifications
  solana_incoming: {
    title: (data: SolanaNotificationData) => `💰 Received ${data.amount} ${data.token || 'SOL'}`,
    message: (data: SolanaNotificationData) => `Transaction confirmed on Solana ${data.network}`,
    icon: '💰',
    color: '#00ff88'
  },
  solana_outgoing: {
    title: (data: SolanaNotificationData) => `📤 Sent ${data.amount} ${data.token || 'SOL'}`,
    message: (data: SolanaNotificationData) => `Transaction confirmed on Solana ${data.network}`,
    icon: '📤',
    color: '#ff6b35'
  },
  solana_swap: {
    title: (data: SolanaNotificationData) => `🔄 Swap Completed`,
    message: (data: SolanaNotificationData) => `Swapped ${data.amount} ${data.token || 'SOL'}`,
    icon: '🔄',
    color: '#4ecdc4'
  },
  solana_stake: {
    title: (data: SolanaNotificationData) => `🎯 Staking Transaction`,
    message: (data: SolanaNotificationData) => `${data.amount} SOL staking operation completed`,
    icon: '🎯',
    color: '#9b59b6'
  },

  // Auto-Link Notifications
  auto_link_success: {
    title: (data: AutoLinkNotificationData) => `🔗 Auto-Link Success`,
    message: (data: AutoLinkNotificationData) => `${data.amount} SOL linked with ${data.confidence_score}% confidence`,
    icon: '✅',
    color: '#00ff88'
  },
  auto_link_failed: {
    title: (data: AutoLinkNotificationData) => `⚠️ Auto-Link Review Needed`,
    message: (data: AutoLinkNotificationData) => `${data.amount} SOL requires manual review (${data.confidence_score}% confidence)`,
    icon: '⚠️',
    color: '#f39c12'
  },
  auto_link_manual_review: {
    title: (data: AutoLinkNotificationData) => `👀 Manual Review Required`,
    message: (data: AutoLinkNotificationData) => `Low confidence match for ${data.amount} SOL transaction`,
    icon: '👀',
    color: '#e74c3c'
  },

  // Price Alerts
  price_alert_up: {
    title: (data: any) => `📈 ${data.token} Price Alert`,
    message: (data: any) => `${data.token} is up ${data.change}% to $${data.price}`,
    icon: '📈',
    color: '#00ff88'
  },
  price_alert_down: {
    title: (data: any) => `📉 ${data.token} Price Alert`,
    message: (data: any) => `${data.token} is down ${data.change}% to $${data.price}`,
    icon: '📉',
    color: '#ff6b35'
  },

  // Security Alerts
  security_new_device: {
    title: () => `🔐 New Device Login`,
    message: (data: any) => `Login detected from ${data.location || 'unknown location'}`,
    icon: '🔐',
    color: '#e74c3c'
  },
  security_suspicious: {
    title: () => `⚠️ Suspicious Activity`,
    message: (data: any) => `Unusual transaction pattern detected in ${data.wallet_name}`,
    icon: '⚠️',
    color: '#e74c3c'
  }
};

class SolanaPushNotificationService {
  private supabase: any;
  private vapidKeys: {
    publicKey: string;
    privateKey: string;
  };

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // In production, these should be environment variables
    this.vapidKeys = {
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY') || '',
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY') || ''
    };
  }

  async sendSolanaTransactionNotification(
    userId: string,
    transactionData: SolanaNotificationData
  ): Promise<void> {
    const template = PUSH_NOTIFICATION_TEMPLATES[`solana_${transactionData.transaction_type}`];
    if (!template) {
      throw new Error(`Unknown transaction type: ${transactionData.transaction_type}`);
    }

    await this.sendNotification({
      user_id: userId,
      notification_type: 'solana_transaction',
      title: template.title(transactionData),
      message: template.message(transactionData),
      data: {
        signature: transactionData.signature,
        amount: transactionData.amount,
        token: transactionData.token,
        transaction_type: transactionData.transaction_type,
        network: transactionData.network,
        icon: template.icon,
        color: template.color
      },
      priority: transactionData.transaction_type === 'incoming' ? 'high' : 'normal'
    });
  }

  async sendAutoLinkNotification(
    userId: string,
    autoLinkData: AutoLinkNotificationData
  ): Promise<void> {
    let templateKey = 'auto_link_success';
    
    if (autoLinkData.status === 'failed') {
      templateKey = 'auto_link_failed';
    } else if (autoLinkData.status === 'manual_review') {
      templateKey = 'auto_link_manual_review';
    }

    const template = PUSH_NOTIFICATION_TEMPLATES[templateKey];
    
    await this.sendNotification({
      user_id: userId,
      notification_type: autoLinkData.status === 'success' ? 'auto_link_success' : 'auto_link_failed',
      title: template.title(autoLinkData),
      message: template.message(autoLinkData),
      data: {
        signature: autoLinkData.signature,
        confidence_score: autoLinkData.confidence_score,
        matched_wallet: autoLinkData.matched_wallet,
        amount: autoLinkData.amount,
        status: autoLinkData.status,
        icon: template.icon,
        color: template.color
      },
      priority: autoLinkData.status === 'manual_review' ? 'high' : 'normal'
    });
  }

  async sendPriceAlert(
    userId: string,
    priceData: {
      token: string;
      price: number;
      change: number;
      threshold: number;
      direction: 'up' | 'down';
    }
  ): Promise<void> {
    const template = PUSH_NOTIFICATION_TEMPLATES[`price_alert_${priceData.direction}`];
    
    await this.sendNotification({
      user_id: userId,
      notification_type: 'price_alert',
      title: template.title(priceData),
      message: template.message(priceData),
      data: {
        token: priceData.token,
        price: priceData.price.toString(),
        change: priceData.change.toString(),
        threshold: priceData.threshold.toString(),
        direction: priceData.direction,
        icon: template.icon,
        color: template.color
      },
      priority: Math.abs(priceData.change) > 10 ? 'high' : 'normal'
    });
  }

  async sendSecurityAlert(
    userId: string,
    securityData: {
      type: 'new_device' | 'suspicious';
      location?: string;
      wallet_name?: string;
      details?: string;
    }
  ): Promise<void> {
    const template = PUSH_NOTIFICATION_TEMPLATES[`security_${securityData.type}`];
    
    await this.sendNotification({
      user_id: userId,
      notification_type: 'security_alert',
      title: template.title(securityData),
      message: template.message(securityData),
      data: {
        security_type: securityData.type,
        location: securityData.location,
        wallet_name: securityData.wallet_name,
        details: securityData.details,
        icon: template.icon,
        color: template.color
      },
      priority: 'high'
    });
  }

  private async sendNotification(notification: PushNotificationRequest): Promise<void> {
    try {
      // 1. Store notification in database
      await this.storeNotification(notification);

      // 2. Get user's push subscriptions
      const subscriptions = await this.getUserPushSubscriptions(notification.user_id);

      // 3. Check user's notification preferences
      const preferences = await this.getUserNotificationPreferences(notification.user_id);
      
      if (!this.shouldSendNotification(notification.notification_type, preferences)) {
        console.log(`Notification blocked by user preferences: ${notification.notification_type}`);
        return;
      }

      // 4. Send push notifications to all user devices
      const pushPromises = subscriptions.map(subscription => 
        this.sendPushToDevice(subscription, notification)
      );

      await Promise.allSettled(pushPromises);

      // 5. Update notification status
      await this.updateNotificationStatus(notification.user_id, notification.notification_type, 'sent');

    } catch (error) {
      console.error('Failed to send notification:', error);
      await this.updateNotificationStatus(
        notification.user_id, 
        notification.notification_type, 
        'failed'
      );
      throw error;
    }
  }

  private async storeNotification(notification: PushNotificationRequest): Promise<void> {
    const { error } = await this.supabase
      .from('user_notifications')
      .insert({
        user_id: notification.user_id,
        notification_type: notification.notification_type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        priority: notification.priority || 'normal',
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store notification: ${error.message}`);
    }
  }

  private async getUserPushSubscriptions(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get push subscriptions:', error);
      return [];
    }

    return data || [];
  }

  private async getUserNotificationPreferences(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Return default preferences if none found
      return {
        solana_transaction: true,
        auto_link_success: true,
        auto_link_failed: true,
        price_alert: true,
        security_alert: true,
        push_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null
      };
    }

    return data;
  }

  private shouldSendNotification(
    notificationType: string, 
    preferences: any
  ): boolean {
    // Check if push notifications are globally enabled
    if (!preferences.push_enabled) {
      return false;
    }

    // Check if this specific notification type is enabled
    if (preferences[notificationType] === false) {
      return false;
    }

    // Check quiet hours
    if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(preferences.quiet_hours_start);
      const endHour = parseInt(preferences.quiet_hours_end);

      if (startHour <= endHour) {
        // Same day quiet hours (e.g., 10 PM to 8 AM next day)
        if (currentHour >= startHour && currentHour < endHour) {
          return false;
        }
      } else {
        // Cross-midnight quiet hours (e.g., 10 PM to 8 AM)
        if (currentHour >= startHour || currentHour < endHour) {
          return false;
        }
      }
    }

    return true;
  }

  private async sendPushToDevice(subscription: any, notification: PushNotificationRequest): Promise<void> {
    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          ...notification.data,
          notification_type: notification.notification_type,
          url: this.getNotificationUrl(notification.notification_type, notification.data)
        },
        actions: this.getNotificationActions(notification.notification_type),
        tag: notification.notification_type,
        renotify: notification.priority === 'high',
        requireInteraction: notification.priority === 'high'
      });

      // In production, use web-push library
      // For now, we'll use fetch to Web Push API directly
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${this.vapidKeys.privateKey}`,
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Push failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.error('Failed to send push to device:', error);
      // Mark subscription as invalid if it's a permanent failure
      if (error.message.includes('410') || error.message.includes('404')) {
        await this.markSubscriptionInvalid(subscription.id);
      }
      throw error;
    }
  }

  private getNotificationUrl(notificationType: string, data: any): string {
    switch (notificationType) {
      case 'solana_transaction':
        return `/dashboard/transactions?signature=${data.signature}`;
      case 'auto_link_success':
      case 'auto_link_failed':
        return `/dashboard/auto-link?signature=${data.signature}`;
      case 'price_alert':
        return `/dashboard/portfolio?token=${data.token}`;
      case 'security_alert':
        return '/dashboard/security';
      default:
        return '/dashboard';
    }
  }

  private getNotificationActions(notificationType: string): any[] {
    switch (notificationType) {
      case 'auto_link_failed':
        return [
          { action: 'review', title: 'Review', icon: '/icons/review.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
        ];
      case 'security_alert':
        return [
          { action: 'secure', title: 'Secure Account', icon: '/icons/shield.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
        ];
      default:
        return [
          { action: 'view', title: 'View', icon: '/icons/view.png' }
        ];
    }
  }

  private async markSubscriptionInvalid(subscriptionId: string): Promise<void> {
    await this.supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);
  }

  private async updateNotificationStatus(
    userId: string, 
    notificationType: string, 
    status: 'sent' | 'failed'
  ): Promise<void> {
    await this.supabase
      .from('user_notifications')
      .update({ 
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .eq('status', 'pending');
  }
}

// Edge Function handler
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const notificationService = new SolanaPushNotificationService(
      supabaseUrl, 
      supabaseServiceKey
    );

    const { action, data } = await req.json();

    switch (action) {
      case 'send_solana_transaction':
        await notificationService.sendSolanaTransactionNotification(
          data.user_id,
          data.transaction_data
        );
        break;

      case 'send_auto_link':
        await notificationService.sendAutoLinkNotification(
          data.user_id,
          data.auto_link_data
        );
        break;

      case 'send_price_alert':
        await notificationService.sendPriceAlert(
          data.user_id,
          data.price_data
        );
        break;

      case 'send_security_alert':
        await notificationService.sendSecurityAlert(
          data.user_id,
          data.security_data
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Notification service error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});