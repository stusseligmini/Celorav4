// ================================================================
// SUPABASE SERVER CLIENT
// Purpose: Server-side Supabase client for API routes and server functions
// Security: Uses service role key for admin operations
// Usage: Import in API routes, server actions, middleware
// ================================================================

import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Server-side Supabase client with service role privileges
 * 
 * IMPORTANT: This client bypasses RLS policies and has full database access.
 * Only use in server-side code (API routes, server actions, middleware).
 * Never expose this client to the browser.
 * 
 * Features:
 * - Full database access (bypasses RLS)
 * - User management operations
 * - Administrative functions
 * - Secure server-side operations
 */
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

/**
 * Create a Supabase client for a specific user context
 * 
 * Use this when you need to perform operations on behalf of a specific user
 * while still maintaining server-side privileges.
 * 
 * @param accessToken - User's JWT access token
 * @returns Supabase client configured for the specific user
 */
export function createServerClientForUser(accessToken: string) {
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Validate that we're running in a server environment
 * 
 * Call this function at the start of server-only code to ensure
 * the server client isn't accidentally used in the browser.
 */
export function ensureServerEnvironment() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Server Supabase client cannot be used in browser environment. ' +
      'Use client-side client from @/lib/supabase/client instead.'
    )
  }
}

/**
 * Get user from JWT token for server-side operations
 * 
 * @param token - JWT access token
 * @returns User object or null if invalid
 */
export async function getUserFromToken(token: string) {
  ensureServerEnvironment()
  
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token)
    
    if (error) {
      console.error('Error getting user from token:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Failed to validate user token:', error)
    return null
  }
}

// Export types for convenience
export type { Database } from './types'