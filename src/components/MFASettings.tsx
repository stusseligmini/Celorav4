import React, { useState, useEffect } from 'react';
import authService from '@/lib/auth';
import MFASetup from './MFASetup';

interface MFASettingsProps {
  onUpdate?: () => void;
}

const MFASettings: React.FC<MFASettingsProps> = ({ onUpdate }) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [remainingCodes, setRemainingCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check if MFA is enabled on component mount
  useEffect(() => {
    const checkMFAStatus = async () => {
      try {
        const enabled = await authService.isMFAEnabled();
        setMfaEnabled(enabled);
        
        if (enabled) {
          // Get remaining recovery codes
          const codes = await authService.getRemainingRecoveryCodes();
          setRemainingCodes(codes || []);
        }
      } catch (err) {
        console.error('Error checking MFA status:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    checkMFAStatus();
  }, []);

  // Handle MFA setup completion
  const handleSetupComplete = () => {
    setShowSetup(false);
    setMfaEnabled(true);
    setSuccess('Two-factor authentication has been enabled successfully.');
    if (onUpdate) onUpdate();
  };

  // Handle disabling MFA
  const handleDisableMFA = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await authService.supabase.auth.getUser();
      if (!user) {
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Use the updated disableMFA function
      const result = await authService.disableMFA(verificationCode);

      if (!result.success) {
        setError(result.error || 'Failed to disable two-factor authentication');
        return;
      }

      setMfaEnabled(false);
      setShowDisable(false);
      setVerificationCode('');
      setSuccess('Two-factor authentication has been disabled.');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error disabling MFA:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show MFA status and options
  if (initialLoading) {
    return <div className="text-center py-4 text-gray-300">Loading security settings...</div>;
  }

  if (showSetup) {
    return (
      <MFASetup
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
      <h2 className="text-xl font-mono font-bold text-cyan-400 mb-4">TWO-FACTOR AUTHENTICATION (2FA)</h2>
      
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-md p-4 mb-4 text-green-400">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-md p-4 mb-4 text-red-400">
          {error}
        </div>
      )}

      {mfaEnabled ? (
        <div>
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-full bg-green-900/30 flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-cyan-300">Two-factor authentication is enabled</p>
              <p className="text-sm text-gray-300">Your account is protected with an additional layer of security.</p>
            </div>
          </div>

          {!showDisable ? (
            <div className="space-y-4">
              <div className="border border-gray-600/50 rounded-md p-4 bg-gray-800/30">
                <h3 className="font-mono font-bold text-cyan-400 mb-2">RECOVERY CODES</h3>
                <p className="text-sm text-gray-300 mb-2">
                  You have {remainingCodes.length} recovery codes remaining. Each code can be used once to access your account if you lose your authenticator device.
                </p>
                {remainingCodes.length < 3 && (
                  <div className="bg-yellow-900/30 border border-yellow-500/50 text-yellow-400 p-3 text-sm mb-2 rounded-md">
                    You're running low on recovery codes. Consider disabling and re-enabling 2FA to generate new codes.
                  </div>
                )}
                <button
                  onClick={() => setShowDisable(true)}
                  className="text-sm bg-red-600/80 text-white px-3 py-1 rounded-md hover:bg-red-600 font-mono"
                >
                  DISABLE 2FA
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="font-medium mb-2">Disable Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mb-4">
                To disable 2FA, please enter the current verification code from your authenticator app.
              </p>
              <div className="mb-4">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substr(0, 6))}
                  placeholder="000000"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 text-center tracking-widest"
                  maxLength={6}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDisable(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisableMFA}
                  disabled={loading || verificationCode.length !== 6}
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:bg-red-400"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-full bg-gray-800/50 flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-cyan-300">Two-factor authentication is disabled</p>
              <p className="text-sm text-gray-300">Add an extra layer of security to your account.</p>
            </div>
          </div>
          
          <p className="mb-4 text-gray-300">
            With 2FA enabled, you'll need your password and a code from your authenticator app to sign in.
          </p>
          
          <button
            onClick={() => setShowSetup(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-md font-mono"
          >
            ENABLE TWO-FACTOR AUTHENTICATION
          </button>
        </div>
      )}
    </div>
  );
};

export default MFASettings;