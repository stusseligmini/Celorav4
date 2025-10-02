'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { User, Session, AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import CookieErrorHandler from '../components/CookieErrorHandler';
import WebSocketErrorHandler from '../components/WebSocketErrorHandler';
import { getBrowserClient } from '../lib/supabase-browser';
import { withRetry, validateSupabaseClient, attemptSupabaseRecovery } from '../lib/supabaseErrorHandling';
import { cleanupSupabaseStorage } from '../lib/supabaseCleanup';

interface SupabaseContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  reconnecting: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  supabase: SupabaseClient | null;
  envOk: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hold client instance; don't construct if env is missing
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const envOk = useMemo(() => {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  // Function to safely get session with recovery
  const refreshSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!supabase) {
        // No client available; likely missing env. Degraded mode.
        setSession(null);
        setUser(null);
        setError(null);
        return;
      }
      // Use browser singleton client directly
      setReconnecting(false);
      
      // Try to get the session with retry logic
      const result = await withRetry('get-auth-session', async () => {
        return await supabase.auth.getSession();
      });
      
      const { data: { session }, error } = result;
      
      if (error) {
        console.error('Error getting session after recovery attempts:', error);
        setError(new Error(error.message));
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);
      }
    } catch (err) {
      console.error('Fatal error getting session:', err);
      setError(err instanceof Error ? err : new Error('Unknown error getting session'));
    } finally {
      setLoading(false);
      setReconnecting(false);
    }
  };

  useEffect(() => {
    // Rydd opp i eventuelle korrupte Supabase-data før initialisering
    cleanupSupabaseStorage();
    // Initialize client lazily if env is ok
    if (envOk && !supabase) {
      try {
        const client = getBrowserClient();
        setSupabase(client as unknown as SupabaseClient);
      } catch (e) {
        console.error('Failed to create Supabase client in provider:', e);
      }
    }

    // Get initial session (will no-op if supabase is null)
    refreshSession();

    // Set up automatic recovery
    const healthCheckInterval = setInterval(async () => {
      try {
        if (!supabase) return;
        // Simple health check
        const isValid = await validateSupabaseClient(supabase);
        if (!isValid && !reconnecting) {
          console.log('Detected Supabase client issue, attempting refresh');
          refreshSession();
        }
      } catch (err) {
        console.warn('Error during health check:', err);
      }
    }, 60000); // Check every minute

    // Listen for auth changes with error handling
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      if (supabase) {
        const authStateChange = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, newSession: Session | null) => {
          try {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);
          } catch (err) {
            console.error('Error handling auth state change:', err);
          }
        }
        );
        
        subscription = authStateChange.data.subscription;
      }
    } catch (err) {
      console.error('Error setting up auth state change listener:', err);
    }

    // Clean up
    return () => {
      clearInterval(healthCheckInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (err) {
          console.warn('Error unsubscribing from auth changes:', err);
        }
      }
    };
  }, [envOk, supabase]);

  const signOut = async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        return { error: new Error('Auth not available: missing configuration') };
      }
      const { error } = await withRetry('sign-in', async () => {
        return await supabase.auth.signInWithPassword({
          email,
          password,
        });
      });
      return { error };
    } catch (err) {
      console.error('Error signing in:', err);
      return { error: err instanceof Error ? err : new Error('Unknown error signing in') };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      if (!supabase) {
        return { error: new Error('Auth not available: missing configuration') };
      }
      const { error } = await withRetry('sign-up', async () => {
        return await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata || {}
          }
        });
      });
      return { error };
    } catch (err) {
      console.error('Error signing up:', err);
      return { error: err instanceof Error ? err : new Error('Unknown error signing up') };
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    reconnecting,
    signIn,
    signUp,
    signOut,
    refreshSession,
    supabase,
    envOk,
  };

  return (
    <CookieErrorHandler>
      <SupabaseContext.Provider value={value}>
        {children}
      </SupabaseContext.Provider>
      {/* Add WebSocketErrorHandler to manage WebSocket connection issues */}
      <WebSocketErrorHandler />
    </CookieErrorHandler>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
