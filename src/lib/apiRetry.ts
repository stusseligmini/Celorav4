/**
 * API Retry Utilities
 * 
 * Provides advanced retry mechanisms for API calls with exponential backoff, 
 * circuit breaking, and customizable retry strategies.
 */

type RetryOptions = {
  // Maximum number of retry attempts
  maxRetries?: number;
  // Initial delay between retries in milliseconds
  initialDelayMs?: number;
  // Factor by which the delay increases with each retry (exponential backoff)
  backoffFactor?: number;
  // Maximum delay between retries in milliseconds
  maxDelayMs?: number;
  // Function to determine if an error is retryable
  isRetryable?: (error: any) => boolean;
  // Function called before each retry attempt
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
  // HTTP methods to retry (default: ['GET', 'HEAD', 'OPTIONS'])
  retryableMethods?: string[];
  // HTTP status codes to retry (default: [408, 429, 500, 502, 503, 504])
  retryableStatusCodes?: number[];
  // Timeout for each attempt in milliseconds
  timeoutMs?: number;
};

// Default options for retry mechanism
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 300,
  backoffFactor: 2,
  maxDelayMs: 5000,
  isRetryable: () => true,
  onRetry: () => {},
  retryableMethods: ['GET', 'HEAD', 'OPTIONS'],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  timeoutMs: 10000,
};

// Circuit breaker state
type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(failureThreshold: number = 5, resetTimeoutMs: number = 30000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if circuit can be half-opened
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker transitioning to HALF_OPEN state');
      } else {
        throw new Error('Circuit is OPEN - requests are blocked');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        // Reset circuit breaker on successful request
        this.reset();
        console.log('Circuit breaker reset to CLOSED state');
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`Circuit OPEN after ${this.failureCount} failures`);
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log('Circuit OPEN after test request failure');
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }
}

// Cache for circuit breakers by endpoint
const circuitBreakers: Record<string, CircuitBreaker> = {};

/**
 * Retry function that wraps a promise and applies retry logic
 * @param fn Function that returns a promise
 * @param options Retry options
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const config: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
  
  let attempt = 0;
  let lastError: any;

  while (attempt <= config.maxRetries) {
    try {
      if (attempt > 0) {
        const delayMs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelayMs
        );
        
        config.onRetry(attempt, lastError, delayMs);
        await delay(delayMs);
      }

      // Apply timeout to the function call
      return await withTimeout(fn, config.timeoutMs);
    } catch (error) {
      lastError = error;
      attempt++;
      
      // If we've used all retries or the error is not retryable, throw the error
      if (attempt > config.maxRetries || !config.isRetryable(error)) {
        throw error;
      }
    }
  }

  // This should never happen, but TypeScript needs it
  throw lastError;
}

/**
 * Enhanced fetch function with retry capabilities
 * @param url URL to fetch
 * @param options Fetch options and retry options
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit & { retry?: RetryOptions } = {}
): Promise<Response> {
  const { retry: retryOptions, ...fetchOptions } = options;
  const config: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...retryOptions };
  
  // Extract endpoint for circuit breaker
  const urlObj = new URL(url);
  const endpoint = `${urlObj.origin}${urlObj.pathname}`;
  
  // Create circuit breaker for this endpoint if it doesn't exist
  if (!circuitBreakers[endpoint]) {
    circuitBreakers[endpoint] = new CircuitBreaker();
  }
  
  const circuitBreaker = circuitBreakers[endpoint];
  
  // Custom retry logic for fetch
  return await circuitBreaker.execute(async () => {
    return retry(
      () => fetch(url, fetchOptions),
      {
        ...config,
        isRetryable: (error) => {
          // Network errors are always retryable
          if (error instanceof TypeError) {
            return true;
          }
          
          // For HTTP errors, check if the method and status code are retryable
          if (error instanceof Response) {
            const method = fetchOptions.method?.toUpperCase() || 'GET';
            return (
              config.retryableMethods.includes(method) &&
              config.retryableStatusCodes.includes(error.status)
            );
          }
          
          // Use the provided isRetryable function for other errors
          return config.isRetryable(error);
        },
        onRetry: (attempt, error, delayMs) => {
          console.warn(
            `Retrying (${attempt}/${config.maxRetries}) ${fetchOptions.method || 'GET'} ${url} after ${delayMs}ms due to:`,
            error instanceof Response ? `HTTP ${error.status}` : error
          );
          config.onRetry(attempt, error, delayMs);
        },
      }
    );
  });
}

/**
 * Apply a timeout to a promise
 * @param fn Function that returns a promise
 * @param timeoutMs Timeout in milliseconds
 */
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    fn().then(
      result => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      error => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

/**
 * Create a delay promise
 * @param ms Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create an API client with retry capabilities
 * @param baseUrl Base URL for API calls
 * @param defaultOptions Default options for all requests
 */
export function createApiClient(
  baseUrl: string,
  defaultOptions: RequestInit & { retry?: RetryOptions } = {}
) {
  return {
    async get<T>(path: string, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
      const mergedOptions = { 
        ...defaultOptions, 
        ...options,
        method: 'GET',
        headers: { ...defaultOptions.headers, ...options.headers }
      };
      
      const response = await fetchWithRetry(`${baseUrl}${path}`, mergedOptions);
      if (!response.ok) {
        throw response;
      }
      
      return response.json();
    },
    
    async post<T>(path: string, body: any, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
      const mergedOptions = { 
        ...defaultOptions, 
        ...options, 
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...defaultOptions.headers,
          ...options.headers,
        }
      };
      
      const response = await fetchWithRetry(`${baseUrl}${path}`, mergedOptions);
      if (!response.ok) {
        throw response;
      }
      
      return response.json();
    },
    
    async put<T>(path: string, body: any, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
      const mergedOptions = { 
        ...defaultOptions, 
        ...options, 
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          ...defaultOptions.headers,
          ...options.headers,
        }
      };
      
      const response = await fetchWithRetry(`${baseUrl}${path}`, mergedOptions);
      if (!response.ok) {
        throw response;
      }
      
      return response.json();
    },
    
    async delete<T>(path: string, options: RequestInit & { retry?: RetryOptions } = {}): Promise<T> {
      const mergedOptions = { 
        ...defaultOptions, 
        ...options, 
        method: 'DELETE',
        headers: { ...defaultOptions.headers, ...options.headers }
      };
      
      const response = await fetchWithRetry(`${baseUrl}${path}`, mergedOptions);
      if (!response.ok) {
        throw response;
      }
      
      return response.json();
    },
  };
}