'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient, type Session, type User } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ success: boolean, error?: string }>;
  signOut: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  updateUser: (attributes: Record<string, any>) => Promise<boolean>;
}

/**
 * Hook for authentication state and actions
 */
export function useAuth(): UseAuthReturn {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load initial session
  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error loading session:', error);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        setState({
          user: session?.user || null,
          session,
          isLoading: false,
          isAuthenticated: !!session,
        });
      } catch (err) {
        console.error('Failed to load session:', err);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }

    loadSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setState({
            user: session?.user || null,
            session,
            isLoading: false,
            isAuthenticated: !!session,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Sign in with email and password
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean, error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setState({
        user: data.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: true,
      });

      // Refresh the current route to update UI
      router.refresh();
      
      return { success: true };
    } catch (err) {
      console.error('Sign in error:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to sign in' 
      };
    }
  }, [supabase, router]);

  // Sign up with email and password
  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean, error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // For email confirmation flow, the user won't be fully authenticated yet
      if (data.session) {
        setState({
          user: data.user,
          session: data.session,
          isLoading: false,
          isAuthenticated: true,
        });
        
        // Refresh the current route to update UI
        router.refresh();
      }
      
      return { success: true };
    } catch (err) {
      console.error('Sign up error:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to sign up' 
      };
    }
  }, [supabase, router]);

  // Sign out
  const signOut = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        return false;
      }

      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Redirect to home page
      router.push('/');
      router.refresh();
      
      return true;
    } catch (err) {
      console.error('Sign out error:', err);
      return false;
    }
  }, [supabase, router]);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('Error refreshing session:', error);
        return false;
      }

      setState({
        user: data.user,
        session: data.session,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return true;
    } catch (err) {
      console.error('Session refresh error:', err);
      return false;
    }
  }, [supabase]);

  // Update user attributes
  const updateUser = useCallback(async (
    attributes: Record<string, any>
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: attributes,
      });

      if (error) {
        console.error('Error updating user:', error);
        return false;
      }

      setState(prev => ({
        ...prev,
        user: data.user,
      }));
      
      return true;
    } catch (err) {
      console.error('User update error:', err);
      return false;
    }
  }, [supabase]);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateUser,
  };
}