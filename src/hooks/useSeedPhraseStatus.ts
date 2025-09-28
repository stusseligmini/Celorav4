'use client';

import { useState, useEffect } from 'react';
import { withRetry } from '../lib/supabaseErrorHandling';
import { getSupabaseClient } from '../lib/supabaseSingleton';

interface SeedPhraseStatus {
  needsSetup: boolean;
  loading: boolean;
  isNewUser: boolean;
  hasSeedPhrase: boolean; // Added to track if user has a seed phrase for recovery
}

export function useSeedPhraseStatus(): SeedPhraseStatus {
  const [status, setStatus] = useState<SeedPhraseStatus>({
    needsSetup: false,
    loading: true,
    isNewUser: false,
    hasSeedPhrase: false
  });

  useEffect(() => {
    const checkSeedPhraseStatus = async () => {
      try {
        const supabase = getSupabaseClient();

        // Get current user with retry for reliability
        const { data: { user }, error: userError } = await withRetry(
          'get-user-seed-status',
          async () => await supabase.auth.getUser()
        );
        
        if (userError || !user) {
          setStatus({ 
            needsSetup: false, 
            loading: false, 
            isNewUser: false,
            hasSeedPhrase: false 
          });
          return;
        }

        // Check user profile for seed phrase status
        const { data: profile, error: profileError } = await withRetry(
          'get-profile-seed-status',
          async () => await supabase
            .from('user_profiles')
            .select('has_seed_phrase, created_at')
            .eq('id', user.id)
            .single()
        );

        if (profileError) {
          console.error('Error checking seed phrase status:', profileError);
          setStatus({ 
            needsSetup: false, 
            loading: false, 
            isNewUser: false,
            hasSeedPhrase: false 
          });
          return;
        }

        // Check if user is new (created within last 5 minutes)
        const createdAt = new Date(profile.created_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isNewUser = createdAt > fiveMinutesAgo;

        // CHANGED: No longer showing seed phrase setup for new users
        // Only available in recovery flow now
        const needsSetup = false; // Changed from: isNewUser && !profile.has_seed_phrase;

        setStatus({
          needsSetup,
          loading: false,
          isNewUser,
          hasSeedPhrase: !!profile.has_seed_phrase
        });

      } catch (err) {
        console.error('Error in seed phrase status check:', err);
        setStatus({ 
          needsSetup: false, 
          loading: false, 
          isNewUser: false,
          hasSeedPhrase: false 
        });
      }
    };

    checkSeedPhraseStatus();
  }, []);

  return status;
}