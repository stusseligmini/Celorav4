'use client';

import { createBrowserClient as originalCreateBrowserClient } from '@supabase/ssr';
import { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { parseCookieValue } from './cookieHelper';

// Global instance counter for debugging
let instanceCounter = 0;

/**
 * Enhanced version of createBrowserClient with additional error handling for:
 * - Base64 encoded cookies
 * - Undefined property access
 * - WebSocket connection issues
 */
export function createEnhancedBrowserClient(
  supabaseUrl: string, 
  supabaseKey: string,
  options?: any
): SupabaseClient {
  try {
    instanceCounter++;
    if (instanceCounter > 1) {
      console.warn(`Multiple Supabase client instances detected (${instanceCounter}). Consider using the singleton pattern.`);
    }

    // Original client creation
    const client = originalCreateBrowserClient(supabaseUrl, supabaseKey, options);
    
    // Wrap auth methods with additional error handling
    const originalAuth = client.auth;
    
    // Wrap getSession with error handling
    const originalGetSession = originalAuth.getSession;
    originalAuth.getSession = async () => {
      try {
        return await originalGetSession();
      } catch (error: any) {
        if (error && error.message && (
            error.message.includes('Failed to parse cookie') || 
            error.message.includes('base64')
          )) {
          console.warn('Cookie parsing error detected, attempting recovery:', error.message);
          // Return null session - better than crashing
          return { data: { session: null }, error: null };
        }
        console.warn('Error in getSession:', error);
        // Return a safe default instead of throwing
        return { data: { session: null }, error };
      }
    };
    
    // Add error handling for onAuthStateChange
    const originalOnAuthStateChange = originalAuth.onAuthStateChange;
    // Don't override the method directly to avoid TypeScript errors
    // Instead, add a try-catch wrapper around the callback
    client.auth.onAuthStateChange = (callback) => {
      try {
        return originalOnAuthStateChange((event, session) => {
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

    return client;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    // In case of client creation failure, throw the error
    // This is better than returning a mock client that might hide problems
    throw new Error(`Failed to initialize Supabase client: ${error}`);
  }
}

// For backwards compatibility
export const createBrowserClient = createEnhancedBrowserClient;