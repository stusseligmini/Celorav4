/**
 * API Security Middleware
 * 
 * This file contains middleware functions for securing API endpoints,
 * including input validation, rate limiting, and protection against common attacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from './csrfProtection';
import { z } from 'zod'; // For input validation

// Rate limiting cache (would use Redis in production)
const rateLimitCache: Record<string, { count: number, resetTime: number }> = {};

/**
 * Rate limiting options interface
 */
export interface RateLimitOptions {
  limit: number;          // Maximum requests allowed in the time window
  windowMs: number;       // Time window in milliseconds
  keyPrefix?: string;     // Optional prefix for rate limit key
}

/**
 * Rate limiting result interface
 */
export interface RateLimitResult {
  success: boolean;       // Whether the request is allowed
  limit: number;          // The rate limit
  current: number;        // Current count
  remaining: number;      // Remaining requests
  resetTime: number;      // When the rate limit resets
}

/**
 * Rate limiting middleware for API routes
 * @param request The Next.js request object
 * @param options Rate limit options or limit number
 * @returns RateLimitResult or NextResponse if exceeded
 */
export async function applyRateLimit(
  request: NextRequest, 
  options: RateLimitOptions | number = 60
): Promise<RateLimitResult | NextResponse> {
  // Handle legacy number parameter
  const limit = typeof options === 'number' ? options : options.limit;
  const windowMs = typeof options === 'number' ? 60000 : options.windowMs;
  const keyPrefix = typeof options === 'number' ? '' : (options.keyPrefix || '');
  
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const key = `${keyPrefix}:${ip}:${request.nextUrl.pathname}`;
  
  // Initialize or reset rate limit entry
  if (!rateLimitCache[key] || now > rateLimitCache[key].resetTime) {
    rateLimitCache[key] = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  // Increment count and check if over limit
  rateLimitCache[key].count++;
  
  if (rateLimitCache[key].count > limit) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitCache[key].resetTime - now) / 1000)
      }),
      { 
        status: 429, 
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitCache[key].resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': Math.max(0, limit - rateLimitCache[key].count).toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimitCache[key].resetTime / 1000).toString()
        }
      }
    );
  }
  
  return {
    success: true,
    limit,
    current: rateLimitCache[key].count,
    remaining: limit - rateLimitCache[key].count,
    resetTime: rateLimitCache[key].resetTime
  };
}

/**
 * Middleware to validate CSRF token for mutating requests
 */
export function csrfProtectionMiddleware(request: NextRequest): NextResponse | null {
  // Only check CSRF for mutating methods
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (mutatingMethods.includes(request.method)) {
    if (!validateCsrfToken(request)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid CSRF token',
          message: 'CSRF validation failed. Please refresh the page and try again.'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  return null;
}

/**
 * Generic input validation middleware using Zod schemas
 */
export async function validateInput<T>(
  request: NextRequest,
  schema: z.Schema<T>
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    let body;
    
    if (request.headers.get('content-type')?.includes('application/json')) {
      body = await request.json();
    } else if (request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    } else {
      return {
        data: null,
        error: new NextResponse(
          JSON.stringify({
            error: 'Unsupported content type',
            message: 'Request must be JSON or form data'
          }),
          { status: 415, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    
    const validated = schema.parse(body);
    return { data: validated, error: null };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: new NextResponse(
          JSON.stringify({
            error: 'Validation error',
            message: 'The submitted data failed validation',
            details: error.format()
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    
    return {
      data: null,
      error: new NextResponse(
        JSON.stringify({
          error: 'Server error',
          message: 'An error occurred while processing your request'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  
  return response;
}

/**
 * Combine multiple API middleware functions
 */
export function combineMiddleware(...middlewares: Array<(req: NextRequest) => NextResponse | null>) {
  return (request: NextRequest) => {
    for (const middleware of middlewares) {
      const result = middleware(request);
      if (result) return result;
    }
    return null;
  };
}

/**
 * Complete API security middleware that combines all protections
 */
export async function apiSecurityMiddleware<T>(
  request: NextRequest,
  schema?: z.Schema<T>,
  rateLimit: RateLimitOptions = { limit: 60, windowMs: 60000 }
): Promise<{ data: T | null; error: NextResponse | null }> {
  // Apply rate limiting
  const rateLimitResponse = await applyRateLimit(request, rateLimit);
  
  // Check if rate limit was exceeded (response is NextResponse)
  if (rateLimitResponse instanceof NextResponse) {
    return { data: null, error: rateLimitResponse };
  }
  
  // Apply CSRF protection
  const csrfResponse = csrfProtectionMiddleware(request);
  if (csrfResponse) return { data: null, error: csrfResponse };
  
  // Validate input if schema provided
  if (schema) {
    return await validateInput(request, schema);
  }
  
  return { data: null, error: null };
}