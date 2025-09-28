'use client';

import { useEffect, useState } from 'react';
import MfaRecoveryProcess from '@/components/MfaRecoveryProcess';
import MfaDeviceDetector from '@/components/MfaDeviceDetector';
import { getMfaTranslator } from '@/lib/mfaTranslations';
import { useLanguagePreference } from '@/lib/userPreferencesClient';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export const metadata = {
  title: 'MFA Recovery - Celora',
  description: 'Recover your Multi-Factor Authentication (MFA) access',
};

/**
 * MFA Recovery Page - Desktop Version
 * For mobile devices, users will be redirected to the mobile-optimized version
 */
export default function MfaRecoveryPage() {
  const [language, setLanguage] = useLanguagePreference('en');
  const router = useRouter();
  const t = getMfaTranslator(language);
  
  // The desktop component to render if not on mobile
  const desktopComponent = (
    <div className="flex flex-col justify-center items-center min-h-screen p-6 bg-gradient-to-b from-gray-900 to-black">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl border border-gray-800 relative">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher onLanguageChange={setLanguage} />
        </div>
        <MfaRecoveryProcess t={t} lang={language} />
      </div>
    </div>
  );

  return (
    <MfaDeviceDetector 
      mobileRedirectPath="/(mfa-mobile)/mfa-recovery-mobile" 
      desktopComponent={desktopComponent}
    />
  );
}