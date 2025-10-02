'use client';

import { useEffect } from 'react';
import { cleanupSupabaseStorage } from '../lib/supabaseCleanup';

/**
 * Komponent som kjører tidlig i applikasjonslivssyklusen for å utføre Supabase-relatert opprydding
 * Dette sikrer at nettleserlagringen er ren før Supabase-klienten blir opprettet
 */
export function SupabaseInitializer() {
  useEffect(() => {
    try {
      console.log('🚀 Initialiserer Supabase-miljø...');
      cleanupSupabaseStorage();
    } catch (error) {
      console.error('Feil under Supabase-initialisering:', error);
    }
  }, []);
  
  // Denne komponenten rendrer ingenting synlig
  return null;
}
