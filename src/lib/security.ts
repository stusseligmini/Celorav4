import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';

/**
 * Security event logging utility
 * Tracks security-related events in the system for audit purposes
 */

interface SecurityEventParams {
  userId: string;
  event: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

/**
 * Log a security-related event to the security_events table
 */
export async function logSecurityEvent({
  userId,
  event,
  details = {},
  ip = 'unknown',
  userAgent = 'unknown'
}: SecurityEventParams): Promise<void> {
  try {
    const supabase = createClientComponentClient<Database>();
    
    await supabase
      .from('security_events')
      .insert({
        user_id: userId,
        event,
        details,
        ip_address: ip,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - security logging should not interrupt normal flow
  }
}

/**
 * Security event types
 */
export const SecurityEventTypes = {
  // Authentication events
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET_REQUEST: 'auth.password.reset_request',
  PASSWORD_RESET_COMPLETE: 'auth.password.reset_complete',
  
  // MFA events
  MFA_SETUP: 'mfa.setup',
  MFA_VERIFY_SUCCESS: 'mfa.verify.success',
  MFA_VERIFY_FAILURE: 'mfa.verify.failure',
  MFA_DISABLE: 'mfa.disable',
  MFA_RECOVERY_CODES_GENERATED: 'mfa.recovery_codes.generated',
  MFA_RECOVERY_CODE_USED: 'mfa.recovery_code.used',
  MFA_RECOVERY_REQUESTED: 'mfa.recovery.requested',
  MFA_RECOVERY_INITIATED: 'mfa.recovery.initiated',
  MFA_RECOVERY_APPROVED: 'mfa.recovery.approved',
  MFA_RECOVERY_REJECTED: 'mfa.recovery.rejected',
  MFA_RECOVERY_COMPLETED: 'mfa.recovery.completed',
  
  // Profile events
  PROFILE_UPDATE: 'profile.update',
  EMAIL_CHANGE_REQUEST: 'profile.email.change_request',
  EMAIL_CHANGE_COMPLETE: 'profile.email.change_complete',
  
  // Admin events
  ADMIN_USER_UPDATE: 'admin.user.update',
  ADMIN_USER_DELETE: 'admin.user.delete',
  ADMIN_SETTING_CHANGE: 'admin.setting.change',
  
  // Payment-related events
  PAYMENT_METHOD_ADD: 'payment.method.add',
  PAYMENT_METHOD_UPDATE: 'payment.method.update',
  PAYMENT_METHOD_DELETE: 'payment.method.delete',
  
  // Access events
  ACCESS_SENSITIVE_DATA: 'access.sensitive_data',
  ACCESS_DENIED: 'access.denied',
  PERMISSION_CHANGE: 'access.permission.change'
};

/**
 * Check if a security event requires immediate attention or notification
 */
export function isHighPrioritySecurityEvent(event: string): boolean {
  // List of events that should trigger immediate notification
  const highPriorityEvents = [
    SecurityEventTypes.MFA_VERIFY_FAILURE,
    SecurityEventTypes.ACCESS_DENIED,
    SecurityEventTypes.ADMIN_USER_DELETE,
    SecurityEventTypes.PAYMENT_METHOD_ADD,
    SecurityEventTypes.PAYMENT_METHOD_DELETE
  ];
  
  return highPriorityEvents.includes(event);
}

/**
 * Get recent security events for a user
 */
export async function getUserSecurityEvents(userId: string, limit = 10) {
  try {
    const supabase = createClientComponentClient<Database>();
    
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get user security events:', error);
    return [];
  }
}