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
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 glow-cyan"></div>
          <p className="text-cyan-100">Loading Celora...</p>
        </div>
      </div>
    );
  }

  // Show welcome page for unauthenticated users
  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-cyan-900">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <div className="mb-12">
              <h1 className="text-6xl font-bold text-gray-100 mb-6">
                Welcome to <span className="text-cyan-400 glow-cyan">Celora</span>
              </h1>
              <p className="text-xl text-cyan-100 mb-8">
                The cyberpunk fintech & crypto OS you can actually build on
              </p>
              <div className="text-lg text-gray-300 space-y-2 mb-12">
                <p>✨ Unified virtual cards & crypto wallets</p>
                <p>🔐 Built-in security with KMS & encryption</p>
                <p>⚡ Real-time updates & cross-platform transfers</p>
                <p>🚀 Ready for scale, analytics, and compliance</p>
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-cyan text-lg px-8 py-4 glow-cyan-strong"
              >
                Get Started Free
              </button>
              <p className="text-sm text-gray-400">
                No credit card required • 2-minute setup
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="cyber-card p-6">
                <div className="text-3xl mb-4">💳</div>
                <h3 className="font-semibold text-cyan-300 mb-2">Virtual Cards</h3>
                <p className="text-gray-300">Secure card issuance with PIN protection and real-time controls</p>
              </div>
              <div className="cyber-card p-6">
                <div className="text-3xl mb-4">🪙</div>
                <h3 className="font-semibold text-cyan-300 mb-2">Crypto Wallets</h3>
                <p className="text-gray-300">Multi-currency support with secure key management</p>
              </div>
              <div className="cyber-card p-6">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="font-semibold text-cyan-300 mb-2">Cross-Platform</h3>
                <p className="text-gray-300">Seamless transfers between traditional and crypto assets</p>
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
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cyan-100 mb-4">
              Welcome to <span className="text-cyan-400">Celora</span>, {user.email}!
            </h1>
            <p className="text-gray-300 mb-8">
              Let's set up your cyberpunk fintech account
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="btn-cyan"
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
    <main className="min-h-screen bg-primary">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-100">
            <span className="text-cyan-400">Celora</span> Virtual Cards & Wallet Management
          </h1>
          <p className="mt-2 text-gray-300">
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