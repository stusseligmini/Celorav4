'use client';
import { createBrowserClient, resetSupabaseSingleton } from './supabaseClient';

/**
 * Gets the browser Supabase client singleton instance
 * This is a thin wrapper around createBrowserClient that provides consistent configuration
 * 
 * The actual singleton logic lives in supabaseClient.ts - this just ensures we always
 * use the same configuration (storageKey, auth settings, realtime params)
 */
export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anon) {
    console.error('❌ [BROWSER] Supabase environment variables missing!', {
      hasUrl: !!url,
      hasAnon: !!anon
    });
    throw new Error('Supabase configuration is missing. Please check environment variables.');
  }
  
  try {
    // Delegate to the main singleton with consistent configuration
    // The createBrowserClient function handles ALL singleton logic, cleanup, and caching
    return createBrowserClient(url, anon, {
      auth: {
        storageKey: 'sb-zpcycakwdvymqhwvakrv-auth',
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: { params: { eventsPerSecond: 3 } },
    });
  } catch (error) {
    console.error('❌ [BROWSER] Failed to get Supabase client:', error);
    throw error;
  }
}

/**
 * Force reset the singleton client (delegates to main singleton)
 * Useful for debugging or when you need to reinitialize
 * ⚠️ WARNING: This will break any active subscriptions and log out users!
 */
export function resetBrowserClient() {
  console.log('🔄 [BROWSER] Delegating reset to main singleton...');
  resetSupabaseSingleton();
}