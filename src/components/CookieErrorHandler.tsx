'use client';

import React, { useEffect } from 'react';

/**
 * ErrorBoundary component to handle global errors, particularly cookie parsing errors
 * This component will catch JavaScript errors that happen in the component tree below
 */
export default function CookieErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Immediately clean up problematic cookies on mount
    import('../lib/cookieHelper').then(({ cleanupProblemCookies, enableSafeJsonParsing }) => {
      // First clean up any problematic cookies
      console.log('🍪 Proactively cleaning up problematic cookies...');
      const removedCookies = cleanupProblemCookies();
      if (removedCookies.length > 0) {
        console.log(`🧹 Cleaned up ${removedCookies.length} problematic cookies:`, removedCookies);
      }
      
      // Patch JSON.parse to handle base64-encoded cookies
      const disablePatch = enableSafeJsonParsing();
      
      // Clean up the patch when the component unmounts
      return () => {
        disablePatch();
      };
    });
    
    // Add global error handler for uncaught exceptions
    const originalError = console.error;
    console.error = (...args) => {
      const errorString = args.join(' ');
      
      // Check if this is a cookie parsing error
      if (errorString.includes('Failed to parse cookie') || 
          errorString.includes('base64-eyJ') || 
          errorString.includes('Unexpected token')) {
        
        // Log a more helpful message
        console.warn('🍪 Cookie parsing error detected. This may be caused by a base64-encoded cookie:', args);
        
        // You could also try to clean up problematic cookies here
        try {
          const cookies = document.cookie.split(';');
          
          cookies.forEach(cookie => {
            const cookieParts = cookie.trim().split('=');
            const cookieName = cookieParts[0];
            const cookieValue = cookieParts.slice(1).join('=');
            
            // Check if this cookie might be causing issues
            if (cookieValue?.includes('base64-eyJ') || cookieValue?.includes('Unexpected token')) {
              console.warn(`Problematic cookie found: ${cookieName}`);
              
              // Clear the problematic cookie
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
          });
        } catch (clearError) {
          console.error('Error while trying to inspect cookies:', clearError);
        }
      }
      
      // Check for WebSocket errors
      if (errorString.includes('WebSocket') && errorString.includes('closed')) {
        console.warn('WebSocket connection issue detected. This is usually not critical and will be handled automatically.');
      }
      
      // Call the original console.error
      originalError.apply(console, args);
    };

    // Clean up the override when the component unmounts
    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}

/**
 * Function to safely parse potentially base64-encoded JSON
 * Use this instead of direct JSON.parse calls when dealing with cookie values
 */
export function safeJsonParse(input: string | null | undefined) {
  if (!input) return null;
  
  try {
    return JSON.parse(input);
  } catch (err) {
    // Check if this might be a base64-encoded string
    if (typeof input === 'string' && input.startsWith('base64-')) {
      try {
        const base64Part = input.substring(7); // Remove 'base64-' prefix
        
        // Make sure the base64 string is properly padded and handle URL-safe characters
        const paddedBase64 = base64Part.replace(/-/g, '+').replace(/_/g, '/');
        const paddingNeeded = paddedBase64.length % 4;
        const fullPadded = paddingNeeded > 0 
          ? paddedBase64 + '='.repeat(4 - paddingNeeded) 
          : paddedBase64;
        
        const decoded = atob(fullPadded);
        return JSON.parse(decoded);
      } catch (base64Err) {
        console.warn('Failed to parse base64-encoded string:', base64Err);
        return null;
      }
    }
    
    console.warn('Failed to parse JSON:', err);
    return null;
  }
}
