'use client';

import { useEffect, useState } from 'react';
import MfaVerification from '@/components/MFAVerification';
import MfaDeviceDetector from '@/components/MfaDeviceDetector';
import { getMfaTranslator } from '@/lib/mfaTranslations';
import { useLanguagePreference } from '@/lib/userPreferencesClient';
import { useRouter } from 'next/navigation';
import { getMfaPendingState } from '@/lib/cookieHelper';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * MFA Verification Page - Desktop Version
 * For mobile devices, users will be redirected to the mobile-optimized version
 */
export default function MfaVerificationPage() {
  const [language, setLanguage] = useLanguagePreference('en');
  const router = useRouter();
  const t = getMfaTranslator(language);
  
  // Verify there's a pending MFA state
  useEffect(() => {
    const pendingState = getMfaPendingState();
    if (!pendingState) {
      router.push('/signin');
    }
  }, [router]);

  const handleVerified = () => {
    router.push('/');
  };

  const handleCancel = () => {
    router.push('/signin');
  };
  
  // The desktop component to render if not on mobile
  const desktopComponent = (
    <div className="flex flex-col justify-center items-center min-h-screen p-6 bg-gradient-to-b from-gray-900 to-black">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl border border-gray-800 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher onLanguageChange={setLanguage} />
        </div>
        <MfaVerification 
          t={t} 
          lang={language} 
          onVerified={handleVerified} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  );

  return (
    <MfaDeviceDetector 
      mobileRedirectPath="/(mfa-mobile)/mfa-verification-mobile" 
      desktopComponent={desktopComponent}
    />
  );
}
