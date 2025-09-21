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
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6 glow-cyan-strong"></div>
          <p className="text-cyan-100 font-mono text-xl tracking-wider">INITIALIZING CELORA...</p>
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome page for unauthenticated users
  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 relative overflow-hidden">
          {/* Cyberpunk background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-950/20 to-cyan-900/30"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_70%)]"></div>
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
            <div className="mb-12">
              <h1 className="text-7xl font-bold text-white mb-6 tracking-wider">
                Welcome to <span className="text-cyan-400 glow-cyan-strong neon-text">Celora</span>
              </h1>
              <p className="text-2xl text-cyan-200 mb-8 font-light">
                The cyberpunk fintech & crypto OS you can actually build on
              </p>
              <div className="text-lg text-gray-200 space-y-3 mb-12 font-mono">
                <p className="flex items-center justify-center gap-3">
                  <span className="text-cyan-400">●</span> Unified virtual cards & crypto wallets
                </p>
                <p className="flex items-center justify-center gap-3">
                  <span className="text-cyan-400">●</span> Built-in security with KMS & encryption
                </p>
                <p className="flex items-center justify-center gap-3">
                  <span className="text-cyan-400">●</span> Real-time updates & cross-platform transfers
                </p>
                <p className="flex items-center justify-center gap-3">
                  <span className="text-cyan-400">●</span> Ready for scale, analytics, and compliance
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-cyan text-xl px-12 py-5 glow-cyan-strong font-bold tracking-wide"
              >
                ENTER THE MATRIX
              </button>
              <p className="text-sm text-cyan-300 font-mono">
                No credit card required • 2-minute setup • Full cyberpunk experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="cyber-card p-8 glow-cyan">
                <div className="text-5xl mb-6 text-cyan-400">💳</div>
                <h3 className="font-bold text-xl text-cyan-300 mb-4 font-mono">VIRTUAL CARDS</h3>
                <p className="text-gray-300 leading-relaxed">Secure card issuance with PIN protection and real-time controls</p>
              </div>
              <div className="cyber-card p-8 glow-cyan">
                <div className="text-5xl mb-6 text-cyan-400">🪙</div>
                <h3 className="font-bold text-xl text-cyan-300 mb-4 font-mono">CRYPTO WALLETS</h3>
                <p className="text-gray-300 leading-relaxed">Multi-currency support with secure key management</p>
              </div>
              <div className="cyber-card p-8 glow-cyan">
                <div className="text-5xl mb-6 text-cyan-400">🔄</div>
                <h3 className="font-bold text-xl text-cyan-300 mb-4 font-mono">CROSS-PLATFORM</h3>
                <p className="text-gray-300 leading-relaxed">Seamless transfers between traditional and crypto assets</p>
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
            <h1 className="text-3xl font-bold text-white mb-4 font-mono tracking-wider">
              WELCOME TO <span className="text-cyan-400 neon-text">CELORA</span>, {user.email?.split('@')[0]?.toUpperCase()}!
            </h1>
            <p className="text-cyan-200 mb-8 font-mono">
              INITIALIZING CYBERPUNK FINTECH INTERFACE...
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="btn-cyan font-mono tracking-wide"
            >
              BEGIN SETUP PROTOCOL
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
          <h1 className="text-4xl font-bold text-white font-mono tracking-wider">
            <span className="text-cyan-400 neon-text">CELORA</span> COMMAND CENTER
          </h1>
          <p className="mt-2 text-cyan-200 font-mono">
            Virtual Cards & Wallet Management • Cyberpunk Financial OS
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