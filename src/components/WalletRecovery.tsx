'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { generateSecureSeedPhrase, validateSeedPhrase } from '@/lib/seedPhrase';
import { withRetry } from '@/lib/supabaseErrorHandling';
import { getSupabaseClient } from '@/lib/supabaseSingleton';

interface WalletRecoveryProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function WalletRecovery({ onComplete, onCancel }: WalletRecoveryProps) {
  const [method, setMethod] = useState<'recover' | 'create'>('recover');
  const [step, setStep] = useState<'intro' | 'enter' | 'generate' | 'confirm' | 'complete'>('intro');
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [inputPhrase, setInputPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);

  // Handle seed phrase input during recovery
  const handlePhraseInput = (value: string) => {
    setInputPhrase(value);
    setError(null);
  };

  // Generate a new seed phrase for wallet creation
  const generateNewSeedPhrase = () => {
    setLoading(true);
    try {
      const newPhrase = generateSecureSeedPhrase();
      setSeedPhrase(newPhrase);
      setStep('generate');
    } catch (err) {
      setError('Failed to generate seed phrase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Recover wallet using existing seed phrase
  const recoverWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert input string to array and normalize
      const words = inputPhrase.trim().toLowerCase().split(/\s+/);
      
      // Validate seed phrase
      if (!validateSeedPhrase(words)) {
        setError('Invalid seed phrase. Please check your input and try again.');
        setLoading(false);
        return;
      }

      // Call API to recover wallet
      const supabase = getSupabaseClient();
      const { data, error: apiError } = await withRetry('recover-wallet', async () => {
        return await supabase.functions.invoke('recover-wallet', {
          body: { seedPhrase: words.join(' ') }
        });
      });

      if (apiError) {
        setError(apiError.message || 'Failed to recover wallet');
        setLoading(false);
        return;
      }

      // Update user profile to indicate they have a seed phrase
      await withRetry('update-seed-phrase-status', async () => {
        return await supabase.from('user_profiles')
          .update({ has_seed_phrase: true })
          .eq('id', data.userId);
      });

      setStep('complete');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError('An error occurred during recovery. Please try again.');
      console.error('Wallet recovery error:', err);
    }

    setLoading(false);
  };

  // Create new wallet with generated seed phrase
  const createNewWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call API to create wallet with seed phrase
      const supabase = getSupabaseClient();
      const { data, error: apiError } = await withRetry('create-wallet', async () => {
        return await supabase.functions.invoke('create-wallet', {
          body: { seedPhrase: seedPhrase.join(' ') }
        });
      });

      if (apiError) {
        setError(apiError.message || 'Failed to create wallet');
        setLoading(false);
        return;
      }

      // Update user profile to indicate they have a seed phrase
      await withRetry('update-seed-phrase-status', async () => {
        return await supabase.from('user_profiles')
          .update({ has_seed_phrase: true })
          .eq('id', data.userId);
      });

      setStep('complete');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError('An error occurred while creating the wallet. Please try again.');
      console.error('Wallet creation error:', err);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-400/20"
      >
        {/* Intro Step - Choose Method */}
        {step === 'intro' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Wallet Management</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Choose how you'd like to manage your crypto wallet.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => {
                  setMethod('recover');
                  setStep('enter');
                }}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center ${
                  method === 'recover' 
                    ? 'border-cyan-400 bg-cyan-400/10' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <svg className="w-8 h-8 text-cyan-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">Recover Existing Wallet</h3>
                <p className="text-sm text-gray-400">Use your 12-word seed phrase to recover an existing wallet</p>
              </button>
              
              <button 
                onClick={() => {
                  setMethod('create');
                  generateNewSeedPhrase();
                }}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center ${
                  method === 'create' 
                    ? 'border-cyan-400 bg-cyan-400/10' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <svg className="w-8 h-8 text-cyan-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">Create New Wallet</h3>
                <p className="text-sm text-gray-400">Generate a new secure wallet with a new seed phrase</p>
              </button>
            </div>

            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors font-mono"
            >
              Cancel
            </button>
          </div>
        )}
        
        {/* Enter Seed Phrase Step */}
        {step === 'enter' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">Enter Your Seed Phrase</h2>
              <p className="text-gray-400 mb-2">
                Enter your 12-word seed phrase to recover your wallet.
              </p>
              <p className="text-sm text-gray-500">
                Words should be separated by spaces
              </p>
            </div>

            <div className="mb-8">
              <textarea
                value={inputPhrase}
                onChange={(e) => handlePhraseInput(e.target.value)}
                placeholder="Enter your 12-word seed phrase here..."
                rows={4}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none font-mono"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-left">
                  <h3 className="text-yellow-400 font-medium mb-1">Security Warning</h3>
                  <p className="text-sm text-gray-400">
                    Make sure you're in a private location before entering your seed phrase.
                    Never share your seed phrase with anyone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={recoverWallet}
                disabled={loading || inputPhrase.trim().split(/\s+/).length !== 12}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Recovering...' : 'Recover Wallet'}
              </button>
              <button
                onClick={() => setStep('intro')}
                className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors font-mono"
              >
                Back
              </button>
            </div>
          </div>
        )}
        
        {/* Generate Step - Show New Seed Phrase */}
        {step === 'generate' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">Your New Seed Phrase</h2>
              <p className="text-gray-400">
                Write down these 12 words in order and keep them in a secure place.
              </p>
            </div>

            <div className="mb-8">
              <button
                onClick={() => setShowPhrase(!showPhrase)}
                className="w-full bg-gray-800/50 border-2 border-dashed border-cyan-400/30 rounded-lg p-4 hover:border-cyan-400/50 transition-colors"
              >
                {showPhrase ? (
                  <div className="grid grid-cols-3 gap-4">
                    {seedPhrase.map((word, index) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">{index + 1}</div>
                        <div className="font-mono text-cyan-400">{word}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-cyan-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-cyan-400 font-mono">Click to reveal seed phrase</p>
                    <p className="text-xs text-gray-500 mt-1">Make sure no one is watching</p>
                  </div>
                )}
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-red-400 font-medium mb-1">Critical Security Warning</h3>
                  <p className="text-sm text-gray-400">
                    This seed phrase is the ONLY way to recover your wallet. 
                    If you lose it, your assets cannot be recovered. Write it down now.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={createNewWallet}
                disabled={loading || !showPhrase}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-mono font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Wallet...' : 'I\'ve Written It Down'}
              </button>
              <button
                onClick={() => setStep('intro')}
                className="px-6 py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors font-mono"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              {method === 'recover' ? 'Wallet Recovered!' : 'Wallet Created!'}
            </h2>
            <p className="text-gray-400 mb-8">
              {method === 'recover' 
                ? 'Your wallet has been recovered successfully.' 
                : 'Your new wallet has been created successfully.'}
            </p>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-gray-400">
                ✅ {method === 'recover' ? 'Wallet recovered' : 'Wallet created'}<br />
                ✅ Assets accessible<br />
                ✅ Ready to use
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
