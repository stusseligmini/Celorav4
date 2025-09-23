'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletOverview } from '../components/WalletOverview';
import { VirtualCardOverview } from '../components/VirtualCardOverview';
import { TransactionHistory } from '../components/TransactionHistory';
import NotificationCenter from '../components/NotificationCenter';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'wallet' | 'transactions'>('overview');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch notifications
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotifications(data.notifications);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <nav className="bg-gray-900/50 backdrop-blur border-b border-cyan-400/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-mono font-bold text-cyan-400">CELORA</h1>
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
                <Link href="/analytics" className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-cyan-400 transition-colors">
                  ANALYTICS
                </Link>
              </div>
            </div>
            
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
              
              {/* User Avatar */}
              <div className="w-8 h-8 bg-cyan-400/20 rounded-full flex items-center justify-center">
                <span className="text-cyan-400 text-sm font-mono">U</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/20 rounded-lg p-6">
              <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-2">
                WELCOME TO CELORA
              </h2>
              <p className="text-gray-400">
                Your complete financial technology platform for virtual cards, crypto management, and analytics.
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
      </main>
    </div>
  );
}
