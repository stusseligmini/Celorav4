import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import authService from '@/lib/auth';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify' | 'recoverycodes' | 'complete'>('intro');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize MFA setup
  const startSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Use setupMFA function from auth.ts
      const result = await authService.setupMFA();

      if (!result.success || !result.qrCodeUrl) {
        setError(result.error || 'Failed to generate MFA setup');
        return;
      }

      setSecret(result.secret);
      setQrCodeUrl(result.qrCodeUrl);
      setRecoveryCodes(result.recoveryCodes);
      setStep('qrcode');
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error setting up MFA:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verify the MFA code and enable MFA for the user
  const verifyAndEnable = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the current user ID
      const { data: { user } } = await authService.supabase.auth.getUser();
      if (!user) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Use the enableMFA function which requires the secret from the setup step
      const result = await authService.enableMFA(secret, verificationCode, recoveryCodes);

      if (!result.success) {
        setError(result.error || 'Failed to verify code');
        return;
      }

      setStep('recoverycodes');
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error enabling MFA:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle completion of setup
  const handleComplete = () => {
    onComplete();
  };

  // Render different steps of the MFA setup process
  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-4">ADD TWO-FACTOR AUTHENTICATION</h2>
            <p className="mb-6 text-gray-300">
              Enhance your account security by setting up two-factor authentication (2FA).
              This adds an extra layer of protection to your account.
            </p>
            <div className="flex flex-col space-y-4 mb-6">
              <div className="flex items-start">
                <div className="mr-3 bg-cyan-900/30 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-cyan-300">Enhanced Security</h3>
                  <p className="text-sm text-gray-300">Protect your wallet and financial data with an additional security layer.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mr-3 bg-cyan-900/30 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-cyan-300">Prevent Unauthorized Access</h3>
                  <p className="text-sm text-gray-300">Even if your password is compromised, your account remains protected.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800/50 font-mono"
              >
                CANCEL
              </button>
              <button
                onClick={startSetup}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-md disabled:opacity-50 font-mono"
              >
                {loading ? 'SETTING UP...' : 'SET UP 2FA'}
              </button>
            </div>
          </div>
        );

      case 'qrcode':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-4">SCAN QR CODE</h2>
            <p className="mb-6 text-gray-300">
              Scan this QR code with your authenticator app (like Google Authenticator or Authy).
            </p>
            <div className="mb-6 flex justify-center">
              {qrCodeUrl && (
                <div className="border-2 border-cyan-400/30 p-2 rounded-md inline-block bg-white">
                  <Image 
                    src={qrCodeUrl} 
                    alt="QR Code for MFA" 
                    width={200} 
                    height={200} 
                  />
                </div>
              )}
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-300 mb-2">
                Or enter this code manually in your authenticator app:
              </p>
              <div className="bg-gray-800/50 border border-gray-600 p-2 rounded-md font-mono text-sm break-all text-cyan-300">
                {secret}
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="verification-code" className="block text-sm font-mono text-cyan-400 mb-2">
                ENTER THE 6-DIGIT VERIFICATION CODE FROM YOUR APP
              </label>
              <input
                type="text"
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substr(0, 6))}
                placeholder="000000"
                className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none text-center tracking-widest"
                maxLength={6}
              />
            </div>
            {error && <p className="text-red-400 mb-4 bg-red-500/20 border border-red-500/50 rounded-md p-3">{error}</p>}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep('intro')}
                className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800/50 font-mono"
              >
                BACK
              </button>
              <button
                onClick={verifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-md disabled:opacity-50 font-mono"
              >
                {loading ? 'VERIFYING...' : 'VERIFY AND ENABLE'}
              </button>
            </div>
          </div>
        );

      case 'recoverycodes':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-4">SAVE RECOVERY CODES</h2>
            <p className="mb-6 text-gray-300">
              Store these recovery codes securely. If you lose access to your authenticator app,
              you can use one of these codes to regain access to your account.
              <br />
              <strong className="text-red-400">Each code can only be used once.</strong>
            </p>
            <div className="mb-6 bg-gray-800/50 border border-gray-600 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {recoveryCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-gray-900/50 border border-cyan-400/20 rounded text-cyan-300">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <button
                onClick={() => {
                  // Copy codes to clipboard
                  navigator.clipboard.writeText(recoveryCodes.join('\n'));
                }}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                COPY ALL CODES TO CLIPBOARD
              </button>
            </div>
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-md font-mono"
            >
              I'VE SAVED THESE CODES
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="text-white">
      {renderContent()}
    </div>
  );
};

export default MFASetup;