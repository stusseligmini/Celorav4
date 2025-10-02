/**
 * MFA Verification Component
 * 
 * This component handles verification of multi-factor authentication during login.
 * It displays a form for entering TOTP codes or recovery codes.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { verifyMFA } from '@/lib/auth';
import { getMfaPendingState, deleteMfaPendingCookie, generateDeviceId, setMfaVerifiedDevice } from '@/lib/cookieHelper';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth';
import { getMfaTranslator } from '@/lib/mfaTranslations';

interface MFAVerificationProps {
  tempToken?: string;
  onVerified?: (user: User) => void;
  onCancel?: () => void;
  t?: (key: string) => string; // Translation function
  lang?: string; // Language code
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ 
  tempToken, 
  onVerified, 
  onCancel,
  t: providedTranslator,
  lang = 'en'
}) => {
  // Use provided translator or get default one based on language
  const t = providedTranslator || getMfaTranslator(lang);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(300); // 5 minutes
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [totpTimeRemaining, setTotpTimeRemaining] = useState<number>(30);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const router = useRouter();

  // Initialize component with pending MFA state from cookie
  useEffect(() => {
    // If a temp token is provided directly, use that
    if (tempToken) return;
    
    // Otherwise, try to get from cookie
    const pendingState = getMfaPendingState();
    if (!pendingState) {
      // No valid MFA verification pending
      setError(t('mfa.session_expired'));
      if (onCancel) {
        setTimeout(onCancel, 2000);
      } else {
        setTimeout(() => router.push('/signin'), 2000);
      }
      return;
    }
    
    setUserId(pendingState.userId);
    
    // Calculate remaining time
    const remaining = Math.floor((pendingState.expiration - Date.now()) / 1000);
    setRemainingTime(Math.max(0, remaining));
    
    // Setup countdown timer
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(timer);
          deleteMfaPendingCookie();
          setError(t('mfa.session_expired'));
          if (onCancel) {
            setTimeout(onCancel, 2000);
          } else {
            setTimeout(() => router.push('/signin'), 2000);
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, onCancel, tempToken]);
  
  // TOTP timer effect - shows how much time is left before code changes
  useEffect(() => {
    // Calculate TOTP time remaining (TOTP codes change every 30 seconds)
    // Formula: 30 - (current seconds % 30)
    const updateTotpTimeRemaining = () => {
      const now = new Date();
      const secondsInCurrentMinute = now.getSeconds();
      const secondsUntilNextCode = 30 - (secondsInCurrentMinute % 30);
      setTotpTimeRemaining(secondsUntilNextCode);
    };
    
    // Initial calculation
    updateTotpTimeRemaining();
    
    // Update every second
    const totpTimer = setInterval(updateTotpTimeRemaining, 1000);
    
    return () => clearInterval(totpTimer);
  }, []);
  
  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle verification code submit
  const handleVerify = async () => {
    if (!verificationCode && !showRecovery) {
      setError(t('mfa.enter_verification_code'));
      return;
    }

    if (showRecovery && !recoveryCode) {
      setError(t('mfa.enter_recovery_code_prompt'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      const code = showRecovery ? recoveryCode : verificationCode;
      const effectiveUserId = userId || (tempToken || '');
      
      // Use the new unified MFA verification
      result = await verifyMFA(effectiveUserId, code, showRecovery);
      
      if (!result.verified) {
        setError(result.error || t('mfa.verification_failed'));
        setLoading(false);
        return;
      }
      
      // Success - store device info if requested
      if (rememberDevice && userId) {
        const deviceId = generateDeviceId();
        setMfaVerifiedDevice(userId, deviceId, 30); // Remember for 30 days
      }
      
      // Clean up MFA pending cookie if we're using that flow
      if (!tempToken) {
        deleteMfaPendingCookie();
      }
      
      // Use the callback or redirect
      if (onVerified && result.user) {
        onVerified(result.user);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(t('mfa.unexpected_error'));
      console.error('Error verifying MFA:', err);
      setLoading(false);
    }
  };

  // Toggle between verification code and recovery code
  const toggleRecovery = () => {
    setShowRecovery(!showRecovery);
    setError('');
  };

  return (
    <div className="text-white">
      <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-4 text-center">
        {t('mfa.security_verification')}
      </h2>
      
      {!showRecovery ? (
        <>
          <p className="mb-6 text-gray-300 text-center">
            {t('mfa.enter_code_from_app')}
          </p>
          <div className="mb-6">
            <label htmlFor="verification-code" className="block text-sm font-mono text-cyan-400 mb-2">
              {t('mfa.verification_code')}
            </label>
            <input
              type="text"
              id="verification-code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substr(0, 6))}
              placeholder="000000"
              className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none text-center tracking-widest"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            
            {/* TOTP Code Countdown Timer */}
            <div className="mt-4 flex items-center justify-center">
              <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${totpTimeRemaining <= 5 ? 'bg-red-600' : 'bg-cyan-500'}`}
                  style={{ width: `${(totpTimeRemaining / 30) * 100}%`, transition: 'width 1s linear' }}
                ></div>
              </div>
              <span className="ml-2 text-xs font-mono w-8 text-center">
                {totpTimeRemaining}s
              </span>
            </div>
            <div className="mt-1 text-xs text-center text-gray-400">
              {t('mfa.code_refreshes')}
            </div>
          </div>
          
          {/* Display countdown if we're using cookie-based verification */}
          {!tempToken && userId && (
            <div className="text-center text-sm text-blue-400 mb-4">
              Session expires in <span className="font-mono">{formatTime(remainingTime)}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-6 text-gray-300 text-center">
            {t('mfa.enter_recovery_code')}
          </p>
          <div className="mb-6">
            <label htmlFor="recovery-code" className="block text-sm font-mono text-cyan-400 mb-2">
              {t('mfa.recovery_code')}
            </label>
            <input
              type="text"
              id="recovery-code"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none text-center"
            />
          </div>
          
          {/* Display countdown if we're using cookie-based verification */}
          {!tempToken && userId && (
            <div className="text-center text-sm text-blue-400 mb-4">
              Session expires in <span className="font-mono">{formatTime(remainingTime)}</span>
            </div>
          )}
        </>
      )}

      {/* Remember device option for cookie-based flow */}
      {!tempToken && userId && (
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="remember-device"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-600"
          />
          <label htmlFor="remember-device" className="ml-2 text-sm text-gray-300">
            {t('mfa.remember_device')}
          </label>
        </div>
      )}

      {error && <p className="text-red-400 mb-4 text-center bg-red-500/20 border border-red-500/50 rounded-md p-3">{error}</p>}

      <div className="flex flex-col space-y-4">
        <button
          onClick={handleVerify}
          disabled={loading || ((!showRecovery && verificationCode.length !== 6) || (showRecovery && !recoveryCode))}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
        >
          {loading ? t('mfa.verifying') : t('mfa.verify')}
        </button>
        
        <button
          type="button"
          onClick={() => setShowRecovery(!showRecovery)}
          className="text-sm text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
        >
          {showRecovery 
            ? t('mfa.use_verification_code') 
            : t('mfa.use_recovery_code')}
        </button>
        
        <button
          type="button"
          onClick={() => {
            if (!tempToken) {
              deleteMfaPendingCookie();
            }
            if (onCancel) {
              onCancel();
            } else {
              router.push('/signin');
            }
          }}
          className="text-sm text-gray-400 hover:text-gray-300 font-mono transition-colors"
        >
          {t('mfa.cancel')}
        </button>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center mb-2">
            {t('mfa.lost_device')}
          </p>
          <button
            type="button"
            onClick={() => router.push('/mfa-recovery')}
            className="w-full text-sm text-yellow-400 hover:text-yellow-300 font-mono transition-colors"
          >
            {t('mfa.initiate_recovery')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MFAVerification;
