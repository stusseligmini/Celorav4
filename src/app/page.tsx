'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WalletOverview } from '../components/WalletOverview';
import { VirtualCardOverview } from '../components/VirtualCardOverview';
import { TransactionHistory } from '../components/TransactionHistory';
import NotificationCenter from '../components/NotificationCenter';
import WelcomeScreen from '../components/WelcomeScreen';
import AutoLinkDashboard from '../components/solana/AutoLinkDashboard-clean';
import { useAuthFlow } from '../hooks/useAuthFlow';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'wallet' | 'transactions' | 'autolink'>('overview');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authFlow = useAuthFlow();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!authFlow.loading && !authFlow.user) {
      router.push('/signin');
      return;
    }
  }, [authFlow.loading, authFlow.user, router]);

  // Show welcome screen for new users (including seed phrase setup)
  useEffect(() => {
    if ((authFlow.needsSeedPhrase || authFlow.isNewUser) && !authFlow.loading) {
      setShowWelcome(true);
    }
  }, [authFlow.needsSeedPhrase, authFlow.isNewUser, authFlow.loading]);

  useEffect(() => {
    // Fetch notifications
    if (authFlow.user) {
      try {
        fetch('/api/notifications')
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.notifications)) {
              setNotifications(data.notifications);
            } else {
              console.warn('Failed to get valid notifications data:', data);
              setNotifications([]);
            }
          })
          .catch(error => {
            console.error('Failed to fetch notifications:', error);
            // Set empty notifications on error to prevent UI issues
            setNotifications([]);
          });
      } catch (error) {
        console.error('Error in notifications fetch:', error);
        setNotifications([]);
      }
    }
  }, [authFlow.user]);

  const handleSeedPhraseComplete = () => {
    setShowWelcome(false);
  };

  const handleSeedPhraseSkip = () => {
    setShowWelcome(false);
  };

  // Show loading while checking auth
  if (authFlow.loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-primary mx-auto mb-4 shadow-neon-sm"></div>
          <p className="text-cyan-primary font-mono neon-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!authFlow.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Welcome Screen with Seed Phrase Setup */}
      {showWelcome && (
        <WelcomeScreen
          userName={authFlow.user?.user_metadata?.full_name || ''}
          onComplete={handleSeedPhraseComplete}
          onSkip={handleSeedPhraseSkip}
          isNewUser={authFlow.isNewUser}
        />
      )}

      {/* Top Navigation */}
      <nav className="bg-gray-900/50 backdrop-blur-sm border-b border-cyan-primary/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <h1 className="text-xl sm:text-2xl font-mono font-bold text-cyan-primary neon-text">CELORA</h1>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex space-x-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-mono transition-colors ${
                    activeTab === 'overview' 
                      ? 'text-cyan-400 bg-cyan-400/10 rounded-md' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  OVERVIEW
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`px-4 py-2 text-sm font-mono transition-colors ${
                    activeTab === 'cards' 
                      ? 'text-cyan-400 bg-cyan-400/10 rounded-md' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  CARDS
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`px-4 py-2 text-sm font-mono transition-colors ${
                    activeTab === 'wallet' 
                      ? 'text-cyan-400 bg-cyan-400/10 rounded-md' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  WALLET
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-4 py-2 text-sm font-mono transition-colors ${
                    activeTab === 'transactions' 
                      ? 'text-cyan-400 bg-cyan-400/10 rounded-md' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  TRANSACTIONS
                </button>
                <button
                  onClick={() => setActiveTab('autolink')}
                  className={`px-4 py-2 text-sm font-mono transition-colors ${
                    activeTab === 'autolink' 
                      ? 'text-cyan-400 bg-cyan-400/10 rounded-md' 
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  AUTO-LINK
                </button>
                <Link href="/analytics" className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-cyan-400 transition-colors">
                  ANALYTICS
                </Link>
                <Link href="/settings/notifications" className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-cyan-400 transition-colors">
                  NOTIFICATIONS
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Mobile Menu Button */}
              <button 
                className="md:hidden text-gray-400 hover:text-cyan-primary transition-colors p-1 touch-target"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              
              {/* Notification Bell */}
              <div className="relative">
                <button className="text-gray-400 hover:text-cyan-primary transition-colors p-1 touch-target">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                {Array.isArray(notifications) && notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>
              
              {/* User Avatar */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-primary/20 border border-cyan-primary/30 rounded-full flex items-center justify-center touch-target">
                <span className="text-cyan-primary text-xs sm:text-sm font-mono neon-text">U</span>
              </div>
            </div>
          </div>
          
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-cyan-primary/20">
              <div className="flex flex-col space-y-2 pt-4">
                <button
                  onClick={() => {setActiveTab('overview'); setMobileMenuOpen(false);}}
                  className={`px-4 py-3 text-left text-sm font-mono transition-colors rounded-md touch-target ${
                    activeTab === 'overview' 
                      ? 'text-cyan-400 bg-cyan-400/10' 
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5'
                  }`}
                >
                  OVERVIEW
                </button>
                <button
                  onClick={() => {setActiveTab('cards'); setMobileMenuOpen(false);}}
                  className={`px-4 py-3 text-left text-sm font-mono transition-colors rounded-md touch-target ${
                    activeTab === 'cards' 
                      ? 'text-cyan-400 bg-cyan-400/10' 
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5'
                  }`}
                >
                  CARDS
                </button>
                <button
                  onClick={() => {setActiveTab('wallet'); setMobileMenuOpen(false);}}
                  className={`px-4 py-3 text-left text-sm font-mono transition-colors rounded-md touch-target ${
                    activeTab === 'wallet' 
                      ? 'text-cyan-400 bg-cyan-400/10' 
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5'
                  }`}
                >
                  WALLET
                </button>
                <button
                  onClick={() => {setActiveTab('transactions'); setMobileMenuOpen(false);}}
                  className={`px-4 py-3 text-left text-sm font-mono transition-colors rounded-md touch-target ${
                    activeTab === 'transactions' 
                      ? 'text-cyan-400 bg-cyan-400/10' 
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5'
                  }`}
                >
                  TRANSACTIONS
                </button>
                <button
                  onClick={() => {setActiveTab('autolink'); setMobileMenuOpen(false);}}
                  className={`px-4 py-3 text-left text-sm font-mono transition-colors rounded-md touch-target ${
                    activeTab === 'autolink' 
                      ? 'text-cyan-400 bg-cyan-400/10' 
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5'
                  }`}
                >
                  AUTO-LINK
                </button>
                <Link 
                  href="/analytics" 
                  className="px-4 py-3 text-left text-sm font-mono text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-colors rounded-md touch-target"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ANALYTICS
                </Link>
                <Link 
                  href="/settings/notifications" 
                  className="px-4 py-3 text-left text-sm font-mono text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/5 transition-colors rounded-md touch-target"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  NOTIFICATIONS
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-cyan-primary/10 to-purple-glow/10 border border-cyan-primary/20 rounded-lg p-4 sm:p-6 hover:shadow-neon-sm transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-3">
                <h2 className="text-xl sm:text-2xl font-mono font-bold text-cyan-primary neon-text">
                  WELCOME TO CELORA
                </h2>
                <Link href="/sidebar" className="bg-cyan-primary/20 border border-cyan-primary/30 text-cyan-primary text-xs font-mono px-3 py-2 rounded-full hover:bg-cyan-primary/30 hover:shadow-neon-xs transition-all duration-300 text-center sm:text-left touch-target">
                  TRY NEW SIDEBAR DESIGN ?
                </Link>
              </div>
              <p className="text-gray-400 text-sm sm:text-base">
                Your complete financial technology platform for virtual cards, crypto management, and analytics.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-4 sm:p-6">
                <div className="text-cyan-400 text-xs sm:text-sm font-mono">TOTAL BALANCE</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">$12,450.00</div>
                <div className="text-green-400 text-xs sm:text-sm mt-1">+2.5% today</div>
              </div>
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-4 sm:p-6">
                <div className="text-cyan-400 text-xs sm:text-sm font-mono">ACTIVE CARDS</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">3</div>
                <div className="text-gray-400 text-xs sm:text-sm mt-1">2 virtual, 1 physical</div>
              </div>
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-4 sm:p-6">
                <div className="text-cyan-400 text-xs sm:text-sm font-mono">CRYPTO HOLDINGS</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">$8,920.00</div>
                <div className="text-green-400 text-xs sm:text-sm mt-1">+12.3% this week</div>
              </div>
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-4 sm:p-6">
                <div className="text-cyan-400 text-xs sm:text-sm font-mono">MONTHLY SPENDING</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">$2,180.00</div>
                <div className="text-yellow-400 text-xs sm:text-sm mt-1">73% of budget</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-primary/20 rounded-lg p-4 sm:p-6 hover:shadow-neon-sm transition-all duration-300">
                <h3 className="text-cyan-primary font-mono font-bold mb-4 neon-text text-sm sm:text-base">RECENT TRANSACTIONS</h3>
                <div className="space-y-3">
                  {[
                    { desc: 'Amazon Purchase', amount: '-$129.99', time: '2 mins ago', type: 'card' },
                    { desc: 'BTC Buy Order', amount: '-$500.00', time: '1 hour ago', type: 'crypto' },
                    { desc: 'Salary Deposit', amount: '+$3,500.00', time: '1 day ago', type: 'deposit' },
                    { desc: 'Netflix Subscription', amount: '-$15.99', time: '2 days ago', type: 'card' }
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700/30">
                      <div>
                        <div className="font-medium text-white">{tx.desc}</div>
                        <div className="text-sm text-gray-400">{tx.time}</div>
                      </div>
                      <div className={`font-mono ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-white'}`}>
                        {tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <NotificationCenter />
            </div>
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && <VirtualCardOverview />}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && <WalletOverview />}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && <TransactionHistory />}

        {/* Auto-Link Tab */}
        {activeTab === 'autolink' && (
          <div className="bg-gray-900/30 backdrop-blur border border-cyan-primary/20 rounded-lg p-6 hover:shadow-neon-sm transition-all duration-300">
            <AutoLinkDashboard />
          </div>
        )}
      </main>
    </div>
  );
}
