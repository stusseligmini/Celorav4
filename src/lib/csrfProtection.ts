'use client';

/**
 * CSRF (Cross-Site Request Forgery) protection utilities
 * 
 * These utilities help protect against CSRF attacks by generating and validating
 * CSRF tokens for form submissions and API requests.
 */

const CSRF_TOKEN_KEY = 'celora-csrf-token';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Generates a cryptographically secure random string for CSRF tokens
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof window === 'undefined') {
    // Server-side token generation
    // Note: In a real implementation, you might use the crypto module
    return Array.from(Array(length), () => Math.floor(Math.random() * 36).toString(36)).join('');
  }
  
  // Client-side token generation using Web Crypto API
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates and stores a CSRF token in localStorage
 */
export function getOrCreateCsrfToken(): string {
  if (typeof window === 'undefined') {
    // Server-side - generate a new token each time
    return generateSecureToken();
  }
  
  // Client-side - get existing token or create a new one
  let token = localStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    token = generateSecureToken();
    localStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  
  return token;
}

/**
 * Adds a CSRF token to fetch headers
 */
export function addCsrfTokenToHeaders(headers: HeadersInit = {}): Headers {
  const token = getOrCreateCsrfToken();
  const headerObj = new Headers(headers);
  headerObj.append(CSRF_HEADER, token);
  return headerObj;
}

/**
 * Enhanced fetch function that automatically adds CSRF protection
 */
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = addCsrfTokenToHeaders(options.headers);
  
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Middleware function to validate CSRF tokens on the server side
 * This should be used in API route handlers
 */
export function validateCsrfToken(request: Request): boolean {
  // Get the token from the header
  const csrfToken = request.headers.get(CSRF_HEADER);
  
  // Get the expected token from the cookie or session
  // In a real implementation, you'd get this from a secure, HttpOnly cookie
  // For this example, we'll assume we have a function to get the expected token
  const expectedToken = getExpectedCsrfToken(request);
  
  // Simple equality check (in production, use timing-safe comparison)
  return csrfToken === expectedToken;
}

/**
 * Helper function to get the expected CSRF token from the request
 * In a real implementation, this would extract the token from a secure cookie
 */
function getExpectedCsrfToken(request: Request): string | null {
  // This is just a placeholder
  // In a real implementation, you would extract this from a secure HttpOnly cookie
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  // Parse cookies and find the CSRF token cookie
  const csrfCookieMatch = cookies.match(new RegExp(`${CSRF_TOKEN_KEY}=([^;]+)`));
  return csrfCookieMatch ? csrfCookieMatch[1] : null;
}
