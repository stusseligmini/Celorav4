'use client';

import React, { useState, useEffect } from 'react';
import { 
  usePushNotifications, 
  useNotificationPreferences, 
  useSolanaNotifications,
  useUserNotifications 
} from '@/hooks/usePushNotifications';

interface NotificationTemplate {
  event_type: string;
  title_template: string;
  body_template: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
}

export default function NotificationSettings() {
  const { 
    subscription,
    isSupported,
    isSubscribed,
    loading: pushLoading,
    error: pushError,
    subscribeToPush,
    unsubscribeFromPush,
    clearError
  } = usePushNotifications();

  const {
    preferences,
    loading: prefsLoading,
    saving,
    error: prefsError,
    toggleNotificationType,
    setQuietHours
  } = useNotificationPreferences();

  const {
    sending,
    error: sendError,
    sendSolanaTransactionNotification
  } = useSolanaNotifications();

  const {
    notifications,
    unreadCount,
    loading: notifLoading
  } = useUserNotifications();

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [templates] = useState<NotificationTemplate[]>([
    {
      event_type: 'solana_received',
      title_template: '💰 Solana Received',
      body_template: 'You received {amount} SOL',
      priority: 'normal',
      is_active: true
    },
    {
      event_type: 'solana_sent', 
      title_template: '📤 Solana Sent',
      body_template: 'You sent {amount} SOL',
      priority: 'normal',
      is_active: true
    },
    {
      event_type: 'auto_link_success',
      title_template: '✅ Auto-Link Success',
      body_template: 'Transaction auto-linked with {confidence}% confidence',
      priority: 'high',
      is_active: true
    },
    {
      event_type: 'auto_link_failed',
      title_template: '⚠️ Auto-Link Review Required',
      body_template: 'Transaction requires manual review',
      priority: 'urgent',
      is_active: true
    }
  ]);

  const loading = pushLoading || prefsLoading || notifLoading;

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPush();
      }
    }
  };

  const handleCategoryToggle = async (eventType: string, enabled: boolean) => {
    // Map event types to preference keys
    if (eventType === 'solana_received' || eventType === 'solana_sent') {
      await toggleNotificationType('solana_transaction', enabled);
    } else if (eventType === 'auto_link_success') {
      await toggleNotificationType('auto_link_success', enabled);
    } else if (eventType === 'auto_link_failed') {
      await toggleNotificationType('auto_link_failed', enabled);
    }
  };

  const handleTestNotification = async () => {
    try {
      // Send a test notification using the Solana notification system
      await sendSolanaTransactionNotification({
        user_id: 'test',
        transaction_data: {
          signature: 'test-signature',
          amount: '1.0',
          transaction_type: 'incoming',
          network: 'mainnet'
        }
      });
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'solana_received':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'solana_sent':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'auto_link_success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'auto_link_failed':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM1.751 10.602C3.559 5.277 8.295 1.5 14 1.5s10.441 3.777 12.249 9.102-.814 11.633-6.139 13.441S8.477 23.229 6.669 17.904 1.943 6.271 7.268 4.463" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM1.751 10.602C3.559 5.277 8.295 1.5 14 1.5s10.441 3.777 12.249 9.102-.814 11.633-6.139 13.441S8.477 23.229 6.669 17.904 1.943 6.271 7.268 4.463" />
          </svg>
          Notification Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure your Solana transaction and auto-link notifications
        </p>
      </div>

      {/* Permission Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Status</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${notificationPermission === 'granted' ? 'bg-green-500' : notificationPermission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
              <div>
                <h4 className="font-medium text-gray-900">Browser Notifications</h4>
                <p className="text-sm text-gray-600">
                  Status: {notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Blocked' : 'Not requested'}
                </p>
              </div>
            </div>
            {notificationPermission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enable Notifications
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <h4 className="font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-600">
                  VAPID Support: {isSupported ? 'Supported' : 'Not supported'}
                </p>
              </div>
            </div>
            {isSupported && notificationPermission === 'granted' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600">✓ Ready</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Notification */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Notifications</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Send Test Notification</h4>
            <p className="text-sm text-gray-600">
              Verify that notifications are working correctly
            </p>
          </div>
          <button
            onClick={handleTestNotification}
            disabled={notificationPermission !== 'granted' || testNotificationSent}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              testNotificationSent 
                ? 'bg-green-100 text-green-800' 
                : notificationPermission !== 'granted'
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {testNotificationSent ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Test Sent!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM1.751 10.602C3.559 5.277 8.295 1.5 14 1.5s10.441 3.777 12.249 9.102-.814 11.633-6.139 13.441S8.477 23.229 6.669 17.904 1.943 6.271 7.268 4.463" />
                </svg>
                Send Test
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Categories */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Categories</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose which types of notifications you want to receive
        </p>

        <div className="space-y-4">
          {templates.map((template: any) => (
            <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getEventTypeIcon(template.event_type)}
                <div>
                  <h4 className="font-medium text-gray-900">{template.title_template}</h4>
                  <p className="text-sm text-gray-600">{template.body_template}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(template.priority)}`}>
                  {template.priority}
                </span>
              </div>
              <button
                onClick={() => {
                  // Check current state based on preferences
                  const isEnabled = (() => {
                    if (template.event_type === 'solana_received' || template.event_type === 'solana_sent') {
                      return preferences?.solana_transaction ?? true;
                    } else if (template.event_type === 'auto_link_success') {
                      return preferences?.auto_link_success ?? true;
                    } else if (template.event_type === 'auto_link_failed') {
                      return preferences?.auto_link_failed ?? true;
                    }
                    return false;
                  })();
                  handleCategoryToggle(template.event_type, !isEnabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  (() => {
                    if (template.event_type === 'solana_received' || template.event_type === 'solana_sent') {
                      return preferences?.solana_transaction ? 'bg-blue-600' : 'bg-gray-200';
                    } else if (template.event_type === 'auto_link_success') {
                      return preferences?.auto_link_success ? 'bg-blue-600' : 'bg-gray-200';
                    } else if (template.event_type === 'auto_link_failed') {
                      return preferences?.auto_link_failed ? 'bg-blue-600' : 'bg-gray-200';
                    }
                    return 'bg-gray-200';
                  })()
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    (() => {
                      if (template.event_type === 'solana_received' || template.event_type === 'solana_sent') {
                        return preferences?.solana_transaction ? 'translate-x-6' : 'translate-x-1';
                      } else if (template.event_type === 'auto_link_success') {
                        return preferences?.auto_link_success ? 'translate-x-6' : 'translate-x-1';
                      } else if (template.event_type === 'auto_link_failed') {
                        return preferences?.auto_link_failed ? 'translate-x-6' : 'translate-x-1';
                      }
                      return 'translate-x-1';
                    })()
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Subscriptions</h3>
        
        {!isSubscribed ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM1.751 10.602C3.559 5.277 8.295 1.5 14 1.5s10.441 3.777 12.249 9.102-.814 11.633-6.139 13.441S8.477 23.229 6.669 17.904 1.943 6.271 7.268 4.463" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Subscriptions</h4>
            <p className="text-gray-600 mb-4">Enable notifications to start receiving updates</p>
            {notificationPermission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enable Notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">Browser Subscription</p>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(subscription?.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => unsubscribeFromPush()}
                className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
              >
                Unsubscribe
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Batch Notifications</h4>
              <p className="text-sm text-gray-600">
                Group multiple notifications together to reduce noise
              </p>
            </div>
            <button
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1" />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Sound Notifications</h4>
              <p className="text-sm text-gray-600">
                Play sound when receiving important notifications
              </p>
            </div>
            <button
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Desktop Notifications</h4>
              <p className="text-sm text-gray-600">
                Show notifications on desktop even when browser is closed
              </p>
            </div>
            <button
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600"
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Settings
        </button>
      </div>
    </div>
  );
}