'use client';

/**
 * Client-side user preferences manager
 * Handles user preferences like language and theme settings
 */

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';

/**
 * Hook to get and set user language preference
 * @param defaultLanguage Default language code (optional)
 * @returns [language, setLanguage] tuple
 */
export function useLanguagePreference(defaultLanguage: string = 'en'): [string, (lang: string) => Promise<void>] {
  const [language, setLanguageState] = useState(defaultLanguage);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Initialize language from cookie or localStorage
  useEffect(() => {
    const storedLang = localStorage.getItem('celora-language') || getCookie('celora-language');
    if (storedLang) {
      setLanguageState(storedLang);
    }
    
    // Check if user is logged in
    const supabase = createClientComponentClient<Database>();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        
        // If logged in, try to get language from database
        supabase
          .from('user_preferences')
          .select('language')
          .eq('user_id', data.user.id)
          .single()
          .then(({ data: prefs }) => {
            if (prefs?.language) {
              setLanguageState(prefs.language);
            }
          });
      }
    });
  }, []);
  
  // Function to update language preference
  const setLanguage = async (newLanguage: string): Promise<void> => {
    // Update state
    setLanguageState(newLanguage);
    
    // Update localStorage and cookie
    localStorage.setItem('celora-language', newLanguage);
    setCookie('celora-language', newLanguage, 365);
    
    // If logged in, update database
    if (userId) {
      const supabase = createClientComponentClient<Database>();
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          language: newLanguage
        }, {
          onConflict: 'user_id'
        });
    }
  };
  
  return [language, setLanguage];
}

/**
 * Hook to get and set user theme preference
 * @param defaultTheme Default theme name (optional)
 * @returns [theme, setTheme] tuple
 */
export function useThemePreference(defaultTheme: string = 'system'): [string, (theme: string) => Promise<void>] {
  const [theme, setThemeState] = useState(defaultTheme);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Initialize theme from cookie or localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem('celora-theme') || getCookie('celora-theme');
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    
    // Check if user is logged in
    const supabase = createClientComponentClient<Database>();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        
        // If logged in, try to get theme from database
        supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', data.user.id)
          .single()
          .then(({ data: prefs }) => {
            if (prefs?.theme) {
              setThemeState(prefs.theme);
            }
          });
      }
    });
  }, []);
  
  // Function to update theme preference
  const setTheme = async (newTheme: string): Promise<void> => {
    // Update state
    setThemeState(newTheme);
    
    // Update localStorage and cookie
    localStorage.setItem('celora-theme', newTheme);
    setCookie('celora-theme', newTheme, 365);
    
    // If logged in, update database
    if (userId) {
      const supabase = createClientComponentClient<Database>();
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          theme: newTheme
        }, {
          onConflict: 'user_id'
        });
    }
  };
  
  return [theme, setTheme];
}

// Helper functions for cookie management
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;samesite=lax`;
}