'use client';

/**
 * This file centralizes common error handling and configuration for Supabase interactions
 * It consolidates error recovery strategies for various Supabase errors:
 * - Cookie parsing errors
 * - WebSocket connection issues
 * - Authentication state changes
 * - Connection recovery
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { cleanupProblemCookies } from './cookieHelper';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000  // 30 seconds
};

// Cache storage for retry attempts
const retryAttempts: Record<string, number> = {};

/**
 * Resets retry attempt counter for a specific operation
 * @param operationId Unique identifier for the operation
 */
export function resetRetryAttempts(operationId: string): void {
  delete retryAttempts[operationId];
}

/**
 * Handles exponential backoff retry logic
 * @param operationId Unique identifier for the operation being retried
 * @param operation Function to retry
 * @param config Optional retry configuration
 * @returns Result of the operation or throws after max attempts
 */
export async function withRetry<T>(
  operationId: string,
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };
  
  // Initialize or increment retry counter
  retryAttempts[operationId] = (retryAttempts[operationId] || 0) + 1;
  
  try {
    // Attempt the operation
    const result = await operation();
    
    // Success! Reset retry counter
    resetRetryAttempts(operationId);
    
    return result;
  } catch (error) {
    console.warn(`Operation ${operationId} failed (attempt ${retryAttempts[operationId]}):`, error);
    
    // Check if we should retry
    if (retryAttempts[operationId] < maxAttempts) {
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        maxDelay,
        baseDelay * Math.pow(2, retryAttempts[operationId] - 1)
      );
      
      // Add some randomness to avoid thundering herd
      const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
      const delay = exponentialDelay * jitter;
      
      console.log(`Retrying operation ${operationId} in ${Math.round(delay)}ms...`);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operationId, operation, config);
    }
    
    // Max retries exceeded
    resetRetryAttempts(operationId);
    throw error;
  }
}

/**
 * Attempts to recover from common Supabase errors
 * @param supabase Supabase client instance
 */
export async function attemptSupabaseRecovery(supabase: SupabaseClient): Promise<void> {
  try {
    // Step 1: Clean up problematic cookies
    if (typeof document !== 'undefined') {
      cleanupProblemCookies();
    }
    
    // Step 2: Test the connection with a simple query
    await withRetry('test-connection', async () => {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
        
      if (error) throw error;
      return count;
    });
    
    console.log('Supabase recovery successful');
  } catch (error) {
    console.error('Supabase recovery failed:', error);
    throw error;
  }
}

/**
 * Helper function to safely unsubscribe from a realtime channel
 * @param supabase Supabase client instance
 * @param channel Channel to unsubscribe from
 */
export function safeUnsubscribe(supabase: SupabaseClient, channel: RealtimeChannel): void {
  try {
    supabase.removeChannel(channel);
  } catch (error) {
    console.warn('Error unsubscribing from channel:', error);
    // Don't rethrow - this is a best-effort cleanup
  }
}

/**
 * Safely validates if the Supabase client is functioning correctly
 * @param supabase Supabase client instance to validate
 * @returns True if the client is working, false otherwise
 */
export async function validateSupabaseClient(supabase: SupabaseClient): Promise<boolean> {
  try {
    // Try to get auth session as a simple test
    const { data, error } = await supabase.auth.getSession();
    
    // Check if we got a valid response (even if not authenticated)
    if (error) {
      console.warn('Supabase client validation failed:', error);
      return false;
    }
    
    // Successfully contacted Supabase, even if not authenticated
    return true;
  } catch (error) {
    console.error('Error validating Supabase client:', error);
    return false;
  }
}