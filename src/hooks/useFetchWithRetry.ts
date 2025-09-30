'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/apiClient';

export type RequestState = 'idle' | 'loading' | 'success' | 'error' | 'retrying';

export interface UseFetchWithRetryParams<TData, TError> {
  initialData?: TData;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
  throwOnError?: boolean;
  retries?: number;
  initialDelay?: number;
  backoffFactor?: number;
  maxDelay?: number;
}

export interface UseFetchWithRetryResult<TData, TError> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isRetrying: boolean;
  state: RequestState;
  retryCount: number;
  execute: (path: string, options?: RequestInit) => Promise<TData | undefined>;
  reset: () => void;
}

export function useFetchWithRetry<TData = any, TError = ApiError>(
  params: UseFetchWithRetryParams<TData, TError> = {}
): UseFetchWithRetryResult<TData, TError> {
  const {
    initialData,
    onSuccess,
    onError,
    throwOnError = false,
    retries = 3,
    initialDelay = 500,
    backoffFactor = 1.5,
    maxDelay = 10000
  } = params;

  const [data, setData] = useState<TData | undefined>(initialData);
  const [error, setError] = useState<TError | null>(null);
  const [state, setState] = useState<RequestState>('idle');
  const [retryCount, setRetryCount] = useState(0);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setState('idle');
    setRetryCount(0);
  }, [initialData]);

  const execute = useCallback(
    async (path: string, options?: RequestInit): Promise<TData | undefined> => {
      try {
        setState('loading');
        setError(null);
        setRetryCount(0);

        const result = await api.get<TData>(path, {
          retry: {
            maxRetries: retries,
            initialDelayMs: initialDelay,
            backoffFactor,
            maxDelayMs: maxDelay,
            onRetry: (attempt) => {
              setState('retrying');
              setRetryCount(attempt);
            },
          },
          throwOnError,
          headers: options?.headers as Record<string, string>,
        });

        setData(result);
        setState('success');
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        setState('error');
        const apiError = err as TError;
        setError(apiError);
        
        if (onError) {
          onError(apiError);
        }
        
        if (throwOnError) {
          throw err;
        }
        
        return undefined;
      }
    },
    [retries, initialDelay, backoffFactor, maxDelay, throwOnError, onSuccess, onError]
  );

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
    reset,
  };
}

export interface UseApiRequestProps<TData, TError, TVariables> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  variables?: TVariables;
  options?: {
    initialData?: TData;
    onSuccess?: (data: TData) => void;
    onError?: (error: TError) => void;
    throwOnError?: boolean;
    retries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxDelay?: number;
    headers?: Record<string, string>;
    skipInitialRequest?: boolean;
    disableAutomaticRefetch?: boolean;
    retryOnFocus?: boolean;
    refreshInterval?: number;
  };
}

export function useApiRequest<TData = any, TError = ApiError, TVariables = any>(
  props: UseApiRequestProps<TData, TError, TVariables>
) {
  const {
    url,
    method = 'GET',
    variables,
    options = {}
  } = props;

  const {
    initialData,
    onSuccess,
    onError,
    throwOnError,
    retries,
    initialDelay,
    backoffFactor,
    maxDelay,
    headers = {},
    skipInitialRequest = false,
    disableAutomaticRefetch = false,
    retryOnFocus = true,
    refreshInterval
  } = options;

  const fetchWithRetry = useFetchWithRetry<TData, TError>({
    initialData,
    onSuccess,
    onError,
    throwOnError,
    retries,
    initialDelay,
    backoffFactor,
    maxDelay
  });

  const {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    isRetrying,
    state,
    retryCount,
    execute,
    reset
  } = fetchWithRetry;

  // Store a reference to the latest variables for refetching
  const [latestVariables, setLatestVariables] = useState<TVariables | undefined>(variables);

  // Function to execute the API request based on method
  const executeRequest = useCallback(async (vars?: TVariables) => {
    const reqVariables = vars || latestVariables;
    setLatestVariables(reqVariables);

    try {
      switch (method) {
        case 'GET':
          // For GET requests, add query params if variables exist
          let queryUrl = url;
          if (reqVariables && Object.keys(reqVariables).length > 0) {
            const params = new URLSearchParams();
            Object.entries(reqVariables as Record<string, any>).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                params.append(key, String(value));
              }
            });
            queryUrl = `${url}?${params.toString()}`;
          }
          return await api.get<TData>(queryUrl, { headers, throwOnError });

        case 'POST':
          return await api.post<TData>(url, reqVariables, { headers, throwOnError });

        case 'PUT':
          return await api.put<TData>(url, reqVariables, { headers, throwOnError });

        case 'DELETE':
          return await api.delete<TData>(url, { headers, throwOnError });

        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (err) {
      if (throwOnError) {
        throw err;
      }
      return undefined;
    }
  }, [url, method, latestVariables, headers, throwOnError]);

  // Handle initial request
  useEffect(() => {
    if (!skipInitialRequest) {
      executeRequest(variables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle refetch on variables change
  useEffect(() => {
    if (!disableAutomaticRefetch && variables !== latestVariables) {
      executeRequest(variables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variables, disableAutomaticRefetch]);

  // Handle refetch on window focus
  useEffect(() => {
    if (!retryOnFocus) return;

    const handleFocus = () => {
      if (isError) {
        executeRequest();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isError, retryOnFocus, executeRequest]);

  // Handle refresh interval
  useEffect(() => {
    if (!refreshInterval || isError) return;

    const intervalId = setInterval(() => {
      executeRequest();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, isError, executeRequest]);

  // Refetch function that can be called manually
  const refetch = useCallback((vars?: TVariables) => {
    return executeRequest(vars);
  }, [executeRequest]);

  return {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    isRetrying,
    state,
    retryCount,
    refetch,
    reset,
  };
}