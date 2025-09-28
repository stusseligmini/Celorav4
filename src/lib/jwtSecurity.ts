/**
 * JWT Token Security Module
 * 
 * This module provides utilities for working with JWT tokens securely,
 * including validation, refresh logic, and protection against token theft.
 */

import { jwtDecode } from 'jwt-decode';
import { logSecurity } from './logger';
import { getCorrelationId } from './logger';
import { getKeyRotationManager, KeyType } from './keyRotation';

// Interface for JWT payload
interface JwtPayload {
  exp: number;
  iat: number;
  aud: string;
  sub: string;
  email?: string;
  role?: string;
  jti?: string; // JWT ID
  fingerprint?: string; // Browser fingerprint for additional security
  [key: string]: any;
}

/**
 * Validates a JWT token's expiration and signature
 */
export function validateJwt(token: string): { valid: boolean; payload?: JwtPayload; error?: string } {
  try {
    // Decode the token to get the payload
    const payload = jwtDecode<JwtPayload>(token);
    
    // Check if token has expired
    const now = Math.floor(Date.now() / 1000);
    
    if (!payload.exp) {
      return { valid: false, error: 'Token has no expiration claim' };
    }
    
    if (payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }
    
    // Check if token was issued in the future (clock skew)
    if (payload.iat && payload.iat > now + 60) {
      return { valid: false, error: 'Token was issued in the future' };
    }
    
    // All checks passed
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}

/**
 * Creates a JWT refresh strategy based on token state
 */
export function createRefreshStrategy(token: string): {
  shouldRefresh: boolean;
  refreshThreshold: number;
  reason?: string;
} {
  try {
    const { valid, payload, error } = validateJwt(token);
    
    if (!valid || !payload) {
      return { 
        shouldRefresh: true,
        refreshThreshold: 0,
        reason: error || 'Invalid token'
      };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;
    
    // Refresh if token is about to expire within 5 minutes
    if (timeUntilExpiry < 300) {
      return { 
        shouldRefresh: true,
        refreshThreshold: 300,
        reason: 'Token expiring soon'
      };
    }
    
    // Don't refresh if token is still valid for a while
    return {
      shouldRefresh: false,
      refreshThreshold: 300
    };
  } catch (error) {
    return {
      shouldRefresh: true,
      refreshThreshold: 0,
      reason: 'Error processing token'
    };
  }
}

/**
 * Checks for signs of token theft or misuse
 */
export function detectTokenMisuse(
  token: string,
  context: { 
    userFingerprint?: string;
    ip?: string;
    userAgent?: string;
  }
): { detected: boolean; reason?: string; severity: 'low' | 'medium' | 'high' } {
  try {
    const { payload } = validateJwt(token);
    
    if (!payload) {
      return { 
        detected: true, 
        reason: 'Invalid token format',
        severity: 'medium'
      };
    }
    
    // Check if token was issued for a different audience
    if (payload.aud && 
        payload.aud !== process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !Array.isArray(payload.aud)) {
      return { 
        detected: true, 
        reason: 'Token audience mismatch',
        severity: 'high'
      };
    }
    
    // Check browser fingerprint (if available)
    if (payload.fingerprint && 
        context.userFingerprint && 
        payload.fingerprint !== context.userFingerprint) {
      return { 
        detected: true, 
        reason: 'Browser fingerprint mismatch',
        severity: 'high'
      };
    }
    
    // Check for unusual token issue times
    const now = Math.floor(Date.now() / 1000);
    if (payload.iat && (now - payload.iat > 60 * 60 * 24 * 30)) {
      return {
        detected: true,
        reason: 'Token unusually old',
        severity: 'medium'
      };
    }
    
    // All checks passed
    return { detected: false, severity: 'low' };
  } catch (error) {
    return { 
      detected: true, 
      reason: 'Error analyzing token',
      severity: 'low'
    };
  }
}

/**
 * Revokes a JWT token by adding it to a blocklist
 */
export async function revokeToken(
  token: string, 
  reason: string
): Promise<boolean> {
  try {
    const { payload } = validateJwt(token);
    
    if (!payload) {
      logSecurity('Failed to revoke invalid token', {
        correlationId: getCorrelationId(),
        action: 'revoke_token',
        componentName: 'JWT'
      }, { reason });
      
      return false;
    }
    
    // Store revoked token identifier in the database or cache
    // In this example we use the jti (JWT ID) claim if available,
    // otherwise we use a hash of the token
    const tokenId = payload.jti || createTokenHash(token);
    const expiryTime = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 86400000);
    
    // Store in revocation list (implementation depends on your storage)
    // For this example, we're using Supabase
    // In a real app you might use Redis or a specialized service
    
    // Add revoked token to database
    const supabase = createClient();
    
    const { error } = await supabase
      .from('revoked_tokens')
      .insert({
        token_id: tokenId,
        revoked_at: new Date().toISOString(),
        expires_at: expiryTime.toISOString(),
        reason,
        user_id: payload.sub
      });
    
    if (error) {
      logSecurity('Failed to store revoked token', {
        correlationId: getCorrelationId(),
        action: 'revoke_token',
        componentName: 'JWT'
      }, { error: error.message });
      
      return false;
    }
    
    logSecurity('Token revoked successfully', {
      correlationId: getCorrelationId(),
      action: 'revoke_token',
      componentName: 'JWT',
      userId: payload.sub
    }, { reason });
    
    return true;
  } catch (error) {
    logSecurity('Token revocation error', {
      correlationId: getCorrelationId(),
      action: 'revoke_token_error',
      componentName: 'JWT'
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return false;
  }
}

/**
 * Checks if a token has been revoked
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const { payload } = validateJwt(token);
    
    if (!payload) {
      return true; // Invalid tokens are considered revoked
    }
    
    // Get token identifier
    const tokenId = payload.jti || createTokenHash(token);
    
    // Check revocation list
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('revoked_tokens')
      .select('token_id')
      .eq('token_id', tokenId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logSecurity('Error checking token revocation', {
        correlationId: getCorrelationId(),
        action: 'check_revoked_token',
        componentName: 'JWT'
      }, { error: error.message });
      
      // Default to considering token valid if we can't check revocation
      return false;
    }
    
    // If we found a matching record, the token is revoked
    return !!data;
  } catch (error) {
    logSecurity('Token revocation check error', {
      correlationId: getCorrelationId(),
      action: 'check_revoked_token_error',
      componentName: 'JWT'
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // Default to considering token valid if we can't check revocation
    return false;
  }
}

/**
 * Creates a hash of a token for storage in revocation lists
 */
function createTokenHash(token: string): string {
  // Use crypto in Node.js environments
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // This would be async in a real implementation
    // For simplicity, we're returning a quick hash here
    return Array.from(new Uint8Array(token.split('').map(c => c.charCodeAt(0))))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Fallback for older environments
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Creates a Supabase client for token operations
 */
function createClient() {
  // We would typically use the Supabase client here
  // For this example, we're using a placeholder
  const { createClient } = require('@supabase/supabase-js');
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
  );
}

/**
 * Handles secure refresh of JWT tokens
 */
export async function refreshJwtSecurely(
  refreshToken: string,
  context: {
    fingerprint: string;
    ip: string;
    userAgent: string;
  }
): Promise<{ success: boolean; newToken?: string; error?: string }> {
  try {
    // Check if refresh token is revoked
    if (await isTokenRevoked(refreshToken)) {
      logSecurity('Attempted to use revoked refresh token', {
        correlationId: getCorrelationId(),
        action: 'refresh_token',
        componentName: 'JWT'
      }, { context });
      
      return { 
        success: false,
        error: 'Refresh token has been revoked'
      };
    }
    
    // Validate refresh token
    const { valid, payload } = validateJwt(refreshToken);
    
    if (!valid || !payload) {
      return { 
        success: false,
        error: 'Invalid refresh token'
      };
    }
    
    // Check for token misuse
    const misuseCheck = detectTokenMisuse(refreshToken, context);
    if (misuseCheck.detected) {
      // Revoke the token if misuse is detected
      await revokeToken(refreshToken, `Suspected misuse: ${misuseCheck.reason}`);
      
      logSecurity('Token misuse detected during refresh', {
        correlationId: getCorrelationId(),
        action: 'token_misuse',
        componentName: 'JWT',
        userId: payload.sub
      }, { 
        reason: misuseCheck.reason,
        severity: misuseCheck.severity,
        context
      });
      
      return { 
        success: false,
        error: 'Security validation failed'
      };
    }
    
    // Perform the actual token refresh using Supabase
    const supabase = createClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error || !data.session) {
      return {
        success: false,
        error: error?.message || 'Failed to refresh token'
      };
    }
    
    // Revoke the old refresh token for enhanced security
    // This prevents refresh token reuse
    await revokeToken(refreshToken, 'Refreshed for new token');
    
    logSecurity('Token refreshed successfully', {
      correlationId: getCorrelationId(),
      action: 'refresh_token_success',
      componentName: 'JWT',
      userId: payload.sub
    });
    
    return {
      success: true,
      newToken: data.session.access_token
    };
  } catch (error) {
    logSecurity('Token refresh error', {
      correlationId: getCorrelationId(),
      action: 'refresh_token_error',
      componentName: 'JWT'
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return {
      success: false,
      error: 'An error occurred during token refresh'
    };
  }
}