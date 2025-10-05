// ================================================================
// SUPABASE CLIENT (BROWSER)
// Purpose: Browser-side Supabase client for frontend components
// Security: Uses public anon key, respects RLS policies
// Usage: Import in React components, client-side hooks, browser code
// ================================================================

'use client'

import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Browser-side Supabase client
 * 
 * This client is safe to use in browser environments and automatically
 * handles user authentication, session management, and respects RLS policies.
 * 
 * Features:
 * - Automatic session management
 * - Real-time subscriptions
 * - RLS policy enforcement
 * - Client-side authentication
 * - Secure browser operations
 * 
 * IMPORTANT: Never use server-side operations in browser code.
 * This client only has anon/authenticated user permissions.
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

/**
 * Get the current authenticated user
 * 
 * @returns Promise with user data or null if not authenticated
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Error getting current user:', error)
    return null
  }
  
  return user
}

/**
 * Get the current session
 * 
 * @returns Promise with session data or null if no active session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Error getting current session:', error)
    return null
  }
  
  return session
}

/**
 * Sign out the current user
 * 
 * @returns Promise with sign out result
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
  
  return true
}

/**
 * Check if code is running in browser environment
 * 
 * @returns true if in browser, false if in server
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Validate that we're running in a browser environment
 * 
 * Call this function to ensure browser client isn't used server-side
 */
export function ensureBrowserEnvironment() {
  if (!isBrowser()) {
    throw new Error(
      'Browser Supabase client cannot be used in server environment. ' +
      'Use server-side client from @/lib/supabase/server instead.'
    )
  }
}

// Export types for convenience
export type { Database } from './types'