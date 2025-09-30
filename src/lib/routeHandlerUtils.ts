import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * Type definitions for route handler functions
 */
export type RouteHandlerContext = {
  params: Record<string, string>;
  req: NextRequest;
  searchParams: Record<string, string | string[]>;
};

export type RouteHandler<T = any> = (
  context: RouteHandlerContext
) => Promise<NextResponse<T | { error: string }>>;

export type AuthenticatedContext = RouteHandlerContext & {
  userId: string;
  user: any;
};

export type AuthenticatedRouteHandler<T = any> = (
  context: AuthenticatedContext
) => Promise<NextResponse<T | { error: string }>>;

export type ValidationSchema = {
  body?: z.ZodType<any, any>;
  query?: z.ZodType<any, any>;
  params?: z.ZodType<any, any>;
};

export interface RouteOptions {
  validation?: ValidationSchema;
  authentication?: boolean;
  rateLimit?: {
    limit: number;
    window: number; // in seconds
  };
  caching?: {
    maxAge: number; // in seconds
    staleWhileRevalidate?: number;
  };
  logging?: boolean;
}

/**
 * Error response helper
 */
const errorResponse = (message: string, status: number = 400) => {
  return NextResponse.json(
    { error: message },
    { status }
  );
};

/**
 * Authentication middleware
 */
export const withAuth = (handler: AuthenticatedRouteHandler) => {
  return async (context: RouteHandlerContext) => {
    const { req } = context;
    
    // Get the auth cookie
    const authToken = req.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      return errorResponse('Unauthorized', 401);
    }
    
    try {
      // Verify the token (this would typically involve checking against your auth system)
      // For demonstration, assuming we can get userId from token
      const userId = 'user-123'; // Replace with actual verification
      const user = { id: userId }; // Get actual user data
      
      // Add user info to context
      const authContext: AuthenticatedContext = {
        ...context,
        userId,
        user
      };
      
      // Pass to the handler
      return await handler(authContext);
    } catch (error) {
      console.error('Authentication error:', error);
      return errorResponse('Unauthorized', 401);
    }
  };
};

/**
 * Rate limiting middleware
 */
export const withRateLimit = (
  handler: RouteHandler,
  { limit, window }: { limit: number; window: number }
) => {
  // In a real implementation, this would use Redis or similar to track requests
  const ipRequests: Record<string, { count: number; resetAt: number }> = {};
  
  return async (context: RouteHandlerContext) => {
    const { req } = context;
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Initialize or get current request count for this IP
    if (!ipRequests[ip] || ipRequests[ip].resetAt < now) {
      ipRequests[ip] = { count: 0, resetAt: now + window * 1000 };
    }
    
    // Check if over limit
    if (ipRequests[ip].count >= limit) {
      return errorResponse(
        'Too many requests, please try again later',
        429
      );
    }
    
    // Increment count
    ipRequests[ip].count++;
    
    // Call handler
    return await handler(context);
  };
};

/**
 * Validation middleware
 */
export const withValidation = (
  handler: RouteHandler,
  schema: ValidationSchema
) => {
  return async (context: RouteHandlerContext) => {
    const { req, searchParams, params } = context;
    let validationError = '';
    
    try {
      // Validate body if schema exists and request has body
      if (schema.body) {
        try {
          const body = await req.json();
          schema.body.parse(body);
          // Re-assign parsed body to the request for downstream handlers
          (req as any).parsedBody = body;
        } catch (error) {
          if (error instanceof z.ZodError) {
            validationError = `Body validation error: ${error.format()}`;
          } else {
            validationError = 'Invalid request body';
          }
          return errorResponse(validationError, 400);
        }
      }
      
      // Validate query parameters
      if (schema.query) {
        try {
          schema.query.parse(searchParams);
        } catch (error) {
          if (error instanceof z.ZodError) {
            validationError = `Query validation error: ${error.format()}`;
          } else {
            validationError = 'Invalid query parameters';
          }
          return errorResponse(validationError, 400);
        }
      }
      
      // Validate path parameters
      if (schema.params) {
        try {
          schema.params.parse(params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            validationError = `Path parameter validation error: ${error.format()}`;
          } else {
            validationError = 'Invalid path parameters';
          }
          return errorResponse(validationError, 400);
        }
      }
      
      // All validations passed, call the handler
      return await handler(context);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return errorResponse('Internal server error', 500);
    }
  };
};

/**
 * Caching middleware
 */
export const withCaching = (
  handler: RouteHandler,
  { maxAge, staleWhileRevalidate = 0 }: { maxAge: number; staleWhileRevalidate?: number }
) => {
  return async (context: RouteHandlerContext) => {
    const response = await handler(context);
    
    // Add cache control headers
    response.headers.set(
      'Cache-Control',
      `max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    
    return response;
  };
};

/**
 * Logging middleware
 */
export const withLogging = (handler: RouteHandler) => {
  return async (context: RouteHandlerContext) => {
    const { req, params } = context;
    const start = Date.now();
    const method = req.method;
    const url = req.url;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - Started`);
    
    try {
      // Call the handler
      const response = await handler(context);
      
      // Log the completion
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${method} ${url} - Completed in ${duration}ms with status ${response.status}`
      );
      
      return response;
    } catch (error) {
      // Log the error
      const duration = Date.now() - start;
      console.error(
        `[${new Date().toISOString()}] ${method} ${url} - Failed after ${duration}ms:`,
        error
      );
      
      // Return an error response
      return errorResponse('Internal server error', 500);
    }
  };
};

/**
 * Create a route handler with specified options
 */
export function createRouteHandler<T = any>(
  handler: RouteHandler<T>,
  options: RouteOptions = {}
): RouteHandler<T> {
  let wrappedHandler: RouteHandler<T> = handler;
  
  // Apply logging middleware first to catch all activity
  if (options.logging !== false) { // Default to true
    wrappedHandler = withLogging(wrappedHandler);
  }
  
  // Apply validation if schema provided
  if (options.validation) {
    wrappedHandler = withValidation(wrappedHandler, options.validation);
  }
  
  // Apply rate limiting if configured
  if (options.rateLimit) {
    wrappedHandler = withRateLimit(wrappedHandler, options.rateLimit);
  }
  
  // Apply caching if configured
  if (options.caching) {
    wrappedHandler = withCaching(wrappedHandler, options.caching);
  }
  
  // Return the handler
  return async (context: RouteHandlerContext) => {
    try {
      // Extract search params from URL
      const url = new URL(context.req.url);
      const searchParams: Record<string, string | string[]> = {};
      
      url.searchParams.forEach((value, key) => {
        const existingValue = searchParams[key];
        
        if (existingValue) {
          if (Array.isArray(existingValue)) {
            existingValue.push(value);
          } else {
            searchParams[key] = [existingValue, value];
          }
        } else {
          searchParams[key] = value;
        }
      });
      
      // Update context with search params
      const enrichedContext = {
        ...context,
        searchParams
      };
      
      // Call the wrapped handler
      return await wrappedHandler(enrichedContext);
    } catch (error) {
      console.error('Route handler error:', error);
      return errorResponse('Internal server error', 500);
    }
  };
}

/**
 * Create an authenticated route handler
 */
export function createAuthenticatedRouteHandler<T = any>(
  handler: AuthenticatedRouteHandler<T>,
  options: RouteOptions = {}
): RouteHandler<T> {
  // Apply authentication middleware
  const authenticatedHandler = withAuth(handler);
  
  // Apply other middlewares via createRouteHandler
  return createRouteHandler(authenticatedHandler as RouteHandler<T>, options);
}