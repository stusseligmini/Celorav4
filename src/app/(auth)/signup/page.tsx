"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '@/lib/auth';
import { generateSecureSeedPhrase, validateSeedPhrase, getSeedPhraseStrength } from '@/lib/seedPhrase';

export default function SignUpPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<'method' | 'create' | 'verify'>('method');
  const [accountType, setAccountType] = useState<'email' | 'wallet'>('wallet');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string[]>([]);
  const [verificationSeedPhrase, setVerificationSeedPhrase] = useState(Array(12).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seedPhraseSaved, setSeedPhraseSaved] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  // Generate a new 12-word seed phrase using secure randomness
  const generateNewSeedPhrase = () => {
    const newPhrase = generateSecureSeedPhrase();
    setGeneratedSeedPhrase(newPhrase);
    setSeedPhraseSaved(false);
    setBackupConfirmed(false);
  };

  useEffect(() => {
    if (accountType === 'wallet') {
      generateNewSeedPhrase();
    }
  }, [accountType]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await authService.signUpWithEmail(email, password, fullName);
    
    if (result.success) {
      setSuccess('Account created successfully! Check your email to verify your account.');
      setTimeout(() => router.push('/signin'), 3000);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedPhraseSaved || !backupConfirmed) {
      setError('Please confirm that you have saved your seed phrase');
      return;
    }
    setStep('verify');
  };

  const handleVerifyAndRegister = async (e: React.FormEvent, retryAttempt = 0) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Verify seed phrase
    if (!validateSeedPhrase(verificationSeedPhrase)) {
      setError('Please enter all 12 words correctly');
      setLoading(false);
      return;
    }
    
    // Debug: Check word by word matching
    const mismatches = [];
    for (let i = 0; i < 12; i++) {
      const generated = generatedSeedPhrase[i]?.toLowerCase().trim();
      const verified = verificationSeedPhrase[i]?.toLowerCase().trim();
      if (generated !== verified) {
        mismatches.push(`Word ${i + 1}: expected "${generated}", got "${verified}"`);
      }
    }

    if (mismatches.length > 0) {
      console.log('Seed phrase mismatches:', mismatches);
      setError(`Seed phrase verification failed. Check these words: ${mismatches.slice(0, 3).map(m => m.split(':')[0]).join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const result = await authService.createWalletWithSeedPhrase(
        generatedSeedPhrase,
        fullName,
        email || undefined
      );
      
      if (result.success) {
        setSuccess('🎉 Wallet created successfully! Redirecting to sign in...');
        setTimeout(() => router.push('/signin'), 2000);
      } else {
        // Handle specific error cases with retry logic
        if (result.error?.includes('rate-limited') || result.error?.includes('captcha')) {
          if (retryAttempt < 2) {
            setError(`${result.error} Retrying in 3 seconds... (Attempt ${retryAttempt + 1}/3)`);
            setTimeout(() => {
              handleVerifyAndRegister(e, retryAttempt + 1);
            }, 3000);
            return;
          } else {
            setError('Unable to create wallet after multiple attempts. Please try again later or use email signup instead.');
          }
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('Network error occurred. Please check your connection and try again.');
    }
    
    setLoading(false);
  };

  const handleVerificationWordChange = (index: number, value: string) => {
    const newPhrase = [...verificationSeedPhrase];
    newPhrase[index] = value.toLowerCase().trim();
    setVerificationSeedPhrase(newPhrase);
  };

  const copySeedPhrase = async () => {
    try {
      await navigator.clipboard.writeText(generatedSeedPhrase.join(' '));
      setSuccess('Seed phrase copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const downloadSeedPhrase = () => {
    const text = `CELORA WALLET RECOVERY PHRASE
    
WARNING: Keep this safe and secure! This is the ONLY way to recover your wallet.
Never share this with anyone!

Your 12-word seed phrase:
${generatedSeedPhrase.map((word, i) => `${i + 1}. ${word}`).join('\n')}

Created: ${new Date().toLocaleString()}
Account: ${fullName}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'celora-wallet-recovery.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-blue-950/20"></div>
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-mono font-bold text-cyan-400 mb-2">CELORA</h1>
            <p className="text-gray-400">
              {step === 'method' ? 'Create Account' : 
               step === 'create' ? 'Create New Wallet' : 
               'Verify Seed Phrase'}
            </p>
          </div>

          {error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-md"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-red-400 text-sm font-medium mb-2">{error}</p>
                    {(error.includes('rate-limited') || error.includes('captcha') || error.includes('Too many')) && (
                      <div className="space-y-2">
                        <p className="text-red-300 text-xs">
                          This usually happens when there are too many signup attempts. You can:
                        </p>
                        <ul className="text-red-300 text-xs space-y-1 ml-4">
                          <li>• Wait a few minutes and try again</li>
                          <li>• Use email signup instead (more reliable)</li>
                          <li>• Generate a new seed phrase</li>
                        </ul>
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => {
                              setAccountType('email');
                              setStep('create');
                              setError(null);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                          >
                            Use Email Instead
                          </button>
                          <button
                            onClick={() => {
                              generateNewSeedPhrase();
                              setError(null);
                            }}
                            className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded transition-colors"
                          >
                            New Seed Phrase
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {success && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-md"
              >
                <p className="text-green-400 text-sm">{success}</p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Account Type Selection */}
          {step === 'method' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <p className="text-gray-300 text-sm mb-4">Choose your account type:</p>
              </div>

              {/* Crypto Wallet Option */}
              <motion.button
                onClick={() => {
                  setAccountType('wallet');
                  setStep('create');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-6 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-2 border-cyan-400/30 rounded-lg hover:border-cyan-400/50 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-cyan-400/20 rounded-full flex items-center justify-center group-hover:bg-cyan-400/30 transition-colors">
                    <span className="text-cyan-400 text-xl">🔐</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-mono font-bold">Crypto Wallet</h3>
                    <p className="text-gray-400 text-sm">12-word seed phrase • Most secure • Recommended</p>
                  </div>
                </div>
              </motion.button>

              {/* Email Account Option */}
              <motion.button
                onClick={() => {
                  setAccountType('email');
                  setStep('create');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-6 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg hover:border-gray-500/50 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-600/20 rounded-full flex items-center justify-center group-hover:bg-gray-600/30 transition-colors">
                    <span className="text-gray-400 text-xl">📧</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-mono font-bold">Email Account</h3>
                    <p className="text-gray-400 text-sm">Traditional email & password • Easier setup</p>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Create Account */}
          {step === 'create' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Back button */}
              <button
                onClick={() => setStep('method')}
                className="mb-4 text-sm text-gray-400 hover:text-cyan-400 font-mono transition-colors"
              >
                ← BACK
              </button>

              {accountType === 'email' ? (
                /* Email Account Creation */
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-mono text-cyan-400 mb-2">FULL NAME</label>
                    <input
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-mono text-cyan-400 mb-2">EMAIL</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-mono text-cyan-400 mb-2">PASSWORD</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                      placeholder="Choose a strong password"
                      minLength={8}
                    />
                  </div>
                  <button
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50 mt-6"
                  >
                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </button>
                </form>
              ) : (
                /* Wallet Creation */
                <form onSubmit={handleCreateWallet} className="space-y-4">
                  <div>
                    <label className="block text-sm font-mono text-cyan-400 mb-2">FULL NAME</label>
                    <input
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-mono text-cyan-400 mb-2">EMAIL (OPTIONAL)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                      placeholder="your@email.com (for recovery notifications)"
                    />
                  </div>

                  {/* Generated Seed Phrase Display */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-mono text-cyan-400">YOUR SEED PHRASE</label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={copySeedPhrase}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                        >
                          COPY
                        </button>
                        <button
                          type="button"
                          onClick={downloadSeedPhrase}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                        >
                          DOWNLOAD
                        </button>
                        <button
                          type="button"
                          onClick={generateNewSeedPhrase}
                          className="text-xs text-gray-400 hover:text-gray-300 font-mono transition-colors"
                        >
                          NEW
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/70 border border-gray-600 rounded-md p-4">
                      <div className="grid grid-cols-3 gap-2">
                        {generatedSeedPhrase.map((word, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-gray-700/50 rounded px-2 py-2 text-center hover:bg-gray-700/70 transition-colors"
                          >
                            <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
                            <div className="text-sm text-white font-mono font-semibold">{word}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Security warnings and confirmations */}
                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-md">
                        <p className="text-yellow-400 text-xs">
                          🔐 <strong>CRITICAL:</strong> This 12-word seed phrase is the ONLY way to recover your wallet. 
                          If you lose it, your funds are gone forever. Never share it with anyone!
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={seedPhraseSaved}
                            onChange={e => setSeedPhraseSaved(e.target.checked)}
                            className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 rounded focus:ring-cyan-400"
                          />
                          <span className="text-sm text-gray-300">
                            I have written down my seed phrase in a safe place
                          </span>
                        </label>
                        
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={backupConfirmed}
                            onChange={e => setBackupConfirmed(e.target.checked)}
                            className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 rounded focus:ring-cyan-400"
                          />
                          <span className="text-sm text-gray-300">
                            I understand that losing my seed phrase means losing access to my wallet
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!seedPhraseSaved || !backupConfirmed}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50 mt-6"
                  >
                    CONTINUE TO VERIFICATION
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* Step 3: Verify Seed Phrase */}
          {step === 'verify' && accountType === 'wallet' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-cyan-400 mb-2">
                    VERIFY YOUR SEED PHRASE
                  </label>
                  <p className="text-xs text-gray-400 mb-4">
                    Enter your 12-word seed phrase exactly as shown previously to verify you've saved it correctly:
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {verificationSeedPhrase.map((word, index) => (
                      <div key={index} className="relative">
                        <span className="absolute left-2 top-1 text-xs text-gray-500 font-mono z-10">
                          {index + 1}
                        </span>
                        <input
                          id={`verify-${index}`}
                          type="text"
                          value={word}
                          onChange={e => handleVerificationWordChange(index, e.target.value)}
                          className={`w-full bg-gray-800/50 border rounded-md px-2 pt-5 pb-2 text-white text-sm placeholder-gray-400 focus:outline-none transition-all ${
                            word && word.toLowerCase() === generatedSeedPhrase[index]
                              ? 'border-green-500/50 focus:border-green-400'
                              : word && word.length > 0
                              ? 'border-red-500/50 focus:border-red-400'
                              : 'border-gray-600 focus:border-cyan-400'
                          }`}
                          placeholder="word"
                          autoComplete="off"
                        />
                        
                        {/* Validation indicator */}
                        {word && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            {word.toLowerCase() === generatedSeedPhrase[index] ? (
                              <span className="text-green-400 text-xs">✓</span>
                            ) : (
                              <span className="text-red-400 text-xs">✗</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Progress indicator */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Verification Progress</span>
                      <span>
                        {verificationSeedPhrase.filter((word, i) => word.toLowerCase() === generatedSeedPhrase[i]).length}/12
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(verificationSeedPhrase.filter((word, i) => word.toLowerCase() === generatedSeedPhrase[i]).length / 12) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep('create')}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-mono py-3 px-4 rounded-md transition-all"
                  >
                    BACK
                  </button>
                  <button
                    disabled={loading || !generatedSeedPhrase.every((word, i) => word === verificationSeedPhrase[i]?.toLowerCase())}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-mono font-bold py-3 px-4 rounded-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'CREATING WALLET...' : 'CREATE WALLET'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <div className="text-center">
              <Link 
                href="/signin" 
                className="text-cyan-400 hover:text-cyan-300 font-mono text-sm transition-colors"
              >
                ALREADY HAVE A WALLET? SIGN IN
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
