'use client';

import { createBrowserClient as originalCreateBrowserClient } from '@supabase/ssr';
import { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { parseCookieValue, cleanupProblemCookies } from './cookieHelper';
import { cleanupSupabaseStorage } from './supabaseCleanup';

// ==========================================
// SINGLE SOURCE OF TRUTH FOR SUPABASE CLIENT
// ==========================================
// This module-level singleton ensures ONLY ONE Supabase client instance exists
// across the entire application, preventing "Multiple GoTrueClient instances" warnings

let singletonInstance: SupabaseClient | null = null;
let singletonUrl: string | null = null;
let singletonKey: string | null = null;
let isInitializing: boolean = false;

/**
 * Enhanced version of createBrowserClient with additional error handling for:
 * - Base64 encoded cookies
 * - Undefined property access
 * - WebSocket connection issues
 * - Cookie parsing errors
 * 
 * NOW WITH SINGLETON PATTERN: Returns the same instance if called with same URL/key
 */
export function createEnhancedBrowserClient(
  supabaseUrl: string, 
  supabaseKey: string,
  options?: any
): SupabaseClient {
  // Return existing instance if we already have one with the same credentials
  if (singletonInstance && singletonUrl === supabaseUrl && singletonKey === supabaseKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log('♻️ [SINGLETON] Returning cached Supabase client instance');
    }
    return singletonInstance;
  }

  // Prevent concurrent initialization
  if (isInitializing) {
    console.warn('⚠️ [SINGLETON] Client is already initializing');
    throw new Error('Supabase client is already being initialized. Please wait.');
  }

  isInitializing = true;
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 [SINGLETON] Creating new Supabase client instance...');
  }
  try {
    // ========================================
    // STEP 1: Aggressive Pre-Initialization Cleanup
    // ========================================
    if (typeof document !== 'undefined') {
      try {
        // Clean up all Supabase-related storage
        cleanupSupabaseStorage();
        if (process.env.NODE_ENV === 'development') {
          console.log('🧹 [SINGLETON] Cleaned up localStorage/sessionStorage');
        }
      } catch (e) {
        console.warn('⚠️ Storage cleanup warning:', e);
      }

      // Clean up problematic cookies
      const removedCookies = cleanupProblemCookies(false);
      if (removedCookies.length > 0 && process.env.NODE_ENV === 'development') {
        console.log(`🧹 [SINGLETON] Removed ${removedCookies.length} problematic cookies`);
      }
      
      // Also add a fallback mechanism for Supabase cookies
      // If you find any cookies with supabase or sb- prefix, let's ensure they're valid
      try {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const cookieParts = cookie.trim().split('=');
          const cookieName = cookieParts[0];
          
          // Check if this is a Supabase-related cookie
          if (cookieName.startsWith('sb-') || cookieName.includes('supabase')) {
            try {
              const cookieValue = cookieParts.slice(1).join('=');
              
              // Try parsing it - if it fails, we'll clean it up
              if (cookieValue) {
                parseCookieValue(cookieValue);
              }
            } catch (parseErr) {
              // If parsing fails, remove the cookie
              console.warn(`Removing problematic Supabase cookie: ${cookieName}`);
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
          }
        });
      } catch (cookieCleanupError) {
        console.error('Error during proactive cookie cleanup:', cookieCleanupError);
      }
    }
    
    // For browser runtime, do NOT pass any options - let @supabase/ssr use document.cookie automatically
    // Passing any options (even empty {}) can trigger the "requires configuring getAll and setAll" error
    // Only pass options if they don't contain a cookies object
    let clientOptions = undefined;
    
    if (options && Object.keys(options).length > 0) {
      // If options are provided, make sure we don't pass through any cookies config
      const { cookies, ...safeOptions } = options as any;
      if (Object.keys(safeOptions).length > 0) {
        clientOptions = safeOptions;
      }
    }

    // Original client creation - cookies will be handled automatically via document.cookie
    const client = originalCreateBrowserClient(supabaseUrl, supabaseKey, clientOptions);
    
    // Ensure client is properly initialized before adding wrappers
    if (!client || typeof client !== 'object') {
      throw new Error('Failed to create Supabase client - invalid client object');
    }
    
    // Safely access auth with null check
    if (!client.auth) {
      throw new Error('Supabase client missing auth property');
    }
    
    // Wrap auth methods with additional error handling
    const originalAuth = client.auth;
    
    // Wrap getSession with error handling (bind to preserve `this`)
    const originalGetSession = originalAuth.getSession;
    originalAuth.getSession = async () => {
      try {
        // Ensure correct `this` binding when calling the original method
        return await (originalGetSession as any).call(originalAuth);
      } catch (error: any) {
        if (error && error.message && (
            error.message.includes('Failed to parse cookie') || 
            error.message.includes('base64') ||
            error.message.includes('Unexpected token')
          )) {
          console.warn('Cookie parsing error detected, attempting recovery:', error.message);
          
          // Try to clean up problematic cookies
          if (typeof document !== 'undefined') {
            cleanupProblemCookies();
          }
          
          // Return null session - better than crashing
          return { data: { session: null }, error: null };
        }
        console.warn('Error in getSession:', error);
        // Return a safe default instead of throwing
        return { data: { session: null }, error };
      }
    };
    
    // Add error handling for onAuthStateChange (bind to preserve `this`)
    const originalOnAuthStateChange = originalAuth.onAuthStateChange;
    // Don't override the method directly to avoid TypeScript errors
    // Instead, add a try-catch wrapper around the callback
    client.auth.onAuthStateChange = (callback) => {
      try {
        return (originalOnAuthStateChange as any).call(originalAuth, (event: AuthChangeEvent, session: Session | null) => {
          try {
            return callback(event, session);
          } catch (callbackError) {
            console.warn('Error in auth state change callback:', callbackError);
          }
        });
      } catch (error) {
        console.warn('Error in onAuthStateChange setup:', error);
        throw error; // Still throw to maintain type compatibility
      }
    };
    
    // Enhance realtime connection handling
    const originalChannel = client.channel;
    client.channel = (name, opts) => {
      const channel = originalChannel.call(client, name, opts);
      
      // Add custom error handling for WebSocket connections
      const originalSubscribe = channel.subscribe;
      channel.subscribe = function enhancedSubscribe(callback) {
        try {
          // Add reconnection logic for WebSocket failures
          return originalSubscribe.call(this, (status) => {
            // Handle WebSocket closed errors
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`WebSocket channel ${name} encountered an error: ${status}`);
              }
              
              // Attempt to reconnect with backoff
              setTimeout(() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`Attempting to reconnect WebSocket channel ${name}`);
                }
                try {
                  originalSubscribe.call(this, callback);
                } catch (reconnectError) {
                  console.error('Error during WebSocket reconnection:', reconnectError);
                }
              }, 3000);
            }
            
            // Call the original callback
            if (typeof callback === 'function') {
              try {
                return callback(status);
              } catch (callbackError) {
                console.warn('Error in channel status callback:', callbackError);
              }
            }
          });
        } catch (subscribeError) {
          console.warn('Error in channel.subscribe:', subscribeError);
          throw subscribeError; // Re-throw to maintain type compatibility
        }
      };
      
      return channel;
    };

    // Store singleton instance
    singletonInstance = client;
    singletonUrl = supabaseUrl;
    singletonKey = supabaseKey;
    isInitializing = false;
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SINGLETON] Successfully created and cached Supabase client instance');
    }

    return client;
  } catch (error) {
    // Reset initialization flag on error
    isInitializing = false;
    console.error('❌ [SINGLETON] Failed to create Supabase client:', error);
    // In case of client creation failure, throw the error
    // This is better than returning a mock client that might hide problems
    throw new Error(`Failed to initialize Supabase client: ${error}`);
  }
}

/**
 * Resets the singleton instance (for debugging/testing only)
 * ⚠️ WARNING: This will break any active subscriptions and log out users!
 */
export function resetSupabaseSingleton() {
  if (singletonInstance) {
    console.warn('⚠️ [SINGLETON] Resetting Supabase client singleton...');
    try {
      // Try to clean up active subscriptions
      singletonInstance.removeAllChannels?.();
    } catch (e) {
      console.warn('Error cleaning up channels:', e);
    }
  }
  singletonInstance = null;
  singletonUrl = null;
  singletonKey = null;
  isInitializing = false;
  console.log('✅ [SINGLETON] Reset complete');
}

// For backwards compatibility
export const createBrowserClient = createEnhancedBrowserClient;
