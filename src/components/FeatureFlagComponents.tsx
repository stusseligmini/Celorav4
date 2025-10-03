'use client';

import React, { useEffect, useState } from 'react';
import { featureFlags, useFeatureFlag, useFeatureFlagVariant } from '@/lib/featureFlags';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { User } from '@supabase/supabase-js';

interface FeatureFlagProviderProps {
  children: React.ReactNode;
  initialUserContext?: {
    userId?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
}

/**
 * Provider component for feature flags
 * Initializes the feature flag system and provides user context
 */
export function FeatureFlagProvider({ children, initialUserContext }: FeatureFlagProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get the current user from Supabase
    async function getCurrentUser() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting user:', error);
          return null;
        }
        
        return user;
      } catch (err) {
        console.error('Error in getCurrentUser:', err);
        return null;
      }
    }
    
    // Initialize feature flags with user context
    async function initFeatureFlags() {
      try {
        // Get current user
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Merge provided context with user data
        const userContext = {
          ...initialUserContext,
          userId: currentUser?.id,
          email: currentUser?.email,
          // Get user role from user_metadata if available
          role: currentUser?.user_metadata?.role as string | undefined,
          // Get additional user attributes if needed
        };
        
        await featureFlags.initialize(userContext);
        
        // Initialize notification system with the same user context
        const notificationManager = (await import('@/lib/notificationManager')).notificationManager;
        await notificationManager.initialize(userContext);
        
        // Log feature flag status for notification system
        const logger = (await import('@/lib/logger')).createLogger('FeatureFlags');
        const notificationsEnabled = featureFlags.isEnabled('notifications', { defaultValue: true });
        const channelFlags = {
          in_app: featureFlags.isEnabled('notifications_in_app', { defaultValue: true }),
          push: featureFlags.isEnabled('notifications_push', { defaultValue: false }),
          email: featureFlags.isEnabled('notifications_email', { defaultValue: false }),
          sms: featureFlags.isEnabled('notifications_sms', { defaultValue: false })
        };
        
        logger.info('Notification system initialized with feature flags', {}, {
          master: notificationsEnabled,
          channels: channelFlags
        });
        
        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize feature flags:', err);
        setError(err instanceof Error ? err : new Error('Unknown error initializing feature flags'));
        // Do not block UI on failure
        setInitialized(true);
      }
    }

    initFeatureFlags();

    // Set up auth state listener
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const user = session?.user || null;
          setUser(user);
          
          if (user) {
            featureFlags.updateUserContext({
              userId: user.id,
              email: user.email,
              role: user.user_metadata?.role as string | undefined,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          featureFlags.updateUserContext({
            userId: undefined,
            email: undefined,
            role: undefined,
          });
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
      featureFlags.cleanup();
    };
  }, [initialUserContext]);
  // Never block rendering due to feature flag init issues; log only in dev
  if (error && process.env.NODE_ENV !== 'production') {
    console.warn('Feature flags init error (dev):', error);
  }

  // Render children even if not initialized yet
  // Feature flags will use default values until initialized
  return <>{children}</>;
}

/**
 * Component that conditionally renders content based on a feature flag
 */
export function FeatureFlag({ 
  name, 
  fallback = null, 
  defaultValue = false,
  children 
}: {
  name: string;
  fallback?: React.ReactNode;
  defaultValue?: boolean;
  children: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(name, { defaultValue });

  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that renders different content based on a feature flag variant
 */
export function FeatureFlagVariant({
  name,
  variants,
  defaultVariant = 'control'
}: {
  name: string;
  variants: Record<string, React.ReactNode>;
  defaultVariant?: string;
}) {
  const variant = useFeatureFlagVariant(name, defaultVariant);
  const content = variants[variant] || variants[defaultVariant] || null;

  return <>{content}</>;
}

/**
 * Debug component to display current feature flag state
 * Only use in development or admin panels
 */
export function FeatureFlagDebugger() {
  const [flags, setFlags] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Get all flags
    const allFlags = featureFlags.getAllFlags();
    setFlags(allFlags);

    // Set up interval to refresh flags
    const interval = setInterval(() => {
      setFlags(featureFlags.getAllFlags());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleOverride = (flagName: string, currentValue: boolean) => {
    const newValue = !currentValue;
    featureFlags.setLocalOverride(flagName, newValue);
    setOverrides({ ...overrides, [flagName]: newValue });
  };

  if (!flags.length) {
    return <div className="p-4 text-sm text-gray-500">Loading feature flags...</div>;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-w-3xl">
      <h3 className="text-lg font-medium mb-4">Feature Flag Debugger</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flags.map((flag) => (
              <tr key={flag.name}>
                <td className="px-3 py-2 text-sm font-mono">{flag.name}</td>
                <td className="px-3 py-2">
                  {featureFlags.isEnabled(flag.name) ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Enabled</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Disabled</span>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">{flag.description}</td>
                <td className="px-3 py-2 text-sm">
                  <button
                    onClick={() => handleToggleOverride(flag.name, overrides[flag.name] || false)}
                    className="px-3 py-1 text-xs text-white font-medium bg-indigo-600 hover:bg-indigo-700 rounded"
                  >
                    {overrides[flag.name] ? 'Remove Override' : 'Override'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
