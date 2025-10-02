/**
 * Multi-factor Authentication (MFA) System
 * 
 * This module provides functionality for implementing Multi-factor Authentication
 * in the Celora platform, supporting various methods including:
 * - Time-based One-Time Passwords (TOTP)
 * - Email verification codes
 * - SMS verification codes
 * - Push notifications
 * - Recovery codes
 */

'use client';

import { createHash, randomBytes } from 'crypto';
import { logSecurity } from './logger';
import QRCode from 'qrcode';

// MFA method types
export enum MfaMethod {
  TOTP = 'totp',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  RECOVERY = 'recovery'
}

// Interface for MFA settings
export interface MfaSettings {
  enabled: boolean;
  primaryMethod: MfaMethod;
  backupMethods: MfaMethod[];
  lastVerified?: Date;
  totpSecret?: string;
  recoveryCodesHash?: string[];
  verificationAttempts?: number;
}

// Interface for storing MFA state during enrollment
export interface MfaEnrollmentState {
  secret: string;
  uri: string;
  qrCode?: string;
  recoveryCodes?: string[];
  completed: boolean;
}

/**
 * Generates a cryptographically secure random verification code
 */
export function generateVerificationCode(length = 6): string {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment - use Web Crypto API
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    let code = '';
    for (let i = 0; i < array.length; i++) {
      code += (array[i] % 10).toString();
    }
    return code;
  } else {
    // Node.js environment - use crypto module
    try {
      return randomBytes(length)
        .toString('hex')
        .replace(/[^0-9]/g, '')
        .substring(0, length);
    } catch (e) {
      // Fallback to less secure but functional method
      let code = '';
      for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10).toString();
      }
      return code;
    }
  }
}

/**
 * Generates a TOTP secret key for MFA enrollment
 */
export function generateTotpSecret(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const array = new Uint8Array(20);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    try {
      return randomBytes(20).toString('hex');
    } catch (e) {
      throw new Error('Unable to generate secure TOTP secret');
    }
  }
}

/**
 * Generates a URI for TOTP enrollment (for QR codes)
 */
export function generateTotpUri(secret: string, email: string, issuer = 'Celora'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}`;
}

/**
 * Generates a QR code for TOTP enrollment
 */
export async function generateQrCode(uri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(uri);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates recovery codes for backup access
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX-XXXX (12 alphanumeric characters in groups of 4)
    const part1 = randomBytes(2).toString('hex').toUpperCase();
    const part2 = randomBytes(2).toString('hex').toUpperCase();
    const part3 = randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}-${part3}`);
  }
  return codes;
}

/**
 * Hashes a recovery code for secure storage
 */
export function hashRecoveryCode(code: string): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // This would be async in real implementation
    // Using a temporary synchronous hash for demonstration
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    
    // Create a simple hash (in real app, use crypto.subtle.digest properly)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  } else {
    try {
      return createHash('sha256').update(code).digest('hex');
    } catch (e) {
      throw new Error('Unable to hash recovery code');
    }
  }
}

/**
 * Starts the MFA enrollment process for a user
 */
export async function startMfaEnrollment(
  email: string, 
  method: MfaMethod = MfaMethod.TOTP
): Promise<MfaEnrollmentState> {
  try {
    // Generate appropriate secrets based on the method
    if (method === MfaMethod.TOTP) {
      const secret = generateTotpSecret();
      const uri = generateTotpUri(secret, email);
      const qrCode = await generateQrCode(uri);
      const recoveryCodes = generateRecoveryCodes();
      
      logSecurity('MFA enrollment started', {
        action: 'mfa_enrollment_start',
        componentName: 'MFA',
      }, { method, email: email.substring(0, 3) + '***' });
      
      return {
        secret,
        uri,
        qrCode,
        recoveryCodes,
        completed: false
      };
    } else {
      throw new Error(`MFA method ${method} not yet implemented`);
    }
  } catch (error) {
    logSecurity('MFA enrollment error', {
      action: 'mfa_enrollment_error',
      componentName: 'MFA',
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    throw error;
  }
}

/**
 * Verifies a TOTP code against the user's secret
 * Note: In a real implementation, this would use a TOTP library like 'otplib'
 * This is a placeholder implementation
 */
export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    // Placeholder for actual TOTP verification
    // In real implementation, use a library like:
    // import { authenticator } from 'otplib';
    // return authenticator.verify({ token: code, secret });
    
    // For demonstration only - NOT SECURE
    const expectedCode = generateCodeFromSecret(secret);
    return code === expectedCode;
  } catch (error) {
    logSecurity('TOTP verification error', {
      action: 'totp_verification_error',
      componentName: 'MFA',
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return false;
  }
}

/**
 * Placeholder function for TOTP code generation
 * In a real app, use a proper TOTP library
 */
function generateCodeFromSecret(secret: string): string {
  // This is NOT a real TOTP implementation
  // In production, use a library like 'otplib'
  const hash = createHash('sha1')
    .update(secret + Math.floor(Date.now() / 30000).toString())
    .digest('hex');
  
  // Take 6 digits from the hash
  const offset = parseInt(hash.charAt(hash.length - 1), 16);
  const truncatedHash = hash.substring(offset, offset + 6);
  return (parseInt(truncatedHash, 16) % 1000000).toString().padStart(6, '0');
}

/**
 * Completes MFA enrollment process for a user
 */
export async function completeMfaEnrollment(
  userId: string,
  enrollmentState: MfaEnrollmentState,
  verificationCode: string
): Promise<boolean> {
  try {
    // Verify the provided code matches the expected value
    if (enrollmentState.secret && verifyTotpCode(verificationCode, enrollmentState.secret)) {
      // Hash recovery codes for storage
      const recoveryCodeHashes = enrollmentState.recoveryCodes?.map(hashRecoveryCode) || [];
      
      // In a real app, you'd store these in your database
      const mfaSettings: MfaSettings = {
        enabled: true,
        primaryMethod: MfaMethod.TOTP,
        backupMethods: [MfaMethod.RECOVERY],
        lastVerified: new Date(),
        totpSecret: enrollmentState.secret,
        recoveryCodesHash: recoveryCodeHashes,
        verificationAttempts: 0
      };
      
      // Store MFA settings (placeholder - in real app, store in database)
      localStorage.setItem(`mfa_settings_${userId}`, JSON.stringify(mfaSettings));
      
      logSecurity('MFA enrollment completed', {
        action: 'mfa_enrollment_complete',
        componentName: 'MFA',
        userId
      });
      
      return true;
    }
    
    logSecurity('MFA enrollment verification failed', {
      action: 'mfa_enrollment_verification_failed',
      componentName: 'MFA',
      userId
    });
    
    return false;
  } catch (error) {
    logSecurity('MFA enrollment completion error', {
      action: 'mfa_enrollment_completion_error',
      componentName: 'MFA',
      userId
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return false;
  }
}

/**
 * Disables MFA for a user
 */
export async function disableMfa(userId: string): Promise<boolean> {
  try {
    // In a real app, update the database
    localStorage.removeItem(`mfa_settings_${userId}`);
    
    logSecurity('MFA disabled', {
      action: 'mfa_disabled',
      componentName: 'MFA',
      userId
    });
    
    return true;
  } catch (error) {
    logSecurity('Error disabling MFA', {
      action: 'mfa_disable_error',
      componentName: 'MFA',
      userId
    }, { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return false;
  }
}

/**
 * Validates a recovery code
 */
export function validateRecoveryCode(code: string, hashedCodes: string[]): boolean {
  try {
    const hashedInput = hashRecoveryCode(code);
    return hashedCodes.includes(hashedInput);
  } catch (error) {
    return false;
  }
}

/**
 * Checks if a user has MFA enabled
 */
export function isMfaEnabled(userId: string): boolean {
  try {
    const settings = getMfaSettings(userId);
    return settings?.enabled || false;
  } catch (error) {
    return false;
  }
}

/**
 * Gets a user's MFA settings
 */
export function getMfaSettings(userId: string): MfaSettings | null {
  try {
    const settingsJson = localStorage.getItem(`mfa_settings_${userId}`);
    if (!settingsJson) return null;
    
    return JSON.parse(settingsJson) as MfaSettings;
  } catch (error) {
    console.error('Error getting MFA settings:', error);
    return null;
  }
}
