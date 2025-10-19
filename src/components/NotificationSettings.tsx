'use client';

import React, { useState, useEffect } from 'react';
import { 
  usePushNotifications, 
  useNotificationPreferences,
  useUserNotifications
} from '@/hooks/usePushNotifications';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className = '' }) => {
  const {
    isSupported,
    isSubscribed,
    loading: subscriptionLoading,
    error: subscriptionError,
    subscribeToPush,
    unsubscribeFromPush,
    clearError: clearSubscriptionError
  } = usePushNotifications();

  const {
    preferences,
    loading: preferencesLoading,
    saving,
    error: preferencesError,
    toggleNotificationType,
    setQuietHours
  } = useNotificationPreferences();

  const { unreadCount } = useUserNotifications();

  const [quietHoursStart, setQuietHoursStart] = useState(22);
  const [quietHoursEnd, setQuietHoursEnd] = useState(8);

  // Initialize quiet hours from preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.quiet_hours_start) {
        setQuietHoursStart(parseInt(preferences.quiet_hours_start.split(':')[0]));
      }
      if (preferences.quiet_hours_end) {
        setQuietHoursEnd(parseInt(preferences.quiet_hours_end.split(':')[0]));
      }
    }
  }, [preferences]);

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  };

  const handleToggleNotification = async (
    type: string, 
    enabled: boolean
  ) => {
    await toggleNotificationType(type as any, enabled);
  };

  const handleQuietHoursChange = async () => {
    await setQuietHours(quietHoursStart, quietHoursEnd);
  };

  if (!isSupported) {
    return (
      <div className={`notification-settings ${className}`}>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <h3 className="font-bold">Push Notifications Not Supported</h3>
          <p className="text-sm">Your browser doesn't support push notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`notification-settings space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🔔 Notification Settings</h2>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* Error Messages */}
      {(subscriptionError || preferencesError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <div className="flex justify-between items-start">
            <div>
              {subscriptionError && <div>Subscription: {subscriptionError}</div>}
              {preferencesError && <div>Preferences: {preferencesError}</div>}
            </div>
            <button
              onClick={() => {
                clearSubscriptionError();
                // clearPreferencesError(); // Add this if available
              }}
              className="text-red-500 hover:text-red-700 font-bold ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Push Notification Toggle */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">📱 Push Notifications</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white font-medium">Enable Push Notifications</div>
            <div className="text-sm text-gray-400">
              Receive notifications when the app is closed
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSubscribed}
              onChange={handleToggleSubscription}
              disabled={subscriptionLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>

        {subscriptionLoading && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
            <span>Setting up push notifications...</span>
          </div>
        )}

        {!isSubscribed && (
          <div className="text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded p-3">
            💡 Enable push notifications to receive instant alerts for Solana transactions, auto-link updates, and security alerts.
          </div>
        )}
      </div>

      {/* Notification Type Settings */}
      {preferences && isSubscribed && (
        <div className="bg-gray-900/50 backdrop-blur border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">🎛️ Notification Types</h3>
          
          <div className="space-y-4">
            <NotificationToggle
              icon="⚡"
              title="Solana Transactions"
              description="Incoming/outgoing SOL and SPL token transfers"
              enabled={preferences.solana_transaction}
              onChange={(enabled) => handleToggleNotification('solana_transaction', enabled)}
              disabled={saving}
            />

            <NotificationToggle
              icon="🔗"
              title="Auto-Link Success"
              description="Successful automatic transaction linking"
              enabled={preferences.auto_link_success}
              onChange={(enabled) => handleToggleNotification('auto_link_success', enabled)}
              disabled={saving}
            />

            <NotificationToggle
              icon="⚠️"
              title="Auto-Link Review Required"
              description="Manual review needed for low-confidence matches"
              enabled={preferences.auto_link_failed}
              onChange={(enabled) => handleToggleNotification('auto_link_failed', enabled)}
              disabled={saving}
            />

            <NotificationToggle
              icon="📈"
              title="Price Alerts"
              description="Token price movements and thresholds"
              enabled={preferences.price_alert}
              onChange={(enabled) => handleToggleNotification('price_alert', enabled)}
              disabled={saving}
            />

            <NotificationToggle
              icon="🔐"
              title="Security Alerts"
              description="Suspicious activity and login notifications"
              enabled={preferences.security_alert}
              onChange={(enabled) => handleToggleNotification('security_alert', enabled)}
              disabled={saving}
              important
            />
          </div>

          {saving && (
            <div className="mt-4 flex items-center space-x-2 text-sm text-cyan-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
              <span>Saving preferences...</span>
            </div>
          )}
        </div>
      )}

      {/* Quiet Hours */}
      {preferences && isSubscribed && (
        <div className="bg-gray-900/50 backdrop-blur border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">🌙 Quiet Hours</h3>
          
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-3">
              Don't send notifications during these hours (except critical security alerts)
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <select
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <select
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleQuietHoursChange}
              disabled={saving}
              className="mt-3 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Saving...' : 'Save Quiet Hours'}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Current quiet hours: {quietHoursStart.toString().padStart(2, '0')}:00 - {quietHoursEnd.toString().padStart(2, '0')}:00
            {quietHoursStart > quietHoursEnd && ' (next day)'}
          </div>
        </div>
      )}

      {/* Test Notification */}
      {isSubscribed && (
        <div className="bg-gray-900/50 backdrop-blur border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">🧪 Test Notifications</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <TestNotificationButton
              type="solana_transaction"
              label="SOL Transfer"
              icon="⚡"
            />
            <TestNotificationButton
              type="auto_link_success"
              label="Auto-Link"
              icon="🔗"
            />
            <TestNotificationButton
              type="price_alert"
              label="Price Alert"
              icon="📈"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface NotificationToggleProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  important?: boolean;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  icon,
  title,
  description,
  enabled,
  onChange,
  disabled = false,
  important = false
}) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${important ? 'bg-orange-400/10 border border-orange-400/20' : 'bg-gray-800/50'}`}>
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-white font-medium flex items-center space-x-2">
            <span>{title}</span>
            {important && <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">IMPORTANT</span>}
          </div>
          <div className="text-sm text-gray-400">{description}</div>
        </div>
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 peer-disabled:opacity-50"></div>
      </label>
    </div>
  );
};

interface TestNotificationButtonProps {
  type: string;
  label: string;
  icon: string;
}

const TestNotificationButton: React.FC<TestNotificationButtonProps> = ({ type, label, icon }) => {
  const [sending, setSending] = useState(false);

  const sendTestNotification = async () => {
    setSending(true);
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        console.log(`Test ${type} notification sent`);
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={sendTestNotification}
      disabled={sending}
      className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
    >
      <span>{sending ? '⏳' : icon}</span>
      <span>{sending ? 'Sending...' : label}</span>
    </button>
  );
};

export default NotificationSettings;