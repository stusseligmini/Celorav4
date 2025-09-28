'use client';

/**
 * Helper functions for dealing with cookies, especially those that might be base64 encoded
 * 
 * These functions help solve the "Failed to parse cookie string: SyntaxError: Unexpected token 'b', 
 * "base64-eyJ"... is not valid JSON" error that occurs when cookies contain base64 encoded data
 * but the application tries to parse them directly as JSON.
 */

/**
 * Parse a cookie value that might be JSON or base64 encoded JSON
 * @param cookieValue The raw cookie value
 * @returns The parsed value, or null if parsing failed
 */
export function parseCookieValue(cookieValue: string | null | undefined): any {
  if (!cookieValue) return null;
  
  try {
    // First try to parse as regular JSON
    return JSON.parse(cookieValue);
  } catch (e) {
    // If it fails, check if it's base64 encoded
    if (cookieValue.startsWith('base64-')) {
      try {
        // Extract the base64 part (after "base64-")
        const base64String = cookieValue.substring('base64-'.length);
        // Decode the base64 string
        const decodedString = atob(base64String);
        
        try {
          // Try to parse the decoded string as JSON
          return JSON.parse(decodedString);
        } catch (jsonError) {
          // If it's not valid JSON, just return the decoded string
          console.warn('Failed to parse decoded base64 cookie as JSON:', jsonError);
          return decodedString;
        }
      } catch (base64Error) {
        console.warn('Failed to decode base64 cookie:', base64Error);
        return null;
      }
    } else {
      // Not base64, not JSON - return as is
      return cookieValue;
    }
  }
}

/**
 * Gets a cookie value by name from document.cookie
 * @param name The name of the cookie to get
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

/**
 * Gets and parses a cookie value by name
 * @param name The name of the cookie to get
 * @returns The parsed cookie value or null if not found or parsing failed
 */
export function getParsedCookie(name: string): any {
  const cookieValue = getCookie(name);
  return parseCookieValue(cookieValue);
}

/**
 * Patch the global JSON object to handle base64-encoded strings
 * This is a more aggressive approach to fixing base64 cookie issues by
 * monkey patching the global JSON.parse method
 * 
 * WARNING: Only use this if the other methods don't work
 */
export function enableSafeJsonParsing() {
  const originalParse = JSON.parse;
  
  // @ts-ignore - Intentionally overriding JSON.parse
  JSON.parse = function safeJsonParse(text: string, ...args: any[]) {
    try {
      // Try normal parsing first
      return originalParse(text, ...args);
    } catch (e) {
      // If it looks like a base64 string, try to decode it
      if (typeof text === 'string' && text.startsWith('base64-')) {
        try {
          const base64Part = text.substring('base64-'.length);
          const decoded = atob(base64Part);
          return originalParse(decoded, ...args);
        } catch (base64Error) {
          console.warn('Failed to decode base64 string:', base64Error);
          throw e; // Throw the original error
        }
      }
      throw e; // Not a base64 string, throw the original error
    }
  };
  
  return function disableSafeJsonParsing() {
    JSON.parse = originalParse;
  };
}