'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MfaDeviceDetectorProps {
  mobileRedirectPath: string;
  desktopComponent: React.ReactNode;
  userPrefersMobile?: boolean;
}

/**
 * Component that detects mobile devices and redirects to a mobile-optimized page
 * while rendering the desktop component for larger screens
 */
const MfaDeviceDetector: React.FC<MfaDeviceDetectorProps> = ({ 
  mobileRedirectPath, 
  desktopComponent,
  userPrefersMobile = false
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // Detect if the user is on a mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      // User preference override
      if (userPrefersMobile) return true;
      
      // Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const forceMobile = urlParams.get('forceMobile') === 'true';
      const forceDesktop = urlParams.get('forceDesktop') === 'true';
      
      if (forceMobile) return true;
      if (forceDesktop) return false;
      
      // Check local storage preference
      const storedPreference = localStorage.getItem('celora-prefer-mobile');
      if (storedPreference === 'true') return true;
      if (storedPreference === 'false') return false;
      
      // Standard mobile detection
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      
      return isMobileDevice || isSmallScreen;
    };
    
    if (checkIfMobile()) {
      // Add language parameter if present in current URL
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get('lang');
      
      let redirectPath = mobileRedirectPath;
      if (langParam) {
        redirectPath += redirectPath.includes('?') ? `&lang=${langParam}` : `?lang=${langParam}`;
      }
      
      router.push(redirectPath);
    } else {
      setIsLoading(false);
    }
  }, [mobileRedirectPath, router, userPrefersMobile]);
  
  if (isLoading) {
    // Simple loading state while determining device type
    return (
      <div className="flex justify-center items-center h-full w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }
  
  // Render desktop component if not redirected
  return <>{desktopComponent}</>;
};

export default MfaDeviceDetector;
