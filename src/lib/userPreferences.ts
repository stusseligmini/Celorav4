import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';

/**
 * User preferences service for server components
 * This allows server components to access user preferences
 * such as language, theme, and other settings
 */

/**
 * Get the user's language preference from cookies or database
 * @returns Language code (e.g., 'en', 'nb')
 */
export async function getUserLanguagePreference(): Promise<string> {
  // First check cookies
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('celora-language');
  
  if (langCookie) {
    return langCookie.value;
  }
  
  // If authenticated, check user preferences in database
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', session.user.id)
        .single();
        
      if (userPrefs?.language) {
        return userPrefs.language;
      }
    }
  } catch (error) {
    console.error('Error fetching user language preference:', error);
  }
  
  // Default to English
  return 'en';
}

/**
 * Get the user's theme preference from cookies or database
 * @returns Theme name (e.g., 'light', 'dark', 'system')
 */
export async function getUserThemePreference(): Promise<string> {
  // First check cookies
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('celora-theme');
  
  if (themeCookie) {
    return themeCookie.value;
  }
  
  // If authenticated, check user preferences in database
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', session.user.id)
        .single();
        
      if (userPrefs?.theme) {
        return userPrefs.theme;
      }
    }
  } catch (error) {
    console.error('Error fetching user theme preference:', error);
  }
  
  // Default to system preference
  return 'system';
}

/**
 * Update or set the user's language preference
 * @param language Language code
 * @param userId Optional user ID (for authenticated users)
 */
export async function setUserLanguagePreference(language: string, userId?: string): Promise<void> {
  // Set cookie for all users
  const cookieStore = await cookies();
  cookieStore.set('celora-language', language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax'
  });
  
  // If authenticated, update database
  if (userId) {
    try {
      const supabase = createServerComponentClient<Database>({ cookies });
      
      // Upsert to user_preferences table
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          language
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.error('Error updating user language preference:', error);
    }
  }
}

/**
 * Get user metadata and preferences
 * @returns Object containing user preferences and metadata
 */
export async function getUserPreferences() {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return {
        language: await getUserLanguagePreference(),
        theme: await getUserThemePreference(),
        authenticated: false
      };
    }
    
    // Get user preferences from database
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    return {
      userId: session.user.id,
      language: userPrefs?.language || await getUserLanguagePreference(),
      theme: userPrefs?.theme || await getUserThemePreference(),
      notifications: userPrefs?.notifications_enabled ?? true,
      authenticated: true
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return {
      language: await getUserLanguagePreference(),
      theme: await getUserThemePreference(),
      authenticated: false
    };
  }
}