'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookieValue, setCookie } from '@/lib/cookieHelper';

interface DeviceRouterProps {
  mobileRoute: string;
  desktopRoute: string;
  forceDesktop?: boolean;
  forceMobile?: boolean;
  children?: React.ReactNode;
}

/**
 * MfaDeviceRouter Component
 * 
 * Smartere komponent for å rute mellom mobile og desktop MFA-sider
 * Støtter også brukerpreferanser og bedre enhetsdeteteksjon
 */
export default function MfaDeviceRouter({
  mobileRoute,
  desktopRoute,
  forceDesktop,
  forceMobile,
  children
}: DeviceRouterProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  useEffect(() => {
    const determineDevice = () => {
      // Sjekk om brukeren har lagret en preferanse
      const storedPreference = getCookieValue('celora-device-preference');
      
      // Hvis forced mode er spesifisert, bruk det
      if (forceDesktop) {
        setCookie('celora-device-preference', 'desktop', { maxAge: 60 * 60 * 24 * 30 });
        router.replace(desktopRoute);
        return;
      }
      
      if (forceMobile) {
        setCookie('celora-device-preference', 'mobile', { maxAge: 60 * 60 * 24 * 30 });
        router.replace(mobileRoute);
        return;
      }
      
      // Hvis brukeren har en lagret preferanse, bruk den
      if (storedPreference === 'desktop') {
        router.replace(desktopRoute);
        return;
      }
      
      if (storedPreference === 'mobile') {
        router.replace(mobileRoute);
        return;
      }
      
      // Ellers, sjekk enheten basert på user agent og skjermstørrelse
      const isMobileDevice = () => {
        // Sjekk user agent for mobile enheter
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUserAgent = mobileRegex.test(navigator.userAgent);
        
        // Sjekk skjermstørrelse (mindre enn 768px er typisk mobil)
        const isMobileScreenSize = window.innerWidth < 768;
        
        // Sjekk touch-støtte
        const isTouchDevice = 'ontouchstart' in window || 
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore
          navigator.msMaxTouchPoints > 0;
        
        // Vi anser enheten som mobil hvis den har en mobil user agent ELLER
        // har en liten skjerm OG støtter touch
        return isMobileUserAgent || (isMobileScreenSize && isTouchDevice);
      };
      
      // Rute basert på enhetstype
      if (isMobileDevice()) {
        setCookie('celora-device-preference', 'mobile', { maxAge: 60 * 60 * 24 * 30 });
        router.replace(mobileRoute);
      } else {
        setCookie('celora-device-preference', 'desktop', { maxAge: 60 * 60 * 24 * 30 });
        router.replace(desktopRoute);
      }
    };
    
    // Utfør ruting
    determineDevice();
    
    // Sett en timeout for å vise children hvis omdirigering tar for lang tid
    const timeout = setTimeout(() => {
      setIsRedirecting(false);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [router, mobileRoute, desktopRoute, forceDesktop, forceMobile]);
  
  // Vis barn-komponenter hvis omdirigering tar tid eller hvis vi har spesifisert barn
  if (!isRedirecting || children) {
    return (
      <>
        {children || (
          <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-lg">Optimaliserer opplevelsen for enheten din...</p>
              <div className="mt-8 space-x-4">
                <button 
                  onClick={() => {
                    setCookie('celora-device-preference', 'desktop', { maxAge: 60 * 60 * 24 * 30 });
                    router.replace(desktopRoute);
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
                >
                  Bruk desktop-versjon
                </button>
                <button 
                  onClick={() => {
                    setCookie('celora-device-preference', 'mobile', { maxAge: 60 * 60 * 24 * 30 });
                    router.replace(mobileRoute);
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm"
                >
                  Bruk mobil-versjon
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Vis en enkel spinner mens vi omdirigerer
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
  );
}