'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletOverview } from '../../components/WalletOverview';
import { VirtualCardOverview } from '../../components/VirtualCardOverview';
import { TransactionHistory } from '../../components/TransactionHistory';
import NotificationCenter from '../../components/NotificationCenter';
import WelcomeScreen from '../../components/WelcomeScreen';
import { useAuthFlow } from '../../hooks/useAuthFlow';
import { NavigationSidebar } from '../../components/NavigationSidebar';

export default function SidebarPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'wallet' | 'transactions'>('overview');
  const [notifications, setNotifications] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
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
            if (data.success) {
              setNotifications(data.notifications);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-cyan-400 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!authFlow.user) {
    // Show minimal UI while redirecting or if there's an unexpected auth state
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-cyan-400 font-mono">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Welcome Screen with Seed Phrase Setup */}
      {showWelcome && authFlow.user && (
        <WelcomeScreen
          userName={authFlow.user?.user_metadata?.full_name || ''}
          onComplete={handleSeedPhraseComplete}
          onSkip={handleSeedPhraseSkip}
          isNewUser={authFlow.isNewUser}
        />
      )}

      {/* Navigation Sidebar - authFlow.user is safely checked inside component */}
      <NavigationSidebar />

      {/* Main Content Area */}
      <div className="md:ml-64 transition-all duration-300"> {/* Responsive margin that only applies on larger screens */}
        {/* Top Header */}
        <header className="bg-gray-900/50 backdrop-blur border-b border-cyan-400/20 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-mono font-bold text-cyan-400">
                {activeTab === 'overview' && 'DASHBOARD'}
                {activeTab === 'cards' && 'VIRTUAL CARDS'}
                {activeTab === 'wallet' && 'WALLETS'}
                {activeTab === 'transactions' && 'TRANSACTION HISTORY'}
              </h1>
              
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <div className="relative">
                  <button className="text-gray-400 hover:text-cyan-400 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </div>

                {/* Mobile sidebar toggle - This would be implemented in responsive design */}
                <button className="md:hidden text-gray-400 hover:text-cyan-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Secondary navigation for Dashboard tabs */}
            {activeTab === 'overview' && (
              <div className="flex mt-4 space-x-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 text-sm font-mono text-cyan-400 bg-cyan-400/10 rounded-md"
                >
                  OVERVIEW
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  CARDS
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  WALLET
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  TRANSACTIONS
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-mono font-bold text-cyan-400">
                    WELCOME TO CELORA
                  </h2>
                  <span className="bg-cyan-500/20 text-cyan-400 text-xs font-mono px-3 py-1 rounded-full">
                    NEW SIDEBAR VERSION
                  </span>
                </div>
                <p className="text-gray-400">
                  This is the new sidebar navigation version of Celora. Compare it with the original design by visiting the <a href="/" className="text-cyan-400 hover:underline">classic version</a>.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                  <div className="text-cyan-400 text-sm font-mono">TOTAL BALANCE</div>
                  <div className="text-2xl font-bold text-white mt-1">$12,450.00</div>
                  <div className="text-green-400 text-sm mt-1">+2.5% today</div>
                </div>
                <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                  <div className="text-cyan-400 text-sm font-mono">ACTIVE CARDS</div>
                  <div className="text-2xl font-bold text-white mt-1">3</div>
                  <div className="text-gray-400 text-sm mt-1">2 virtual, 1 physical</div>
                </div>
                <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                  <div className="text-cyan-400 text-sm font-mono">CRYPTO HOLDINGS</div>
                  <div className="text-2xl font-bold text-white mt-1">$8,920.00</div>
                  <div className="text-green-400 text-sm mt-1">+12.3% this week</div>
                </div>
                <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                  <div className="text-cyan-400 text-sm font-mono">MONTHLY SPENDING</div>
                  <div className="text-2xl font-bold text-white mt-1">$2,180.00</div>
                  <div className="text-yellow-400 text-sm mt-1">73% of budget</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                  <h3 className="text-cyan-400 font-mono font-bold mb-4">RECENT TRANSACTIONS</h3>
                  <div className="space-y-3">
                    {[
                      { desc: 'Amazon Purchase', amount: '-$129.99', time: '2 mins ago', type: 'card' },
                      { desc: 'BTC Buy Order', amount: '-$500.00', time: '1 hour ago', type: 'crypto' },
                      { desc: 'Salary Deposit', amount: '+$3,500.00', time: '1 day ago', type: 'deposit' },
                      { desc: 'Netflix Subscription', amount: '-$15.99', time: '2 days ago', type: 'card' }
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
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
        </main>
      </div>
    </div>
  );
}