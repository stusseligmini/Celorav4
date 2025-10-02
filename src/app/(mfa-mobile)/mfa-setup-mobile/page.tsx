'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MfaSetupMobile from '@/components/MfaSetupMobile';
import { getMfaTranslator } from '@/lib/mfaTranslations';
import { getCookieValue } from '@/lib/cookieHelper';

/**
 * MFA Setup Mobile Page
 * 
 * Mobile-optimized page for setting up MFA/2FA
 */
export default function MfaSetupMobilePage() {
  const [lang, setLang] = useState('en');
  const router = useRouter();
  const t = getMfaTranslator(lang);

  // Load language preference
  useEffect(() => {
    // Get language from cookie or localStorage
    const cookieLang = getCookieValue('celora-language');
    const storedLang = typeof window !== 'undefined' 
      ? localStorage.getItem('celora-language')
      : null;
    
    const userLang = cookieLang || storedLang || navigator.language.split('-')[0];
    const supportedLang = ['en', 'no'].includes(userLang) ? userLang : 'en';
    
    setLang(supportedLang);
  }, []);

  return (
    <div className="pt-4 pb-12">
      <div className="mfa-mobile-header text-center mb-6">
        <h2 className="text-xl font-bold text-cyan-400 mb-1">
          {t('mfa.setup_title')}
        </h2>
        <p className="text-sm text-gray-400">
          {t('mfa.setup_subtitle')}
        </p>
      </div>
      
      <div className="mx-auto max-w-md">
        <MfaSetupMobile 
          t={t} 
          lang={lang} 
          onComplete={() => router.push('/profile')} 
        />
      </div>
    </div>
  );
}
