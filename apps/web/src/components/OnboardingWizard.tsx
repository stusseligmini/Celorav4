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
              <h3 className="text-lg font-semibold text-gray-900">Welcome to Celora!</h3>
              <p className="text-gray-600">Let's set up your profile</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <button
              onClick={handleStep1Submit}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Your Wallet</h3>
              <p className="text-gray-600">Set up your digital wallet for crypto and fiat currencies</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wallet Name
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Wallet"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Your wallet will support:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• USD and other fiat currencies</li>
                <li>• Bitcoin, Ethereum, and major cryptocurrencies</li>
                <li>• Secure key management with encryption</li>
                <li>• Real-time balance tracking</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleStep2Submit}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Secure Your Virtual Card</h3>
              <p className="text-gray-600">Set a 4-digit PIN for your virtual card transactions</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                4-Digit PIN
              </label>
              <input
                type="password"
                value={cardPin}
                onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm PIN
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Security Note:</strong> Your PIN will be required for all card transactions and sensitive operations.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleStep3Submit}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Ready to Launch!</h3>
              <p className="text-gray-600">Review your setup and complete onboarding</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <span className="text-sm text-gray-900">{fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <span className="text-sm text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Wallet:</span>
                <span className="text-sm text-gray-900">{walletName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Virtual Card:</span>
                <span className="text-sm text-gray-900">PIN Protected</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">What's included:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• $100 welcome bonus added to your card</li>
                <li>• Full access to all Celora features</li>
                <li>• Real-time transaction monitoring</li>
                <li>• Secure cross-platform transfers</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleFinalSetup}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Setting up...
                  </div>
                ) : (
                  'Complete Setup'
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step content */}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}