'use client';

/**
 * MFA Recovery Process Component
 * 
 * This component handles the MFA recovery process when a user loses their authentication device
 * or has no access to recovery codes.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getMfaTranslator } from '@/lib/mfaTranslations';

type RecoveryStep = 'email' | 'verification' | 'identity' | 'processing' | 'success';

interface MfaRecoveryProcessProps {
  t?: (key: string) => string; // Translation function
  lang?: string; // Language code
}

const MfaRecoveryProcess: React.FC<MfaRecoveryProcessProps> = ({ 
  t: providedTranslator,
  lang = 'en'
}) => {
  // Use provided translator or get default one based on language
  const t = providedTranslator || getMfaTranslator(lang);
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    dateOfBirth: '',
    lastFourDigits: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [caseNumber, setCaseNumber] = useState('');
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Step 1: Send recovery email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Check if email exists in the system
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
      });
      
      if (error) throw error;
      
      // Generate a unique case number for tracking
      const generatedCaseNumber = `MFA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      setCaseNumber(generatedCaseNumber);
      
      setStep('verification');
    } catch (err: any) {
      console.error('Error initiating MFA recovery:', err);
      // Don't reveal if email exists or not for security reasons
      setError('If your email exists in our system, you will receive instructions shortly.');
    } finally {
      setLoading(false);
    }
  };
  
  // Step 2: Verify email code
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // In a real implementation, this would verify the code from the email
      // For demo purposes, we'll accept any 6-digit code
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new Error('Please enter a valid 6-digit verification code');
      }
      
      setStep('identity');
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };
  
  // Step 3: Verify identity
  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validate input fields
      if (!personalInfo.fullName.trim()) {
        throw new Error('Please enter your full name');
      }
      
      if (!personalInfo.dateOfBirth) {
        throw new Error('Please enter your date of birth');
      }
      
      if (!/^\d{4}$/.test(personalInfo.lastFourDigits)) {
        throw new Error('Please enter the last 4 digits of your payment card');
      }
      
      // In a real implementation, this would verify the personal information against the database
      // For demo purposes, we'll proceed to the next step
      
      setStep('processing');
      
      // Simulate processing time
      setTimeout(() => {
        setStep('success');
      }, 3000);
    } catch (err: any) {
      console.error('Error verifying identity:', err);
      setError(err.message || 'Failed to verify your identity');
    } finally {
      setLoading(false);
    }
  };
  
  const renderEmailForm = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-mono text-cyan-400 mb-2">
          EMAIL ADDRESS
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
          required
        />
      </div>
      
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
      >
        {loading ? 'SENDING...' : 'CONTINUE'}
      </button>
    </form>
  );
  
  const renderVerificationForm = () => (
    <form onSubmit={handleVerificationSubmit} className="space-y-4">
      <div>
        <div className="mb-4 p-3 bg-cyan-900/20 border border-cyan-900/30 rounded-md">
          <p className="text-cyan-200 text-sm">
            We've sent a verification code to <strong>{email}</strong>. Please check your inbox and enter the code below.
          </p>
        </div>
        
        <label htmlFor="verification-code" className="block text-sm font-mono text-cyan-400 mb-2">
          VERIFICATION CODE
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
          required
        />
      </div>
      
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-300"
          onClick={() => setStep('email')}
        >
          Back
        </button>
        <button
          type="button"
          className="text-cyan-400 hover:text-cyan-300"
          onClick={() => alert('A new code has been sent')}
        >
          Resend code
        </button>
      </div>
      
      <button
        type="submit"
        disabled={loading || verificationCode.length !== 6}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
      >
        {loading ? 'VERIFYING...' : 'CONTINUE'}
      </button>
    </form>
  );
  
  const renderIdentityForm = () => (
    <form onSubmit={handleIdentitySubmit} className="space-y-4">
      <div className="mb-4 p-3 bg-cyan-900/20 border border-cyan-900/30 rounded-md">
        <p className="text-cyan-200 text-sm">
          To verify your identity, please provide the following information. This will be matched against your account details.
        </p>
      </div>
      
      <div>
        <label htmlFor="full-name" className="block text-sm font-mono text-cyan-400 mb-2">
          FULL NAME (AS ON ACCOUNT)
        </label>
        <input
          type="text"
          id="full-name"
          value={personalInfo.fullName}
          onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
          placeholder="Full Name"
          className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
          required
        />
      </div>
      
      <div>
        <label htmlFor="date-of-birth" className="block text-sm font-mono text-cyan-400 mb-2">
          DATE OF BIRTH
        </label>
        <input
          type="date"
          id="date-of-birth"
          value={personalInfo.dateOfBirth}
          onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
          className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
          required
        />
      </div>
      
      <div>
        <label htmlFor="last-four-digits" className="block text-sm font-mono text-cyan-400 mb-2">
          LAST 4 DIGITS OF PAYMENT CARD
        </label>
        <input
          type="text"
          id="last-four-digits"
          value={personalInfo.lastFourDigits}
          onChange={(e) => setPersonalInfo({ ...personalInfo, lastFourDigits: e.target.value.replace(/\D/g, '').substr(0, 4) })}
          placeholder="0000"
          className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none text-center tracking-widest"
          maxLength={4}
          inputMode="numeric"
          required
        />
      </div>
      
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-300"
          onClick={() => setStep('verification')}
        >
          Back
        </button>
      </div>
      
      <button
        type="submit"
        disabled={loading || !personalInfo.fullName || !personalInfo.dateOfBirth || personalInfo.lastFourDigits.length !== 4}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
      >
        {loading ? 'VERIFYING...' : 'SUBMIT RECOVERY REQUEST'}
      </button>
    </form>
  );
  
  const renderProcessingStep = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
      <h3 className="text-lg font-medium text-white mb-2">Processing Your Request</h3>
      <p className="text-gray-300">
        Please wait while we verify your information and process your recovery request.
      </p>
    </div>
  );
  
  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <div className="bg-green-900/20 border border-green-900/30 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-white mb-2">Recovery Request Submitted</h3>
      
      <div className="mb-6 mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-md">
        <p className="text-gray-300 mb-2">Your case number:</p>
        <p className="font-mono text-xl text-cyan-400 font-bold">{caseNumber}</p>
      </div>
      
      <p className="text-gray-300 mb-6">
        Your MFA recovery request has been submitted successfully. Our security team will review your request and contact you via email within 24-48 hours.
      </p>
      
      <div className="flex flex-col space-y-2">
        <button
          onClick={() => router.push('/signin')}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold rounded-md transition-all"
        >
          RETURN TO SIGN IN
        </button>
        
        <button
          onClick={() => window.location.href = 'mailto:support@celora.com?subject=MFA Recovery Case: ' + caseNumber}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-all"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-6 text-center">MFA RECOVERY</h2>
      
      {step !== 'success' && (
        <div className="mb-6">
          <div className="flex items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step === 'email' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}>1</div>
            <div className={`h-1 flex-1 ${step === 'email' ? 'bg-gray-700' : 'bg-cyan-600'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step === 'verification' ? 'bg-cyan-600 text-white' : step === 'email' ? 'bg-gray-700 text-gray-300' : 'bg-cyan-600 text-white'}`}>2</div>
            <div className={`h-1 flex-1 ${step === 'email' || step === 'verification' ? 'bg-gray-700' : 'bg-cyan-600'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step === 'identity' || step === 'processing' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}>3</div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Email</span>
            <span>Verify</span>
            <span>Identity</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-400">
          {error}
        </div>
      )}
      
      {step === 'email' && renderEmailForm()}
      {step === 'verification' && renderVerificationForm()}
      {step === 'identity' && renderIdentityForm()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'success' && renderSuccessStep()}
      
      {step !== 'success' && (
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>
            Remember your MFA credentials?{' '}
            <button
              onClick={() => router.push('/signin')}
              className="text-cyan-400 hover:text-cyan-300"
            >
              Return to sign in
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default MfaRecoveryProcess;