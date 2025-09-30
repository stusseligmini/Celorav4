'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/apiClient';
import { RequestState } from './useFetchWithRetry';

// Types for the hook
export interface UseSecureApiOptions<TData, TVariables> {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  initialVariables?: TVariables;
  initialData?: TData;
  headers?: Record<string, string>;
  retries?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
  autoFetch?: boolean;
  redirectOnAuthError?: boolean;
  authErrorRedirectPath?: string;
  refreshInterval?: number;
}

export interface UseSecureApiResult<TData, TVariables> {
  data: TData | undefined;
  error: ApiError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isRetrying: boolean;
  state: RequestState;
  retryCount: number;
  execute: (variables?: TVariables) => Promise<TData | undefined>;
  reset: () => void;
}

/**
 * Hook for making secure API requests with authentication handling
 */
export function useSecureApi<TData = any, TVariables = any>(
  options: UseSecureApiOptions<TData, TVariables>
): UseSecureApiResult<TData, TVariables> {
  const {
    url,
    method = 'GET',
    initialVariables,
    initialData,
    headers = {},
    retries = 3,
    onSuccess,
    onError,
    autoFetch = true,
    redirectOnAuthError = true,
    authErrorRedirectPath = '/signin',
    refreshInterval
  } = options;

  const router = useRouter();
  
  const [data, setData] = useState<TData | undefined>(initialData);
  const [error, setError] = useState<ApiError | null>(null);
  const [state, setState] = useState<RequestState>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [variables, setVariables] = useState<TVariables | undefined>(initialVariables);

  // Function to make the API request
  const execute = useCallback(
    async (newVariables?: TVariables): Promise<TData | undefined> => {
      if (!url) {
        console.warn('No URL provided for API request');
        return undefined;
      }
      
      const currentVariables = newVariables !== undefined ? newVariables : variables;
      setVariables(currentVariables);
      setState('loading');
      setError(null);
      setRetryCount(0);

      try {
        let result: TData;
        const retryOptions = {
          maxRetries: retries,
          onRetry: (attempt: number) => {
            setState('retrying');
            setRetryCount(attempt);
          }
        };

        switch (method) {
          case 'GET': {
            // For GET requests, construct query string from variables
            let requestUrl = url;
            if (currentVariables) {
              const queryParams = new URLSearchParams();
              Object.entries(currentVariables as Record<string, any>).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  queryParams.append(key, String(value));
                }
              });
              const queryString = queryParams.toString();
              if (queryString) {
                requestUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
              }
            }
            result = await api.get<TData>(requestUrl, { retry: retryOptions, headers });
            break;
          }
          case 'POST':
            result = await api.post<TData>(url, currentVariables, { retry: retryOptions, headers });
            break;
          case 'PUT':
            result = await api.put<TData>(url, currentVariables, { retry: retryOptions, headers });
            break;
          case 'DELETE': {
            // For DELETE requests, construct query string from variables if needed
            let requestUrl = url;
            if (currentVariables) {
              const queryParams = new URLSearchParams();
              Object.entries(currentVariables as Record<string, any>).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  queryParams.append(key, String(value));
                }
              });
              const queryString = queryParams.toString();
              if (queryString) {
                requestUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
              }
            }
            result = await api.delete<TData>(requestUrl, { retry: retryOptions, headers });
            break;
          }
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        setData(result);
        setState('success');
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        setState('error');
        
        if (onError) {
          onError(apiError);
        }
        
        // Handle authentication errors
        if (redirectOnAuthError && (apiError.status === 401 || apiError.status === 403)) {
          console.warn('Authentication error, redirecting to', authErrorRedirectPath);
          router.push(authErrorRedirectPath);
        }
        
        return undefined;
      }
    },
    [url, method, variables, headers, retries, onSuccess, onError, redirectOnAuthError, authErrorRedirectPath, router]
  );

  // Reset the state
  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setState('idle');
    setRetryCount(0);
  }, [initialData]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && url) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, url]);
  
  // Set up refresh interval if provided
  useEffect(() => {
    if (!refreshInterval || !url || state === 'loading' || state === 'retrying') {
      return;
    }
    
    const intervalId = setInterval(() => {
      execute();
    }, refreshInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshInterval, url, state, execute]);

  return {
    data,
    error,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isRetrying: state === 'retrying',
    state,
    retryCount,
    execute,
    reset
  };
}