'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Definerer typen for konteksten
interface SupabaseContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

// Opprett konteksten med default verdier
export const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

// Hook for å bruke Supabase-konteksten
export const useSupabase = () => useContext(SupabaseContext);

// Provider-komponent
interface SupabaseProviderProps {
  children: React.ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialiser sesjon og bruker
  useEffect(() => {
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Feil ved lasting av sesjon:', error);
      }
      
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    };

    // Kjør initialiseringsfunksjonen
    setData();

    // Lytt på auth-endringer
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth-endring:', event);
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Rengjøringsfunksjon
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Autentiseringsfunksjoner
  const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
    });
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  // Kontekst-verdien som eksporteres
  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  // Returnerer provideren med verdiene
  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}
