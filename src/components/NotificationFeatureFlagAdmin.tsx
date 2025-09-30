'use client';

import React, { useEffect, useState } from 'react';
import { featureFlags, FeatureFlag } from '@/lib/featureFlags';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { User } from '@supabase/supabase-js';

interface NotificationFeatureFlagAdminProps {
  isAdmin?: boolean;
}

export default function NotificationFeatureFlagAdmin({ isAdmin = true }: NotificationFeatureFlagAdminProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [notificationFlags, setNotificationFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [updateSuccess, setUpdateSuccess] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'master' | 'channels' | 'types' | 'browser'>('master');

  useEffect(() => {
    async function fetchFlags() {
      try {
        // Get the current user
        const supabase = getSupabaseClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        setUser(user);
        
        // Check if user is admin
        if (!isAdmin) {
          const { data: userData, error: profileError } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('user_id', user!.id)
            .single();
            
          if (profileError) throw profileError;
          if (!userData?.is_admin) {
            setError('Unauthorized: Admin access required');
            setLoading(false);
            return;
          }
        }
        
        // Get all feature flags from the database
        const { data: flagsData, error: flagsError } = await supabase
          .from('feature_flags')
          .select('*')
          .order('name');
          
        if (flagsError) throw flagsError;
        
        setFlags(flagsData);
        
        // Filter notification-related flags
        const notificationRelated = flagsData.filter(flag => 
          flag.name === 'notifications' || 
          flag.name.startsWith('notifications_')
        );
        
        setNotificationFlags(notificationRelated);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching feature flags:', err);
        setError('Failed to load feature flags');
        setLoading(false);
      }
    }
    
    fetchFlags();
  }, [isAdmin]);
  
  const updateFeatureFlag = async (flagName: string, isEnabled: boolean) => {
    try {
      setUpdating(prev => ({ ...prev, [flagName]: true }));
      setUpdateSuccess(prev => ({ ...prev, [flagName]: false }));
      
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('feature_flags')
        .update({ 
          is_enabled: isEnabled,
          last_updated: new Date().toISOString()
        })
        .eq('name', flagName);
        
      if (error) throw error;
      
      // Update local state
      setFlags(prev => prev.map(flag => 
        flag.name === flagName ? { ...flag, is_enabled: isEnabled } : flag
      ));
      
      setNotificationFlags(prev => prev.map(flag => 
        flag.name === flagName ? { ...flag, is_enabled: isEnabled } : flag
      ));
      
      // Clear existing feature flag cache and reset
      featureFlags.clearLocalOverride(flagName);
      
      setUpdateSuccess(prev => ({ ...prev, [flagName]: true }));
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(prev => ({ ...prev, [flagName]: false }));
      }, 3000);
    } catch (err) {
      console.error(`Error updating feature flag ${flagName}:`, err);
      alert(`Failed to update feature flag: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdating(prev => ({ ...prev, [flagName]: false }));
    }
  };
  
  const getTabFlags = () => {
    switch (activeTab) {
      case 'master':
        return notificationFlags.filter(flag => 
          flag.name === 'notifications' || 
          flag.name === 'notifications_api'
        );
      case 'channels':
        return notificationFlags.filter(flag => 
          flag.name === 'notifications_in_app' || 
          flag.name === 'notifications_push' ||
          flag.name === 'notifications_email' || 
          flag.name === 'notifications_sms'
        );
      case 'types':
        return notificationFlags.filter(flag => flag.name.includes('notifications_type_'));
      case 'browser':
        return notificationFlags.filter(flag => 
          flag.name === 'notifications_push_chrome' || 
          flag.name === 'notifications_push_firefox' || 
          flag.name === 'notifications_push_safari'
        );
      default:
        return notificationFlags;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-center mt-4 text-gray-500">Loading notification feature flags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading feature flags
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Notification System Feature Flags
      </h2>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'master' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Master Controls
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'channels' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Notification Channels
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'types' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Notification Types
          </button>
          <button
            onClick={() => setActiveTab('browser')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'browser' 
                ? 'bg-cyan-100 text-cyan-800 border-b-2 border-cyan-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Browser Support
          </button>
        </nav>
      </div>
      
      {/* Feature Flags Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Feature Flag
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Updated
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {getTabFlags().length > 0 ? (
              getTabFlags().map((flag) => (
                <tr key={flag.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                      {flag.name}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {flag.is_enabled ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Enabled
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {flag.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(flag.last_updated || flag.created_at || new Date().toISOString()).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end items-center">
                      {updateSuccess[flag.name] && (
                        <span className="mr-2 text-xs text-green-500">
                          Updated ✓
                        </span>
                      )}
                      <button
                        onClick={() => updateFeatureFlag(flag.name, !flag.is_enabled)}
                        disabled={updating[flag.name]}
                        className={`px-4 py-1 text-sm rounded-md ${
                          flag.is_enabled
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        } transition-colors ${updating[flag.name] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {updating[flag.name] ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </span>
                        ) : flag.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-300">
                  No {activeTab} feature flags found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Feature Flag Explanation */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          About Notification Feature Flags
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Feature flags allow you to control which notification features are enabled in the platform.
          The notification system uses a hierarchical approach:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
          <li><strong>Master Control:</strong> The <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1">notifications</code> flag controls the entire notification system</li>
          <li><strong>Channel Flags:</strong> Control individual notification channels (in-app, push, email, SMS)</li>
          <li><strong>Type Flags:</strong> Control specific notification types (transaction, security, etc.)</li>
          <li><strong>Browser Support:</strong> Control push notifications for specific browsers</li>
        </ul>
      </div>
    </div>
  );
}