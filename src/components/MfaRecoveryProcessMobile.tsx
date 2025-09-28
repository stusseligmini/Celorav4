'use client';

/**
 * Mobile-optimized MFA Recovery Process Component
 * 
 * This component provides a mobile-friendly interface for initiating and completing
 * MFA recovery when a user has lost access to their authenticator device and recovery codes.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initiateRecovery, verifyRecoveryEmail, submitRecoveryRequest, checkMfaRecoveryStatus } from '@/lib/mfaRecovery';
import { getMfaTranslator } from '@/lib/mfaTranslations';

interface MfaRecoveryProcessMobileProps {
  t?: (key: string) => string; // Translation function
  lang?: string; // Language code
  onComplete?: () => void; // Callback for completion
}

const MfaRecoveryProcessMobile: React.FC<MfaRecoveryProcessMobileProps> = ({ 
  t: providedTranslator, 
  lang = 'en',
  onComplete
}) => {
  // Use provided translator or get default one based on language
  const t = providedTranslator || getMfaTranslator(lang);
  
  const router = useRouter();
  
  // Form states
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [activeInput, setActiveInput] = useState(0);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [lastFourCard, setLastFourCard] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  
  // Process states
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState('');
  
  // Handle the email submission step
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await initiateRecovery(email);
      
      if (result.success) {
        setEmailSentTo(email);
        setCurrentStep(2);
      } else {
        setError(result.error || t('mfa.unexpected_error'));
      }
    } catch (err) {
      setError(t('mfa.unexpected_error'));
      console.error('Error initiating recovery:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle code input changes (for the segmented input)
  const handleCodeInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newVerificationCode = [...verificationCode];
    newVerificationCode[index] = value;
    setVerificationCode(newVerificationCode);
    
    // Auto-advance to next input field if this one is filled
    if (value && index < 5) {
      setActiveInput(index + 1);
      document.getElementById(`recovery-code-input-${index + 1}`)?.focus();
    }
  };
  
  // Handle keydown event for navigation between inputs
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Navigate left on backspace if current field is empty
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      setActiveInput(index - 1);
      document.getElementById(`recovery-code-input-${index - 1}`)?.focus();
    } 
    // Navigate right on arrow right
    else if (e.key === 'ArrowRight' && index < 5) {
      setActiveInput(index + 1);
      document.getElementById(`recovery-code-input-${index + 1}`)?.focus();
    }
    // Navigate left on arrow left
    else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveInput(index - 1);
      document.getElementById(`recovery-code-input-${index - 1}`)?.focus();
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
        document.getElementById(`recovery-code-input-${nextEmptyIndex}`)?.focus();
      } else {
        setActiveInput(5);
        document.getElementById(`recovery-code-input-5`)?.focus();
      }
    }
  };
  
  // Handle the verification code submission step
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.some(digit => !digit)) {
      setError(t('mfa.enter_verification_code'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const code = verificationCode.join('');
      const result = await verifyRecoveryEmail(email, code);
      
      if (result.verified) {
        setEmailVerified(true);
        setCurrentStep(3);
      } else {
        setError(result.error || t('mfa.verification_failed'));
      }
    } catch (err) {
      setError(t('mfa.unexpected_error'));
      console.error('Error verifying code:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle the recovery request submission step
  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !dateOfBirth || !lastFourCard) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await submitRecoveryRequest({
        email,
        fullName,
        dateOfBirth,
        lastFourCard
      });
      
      if (result.success) {
        setCaseNumber(result.caseNumber || 'MFA-' + Math.random().toString(36).substring(2, 10).toUpperCase());
        setRequestSubmitted(true);
        setCurrentStep(4);
      } else {
        setError(result.error || t('mfa.unexpected_error'));
      }
    } catch (err) {
      setError(t('mfa.unexpected_error'));
      console.error('Error submitting recovery request:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 1: // Email entry
        return (
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-xs md:text-sm font-mono text-cyan-400 mb-2">
                {t('mfa.recovery_email')}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                placeholder="your.email@example.com"
                required
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
            >
              {loading ? t('mfa.recovery_sending') : t('mfa.recovery_continue')}
            </button>
          </form>
        );
        
      case 2: // Verification code entry
        return (
          <form onSubmit={handleVerifyCode}>
            <p className="mb-6 text-gray-300 text-center text-sm md:text-base">
              {t('mfa.recovery_email_sent')} <span className="text-cyan-400">{emailSentTo}</span>
            </p>
            
            <div className="mb-6">
              <label htmlFor="verification-code-0" className="block text-xs md:text-sm font-mono text-cyan-400 mb-2">
                {t('mfa.recovery_verification_code')}
              </label>
              
              {/* Mobile-optimized digit input */}
              <div className="flex justify-between space-x-2 mb-4">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`recovery-code-input-${index}`}
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
                  />
                ))}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || verificationCode.some(digit => !digit)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50 mb-4"
            >
              {loading ? t('mfa.recovery_verifying') : t('mfa.recovery_continue')}
            </button>
            
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-full text-sm text-cyan-400 hover:text-cyan-300 font-mono py-2"
            >
              {t('mfa.recovery_resend_code')}
            </button>
          </form>
        );
        
      case 3: // Identity verification
        return (
          <form onSubmit={handleRecoveryRequest}>
            <p className="mb-6 text-gray-300 text-center text-sm md:text-base">
              {t('mfa.recovery_identity_verify')}
            </p>
            
            <div className="mb-4">
              <label htmlFor="fullName" className="block text-xs md:text-sm font-mono text-cyan-400 mb-2">
                {t('mfa.recovery_full_name')}
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="dateOfBirth" className="block text-xs md:text-sm font-mono text-cyan-400 mb-2">
                {t('mfa.recovery_date_birth')}
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="lastFourCard" className="block text-xs md:text-sm font-mono text-cyan-400 mb-2">
                {t('mfa.recovery_payment_last_four')}
              </label>
              <input
                type="text"
                id="lastFourCard"
                value={lastFourCard}
                onChange={(e) => {
                  // Only allow 4 digits
                  const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                  setLastFourCard(value);
                }}
                inputMode="numeric"
                maxLength={4}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                placeholder="1234"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !fullName || !dateOfBirth || !lastFourCard || lastFourCard.length !== 4}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
            >
              {loading ? t('mfa.recovery_processing') : t('mfa.recovery_submit_request')}
            </button>
          </form>
        );
        
      case 4: // Success / Completion
        return (
          <div className="text-center">
            <h3 className="text-lg font-medium text-cyan-400 mb-4">
              {t('mfa.recovery_submitted')}
            </h3>
            
            <div className="border-2 border-cyan-500/30 bg-cyan-500/10 rounded-md p-4 mb-6">
              <p className="text-sm text-gray-300 mb-2">
                {t('mfa.recovery_case_number')}
              </p>
              <p className="text-xl font-mono text-cyan-400">
                {caseNumber}
              </p>
            </div>
            
            <p className="text-sm text-gray-300 mb-6">
              {t('mfa.recovery_submitted_description')}
            </p>
            
            <button
              onClick={() => onComplete ? onComplete() : router.push('/signin')}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all mb-4"
            >
              {t('mfa.recovery_return_signin')}
            </button>
            
            <button
              onClick={() => window.location.href = 'mailto:support@celora.com?subject=MFA Recovery Case: ' + caseNumber}
              className="w-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-mono py-3 px-4 rounded-md transition-all"
            >
              {t('mfa.recovery_contact_support')}
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="text-white">
      <h2 className="text-xl md:text-2xl font-mono font-bold text-cyan-400 mb-4 text-center">
        {t('mfa.recovery_title')}
      </h2>
      
      {/* Progress Indicator */}
      {currentStep < 4 && (
        <div className="flex justify-between mb-6">
          {[1, 2, 3].map((step) => (
            <div 
              key={step}
              className={`flex flex-col items-center ${step < currentStep ? 'text-cyan-400' : step === currentStep ? 'text-white' : 'text-gray-500'}`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1
                  ${step < currentStep 
                    ? 'bg-cyan-500 text-black' 
                    : step === currentStep 
                      ? 'bg-gray-700 border border-cyan-400' 
                      : 'bg-gray-800 border border-gray-700'
                  }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              <div className="text-xs hidden md:block">
                {step === 1 
                  ? 'Email' 
                  : step === 2 
                    ? 'Verify' 
                    : 'Identity'}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="text-red-400 mb-4 text-center bg-red-500/20 border border-red-500/50 rounded-md p-3 text-sm">
          {error}
        </div>
      )}
      
      {renderStep()}
      
      {currentStep !== 4 && (
        <div className="mt-8 pt-4 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            {t('mfa.recovery_remember_credentials')}
          </p>
          <button
            type="button"
            onClick={() => onComplete ? onComplete() : router.push('/signin')}
            className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {t('mfa.recovery_return')}
          </button>
        </div>
      )}
    </div>
  );
};

export default MfaRecoveryProcessMobile;