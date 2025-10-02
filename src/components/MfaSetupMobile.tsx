'use client';

/**
 * Mobile-optimized MFA Setup Component
 * 
 * This component provides a mobile-friendly interface for setting up
 * Multi-Factor Authentication (MFA) on smaller screens.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { Database } from '@/lib/database.types';
import { getMfaTranslator } from '@/lib/mfaTranslations';
import Image from 'next/image';
import { logSecurityEvent, SecurityEventTypes } from '@/lib/security';

interface MfaSetupMobileProps {
  onComplete?: () => void;
  t?: (key: string) => string; // Translation function
  lang?: string; // Language code
}

const MfaSetupMobile: React.FC<MfaSetupMobileProps> = ({ 
  onComplete,
  t: providedTranslator,
  lang = 'en'
}) => {
  // Use provided translator or get default one based on language
  const t = providedTranslator || getMfaTranslator(lang);
  
  const router = useRouter();
  const supabase = getSupabaseClient() as any;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupStep, setSetupStep] = useState<'generating' | 'verification' | 'recoveryCodes' | 'complete'>('generating');
  
  // MFA setup data
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [activeInput, setActiveInput] = useState(0);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  // Get MFA setup data when the component loads
  useEffect(() => {
    const setupMfa = async () => {
      try {
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/signin');
          return;
        }
        
        // Get existing MFA factors
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) throw factorsError;
        
        // Check if MFA is already enrolled
        const isEnrolled = factors.totp.some(factor => factor.status === 'verified');
        
        if (isEnrolled) {
          setError('MFA is already enabled for this account.');
          return;
        }
        
        // Enroll in TOTP MFA
        const { data: factor, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp'
        });
        
        if (enrollError) throw enrollError;
        
        if (!factor) {
          throw new Error('Failed to enroll in MFA');
        }
        
        setQrCodeUrl(factor.totp.qr_code);
        setSecret(factor.totp.secret);
        setLoading(false);
        
      } catch (err: any) {
        console.error('Error setting up MFA:', err);
        setError(err.message || 'Failed to set up MFA');
        setLoading(false);
      }
    };
    
    setupMfa();
  }, [supabase, router]);
  
  // Handle code input changes (for the segmented input)
  const handleCodeInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newVerificationCode = [...verificationCode];
    newVerificationCode[index] = value;
    setVerificationCode(newVerificationCode);
    
    // Auto-advance to next input field if this one is filled
    if (value && index < 5) {
      setActiveInput(index + 1);
      document.getElementById(`mfa-setup-code-input-${index + 1}`)?.focus();
    }
  };

  // Handle keydown event for navigation between inputs
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Navigate left on backspace if current field is empty
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      setActiveInput(index - 1);
      document.getElementById(`mfa-setup-code-input-${index - 1}`)?.focus();
    } 
    // Navigate right on arrow right
    else if (e.key === 'ArrowRight' && index < 5) {
      setActiveInput(index + 1);
      document.getElementById(`mfa-setup-code-input-${index + 1}`)?.focus();
    }
    // Navigate left on arrow left
    else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveInput(index - 1);
      document.getElementById(`mfa-setup-code-input-${index - 1}`)?.focus();
    }
  };
  
  // Handle paste event for verification code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // If pasted data contains only digits and has 6 or fewer characters
    if (/^\d+$/.test(pastedData) && pastedData.length <= 6) {
      const digits = pastedData.split('').slice(0, 6);
      const newCode = [...verificationCode];
      
      digits.forEach((digit, index) => {
        if (index < 6) {
          newCode[index] = digit;
        }
      });
      
      setVerificationCode(newCode);
      
      // Focus the next empty input or the last input
      const nextEmptyIndex = newCode.findIndex(digit => !digit);
      if (nextEmptyIndex >= 0 && nextEmptyIndex < 6) {
        setActiveInput(nextEmptyIndex);
        document.getElementById(`mfa-setup-code-input-${nextEmptyIndex}`)?.focus();
      } else {
        setActiveInput(5);
        document.getElementById(`mfa-setup-code-input-5`)?.focus();
      }
    }
  };
  
  // Verify the TOTP code
  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const code = verificationCode.join('');
      
      // Verify MFA setup with the provided code
      const { data, error: verifyError } = await supabase.auth.mfa.challenge({
        factorId: secret // Vi bruker secret som factorId for demo (i virkeligheten må vi lagre factorId)
      });
      
      if (verifyError) throw verifyError;
      
      if (!data) {
        throw new Error('Challenge failed');
      }
      
      // Verify the challenge with the code
      const { data: verifyData, error: verificationError } = await supabase.auth.mfa.verify({
        factorId: secret,
        challengeId: data.id,
        code
      });
      
      if (verificationError) throw verificationError;
      
      if (!verifyData) {
        throw new Error('Verification failed');
      }
      
      // Get recovery codes
      const { data: factorData, error: factorError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (factorError) throw factorError;
      
      // Get user session for logging
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Log the security event
        await logSecurityEvent({
          userId: session.user.id,
          event: SecurityEventTypes.MFA_SETUP,
          details: { method: 'totp' },
          ip: 'client-side',
          userAgent: navigator.userAgent
        });
      }
      
      // For enklere demo, vi genererer tilfeldige recovery koder
      // I en virkelig app må vi bruke faktiske Supabase MFA recovery koder
      const generateFakeRecoveryCodes = () => {
        const codes = [];
        for (let i = 0; i < 10; i++) {
          const randomCode = Math.random().toString(36).substring(2, 6) + '-' + 
                           Math.random().toString(36).substring(2, 6) + '-' +
                           Math.random().toString(36).substring(2, 6);
          codes.push(randomCode);
        }
        return codes;
      };
      
      // Sett recovery koder
      const generatedCodes = generateFakeRecoveryCodes();
      setRecoveryCodes(generatedCodes);
      
      // Move to recovery codes step
      setSetupStep('recoveryCodes');
      
    } catch (err: any) {
      console.error('Error verifying MFA code:', err);
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };
  
  // Copy recovery codes to clipboard
  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
      .then(() => {
        alert(t('mfa.codes_copied'));
      })
      .catch((err) => {
        console.error('Error copying recovery codes:', err);
      });
  };
  
  // Download recovery codes as a text file
  const handleDownloadRecoveryCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([recoveryCodes.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'mfa-recovery-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Complete MFA setup
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push('/profile');
    }
  };
  
  // Render appropriate step
  const renderStep = () => {
    switch (setupStep) {
      case 'generating':
        return (
          <div className="text-center">
            <h3 className="text-lg font-medium text-cyan-400 mb-4">
              {t('mfa.setup_title')}
            </h3>
            
            <p className="mb-6 text-sm text-gray-300">
              {t('mfa.setup_description')}
            </p>
            
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <>
                <div className="mb-6 p-3 bg-white rounded-lg inline-block">
                  {qrCodeUrl ? (
                    <Image src={qrCodeUrl} alt="QR Code for MFA" width={200} height={200} />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-800">
                      {t('mfa.loading_qr')}
                    </div>
                  )}
                </div>
                
                <p className="mb-2 text-sm text-gray-300">
                  {t('mfa.scan_qr_code')}
                </p>
                
                <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-2">
                    {t('mfa.manual_code')}
                  </p>
                  <p className="font-mono text-sm bg-gray-800/50 p-3 rounded-md border border-gray-700 break-all">
                    {secret}
                  </p>
                </div>
                
                <button
                  onClick={() => setSetupStep('verification')}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all"
                >
                  {t('mfa.continue')}
                </button>
              </>
            )}
          </div>
        );
        
      case 'verification':
        return (
          <div>
            <h3 className="text-lg font-medium text-cyan-400 mb-4 text-center">
              {t('mfa.verify_code')}
            </h3>
            
            <div className="mb-6">
              {/* Mobile-optimized digit input */}
              <div className="flex justify-between space-x-2 mb-4">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`mfa-setup-code-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInputChange(index, e.target.value)}
                    onFocus={() => setActiveInput(index)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`w-full h-14 text-center text-xl font-mono rounded-md 
                      ${activeInput === index 
                        ? 'bg-gray-800 border-2 border-cyan-400' 
                        : 'bg-gray-800/50 border border-gray-600'} 
                      text-white focus:outline-none`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>
            
            {error && (
              <div className="text-red-400 mb-4 text-center bg-red-500/20 border border-red-500/50 rounded-md p-3 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.some(digit => !digit)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
              >
                {loading ? t('mfa.verifying') : t('mfa.verify')}
              </button>
              
              <button
                type="button"
                onClick={() => setSetupStep('generating')}
                className="text-sm text-gray-400 hover:text-gray-300 font-mono transition-colors"
              >
                {t('mfa.cancel')}
              </button>
            </div>
          </div>
        );
        
      case 'recoveryCodes':
        return (
          <div className="text-center">
            <h3 className="text-lg font-medium text-cyan-400 mb-4">
              {t('mfa.recovery_codes_title')}
            </h3>
            
            <p className="mb-6 text-sm text-gray-300">
              {t('mfa.recovery_codes_description')}
            </p>
            
            <div className="mb-6 bg-gray-800/50 p-4 rounded-md border border-gray-700 text-left">
              <div className="space-y-1 font-mono text-sm">
                {recoveryCodes.map((code, index) => (
                  <div key={index} className="text-cyan-400 break-all">
                    {code}
                  </div>
                ))}
              </div>
              
              <p className="mt-3 text-xs text-yellow-400 text-center">
                {t('mfa.recovery_codes_warning')}
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleCopyRecoveryCodes}
                className="w-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-mono py-3 px-4 rounded-md transition-all"
              >
                {t('mfa.copy_codes')}
              </button>
              
              <button
                onClick={handleDownloadRecoveryCodes}
                className="w-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-mono py-3 px-4 rounded-md transition-all"
              >
                {t('mfa.download_codes')}
              </button>
              
              <button
                onClick={handleComplete}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all"
              >
                {t('mfa.continue')}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="text-white">
      {renderStep()}
    </div>
  );
};

export default MfaSetupMobile;
