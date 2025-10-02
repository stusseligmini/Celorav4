'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { featureFlags } from '@/lib/featureFlags';
import Link from 'next/link';

type NotificationPreference = {
  id: string;
  user_id: string;
  channel: 'in_app' | 'push' | 'email' | 'sms';
  notification_type: string;
  is_enabled: boolean;
};

type NotificationSetting = {
  type: string;
  title: string;
  description: string;
  in_app: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
};

export default function UserNotificationPreferences() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [channelsEnabled, setChannelsEnabled] = useState({
    in_app: true,
    push: false,
    email: false,
    sms: false,
  });
  const [activeTab, setActiveTab] = useState<string>('all');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    loadFeatureFlagsAndPreferences();
  }, []);
  
  async function loadFeatureFlagsAndPreferences() {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      // Initialize feature flags
      await featureFlags.initialize();
      
      // Check if notifications are generally enabled
      const notificationsEnabled = featureFlags.isEnabled('notifications', { defaultValue: true });
      setMasterEnabled(notificationsEnabled);
      
      // Check which channels are enabled
      setChannelsEnabled({
        in_app: featureFlags.isEnabled('notifications_in_app', { defaultValue: true }),
        push: featureFlags.isEnabled('notifications_push', { defaultValue: false }),
        email: featureFlags.isEnabled('notifications_email', { defaultValue: false }),
        sms: featureFlags.isEnabled('notifications_sms', { defaultValue: false }),
      });
      
      // Get all notification type flags
      const supabase = getSupabaseClient();
      
      // Get user's notification preferences
      const { data: userPreferences, error: preferencesError } = await supabase
        .from('user_notification_preferences')
        .select('*');
        
      if (preferencesError) throw preferencesError;
      
      if (userPreferences) {
        setPreferences(userPreferences);
      }
      
      // Get notification types from feature flags
      const { data: notificationTypes, error: typesError } = await supabase
        .from('feature_flags')
        .select('*')
        .like('name', 'notifications_type_%')
        .eq('is_enabled', true);
        
      if (typesError) throw typesError;
      
      // Convert to notification settings structure
      if (notificationTypes) {
        const settings = notificationTypes.map(flag => {
          // Extract type from flag name (e.g., "transaction" from "notifications_type_transaction")
          const type = flag.name.replace('notifications_type_', '');
          
          // Find user preferences for this notification type
          const typePreferences = userPreferences?.filter(
            pref => pref.notification_type === type
          ) || [];
          
          // Default title and description based on type
          const title = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
          const description = flag.description || `Notifications related to ${type}`;
          
          return {
            type,
            title,
            description,
            in_app: typePreferences.find(pref => pref.channel === 'in_app')?.is_enabled ?? true,
            push: typePreferences.find(pref => pref.channel === 'push')?.is_enabled ?? false,
            email: typePreferences.find(pref => pref.channel === 'email')?.is_enabled ?? false,
            sms: typePreferences.find(pref => pref.channel === 'sms')?.is_enabled ?? false,
          };
        });
        
        setNotificationSettings(settings);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      setErrorMessage('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }
  
  const updateSetting = (type: string, channel: 'in_app' | 'push' | 'email' | 'sms', value: boolean) => {
    setNotificationSettings(prev => 
      prev.map(setting => 
        setting.type === type 
          ? { ...setting, [channel]: value } 
          : setting
      )
    );
    setUnsavedChanges(true);
  };
  
  const savePreferences = async () => {
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      const supabase = getSupabaseClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Convert settings to preference records
      const preferencesToUpsert: Partial<NotificationPreference>[] = [];
      
      notificationSettings.forEach(setting => {
        ['in_app', 'push', 'email', 'sms'].forEach(channel => {
          preferencesToUpsert.push({
            user_id: user.id,
            channel: channel as 'in_app' | 'push' | 'email' | 'sms',
            notification_type: setting.type,
            is_enabled: setting[channel as 'in_app' | 'push' | 'email' | 'sms']
          });
        });
      });
      
      // Upsert preferences
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(preferencesToUpsert, {
          onConflict: 'user_id,channel,notification_type'
        });
        
      if (error) throw error;
      
      setSuccessMessage('Notification preferences saved successfully');
      setUnsavedChanges(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setErrorMessage('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };
  
  const getFilteredSettings = () => {
    switch (activeTab) {
      case 'transactions':
        return notificationSettings.filter(setting => 
          setting.type === 'transaction' || 
          setting.type.startsWith('transaction_')
        );
      case 'security':
        return notificationSettings.filter(setting => 
          setting.type === 'security' || 
          setting.type.startsWith('security_')
        );
      case 'account':
        return notificationSettings.filter(setting => 
          setting.type === 'account' || 
          setting.type.startsWith('account_')
        );
      default:
        return notificationSettings;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          Notification Preferences
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize how you receive notifications from Celora
        </p>
      </div>
      
      <div className="p-6">
        {/* System Status */}
        {!masterEnabled && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  Notifications are currently disabled system-wide.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'all' 
                  ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'transactions' 
                  ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'security' 
                  ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'account' 
                  ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Account
            </button>
          </nav>
        </div>
        
        {/* Channel headers */}
        <div className="grid grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-4">
          <div className="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Notification Type
          </div>
          <div className="col-span-1 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            In-app
            {!channelsEnabled.in_app && <p className="text-red-600 text-xs">(Disabled)</p>}
          </div>
          <div className="col-span-1 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            Push
            {!channelsEnabled.push && <p className="text-red-600 text-xs">(Disabled)</p>}
          </div>
          <div className="col-span-1 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
            {!channelsEnabled.email && <p className="text-red-600 text-xs">(Disabled)</p>}
          </div>
        </div>
        
        {/* Notification settings */}
        <div className="space-y-4">
          {getFilteredSettings().length > 0 ? (
            getFilteredSettings().map(setting => (
              <div key={setting.type} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div className="col-span-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{setting.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={setting.in_app}
                        disabled={!masterEnabled || !channelsEnabled.in_app}
                        onChange={(e) => updateSetting(setting.type, 'in_app', e.target.checked)}
                      />
                      <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-disabled:bg-gray-300 peer-disabled:peer-checked:bg-cyan-300 transition-colors ${!masterEnabled || !channelsEnabled.in_app ? 'opacity-50' : ''}`}>
                        <span className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all peer-checked:left-5`}></span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={setting.push}
                        disabled={!masterEnabled || !channelsEnabled.push}
                        onChange={(e) => updateSetting(setting.type, 'push', e.target.checked)}
                      />
                      <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-disabled:bg-gray-300 peer-disabled:peer-checked:bg-cyan-300 transition-colors ${!masterEnabled || !channelsEnabled.push ? 'opacity-50' : ''}`}>
                        <span className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all peer-checked:left-5`}></span>
                      </div>
                    </label>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={setting.email}
                        disabled={!masterEnabled || !channelsEnabled.email}
                        onChange={(e) => updateSetting(setting.type, 'email', e.target.checked)}
                      />
                      <div className={`relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-disabled:bg-gray-300 peer-disabled:peer-checked:bg-cyan-300 transition-colors ${!masterEnabled || !channelsEnabled.email ? 'opacity-50' : ''}`}>
                        <span className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-all peer-checked:left-5`}></span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No notification settings found for this category
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button 
            onClick={savePreferences} 
            disabled={saving || !unsavedChanges}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              !unsavedChanges 
                ? 'bg-gray-400 cursor-not-allowed' 
                : saving 
                  ? 'bg-cyan-600' 
                  : 'bg-cyan-600 hover:bg-cyan-700'
            } flex items-center`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-2" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
