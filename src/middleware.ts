import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge runtime compatible UUID generation
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const correlationId = request.headers.get('x-correlation-id') || generateUUID();
  
  // Add correlation ID to both request and response
  response.headers.set('x-correlation-id', correlationId);
  
  // Add security headers
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  
  // Add performance timing header
  const startTime = Date.now();
  response.headers.set('x-response-time', `${Date.now() - startTime}ms`);
  
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
