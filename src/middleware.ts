import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Edge runtime compatible UUID generation
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();
  const correlationId = request.headers.get('x-correlation-id') || generateUUID();
  
  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Protected routes that require authentication
  const protectedRoutes = ['/', '/analytics', '/wallet', '/cards', '/transactions'];
  const authRoutes = ['/signin', '/signup', '/reset-password', '/update-password'];
  const currentPath = request.nextUrl.pathname;

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && authRoutes.includes(currentPath)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to signin
  if (!user && protectedRoutes.includes(currentPath)) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }
  
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)']
};
