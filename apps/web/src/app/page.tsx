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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-300 text-xl">Loading Celora Platform...</p>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
          {/* Subtle gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-950/10 to-cyan-900/20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.05),transparent_70%)]"></div>
          
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center">
            <div className="mb-16">
              <h1 className="text-6xl font-light text-white mb-8 tracking-tight">
                Welcome to <span className="text-cyan-400 font-medium">Celora</span>
              </h1>
              <p className="text-xl text-gray-300 mb-12 font-light max-w-3xl mx-auto leading-relaxed">
                Advanced financial technology platform for virtual cards, cryptocurrency management, and real-time analytics
              </p>
              <div className="text-base text-gray-400 space-y-4 mb-16 max-w-2xl mx-auto">
                <p className="flex items-center justify-center gap-3">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"></span> 
                  Enterprise-grade virtual card management
                </p>
                <p className="flex items-center justify-center gap-3">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"></span> 
                  Multi-chain cryptocurrency wallets with institutional security
                </p>
                <p className="flex items-center justify-center gap-3">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"></span> 
                  Real-time transaction monitoring and fraud detection
                </p>
                <p className="flex items-center justify-center gap-3">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"></span> 
                  Advanced analytics dashboard with compliance reporting
                </p>
              </div>
            </div>

            <div className="space-y-6 mb-16">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-10 py-4 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
              >
                Get Started
              </button>
              <p className="text-sm text-gray-500">
                No setup fees • Enterprise security • Full platform access
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-cyan-500/30 transition-all duration-200">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-xl text-white mb-4">Virtual Cards</h3>
                <p className="text-gray-400 leading-relaxed">Issue and manage virtual payment cards with real-time spending controls and advanced security features</p>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-cyan-500/30 transition-all duration-200">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="font-semibold text-xl text-white mb-4">Crypto Wallets</h3>
                <p className="text-gray-400 leading-relaxed">Multi-chain cryptocurrency management with institutional-grade security and seamless trading capabilities</p>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-cyan-500/30 transition-all duration-200">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-xl text-white mb-4">Analytics Platform</h3>
                <p className="text-gray-400 leading-relaxed">Comprehensive financial analytics with real-time insights, compliance reporting, and performance metrics</p>
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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-lg mx-auto px-6">
            <h1 className="text-3xl font-light text-white mb-4">
              Welcome to <span className="text-cyan-400 font-medium">Celora</span>, {user.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-400 mb-8">
              Let's set up your financial platform and get you started
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-8 py-3 rounded-lg transition-all duration-200"
            >
              Complete Setup
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
    <main className="min-h-screen bg-slate-900">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-white">
            <span className="text-cyan-400 font-medium">Celora</span> Dashboard
          </h1>
          <p className="mt-2 text-gray-400">
            Financial platform overview and account management
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