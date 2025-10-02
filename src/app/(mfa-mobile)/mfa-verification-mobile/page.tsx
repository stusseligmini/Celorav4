'use client';

import { useEffect } from 'react';
import MfaMobileVerification from '@/components/MfaMobileVerification';
import { getMfaTranslator } from '@/lib/mfaTranslations';
import { useLanguagePreference } from '@/lib/userPreferencesClient';
import { useSearchParams } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getMfaPendingState } from '@/lib/cookieHelper';
import { useRouter } from 'next/navigation';

/**
 * Mobile-optimized MFA Verification Page
 */
export default function MfaVerificationMobilePage() {
  const [language, setLanguage] = useLanguagePreference('en');
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = getMfaTranslator(language);
  
  // Check for language parameter in URL
  useEffect(() => {
    const langParam = searchParams.get('lang');
    if (langParam && ['en', 'nb'].includes(langParam)) {
      setLanguage(langParam);
    }
    
    // Verify there's a pending MFA state
    const pendingState = getMfaPendingState();
    if (!pendingState) {
      router.push('/signin');
    }
  }, [searchParams, setLanguage, router]);

  const handleVerified = () => {
    router.push('/');
  };

  const handleCancel = () => {
    router.push('/signin');
  };

  return (
    <div className="pt-4 pb-12">
      <div className="mfa-mobile-header text-center mb-6">
        <h2 className="text-xl font-bold text-cyan-400 mb-1">
          {t('mfa.verification_title')}
        </h2>
        <p className="text-sm text-gray-400">
          {t('mfa.verification_subtitle')}
        </p>
        <div className="absolute top-3 right-3">
          <LanguageSwitcher minimalist onLanguageChange={setLanguage} />
        </div>
      </div>
      
      <div className="mx-auto max-w-md px-4">
        <MfaMobileVerification 
          t={t} 
          lang={language} 
          onVerified={handleVerified} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  );
}
