'use client';

import { cleanupProblemCookies } from './cookieHelper';

/**
 * Funksjon for å rydde opp i korrupte Supabase-relaterte lagringer i nettleseren
 * Denne kan kalles ved oppstart av applikasjonen
 * @param forceClean Hvis true, vil alle Supabase-relaterte data slettes uavhengig av om de er korrupte
 */
export function cleanupSupabaseStorage(forceClean: boolean = true) {
  if (typeof window === 'undefined') return;
  
  try {
    console.log(`🧹 Rydder opp i Supabase-lagring... ${forceClean ? '(tvungen opprydding)' : '(kun problematiske data)'}`);
    
    // 1. Rydd opp i LocalStorage
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      
      const isSupabaseKey = 
        key.startsWith('sb-') || 
        key.includes('supabase') || 
        key === 'sb-zpcycakwdvymqhwvakrv-auth';
      
      // Hvis forceClean, fjern alle supabase-relaterte nøkler
      // ellers prøv å analysere innholdet for å finne problemer
      let shouldRemove = false;
      
      if (forceClean && isSupabaseKey) {
        shouldRemove = true;
      } else if (isSupabaseKey) {
        try {
          // Sjekk om verdien kan være problematisk
          const value = window.localStorage.getItem(key);
          
          if (value && (
            value.startsWith('base64-') || 
            value.includes('eyJ') ||  // Typisk start på en JWT
            value.length > 1000 ||    // Svært lange verdier kan være problematiske
            value.includes('%')       // URL-kodede data som kan være problematiske
          )) {
            shouldRemove = true;
          }
        } catch (valueErr) {
          console.warn(`Kunne ikke lese localStorage-verdi for ${key}:`, valueErr);
          shouldRemove = true; // Fjern nøkkel som ikke kan leses
        }
      }
      
      if (shouldRemove) {
        keysToRemove.push(key);
      }
    }
    
    // Fjern de identifiserte nøklene
    if (keysToRemove.length > 0) {
      console.log(`🗑️ Fjerner ${keysToRemove.length} localStorage-nøkler:`, keysToRemove);
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
    } else {
      console.log('✓ Ingen problematiske localStorage-nøkler funnet');
    }
    
    // 2. Rydd opp i cookies ved hjelp av vår forbedrede funksjon
    const removedCookies = cleanupProblemCookies(!forceClean); // Hvis forceClean=true, fjern alle supabase-cookies
    
    if (removedCookies.length > 0) {
      console.log(`🍪 Fjernet ${removedCookies.length} cookies:`, removedCookies);
    } else {
      console.log('✓ Ingen problematiske cookies funnet');
    }
    
    console.log('✅ Supabase-opprydding fullført');
    
    return {
      removedStorageKeys: keysToRemove,
      removedCookies
    };
  } catch (error) {
    console.error('❌ Feil under opprydding av Supabase-lagring:', error);
    return {
      error,
      removedStorageKeys: [],
      removedCookies: []
    };
  }
}