'use client';
import { createBrowserClient } from './supabaseClient';
import { cleanupSupabaseStorage } from './supabaseCleanup';
import { cleanupProblemCookies } from './cookieHelper';

// Singleton-instans av Supabase-klienten
let browserClient: any | null = null;

/**
 * Henter singleton-instansen av Supabase-klienten for browser-kontekst
 * Sørger for at det kun er én instans per browser-kontekst med samme storageKey
 */
export function getBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anon) {
      console.error('❌ Supabase environment variables mangler!', {
        hasUrl: !!url,
        hasAnon: !!anon
      });
      throw new Error('Supabase configuration is missing. Please check environment variables.');
    }
    
    try {
      // Aggressiv tidlig-opprydding av problematiske Supabase-cookies for å hindre JSON/base64-feil
      try {
        cleanupSupabaseStorage();
        cleanupProblemCookies(false);
      } catch (e) {
        console.warn('Cookie/storage cleanup warning:', e);
      }

      // Bruk den forbedrede wrapperen slik at vi har ekstra beskyttelser på cookies og realtime
      // createBrowserClient har nå også sin egen singleton-logikk, så selv om denne
      // funksjonen kalles flere ganger, vil den underliggende klienten være den samme
      browserClient = createBrowserClient(url, anon, {
        auth: {
          storageKey: 'sb-zpcycakwdvymqhwvakrv-auth',
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: { params: { eventsPerSecond: 3 } },
      });
      
      console.log('✅ Supabase browser client initialisert via getBrowserClient');
    } catch (error) {
      console.error('❌ Feil ved opprettelse av Supabase client:', error);
      throw error;
    }
  } else {
    console.log('♻️ Returning cached browser client from getBrowserClient');
  }
  return browserClient;
}

/**
 * Force reset the singleton browser client
 * Useful for debugging or when you need to reinitialize
 * WARNING: This will break any active subscriptions!
 */
export function resetBrowserClient() {
  if (browserClient) {
    console.warn('⚠️ Resetting Supabase browser client singleton');
    try {
      // Try to clean up any active subscriptions
      browserClient.removeAllChannels?.();
    } catch (e) {
      console.warn('Error cleaning up channels during reset:', e);
    }
  }
  browserClient = null;
  console.log('✅ Browser client singleton reset');
}