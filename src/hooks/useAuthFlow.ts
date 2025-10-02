/**
 * Authentication middleware for handling post-login flow
 * Determines where to redirect users after successful authentication
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '../lib/supabase-browser';

interface AuthState {
  user: any | null;
  needsSeedPhrase: boolean;
  loading: boolean;
  isNewUser: boolean;
}

export function useAuthFlow(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    needsSeedPhrase: false,
    loading: true,
    isNewUser: false
  });

  const router = useRouter();

  useEffect(() => {
    const handleAuthFlow = async () => {
      try {
        // Debug environment variables
        console.log('🔍 Environment check:', {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error('❌ Missing environment variables');
          setAuthState({ user: null, needsSeedPhrase: false, loading: false, isNewUser: false });
          return;
        }
        let supabase;
        try {
          supabase = getBrowserClient();
        } catch (e) {
          console.error('Failed to init Supabase client in useAuthFlow:', e);
          setAuthState({ user: null, needsSeedPhrase: false, loading: false, isNewUser: false });
          return;
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setAuthState({ user: null, needsSeedPhrase: false, loading: false, isNewUser: false });
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('has_seed_phrase, created_at, wallet_type')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          setAuthState({ user, needsSeedPhrase: false, loading: false, isNewUser: false });
          return;
        }

        // Check if user is new (created within last 10 minutes)
        const createdAt = new Date(profile.created_at);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const isNewUser = createdAt > tenMinutesAgo;

        // Only suggest seed phrase for:
        // 1. New email users (not seed phrase users)
        // 2. Users who don't already have seed phrase backup
        const isEmailUser = profile.wallet_type !== 'seed_phrase';
        const needsSeedPhrase = isNewUser && isEmailUser && !profile.has_seed_phrase;

        setAuthState({
          user,
          needsSeedPhrase,
          loading: false,
          isNewUser
        });

      } catch (err) {
        console.error('Auth flow error:', err);
        setAuthState({ user: null, needsSeedPhrase: false, loading: false, isNewUser: false });
      }
    };

    handleAuthFlow();

    // Listen for auth changes
    let supabase;
    try {
      supabase = getBrowserClient();
    } catch {
      return; // no listener if client missing
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_IN' && session) {
        // Refresh auth flow on sign in
        handleAuthFlow();
      } else if (event === 'SIGNED_OUT') {
        setAuthState({ user: null, needsSeedPhrase: false, loading: false, isNewUser: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}

// Alias for compatibility
export const useAuth = useAuthFlow;
