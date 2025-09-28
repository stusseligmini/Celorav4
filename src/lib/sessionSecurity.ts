'use client';

import { SupabaseClient, Session } from '@supabase/supabase-js';
import { validateJwt, createRefreshStrategy, detectTokenMisuse } from './jwtSecurity';
import { logSecurity } from './logger';

/**
 * Enhanced session security utilities for CeloraV2
 * 
 * Implements best practices for JWT token handling, session management,
 * and protection against session-based attacks.
 */

// Session configuration
export const SESSION_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 60 * 15, // 15 minutes in seconds
  REFRESH_TOKEN_EXPIRY: 60 * 60 * 24 * 7, // 1 week in seconds
  INACTIVITY_TIMEOUT: 60 * 30, // 30 minutes in seconds
  MAX_SESSION_DURATION: 60 * 60 * 24, // 24 hours in seconds
  TOKEN_ROTATION_THRESHOLD: 0.7, // Rotate refresh token when 70% of its lifetime has passed
};

// Device fingerprinting data to enhance session security
export interface DeviceFingerprint {
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  platform: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  hashedCanvasFingerprint?: string;
  ipAddress?: string;
  geolocation?: {
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Generates a device fingerprint based on browser and device characteristics
 * This enhances security by detecting unusual login attempts from new devices
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
      userAgent: '',
      language: '',
      timezone: '',
      screenResolution: '',
      colorDepth: 0,
      platform: '',
    };
  }

  // Generate a fingerprint from browser properties
  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    colorDepth: window.screen.colorDepth,
    platform: navigator.platform,
  };

  // Add optional properties if available
  if ('deviceMemory' in navigator) {
    fingerprint.deviceMemory = (navigator as any).deviceMemory;
  }

  if ('hardwareConcurrency' in navigator) {
    fingerprint.hardwareConcurrency = navigator.hardwareConcurrency;
  }

  // Canvas fingerprinting (optional, creates a hash based on canvas rendering)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 200;
      
      // Draw something that might render differently across devices
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 10, 100, 100);
      ctx.fillStyle = '#069';
      ctx.fillText('Celora Security', 10, 120);
      
      // Hash the canvas data
      const dataURL = canvas.toDataURL();
      let hash = 0;
      for (let i = 0; i < dataURL.length; i++) {
        hash = ((hash << 5) - hash) + dataURL.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      fingerprint.hashedCanvasFingerprint = hash.toString(16);
    }
  } catch (e) {
    console.warn('Canvas fingerprinting failed:', e);
  }

  return fingerprint;
}

/**
 * Stores device fingerprint in local storage and associates it with the session
 */
export function storeDeviceFingerprint(fingerprint: DeviceFingerprint, userId: string): void {
  try {
    const fingerprintKey = `device_fingerprint_${userId}`;
    localStorage.setItem(fingerprintKey, JSON.stringify(fingerprint));
  } catch (e) {
    console.warn('Failed to store device fingerprint:', e);
  }
}

/**
 * Compares current fingerprint with the stored one to detect suspicious logins
 * Returns a risk score from 0-100, where higher values indicate higher risk
 */
export function evaluateSessionRisk(
  currentFingerprint: DeviceFingerprint, 
  userId: string
): number {
  try {
    const fingerprintKey = `device_fingerprint_${userId}`;
    const storedFingerprintJson = localStorage.getItem(fingerprintKey);
    
    if (!storedFingerprintJson) {
      // First login from this browser, moderate risk
      return 40;
    }
    
    const storedFingerprint = JSON.parse(storedFingerprintJson) as DeviceFingerprint;
    let riskScore = 0;
    
    // Compare critical fingerprint properties
    if (storedFingerprint.userAgent !== currentFingerprint.userAgent) riskScore += 20;
    if (storedFingerprint.platform !== currentFingerprint.platform) riskScore += 15;
    if (storedFingerprint.screenResolution !== currentFingerprint.screenResolution) riskScore += 10;
    if (storedFingerprint.timezone !== currentFingerprint.timezone) riskScore += 25;
    if (storedFingerprint.language !== currentFingerprint.language) riskScore += 15;
    if (storedFingerprint.hashedCanvasFingerprint !== currentFingerprint.hashedCanvasFingerprint) riskScore += 10;
    
    return Math.min(riskScore, 100); // Cap risk score at 100
  } catch (e) {
    console.warn('Failed to evaluate session risk:', e);
    return 50; // Default to moderate risk if evaluation fails
  }
}

/**
 * Initializes inactivity tracking to automatically log out after a period of inactivity
 */
export function initInactivityTracking(supabase: SupabaseClient, onTimeout: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  let inactivityTimer: NodeJS.Timeout;
  
  // Reset timer on user activity
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
      console.log('User inactive, logging out due to inactivity');
      try {
        await supabase.auth.signOut();
        onTimeout();
      } catch (error) {
        console.error('Error during auto-logout:', error);
      }
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT * 1000);
  };
  
  // Set up event listeners for user activity
  const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
  activityEvents.forEach(event => {
    window.addEventListener(event, resetTimer);
  });
  
  // Initialize the timer
  resetTimer();
  
  // Return cleanup function
  return () => {
    clearTimeout(inactivityTimer);
    activityEvents.forEach(event => {
      window.removeEventListener(event, resetTimer);
    });
  };
}

/**
 * Handles token rotation based on token expiry threshold and security checks
 * Automatically rotates refresh tokens when they reach 70% of their lifetime
 * or when suspicious activity is detected
 */
export async function handleTokenRotation(
  supabase: SupabaseClient, 
  session: Session | null
): Promise<boolean> {
  if (!session) return false;
  
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  
  // Validate the current access token
  const { valid: isValid, payload } = validateJwt(accessToken);
  
  if (!isValid || !payload) {
    logSecurity('Invalid access token detected during rotation check', {
      action: 'token_rotation',
      componentName: 'SessionSecurity'
    });
    
    try {
      // Force refresh since the token is invalid
      const { error } = await supabase.auth.refreshSession();
      return !error;
    } catch (error) {
      logSecurity('Error refreshing invalid token', {
        action: 'token_rotation_error',
        componentName: 'SessionSecurity'
      }, { error });
      return false;
    }
  }
  
  // Get refresh strategy based on token analysis
  const refreshStrategy = createRefreshStrategy(accessToken);
  
  // Get current device fingerprint for security checks
  const currentFingerprint = generateDeviceFingerprint();
  
  // Check for suspicious token usage
  const misuseCheck = detectTokenMisuse(accessToken, {
    userFingerprint: currentFingerprint.hashedCanvasFingerprint,
    userAgent: currentFingerprint.userAgent,
  });
  
  // Determine if we should rotate the token
  const shouldRotate = refreshStrategy.shouldRefresh || 
                      misuseCheck.detected ||
                      evaluateSessionRisk(currentFingerprint, payload.sub) > 70;
  
  if (shouldRotate) {
    try {
      // Log the rotation reason for security auditing
      const reason = misuseCheck.detected ? misuseCheck.reason : 
                    refreshStrategy.reason || 
                    'Proactive token rotation';
                    
      logSecurity('Rotating session token', {
        action: 'token_rotation',
        componentName: 'SessionSecurity',
        userId: payload.sub
      }, { reason });
      
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        logSecurity('Token rotation failed', {
          action: 'token_rotation_error',
          componentName: 'SessionSecurity',
          userId: payload.sub
        }, { error: error.message });
        return false;
      }
      
      return true;
    } catch (error) {
      logSecurity('Error during token rotation', {
        action: 'token_rotation_error',
        componentName: 'SessionSecurity'
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }
  
  return false;
}

/**
 * Enforces HTTP-Only cookies for secure token storage
 */
export function configureSecureCookieSettings(supabase: SupabaseClient): void {
  // Note: Actual implementation depends on Supabase version and available APIs
  console.log('Configuring secure cookie settings for Supabase');
  // Most settings will be applied in the middleware.ts file
}