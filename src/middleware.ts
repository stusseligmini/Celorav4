import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SESSION_CONFIG } from './lib/sessionSecurity';
import { addCspHeaders, generateCspNonce } from './lib/contentSecurityPolicy';

// Edge runtime compatible UUID generation
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Rate limiting store (in-memory for Edge runtime)
const rateLimitStore: Record<string, { count: number, resetTime: number }> = {};

// Clean up expired rate limit entries periodically
function cleanupRateLimitStore() {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }
  });
}

// Apply rate limiting based on IP address
function applyRateLimit(ip: string, path: string, limit = 60, windowMs = 60000): boolean {
  cleanupRateLimitStore();
  
  const now = Date.now();
  const key = `${ip}:${path}`;
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  // If window has expired, reset
  if (now > rateLimitStore[key].resetTime) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  // Increment count and check if over limit
  rateLimitStore[key].count++;
  return rateLimitStore[key].count <= limit;
}

export async function middleware(request: NextRequest) {
  // Force canonical host www.celora.net (adjust if apex preferred)
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  if (host === 'celora.net') {
    url.host = 'www.celora.net';
    return NextResponse.redirect(url);
  }
  // Handle route conflicts with mfa mobile routes
  if (request.nextUrl.pathname === '/mfa-recovery-mobile') {
    return NextResponse.redirect(new URL('/(mfa-mobile)/mfa-recovery-mobile', request.url));
  }
  
  if (request.nextUrl.pathname === '/mfa-verification-mobile') {
    return NextResponse.redirect(new URL('/(mfa-mobile)/mfa-verification-mobile', request.url));
  }
  
  let response = NextResponse.next();
  const correlationId = request.headers.get('x-correlation-id') || generateUUID();
  
  // Get client IP for rate limiting and security checks
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;
  
  // Apply stricter rate limits to auth routes and API endpoints
  const isAuthRoute = path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/api/auth');
  const isApiRoute = path.startsWith('/api/');
  
  // Apply rate limiting
  if (isAuthRoute) {
    // Strict rate limiting for auth routes (20 requests per minute)
    if (!applyRateLimit(ip, 'auth', 20, 60000)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests, please try again later' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else if (isApiRoute) {
    // Standard rate limiting for API routes (60 requests per minute)
    if (!applyRateLimit(ip, 'api', 60, 60000)) {
      return new NextResponse(
        JSON.stringify({ error: 'API rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // Create Supabase client with secure cookie options
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Enhance cookie security
          const secureOptions = {
            ...options,
            secure: process.env.NODE_ENV === 'production', // Secure in production
            httpOnly: true, // HttpOnly to prevent JS access
            sameSite: 'lax' as 'lax' // Protect against CSRF
          };
          
          request.cookies.set({ name, value, ...secureOptions });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...secureOptions });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get the current user and session
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Protected routes that require authentication
  const protectedRoutes = ['/', '/analytics', '/wallet', '/cards', '/transactions'];
  const authRoutes = ['/signin', '/signup', '/reset-password', '/update-password'];
  const sensitiveRoutes = ['/wallet/transfer', '/cards/create', '/settings/security']; // Routes that need extra security
  const currentPath = request.nextUrl.pathname;

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && authRoutes.includes(currentPath)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to signin
  if (!user && protectedRoutes.includes(currentPath)) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }
  
  // Session expiry check - if JWT is about to expire, redirect to refresh token
  if (user && session) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeRemaining = expiresAt - now;
    
    // If token is about to expire (less than 5 minutes remaining), redirect to token refresh
    if (timeRemaining < 300 && !currentPath.startsWith('/api/')) {
      // Only redirect browser requests, not API calls
      return NextResponse.redirect(new URL('/api/auth/refresh-session?redirect=' + encodeURIComponent(request.url), request.url));
    }
  }
  
  // Enhanced security for sensitive operations
  if (user && sensitiveRoutes.includes(currentPath)) {
    // Check recent authentication time
    const authTime = session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : 0;
    const now = Date.now();
    const authAgeInSeconds = (now - authTime) / 1000;
    
    // For sensitive operations, require recent authentication (last 30 minutes)
    if (authAgeInSeconds > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
      return NextResponse.redirect(new URL('/auth/reauthenticate?redirect=' + encodeURIComponent(request.url), request.url));
    }
  }
  
  // Add correlation ID to both request and response
  response.headers.set('x-correlation-id', correlationId);
  
  // Generate CSP nonce for inline scripts
  const nonce = generateCspNonce();
  
  // Apply Content Security Policy and other security headers
  response = addCspHeaders(response, nonce);
  
  // Store nonce in a request header so it can be accessed from server components
  request.headers.set('x-nonce', nonce);
  
  // Add performance timing header
  const startTime = Date.now();
  response.headers.set('x-response-time', `${Date.now() - startTime}ms`);
  
  // Track user session for security auditing
  if (user) {
    response.headers.set('x-user-id', user.id); // For logging purposes
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)']
};
