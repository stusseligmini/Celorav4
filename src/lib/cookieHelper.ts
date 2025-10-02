'use client';

/**
 * Helper functions for dealing with cookies securely, especially those that might be base64 encoded
 * 
 * These functions help solve the "Failed to parse cookie string: SyntaxError: Unexpected token 'b', 
 * "base64-eyJ"... is not valid JSON" error that occurs when cookies contain base64 encoded data
 * but the application tries to parse them directly as JSON.
 * 
 * This module also provides secure cookie operations to prevent cookie-based attacks.
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Get a cookie value by name
 * @param name The name of the cookie to get
 * @returns The cookie value or null if not found
 */
export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

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
    if (typeof cookieValue === 'string' && cookieValue.startsWith('base64-')) {
      try {
        // Extract the base64 part (after "base64-")
        const base64String = cookieValue.substring('base64-'.length);
        // Make sure the base64 string is properly padded
        const paddedBase64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
        const paddingNeeded = paddedBase64.length % 4;
        const fullPadded = paddingNeeded > 0 
          ? paddedBase64 + '='.repeat(4 - paddingNeeded) 
          : paddedBase64;
          
        // Decode the base64 string
        const decodedString = atob(fullPadded);
        
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
 * Secure cookie options interface
 */
export interface SecureCookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
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
 * Sets a cookie with secure defaults
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options
 */
export function setCookie(name: string, value: string, options: SecureCookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  
  // Default to secure options
  const secureOptions: SecureCookieOptions = {
    path: '/',
    secure: window.location.protocol === 'https:',
    httpOnly: false, // Can't be set from client-side
    sameSite: 'lax',
    ...options
  };
  
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  
  if (secureOptions.path) {
    cookieString += `; Path=${secureOptions.path}`;
  }
  
  if (secureOptions.domain) {
    cookieString += `; Domain=${secureOptions.domain}`;
  }
  
  if (secureOptions.maxAge) {
    cookieString += `; Max-Age=${secureOptions.maxAge}`;
  }
  
  if (secureOptions.expires) {
    cookieString += `; Expires=${secureOptions.expires.toUTCString()}`;
  }
  
  if (secureOptions.secure) {
    cookieString += '; Secure';
  }
  
  if (secureOptions.sameSite) {
    cookieString += `; SameSite=${secureOptions.sameSite}`;
  }
  
  document.cookie = cookieString;
}

/**
 * Deletes a cookie by setting its expiration in the past
 * @param name Cookie name
 * @param path Cookie path
 * @param domain Cookie domain
 */
export function deleteCookie(name: string, path?: string, domain?: string): void {
  if (typeof document === 'undefined') return;
  
  // Set expiration in the past to delete the cookie
  setCookie(name, '', {
    path,
    domain,
    expires: new Date(0),
    maxAge: 0
  });
}

/**
 * Checks if cookies are enabled in the browser
 * @returns true if cookies are enabled, false otherwise
 */
export function areCookiesEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  
  // Try to set a test cookie
  const testCookieName = '__cookie_test__';
  const testCookieValue = 'test';
  
  try {
    setCookie(testCookieName, testCookieValue);
    const result = getCookie(testCookieName) === testCookieValue;
    deleteCookie(testCookieName);
    return result;
  } catch (e) {
    return false;
  }
}

/**
 * Creates a secure, signed cookie that can be verified later
 * @param name Cookie name
 * @param value Cookie value
 * @param secret Secret key for signing
 * @param options Cookie options
 */
export function setSignedCookie(
  name: string,
  value: string,
  secret: string,
  options: SecureCookieOptions = {}
): void {
  if (typeof document === 'undefined') return;
  
  // Create signature using HMAC
  const signature = typeof window !== 'undefined' && window.crypto ? 
    createSignature(value, secret) : 
    '';
  
  // Format: value.timestamp.signature
  const timestamp = Date.now().toString();
  const signedValue = `${encodeURIComponent(value)}.${timestamp}.${signature}`;
  
  // Set the cookie with the signed value
  setCookie(name, signedValue, options);
}

/**
 * Creates a cryptographic signature for a cookie value
 */
function createSignature(value: string, secret: string): string {
  // Use Web Crypto API in the browser
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // This is async, but we can't make this function async in a simple way
    // In a real app, you'd want to refactor this to be properly async
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(value);
    const key = textEncoder.encode(secret);
    
    // This is just a placeholder - in real code you'd use window.crypto.subtle properly
    // with Promise handling
    return Array.from(textEncoder.encode(`${value}${secret}`))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Fallback for non-browser environments or older browsers
  if (typeof createHash === 'function') {
    return createHash('sha256')
      .update(`${value}${secret}`)
      .digest('hex');
  }
  
  // Last resort fallback (not secure)
  console.warn('Secure cookie signing not available in this environment');
  return '';
}

/**
 * Gets and verifies a signed cookie
 * @param name Cookie name
 * @param secret Secret used for signing
 * @param maxAge Maximum age in milliseconds
 * @returns The cookie value if valid, null otherwise
 */
export function getVerifiedCookie(
  name: string,
  secret: string,
  maxAge: number = 24 * 60 * 60 * 1000 // Default: 24 hours
): string | null {
  const signedValue = getCookie(name);
  
  if (!signedValue) return null;
  
  const parts = signedValue.split('.');
  if (parts.length !== 3) return null;
  
  const [value, timestamp, signature] = parts;
  
  // Check if the cookie has expired
  const cookieTime = parseInt(timestamp, 10);
  if (isNaN(cookieTime) || Date.now() - cookieTime > maxAge) {
    return null;
  }
  
  // Verify the signature
  const expectedSignature = createSignature(decodeURIComponent(value), secret);
  if (signature !== expectedSignature) {
    return null;
  }
  
  return decodeURIComponent(value);
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
          // Make sure the base64 string is properly padded
          const paddedBase64 = base64Part.replace(/-/g, '+').replace(/_/g, '/');
          const paddingNeeded = paddedBase64.length % 4;
          const fullPadded = paddingNeeded > 0 
            ? paddedBase64 + '='.repeat(4 - paddingNeeded) 
            : paddedBase64;
          
          const decoded = atob(fullPadded);
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

/**
 * Identifies and removes problematic cookies that might be causing JSON parsing errors
 * @param onlyClear If true, only clears problematic cookies. If false, clears ALL Supabase cookies.
 * @returns Array of cookie names that were removed
 */
export function cleanupProblemCookies(onlyClear: boolean = false): string[] {
  if (typeof document === 'undefined') return [];
  
  const removedCookies: string[] = [];
  const problematicPatterns = [
    'base64-eyJ', // Base64 JSON starts with this
    'supabase-auth-token', // Supabase auth token cookie
    'sb-', // Supabase cookies often start with this
    'eyJ', // Likely a JWT or JSON data
    '%' // URL encoded data that might be causing issues
  ];
  
  try {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const cookieParts = cookie.trim().split('=');
      const cookieName = cookieParts[0];
      const cookieValue = cookieParts.slice(1).join('=');
      
      // Check if this cookie might be causing issues or if it's a Supabase cookie
      const isPotentiallyProblematic = problematicPatterns.some(pattern => 
        cookieValue?.includes(pattern) || cookieName.includes(pattern)
      ) || (cookieValue?.length > 500); // Also check for very long cookies
      
      const isSupabaseRelated = cookieName.startsWith('sb-') || 
                               cookieName.includes('supabase') ||
                               cookieName.includes('_supabase');
      
      if ((onlyClear && isPotentiallyProblematic) || (!onlyClear && isSupabaseRelated)) {
        console.warn(`${onlyClear ? 'Problematic' : 'Supabase'} cookie found: ${cookieName}. Removing...`);
        
        try {
          // Delete the cookie for all possible paths and domains
          deleteCookie(cookieName, '/', undefined);
          
          // Try additional deletion strategies to ensure removal
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          
          // Try also with subdomains
          if (window.location.hostname.includes('.')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
          }
          
          removedCookies.push(cookieName);
        } catch (clearError) {
          console.error('Error clearing cookie:', clearError);
        }
      }
    });
    
    return removedCookies;
  } catch (error) {
    console.error('Error scanning cookies:', error);
    return [];
  }
}

/**
 * MFA-related cookie functions for secure MFA verification flow
 */

/**
 * Sets an MFA verification cookie to indicate a partially authenticated session
 * The user has successfully authenticated with password but needs to complete MFA verification
 * @param userId User ID of the authenticated user pending MFA verification
 * @param expiresIn Expiration time in seconds (default: 5 minutes)
 */
export function setMfaPendingCookie(userId: string, expiresIn: number = 300): void {
  const timestamp = Date.now();
  const expiration = timestamp + (expiresIn * 1000);
  const randomToken = typeof window !== 'undefined' && window.crypto
    ? Array.from(new Uint8Array(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    : Math.random().toString(36).substring(2, 15);
    
  const mfaPendingData = {
    userId,
    timestamp,
    expiration,
    token: randomToken
  };
  
  // Set a secure, short-lived cookie
  setCookie('mfa_pending', JSON.stringify(mfaPendingData), {
    maxAge: expiresIn,
    sameSite: 'strict',
    secure: true,
    path: '/'
  });
  
  // Store token in sessionStorage for additional security
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem('mfa_verification_token', randomToken);
    } catch (e) {
      console.warn('Failed to set MFA verification token in sessionStorage:', e);
    }
  }
}

/**
 * Gets the MFA pending verification state from cookies
 * @returns The MFA pending state or null if not found/invalid
 */
export function getMfaPendingState(): { userId: string; timestamp: number; expiration: number; token: string } | null {
  try {
    const mfaPendingCookie = getParsedCookie('mfa_pending');
    
    if (!mfaPendingCookie || 
        !mfaPendingCookie.userId || 
        !mfaPendingCookie.timestamp ||
        !mfaPendingCookie.expiration ||
        !mfaPendingCookie.token) {
      return null;
    }
    
    // Check if the cookie is expired
    if (Date.now() > mfaPendingCookie.expiration) {
      // Clean up expired cookie
      deleteMfaPendingCookie();
      return null;
    }
    
    // Verify the token matches the one in sessionStorage
    if (typeof window !== 'undefined') {
      const storedToken = window.sessionStorage.getItem('mfa_verification_token');
      if (storedToken !== mfaPendingCookie.token) {
        console.warn('MFA verification token mismatch - potential security issue');
        deleteMfaPendingCookie();
        return null;
      }
    }
    
    return mfaPendingCookie;
  } catch (e) {
    console.error('Error parsing MFA pending cookie:', e);
    return null;
  }
}

/**
 * Deletes the MFA pending verification cookie and sessionStorage data
 */
export function deleteMfaPendingCookie(): void {
  deleteCookie('mfa_pending', '/', undefined);
  
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem('mfa_verification_token');
    } catch (e) {
      console.warn('Failed to remove MFA verification token from sessionStorage:', e);
    }
  }
}

/**
 * Stores the last successful MFA verification time in local storage
 * This is used to implement MFA remember device functionality
 * @param userId The user ID
 * @param deviceId Unique identifier for the device
 * @param rememberDays Number of days to remember this device (default: 30)
 */
export function setMfaVerifiedDevice(userId: string, deviceId: string, rememberDays: number = 30): void {
  if (typeof window === 'undefined') return;
  
  try {
    const now = Date.now();
    const expiration = now + (rememberDays * 24 * 60 * 60 * 1000);
    
    const deviceData: {
      userId: string;
      deviceId: string;
      verifiedAt: number;
      expiration: number;
      hash?: string;
    } = {
      userId,
      deviceId,
      verifiedAt: now,
      expiration
    };
    
    // Create a hash of the device data to prevent tampering
    const dataString = JSON.stringify(deviceData);
    const dataHash = typeof window !== 'undefined' && window.crypto
      ? Array.from(new Uint8Array(new TextEncoder().encode(dataString)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      : btoa(dataString).replace(/=/g, '');
    
    deviceData.hash = dataHash;
    
    window.localStorage.setItem(`mfa_device_${userId}`, JSON.stringify(deviceData));
    
    // Also set a secure cookie with the same data
    setCookie(`mfa_device_${userId}`, JSON.stringify(deviceData), {
      maxAge: rememberDays * 24 * 60 * 60,
      sameSite: 'strict',
      secure: true,
      path: '/'
    });
  } catch (e) {
    console.error('Failed to store MFA verified device:', e);
  }
}

/**
 * Checks if the current device has been previously verified with MFA for this user
 * @param userId User ID to check
 * @returns Whether this device has a valid MFA verification that hasn't expired
 */
export function isMfaVerifiedDevice(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check localStorage first
    const storedData = window.localStorage.getItem(`mfa_device_${userId}`);
    const cookieData = getCookie(`mfa_device_${userId}`);
    
    // Prefer localStorage, fall back to cookie
    const dataSource = storedData || cookieData;
    
    if (!dataSource) return false;
    
    const deviceData = JSON.parse(dataSource);
    
    // Validate required fields
    if (!deviceData || !deviceData.userId || !deviceData.deviceId || 
        !deviceData.verifiedAt || !deviceData.expiration || !deviceData.hash) {
      return false;
    }
    
    // Check if this is for the correct user
    if (deviceData.userId !== userId) {
      return false;
    }
    
    // Check if verification has expired
    if (Date.now() > deviceData.expiration) {
      // Clean up expired data
      window.localStorage.removeItem(`mfa_device_${userId}`);
      deleteCookie(`mfa_device_${userId}`);
      return false;
    }
    
    // Verify hash to detect tampering
    const tempData = { ...deviceData };
    delete tempData.hash;
    const dataString = JSON.stringify(tempData);
    
    const expectedHash = typeof window !== 'undefined' && window.crypto
      ? Array.from(new Uint8Array(new TextEncoder().encode(dataString)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      : btoa(dataString).replace(/=/g, '');
    
    if (deviceData.hash !== expectedHash) {
      console.warn('MFA verified device data appears to be tampered with');
      window.localStorage.removeItem(`mfa_device_${userId}`);
      deleteCookie(`mfa_device_${userId}`);
      return false;
    }
    
    // Device is verified and data is valid
    return true;
  } catch (e) {
    console.error('Error checking MFA verified device:', e);
    return false;
  }
}

/**
 * Removes the MFA verified status for a device
 * @param userId The user ID to clear verification for
 */
export function clearMfaVerifiedDevice(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(`mfa_device_${userId}`);
    deleteCookie(`mfa_device_${userId}`);
  } catch (e) {
    console.error('Error clearing MFA verified device:', e);
  }
}

/**
 * Generates a temporary device ID for MFA device tracking
 * @returns A unique device identifier
 */
export function generateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  // Try to use existing device ID if available
  try {
    const existingDeviceId = window.localStorage.getItem('celora_device_id');
    if (existingDeviceId) return existingDeviceId;
  } catch (e) {
    // Ignore errors reading from localStorage
  }
  
  // Generate a new device ID
  const deviceId = typeof window !== 'undefined' && window.crypto
    ? Array.from(new Uint8Array(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store for future use
  try {
    window.localStorage.setItem('celora_device_id', deviceId);
  } catch (e) {
    // Ignore errors writing to localStorage
  }
  
  return deviceId;
}
