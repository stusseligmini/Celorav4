'use client';

import { useState } from 'react';
import { useSupabase } from '@/providers/SupabaseProvider';
import { DashboardHeader } from '@/components/DashboardHeader';
import { VirtualCardOverview } from '@/components/VirtualCardOverview';
import { TransactionHistory } from '@/components/TransactionHistory';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingWizard } from '@/components/OnboardingWizard';

export default function HomePage() {
  const { user, loading } = useSupabase();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Celora...</p>
        </div>
      </div>
    );
  }

  // Show welcome page for unauthenticated users
  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <div className="mb-12">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Welcome to <span className="text-blue-600">Celora</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                The secure fintech & crypto OS you can actually build on
              </p>
              <div className="text-lg text-gray-700 space-y-2 mb-12">
                <p>✨ Unified virtual cards & crypto wallets</p>
                <p>🔐 Built-in security with KMS & encryption</p>
                <p>⚡ Real-time updates & cross-platform transfers</p>
                <p>🚀 Ready for scale, analytics, and compliance</p>
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
              >
                Get Started Free
              </button>
              <p className="text-sm text-gray-500">
                No credit card required • 2-minute setup
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">💳</div>
                <h3 className="font-semibold text-gray-900 mb-2">Virtual Cards</h3>
                <p className="text-gray-600">Secure card issuance with PIN protection and real-time controls</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">🪙</div>
                <h3 className="font-semibold text-gray-900 mb-2">Crypto Wallets</h3>
                <p className="text-gray-600">Multi-currency support with secure key management</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="font-semibold text-gray-900 mb-2">Cross-Platform</h3>
                <p className="text-gray-600">Seamless transfers between traditional and crypto assets</p>
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultTab="signup"
        />
      </>
    );
  }

  // Show onboarding for new users
  if (user && !hasCompletedOnboarding) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Celora, {user.email}!
            </h1>
            <p className="text-gray-600 mb-8">
              Let's set up your account to get started
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Setup
            </button>
          </div>
        </div>

        <OnboardingWizard
          isOpen={showOnboarding}
          onComplete={() => {
            setShowOnboarding(false);
            setHasCompletedOnboarding(true);
          }}
        />
      </>
    );
  }

  // Show main dashboard for authenticated users
  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Celora Virtual Cards & Wallet Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your virtual cards, crypto wallets, and cross-platform transactions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VirtualCardOverview />
          </div>
          
          <div className="lg:col-span-1">
            <TransactionHistory />
          </div>
        </div>
      </div>
    </main>
  );
}