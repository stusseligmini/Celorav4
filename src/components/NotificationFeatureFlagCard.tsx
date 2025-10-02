'use client';

import React, { useEffect, useState } from 'react';
import { featureFlags } from '@/lib/featureFlags';
import Link from 'next/link';

export default function NotificationFeatureFlagCard() {
  const [flagStatus, setFlagStatus] = useState({
    masterEnabled: false,
    inAppEnabled: false,
    pushEnabled: false,
    emailEnabled: false,
    smsEnabled: false,
    apiEnabled: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatureFlagStatus() {
      try {
        // Initialize feature flags
        await featureFlags.initialize();
        
        // Get status of key notification feature flags
        setFlagStatus({
          masterEnabled: featureFlags.isEnabled('notifications', { defaultValue: true }),
          inAppEnabled: featureFlags.isEnabled('notifications_in_app', { defaultValue: true }),
          pushEnabled: featureFlags.isEnabled('notifications_push', { defaultValue: false }),
          emailEnabled: featureFlags.isEnabled('notifications_email', { defaultValue: false }),
          smsEnabled: featureFlags.isEnabled('notifications_sms', { defaultValue: false }),
          apiEnabled: featureFlags.isEnabled('notifications_api', { defaultValue: true }),
        });
      } catch (error) {
        console.error('Error loading feature flag status:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFeatureFlagStatus();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Notification Feature Flags
        </h2>
        <Link href="/admin/notifications/flags" className="text-sm font-medium text-cyan-600 hover:text-cyan-500">
          Manage All Flags →
        </Link>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Master Toggle</p>
                <p className="text-xs text-gray-500">Controls the entire notification system</p>
              </div>
              <div>
                {flagStatus.masterEnabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">In-App Notifications</p>
                <p className="text-xs text-gray-500">User interface notifications</p>
              </div>
              <div>
                {flagStatus.inAppEnabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Push Notifications</p>
                <p className="text-xs text-gray-500">Browser push notifications</p>
              </div>
              <div>
                {flagStatus.pushEnabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</p>
                <p className="text-xs text-gray-500">Email delivery of notifications</p>
              </div>
              <div>
                {flagStatus.emailEnabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SMS Notifications</p>
                <p className="text-xs text-gray-500">SMS text message notifications</p>
              </div>
              <div>
                {flagStatus.smsEnabled ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="pt-4">
              <Link 
                href="/admin/notifications/flags"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Manage Feature Flags
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
