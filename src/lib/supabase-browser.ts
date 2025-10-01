'use client';

import { createClient } from "@supabase/supabase-js";

// Singleton-instans av Supabase-klienten
let browserClient: ReturnType<typeof createClient<any>> | null = null;

/**
 * Henter singleton-instansen av Supabase-klienten for browser-kontekst
 * Sørger for at det kun er én instans per browser-kontekst med samme storageKey
 */
export function getBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    browserClient = createClient(url, anon, {
      auth: {
        storageKey: "sb-zpcycakwdvymqhwvakrv-auth",
        persistSession: true,
        autoRefreshToken: true,
      },
      // Begrenser antall realtime-events for å unngå overbelastning
      realtime: { params: { eventsPerSecond: 3 } },
    });
  }
  return browserClient;
}