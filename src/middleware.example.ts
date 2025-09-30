import { NextRequest, NextResponse } from 'next/server';
import { featureFlags } from './lib/featureFlags';

// List of middleware features that can be toggled with feature flags
const FEATURES = {
  ADVANCED_SECURITY: 'middleware_advanced_security',
  IP_BLOCKING: 'middleware_ip_blocking',
  BOT_DETECTION: 'middleware_bot_detection',
  REQUEST_LOGGING: 'middleware_request_logging',
  RATE_LIMITING: 'middleware_rate_limiting',
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get user context from cookies or headers for feature flag evaluation
  const userId = request.cookies.get('userId')?.value;
  const userRole = request.cookies.get('userRole')?.value;
  // Get country from a header, assuming it's set by edge functions or a proxy
  const countryCode = request.headers.get('x-country-code') || 'unknown';
  
  const userContext = {
    userId,
    role: userRole,
    country: countryCode,
    deviceType: getDeviceType(request),
    userAgent: request.headers.get('user-agent') || undefined
  };
  
  // Initialize feature flags
  try {
    // We don't need to await this since middleware needs to be fast,
    // and features will fall back to defaults if not initialized yet
    featureFlags.initialize(userContext);
  
    // Example: Advanced security headers based on feature flag
    if (featureFlags.isEnabled(FEATURES.ADVANCED_SECURITY, {}, userContext)) {
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'");
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }
  
    // Example: IP blocking for certain regions
    if (featureFlags.isEnabled(FEATURES.IP_BLOCKING, {}, userContext)) {
      const blockedCountries = ['XX', 'YY']; // Placeholder for blocked country codes
      if (userContext.country && blockedCountries.includes(userContext.country)) {
        return new NextResponse('Access denied from your region', { status: 451 });
      }
    }
  
    // Example: Bot detection
    if (featureFlags.isEnabled(FEATURES.BOT_DETECTION, {}, userContext)) {
      const ua = request.headers.get('user-agent')?.toLowerCase() || '';
      const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
      if (botPatterns.some(pattern => ua.includes(pattern))) {
        // Either block or set a flag for downstream handling
        response.headers.set('X-Is-Bot', 'true');
      }
    }
  
    // Example: Request logging
    if (featureFlags.isEnabled(FEATURES.REQUEST_LOGGING, {}, userContext)) {
      // In production, you would send this to a logging service
      console.log(`[Middleware] ${request.method} ${request.url} - User: ${userId || 'anonymous'}, Country: ${userContext.country}`);
    }
  
    // Example: Rate limiting (simplified example)
    if (featureFlags.isEnabled(FEATURES.RATE_LIMITING, {}, userContext)) {
      // In a real implementation, you would use a Redis cache or similar for tracking
      // This is just illustrative
      const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
      const rateLimit = userRole === 'premium' ? 100 : 20;
      
      response.headers.set('X-Rate-Limit', String(rateLimit));
    }
  } catch (error) {
    console.error('Error in middleware feature flags:', error);
    // Continue with default behavior on error
  }

  return response;
}

// Helper function to determine device type from user agent
function getDeviceType(request: NextRequest): string {
  const ua = request.headers.get('user-agent') || '';
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  if (/tv/i.test(ua)) return 'tv';
  if (/wearable/i.test(ua)) return 'wearable';
  return 'desktop';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};