import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MFA Route Middleware
 * 
 * Dette middleware håndterer omdirigering mellom mobile og desktop MFA-ruter
 * basert på brukerens enhetstype og preferanser.
 */
export function middleware(request: NextRequest) {
  // Sjekker om forespørselen er fra en mobil enhet
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
    // iPad på iOS 13+ detekteres ved å sjekke om det er Mac
    (/Macintosh/i.test(userAgent) && /touch/i.test(userAgent));
  
  // Hent lagret brukerpreferanse fra cookies
  const preference = request.cookies.get('celora-device-preference')?.value;
  
  // Bestem om vi skal bruke mobilversjon basert på enhetstype og preferanse
  const useMobile = preference === 'mobile' || (preference !== 'desktop' && isMobile);
  
  // Liste over ruter som skal omdirigeres
  const routes = {
    '/mfa': useMobile ? '/mfa-mobile' : null,
    '/mfa-verification': useMobile ? '/mfa-verification-mobile' : null,
    '/mfa-recovery': useMobile ? '/mfa-recovery-mobile' : null,
    '/mfa-setup': useMobile ? '/mfa-setup-mobile' : null,
  };
  
  // Sjekk om gjeldende bane er i rutene vi ønsker å omdirigere
  const pathname = request.nextUrl.pathname;
  const redirectTo = routes[pathname as keyof typeof routes];
  
  // Hvis vi har funnet en omdirigering og den er forskjellig fra nåværende bane
  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    
    // Behold alle query-parametere i URL-en
    return NextResponse.redirect(url);
  }
  
  // Hvis ingen omdirigering er nødvendig, fortsett normalt
  return NextResponse.next();
}

// Angi hvilke baner dette middleware skal kjøre på
export const config = {
  matcher: ['/mfa', '/mfa-verification', '/mfa-recovery', '/mfa-setup'],
};
