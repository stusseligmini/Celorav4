/**
 * API Client with Retry Logic
 * 
 * A centralized client for making API calls with retry capabilities,
 * error handling, and response transformation.
 */

import { createApiClient, retry } from './apiRetry';
import { getSupabaseClient } from './supabaseSingleton';
import { featureFlags } from './featureFlags';

// Import type from apiRetry.ts
type RetryOptions = {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
  isRetryable?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
  retryableMethods?: string[];
  retryableStatusCodes?: number[];
  timeoutMs?: number;
};

// Extending Error to include response status and data
export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Default options for API requests
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  backoffFactor: 1.5,
  maxDelayMs: 10000,
  timeoutMs: 20000,
  retryableMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: (attempt: number, error: any, delayMs: number) => {
    console.warn(`Retry attempt ${attempt}, waiting ${delayMs}ms. Error:`, error);
  },
};

// Create the base API client
const apiClient = createApiClient('/api', {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  retry: DEFAULT_RETRY_OPTIONS,
  credentials: 'same-origin',
});

export interface ApiClientOptions {
  retry?: RetryOptions;
  throwOnError?: boolean;
  headers?: Record<string, string>;
}

/**
 * Enhanced API client with error handling and response processing
 */
export const api = {
  /**
   * Make a GET request with retry capabilities
   */
  async get<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
    try {
      // Check if API retry is enabled via feature flag
      const retryEnabled = await featureFlags.isEnabled('api_retry', { defaultValue: true });
      const retryOptions = retryEnabled ? options.retry : { maxRetries: 0 };
      
      return await apiClient.get<T>(path, {
        headers: options.headers,
        retry: retryOptions,
      });
    } catch (error) {
      return handleApiError(error, options.throwOnError);
    }
  },
  
  /**
   * Make a POST request with retry capabilities
   */
  async post<T>(path: string, data: any, options: ApiClientOptions = {}): Promise<T> {
    try {
      // POST requests have more limited retry settings by default
      const retryEnabled = await featureFlags.isEnabled('api_retry', { defaultValue: true });
      const retryOptions = retryEnabled ? {
        ...DEFAULT_RETRY_OPTIONS,
        maxRetries: 2,
        retryableMethods: ['POST'],
        ...options.retry,
      } : { maxRetries: 0 };
      
      return await apiClient.post<T>(path, data, {
        headers: options.headers,
        retry: retryOptions,
      });
    } catch (error) {
      return handleApiError(error, options.throwOnError);
    }
  },
  
  /**
   * Make a PUT request with retry capabilities
   */
  async put<T>(path: string, data: any, options: ApiClientOptions = {}): Promise<T> {
    try {
      const retryEnabled = await featureFlags.isEnabled('api_retry', { defaultValue: true });
      const retryOptions = retryEnabled ? options.retry : { maxRetries: 0 };
      
      return await apiClient.put<T>(path, data, {
        headers: options.headers,
        retry: retryOptions,
      });
    } catch (error) {
      return handleApiError(error, options.throwOnError);
    }
  },
  
  /**
   * Make a DELETE request with retry capabilities
   */
  async delete<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
    try {
      const retryEnabled = await featureFlags.isEnabled('api_retry', { defaultValue: true });
      const retryOptions = retryEnabled ? options.retry : { maxRetries: 0 };
      
      return await apiClient.delete<T>(path, {
        headers: options.headers,
        retry: retryOptions,
      });
    } catch (error) {
      return handleApiError(error, options.throwOnError);
    }
  },

  /**
   * Make a Supabase API call with retry capabilities
   */
  supabase: {
    async query<T>(
      fn: (client: ReturnType<typeof getSupabaseClient>) => Promise<{ data: T; error: any }>,
      options: ApiClientOptions = {}
    ): Promise<T> {
      const retryEnabled = await featureFlags.isEnabled('api_retry', { defaultValue: true });
      const retryOptions = {
        maxRetries: retryEnabled ? (options.retry?.maxRetries || 3) : 0,
        initialDelayMs: options.retry?.initialDelayMs || 500,
        backoffFactor: options.retry?.backoffFactor || 1.5,
        maxDelayMs: options.retry?.maxDelayMs || 10000,
      };
      
      try {
        return await retry(async () => {
          const client = getSupabaseClient();
          const { data, error } = await fn(client);
          
          if (error) {
            throw new ApiError(error.message, error.code || 500, error);
          }
          
          return data as T;
        }, retryOptions);
      } catch (error) {
        return handleApiError(error, options.throwOnError);
      }
    },
  },
};

/**
 * Handle API errors with consistent error processing
 */
function handleApiError(error: any, throwOnError = true): never {
  // Transform error into ApiError if it isn't one already
  let apiError: ApiError;
  
  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof Response) {
    apiError = new ApiError(
      `HTTP error ${error.status}: ${error.statusText}`,
      error.status,
      error
    );
  } else {
    apiError = new ApiError(
      error.message || 'Unknown API error',
      error.status || 500,
      error
    );
  }
  
  // Log the error
  console.error('API Error:', apiError);
  
  // Throw the error if throwOnError is true
  if (throwOnError) {
    throw apiError;
  }
  
  // This line is technically unreachable but required by TypeScript
  throw apiError;
}

export default api;