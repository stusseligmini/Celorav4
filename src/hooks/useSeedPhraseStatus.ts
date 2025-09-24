'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface SeedPhraseStatus {
  needsSetup: boolean;
  loading: boolean;
  isNewUser: boolean;
}

export function useSeedPhraseStatus(): SeedPhraseStatus {
  const [status, setStatus] = useState<SeedPhraseStatus>({
    needsSetup: false,
    loading: true,
    isNewUser: false
  });

  useEffect(() => {
    const checkSeedPhraseStatus = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setStatus({ needsSetup: false, loading: false, isNewUser: false });
          return;
        }

        // Check user profile for seed phrase status
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('has_seed_phrase, created_at')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error checking seed phrase status:', profileError);
          setStatus({ needsSetup: false, loading: false, isNewUser: false });
          return;
        }

        // Check if user is new (created within last 5 minutes)
        const createdAt = new Date(profile.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isNewUser = createdAt > fiveMinutesAgo;

        // Only show seed phrase setup for new users who don't have it yet
        const needsSetup = isNewUser && !profile.has_seed_phrase;

        setStatus({
          needsSetup,
          loading: false,
          isNewUser
        });

      } catch (err) {
        console.error('Error in seed phrase status check:', err);
        setStatus({ needsSetup: false, loading: false, isNewUser: false });
      }
    };

    checkSeedPhraseStatus();
  }, []);

  return status;
}