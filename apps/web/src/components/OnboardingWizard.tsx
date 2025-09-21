'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { SupabaseService } from '@celora/infrastructure/client';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [walletName, setWalletName] = useState('My Wallet');
  const [cardPin, setCardPin] = useState('');
  const [confirmPin, setPinConfirm] = useState('');
  
  const { user } = useSupabase();
  const [supabaseService, setSupabaseService] = useState<SupabaseService | null>(null);

  useEffect(() => {
    if (user) {
      const service = new SupabaseService(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      setSupabaseService(service);
    }
  }, [user]);

  if (!isOpen) return null;

  const totalSteps = 4;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStep1Submit = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    setError('');
    nextStep();
  };

  const handleStep2Submit = async () => {
    if (!walletName.trim()) {
      setError('Please enter a wallet name');
      return;
    }
    setError('');
    nextStep();
  };

  const handleStep3Submit = async () => {
    if (cardPin.length !== 4 || !/^\d{4}$/.test(cardPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (cardPin !== confirmPin) {
      setError('PIN confirmation does not match');
      return;
    }
    setError('');
    nextStep();
  };

  const handleFinalSetup = async () => {
    if (!user || !supabaseService) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create user profile
      const profileResponse = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName,
          phone,
          email: user.email
        })
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to create user profile');
      }

      // 2. Create initial wallet
      const walletResponse = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: walletName,
          currency: 'USD',
          isPrimary: true
        })
      });

      if (!walletResponse.ok) {
        throw new Error('Failed to create wallet');
      }

      // 3. Create initial virtual card
      const cardResponse = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType: 'virtual',
          currency: 'USD',
          spendingLimit: 1000,
          pin: cardPin
        })
      });

      if (!cardResponse.ok) {
        throw new Error('Failed to create virtual card');
      }

      // 4. Add some demo funds
      const card = await cardResponse.json();
      if (card.id) {
        await supabaseService.addFunds({
          cardId: card.id,
          amount: 100,
          currency: 'USD',
          sourceType: 'welcome_bonus'
        });
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-cyan-300 font-mono neon-text">INITIALIZE USER PROFILE</h3>
              <p className="text-gray-400 font-mono">ENTER PERSONAL DATA</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                FULL NAME
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100 placeholder-gray-400 font-mono"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                PHONE NUMBER (OPTIONAL)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100 placeholder-gray-400 font-mono"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <button
              onClick={handleStep1Submit}
              className="w-full btn-cyan font-mono tracking-wide"
            >
              CONTINUE PROTOCOL
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-cyan-300 font-mono neon-text">CREATE WALLET MODULE</h3>
              <p className="text-gray-400 font-mono">CONFIGURE DIGITAL VAULT</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                WALLET IDENTIFIER
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100 placeholder-gray-400 font-mono"
                placeholder="My Wallet"
              />
            </div>

            <div className="cyber-card p-4 glow-cyan border border-cyan-500/30">
              <h4 className="font-bold text-cyan-300 mb-2 font-mono">WALLET CAPABILITIES:</h4>
              <ul className="text-sm text-cyan-200 space-y-1 font-mono">
                <li>• USD and other fiat currencies</li>
                <li>• Bitcoin, Ethereum, and major cryptocurrencies</li>
                <li>• Secure key management with encryption</li>
                <li>• Real-time balance tracking</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={prevStep}
                className="flex-1 btn-outline-cyan font-mono"
              >
                BACK
              </button>
              <button
                onClick={handleStep2Submit}
                className="flex-1 btn-cyan font-mono"
              >
                CONTINUE
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-cyan-300 font-mono neon-text">SECURITY PROTOCOL</h3>
              <p className="text-gray-400 font-mono">SET VIRTUAL CARD PIN</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                4-DIGIT SECURITY PIN
              </label>
              <input
                type="password"
                value={cardPin}
                onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100 text-center text-2xl tracking-widest font-mono glow-cyan"
                placeholder="••••"
                maxLength={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1 font-mono">
                CONFIRM SECURITY PIN
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100 text-center text-2xl tracking-widest font-mono glow-cyan"
                placeholder="••••"
                maxLength={4}
              />
            </div>

            <div className="cyber-card p-4 border border-yellow-500/30 bg-yellow-900/20">
              <p className="text-sm text-yellow-300 font-mono">
                <strong>SECURITY ALERT:</strong> PIN required for all transactions and sensitive operations.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={prevStep}
                className="flex-1 btn-outline-cyan font-mono"
              >
                BACK
              </button>
              <button
                onClick={handleStep3Submit}
                className="flex-1 btn-cyan font-mono"
              >
                CONTINUE
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-cyan-300 font-mono neon-text">READY TO LAUNCH!</h3>
              <p className="text-gray-400 font-mono">REVIEW SETUP AND COMPLETE ONBOARDING</p>
            </div>
            
            <div className="cyber-card p-4 space-y-3 border border-cyan-500/30">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-cyan-300 font-mono">Name:</span>
                <span className="text-sm text-gray-100 font-mono">{fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-cyan-300 font-mono">Email:</span>
                <span className="text-sm text-gray-100 font-mono">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-cyan-300 font-mono">Wallet:</span>
                <span className="text-sm text-gray-100 font-mono">{walletName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-cyan-300 font-mono">Virtual Card:</span>
                <span className="text-sm text-gray-100 font-mono">PIN Protected</span>
              </div>
            </div>

            <div className="cyber-card p-4 border border-green-500/30 bg-green-900/20">
              <h4 className="font-bold text-green-300 mb-2 font-mono">What's included:</h4>
              <ul className="text-sm text-green-300 space-y-1 font-mono">
                <li>• $100 welcome bonus added to your card</li>
                <li>• Full access to all Celora features</li>
                <li>• Real-time transaction monitoring</li>
                <li>• Secure cross-platform transfers</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={prevStep}
                className="flex-1 btn-outline-cyan font-mono"
                disabled={loading}
              >
                BACK
              </button>
              <button
                onClick={handleFinalSetup}
                disabled={loading}
                className="flex-1 btn-cyan font-mono glow-cyan-strong"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                    INITIALIZING...
                  </div>
                ) : (
                  'COMPLETE SETUP'
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="cyber-card w-full max-w-md mx-4 glow-cyan-strong">
        <div className="p-6">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-cyan-300 font-mono">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-cyan-400 font-mono">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 border border-gray-600">
              <div
                className="bg-cyan-400 h-2 rounded-full transition-all duration-300 glow-cyan"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md cyber-card">
              <p className="text-sm text-red-300 font-mono">{error}</p>
            </div>
          )}

          {/* Step content */}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}