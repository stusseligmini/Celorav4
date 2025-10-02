'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SeedPhraseSetup from './SeedPhraseSetup';

interface WelcomeScreenProps {
  userName: string;
  onComplete: () => void;
  onSkip: () => void;
  isNewUser: boolean;
}

export default function WelcomeScreen({ userName, onComplete, onSkip, isNewUser }: WelcomeScreenProps) {
  const [step, setStep] = useState<'welcome' | 'seedphrase'>('welcome');

  const handleContinueToSeedPhrase = () => {
    setStep('seedphrase');
  };

  const handleSeedPhraseComplete = () => {
    setStep('welcome');
    onComplete();
  };

  const handleSeedPhraseSkip = () => {
    setStep('welcome');
    onSkip();
  };

  if (step === 'seedphrase') {
    return (
      <SeedPhraseSetup
        onComplete={handleSeedPhraseComplete}
        onSkip={handleSeedPhraseSkip}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full border border-cyan-primary/20 shadow-neon-sm"
      >
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-cyan-primary/30 to-purple-glow/30 border border-cyan-primary/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-neon-sm">
            <svg className="w-10 h-10 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold font-mono text-cyan-primary neon-text mb-2">
            WELCOME TO CELORA
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            {userName ? `Hi ${userName}!` : 'Welcome!'} 
          </p>
          <p className="text-gray-400">
            Your professional fintech platform is ready to use.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-cyan-primary/20 border border-cyan-primary/30 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-neon-xs">
              <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-cyan-primary font-medium neon-text mb-1">Virtual Cards</h3>
            <p className="text-sm text-gray-400">Create and manage virtual payment cards</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-glow/20 border border-purple-glow/30 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-neon-purple-xs">
              <svg className="w-6 h-6 text-purple-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-purple-glow font-medium neon-text-purple mb-1">Crypto Wallet</h3>
            <p className="text-sm text-gray-400">Secure cryptocurrency management</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-cyan-primary/20 border border-cyan-primary/30 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-neon-xs">
              <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-cyan-primary font-medium neon-text mb-1">Analytics</h3>
            <p className="text-sm text-gray-400">Advanced financial insights</p>
          </div>
        </div>

        {/* Security Recommendation */}
        {isNewUser && (
          <div className="bg-gradient-to-r from-cyan-primary/10 to-purple-glow/10 border border-cyan-primary/20 rounded-xl p-6 mb-8 hover:shadow-neon-sm transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-cyan-primary/20 border border-cyan-primary/30 rounded-lg flex items-center justify-center flex-shrink-0 shadow-neon-xs">
                <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-cyan-primary neon-text font-medium mb-2">🔒 Recommended: Secure Your Account</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Set up a 12-word seed phrase backup to ensure you never lose access to your account. 
                  This is the industry standard for financial security.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleContinueToSeedPhrase}
                    className="bg-cyan-primary/20 border border-cyan-primary/50 text-cyan-primary hover:bg-cyan-primary/30 hover:shadow-neon-sm font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300"
                  >
                    Set Up Backup Now (Recommended)
                  </button>
                  <button
                    onClick={onSkip}
                    className="text-gray-400 hover:text-purple-glow border border-gray-600 hover:border-purple-glow/50 hover:bg-purple-glow/10 font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Get Started Button */}
        {!isNewUser && (
          <div className="text-center">
            <button
              onClick={onComplete}
              className="bg-cyan-primary/20 border border-cyan-primary/50 text-cyan-primary hover:bg-cyan-primary/30 hover:shadow-neon-sm font-mono font-bold py-3 px-8 rounded-lg transition-all duration-300"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Professional Note */}
        <div className="mt-8 pt-6 border-t border-cyan-primary/20 text-center">
          <p className="text-xs text-gray-500">
            Celora Platform • Professional Financial Technology • Secure by Design
          </p>
        </div>
      </motion.div>
    </div>
  );
}
