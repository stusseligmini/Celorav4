'use client';

import { useEffect } from 'react';
import MfaRecoveryProcessMobile from '@/components/MfaRecoveryProcessMobile';
import { getMfaTranslator } from '@/lib/mfaTranslations';
import { useLanguagePreference } from '@/lib/userPreferencesClient';
import { useSearchParams, useRouter } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Mobile-optimized MFA Recovery Page
 * Med oppdatert stilsetting for bedre mobilopplevelse
 */
export default function MfaRecoveryMobilePage() {
  const [language, setLanguage] = useLanguagePreference('en');
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = getMfaTranslator(language);
  
  // Check for language parameter in URL
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam && ['en', 'no', 'nb'].includes(langParam)) {
      setLanguage(langParam);
    }
  }, [searchParams, setLanguage]);

  return (
    <div className="pt-4 pb-12">
      <div className="mfa-mobile-header text-center mb-6">
        <h2 className="text-xl font-bold text-cyan-400 mb-1">
          {t('mfa.recovery_title')}
        </h2>
        <p className="text-sm text-gray-400">
          {t('mfa.recovery_subtitle')}
        </p>
        <div className="absolute top-3 right-3">
          <LanguageSwitcher minimalist onLanguageChange={setLanguage} />
        </div>
      </div>
      
      <div className="mx-auto max-w-md px-4">
        <MfaRecoveryProcessMobile 
          t={t} 
          lang={language} 
          onComplete={() => router.push('/signin')} 
        />
      </div>
    </div>
  );
}
