/**
 * MFA Recovery Functions
 * 
 * These functions handle the process of recovering MFA access when a user loses their authentication device
 * or has no access to recovery codes.
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';
import { logSecurityEvent, SecurityEventTypes } from './security';
import { nanoid } from 'nanoid';

/**
 * Interface for the response from initiating an MFA recovery request
 */
export interface MfaRecoveryInitiateResponse {
  success: boolean;
  error: string | null;
  caseNumber?: string;
}

/**
 * Interface for the response from checking an MFA recovery request status
 */
export interface MfaRecoveryStatusResponse {
  success: boolean;
  error: string | null;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  created?: string;
  updated?: string;
}

/**
 * Interface for the response from email verification
 */
export interface MfaRecoveryEmailVerificationResponse {
  verified: boolean;
  error: string | null;
}

/**
 * Initiates an MFA recovery process - Step 1
 * This sends a verification code to the user's email
 * @param email User's email address
 * @returns Response with success status and error if any
 */
export async function initiateRecovery(
  email: string
): Promise<MfaRecoveryInitiateResponse> {
  try {
    const response = await fetch('/api/mfa/recovery/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send verification code'
      };
    }

    return {
      success: true,
      error: null
    };
  } catch (error: any) {
    console.error('Failed to initiate MFA recovery:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Verifies the email verification code - Step 2
 * @param email User's email address
 * @param code Verification code sent to email
 * @returns Response with verification status and error if any
 */
export async function verifyRecoveryEmail(
  email: string,
  code: string
): Promise<MfaRecoveryEmailVerificationResponse> {
  try {
    const response = await fetch('/api/mfa/recovery/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        verified: false,
        error: data.error || 'Failed to verify code'
      };
    }

    return {
      verified: true,
      error: null
    };
  } catch (error: any) {
    console.error('Failed to verify email code:', error);
    return {
      verified: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Submits the MFA recovery request - Step 3
 * @param recoveryData User's information for recovery verification
 * @returns Response with success status and case number
 */
export async function submitRecoveryRequest(
  recoveryData: {
    email: string;
    fullName: string;
    dateOfBirth: string;
    lastFourCard: string;
  }
): Promise<MfaRecoveryInitiateResponse> {
  try {
    // Generate a case number
    const caseNumber = `MFA-${nanoid(8).toUpperCase()}`;
    
    // Format data for the API
    const personalInfo = {
      fullName: recoveryData.fullName,
      dateOfBirth: recoveryData.dateOfBirth,
      lastFourDigits: recoveryData.lastFourCard
    };
    
    // Call the existing function with the right format
    return await initiateMfaRecovery(recoveryData.email, caseNumber, personalInfo);
  } catch (error: any) {
    console.error('Failed to submit recovery request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Initiates an MFA recovery request
 * @param email User's email address
 * @param caseNumber Generated case number for tracking
 * @param personalInfo User's personal information for verification
 * @returns Response with success status and error if any
 */
export async function initiateMfaRecovery(
  email: string,
  caseNumber: string,
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    lastFourDigits: string;
  }
): Promise<MfaRecoveryInitiateResponse> {
  try {
    const response = await fetch('/api/mfa/recovery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        caseNumber,
        personalInfo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to initiate recovery request'
      };
    }

    return {
      success: true,
      error: null,
      caseNumber: data.caseNumber
    };
  } catch (error: any) {
    console.error('Failed to initiate MFA recovery:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Checks the status of an MFA recovery request
 * @param caseNumber The case number for the recovery request
 * @param email Optional email for unauthenticated status checks
 * @returns Response with success status and request details
 */
export async function checkMfaRecoveryStatus(
  caseNumber: string,
  email?: string
): Promise<MfaRecoveryStatusResponse> {
  try {
    let url = `/api/mfa/recovery?caseNumber=${encodeURIComponent(caseNumber)}`;
    
    if (email) {
      url += `&email=${encodeURIComponent(email)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to check recovery status'
      };
    }

    return {
      success: true,
      error: null,
      status: data.status,
      created: data.created,
      updated: data.updated
    };
  } catch (error: any) {
    console.error('Failed to check MFA recovery status:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Admin function to approve an MFA recovery request
 * @param caseNumber The case number for the recovery request
 * @param reviewNotes Optional notes from the reviewer
 * @returns Response with success status and error if any
 */
export async function approveMfaRecoveryRequest(
  caseNumber: string,
  reviewNotes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClientComponentClient<Database>();
    
    // Get current user to use as reviewer
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to approve recovery requests'
      };
    }
    
    // Call RPC function for updating status
    const { data, error } = await supabase
      .rpc('update_recovery_request_status', {
        p_case_number: caseNumber,
        p_status: 'approved',
        p_reviewer_id: user.id,
        p_review_notes: reviewNotes || null
      });
      
    if (error) {
      console.error('Error approving recovery request:', error);
      return {
        success: false,
        error: 'Failed to approve request'
      };
    }
    
    if (!data) {
      return {
        success: false,
        error: 'Request not found'
      };
    }
    
    // Log the security event
    await logSecurityEvent({
      userId: user.id,
      event: SecurityEventTypes.MFA_RECOVERY_APPROVED,
      details: { caseNumber },
      ip: 'internal',
      userAgent: navigator.userAgent
    });
    
    return {
      success: true,
      error: null
    };
  } catch (error: any) {
    console.error('Failed to approve MFA recovery request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Admin function to reject an MFA recovery request
 * @param caseNumber The case number for the recovery request
 * @param reviewNotes Optional notes from the reviewer explaining rejection
 * @returns Response with success status and error if any
 */
export async function rejectMfaRecoveryRequest(
  caseNumber: string,
  reviewNotes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClientComponentClient<Database>();
    
    // Get current user to use as reviewer
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to reject recovery requests'
      };
    }
    
    // Call RPC function for updating status
    const { data, error } = await supabase
      .rpc('update_recovery_request_status', {
        p_case_number: caseNumber,
        p_status: 'rejected',
        p_reviewer_id: user.id,
        p_review_notes: reviewNotes || null
      });
      
    if (error) {
      console.error('Error rejecting recovery request:', error);
      return {
        success: false,
        error: 'Failed to reject request'
      };
    }
    
    if (!data) {
      return {
        success: false,
        error: 'Request not found'
      };
    }
    
    // Log the security event
    await logSecurityEvent({
      userId: user.id,
      event: SecurityEventTypes.MFA_RECOVERY_REJECTED,
      details: { caseNumber },
      ip: 'internal',
      userAgent: navigator.userAgent
    });
    
    return {
      success: true,
      error: null
    };
  } catch (error: any) {
    console.error('Failed to reject MFA recovery request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Admin function to complete an MFA recovery process
 * This will disable MFA for the user and remove all MFA factors
 * @param caseNumber The case number for the recovery request
 * @returns Response with success status and error if any
 */
export async function completeMfaRecoveryProcess(
  caseNumber: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClientComponentClient<Database>();
    
    // Get current user to use as admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to complete recovery processes'
      };
    }
    
    // Call RPC function for completing the recovery
    const { data, error } = await supabase
      .rpc('complete_mfa_recovery', {
        p_case_number: caseNumber,
        p_admin_id: user.id
      });
      
    if (error) {
      console.error('Error completing recovery process:', error);
      return {
        success: false,
        error: 'Failed to complete recovery process'
      };
    }
    
    if (!data) {
      return {
        success: false,
        error: 'Request not found or not approved'
      };
    }
    
    // Log the security event
    await logSecurityEvent({
      userId: user.id,
      event: SecurityEventTypes.MFA_RECOVERY_COMPLETED,
      details: { caseNumber },
      ip: 'internal',
      userAgent: navigator.userAgent
    });
    
    return {
      success: true,
      error: null
    };
  } catch (error: any) {
    console.error('Failed to complete MFA recovery process:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Get MFA recovery statistics for admin dashboard
 * @returns Statistics about MFA recovery requests
 */
export async function getMfaRecoveryStatistics(): Promise<{
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  completed_requests: number;
  average_resolution_time_hours: number;
} | null> {
  try {
    const supabase = createClientComponentClient<Database>();
    
    const { data, error } = await supabase
      .rpc('get_mfa_recovery_statistics');
      
    if (error) {
      console.error('Error getting MFA recovery statistics:', error);
      return null;
    }
    
    return data;
  } catch (error: any) {
    console.error('Failed to get MFA recovery statistics:', error);
    return null;
  }
}