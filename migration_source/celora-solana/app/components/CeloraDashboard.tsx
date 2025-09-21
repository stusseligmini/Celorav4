'use client';

import { useState, useEffect } from 'react';
import { Wallet, CreditCard, TrendingUp, Send, Settings, Eye, EyeOff, QrCode, Copy } from 'lucide-react';

interface Tab {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'wallet',
    name: 'Wallet',
    icon: <Wallet className="w-5 h-5" />
  },
  {
    id: 'assets',
    name: 'Assets & Card',
    icon: <CreditCard className="w-5 h-5" />
  },
  {
    id: 'earn',
    name: 'Earn & Borrow',
    icon: <TrendingUp className="w-5 h-5" />
  },
  {
    id: 'send',
    name: 'Send & API',
    icon: <Send className="w-5 h-5" />
  }
];

export default function CeloraDashboard() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [balance, setBalance] = useState('$12,456.78');
  const [showBalance, setShowBalance] = useState(true);
  const [walletAddress] = useState('7x8y9z...w3v4u5');

  const [portfolio] = useState([
    { symbol: 'SOL', name: 'Solana', amount: '125.45', value: '$8,234.56', change: '+12.5%', positive: true },
    { symbol: 'ETH', name: 'Ethereum', amount: '2.847', value: '$3,645.23', change: '+8.2%', positive: true },
    { symbol: 'USDC', name: 'USD Coin', amount: '847.29', value: '$847.29', change: '0%', positive: true }
  ]);

  const [transactions] = useState([
    { type: 'receive', amount: '+0.5 SOL', from: 'DeFi Rewards', time: '2 min ago', status: 'completed' },
    { type: 'send', amount: '-1.2 ETH', to: 'UniSwap', time: '1 hour ago', status: 'completed' },
    { type: 'card', amount: '-$45.67', to: 'Amazon Purchase', time: '3 hours ago', status: 'completed' }
  ]);

  const WalletTab = () => (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="glass rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-400 text-sm">Total Balance</p>
              <div className="flex items-center space-x-3">
                <h2 className="text-4xl font-bold text-white">
                  {showBalance ? balance : '••••••'}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {showBalance ? <Eye className="w-5 h-5 text-gray-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-3 hover:bg-white/20 rounded-xl transition-colors">
                <QrCode className="w-5 h-5 text-emerald-400" />
              </button>
              <button className="p-3 hover:bg-white/20 rounded-xl transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Wallet Address</p>
              <div className="flex items-center space-x-2">
                <p className="font-mono text-emerald-400">{walletAddress}</p>
                <button className="p-1 hover:bg-white/20 rounded transition-colors">
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 text-sm">+24h</p>
              <p className="text-green-400 font-semibold">+$234.56 (1.9%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="glass p-6 rounded-2xl hover:bg-white/20 transition-all group">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Send className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-semibold">Send</p>
        </button>
        
        <button className="glass p-6 rounded-2xl hover:bg-white/20 transition-all group">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-semibold">Receive</p>
        </button>
        
        <button className="glass p-6 rounded-2xl hover:bg-white/20 transition-all group">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-semibold">Swap</p>
        </button>
        
        <button className="glass p-6 rounded-2xl hover:bg-white/20 transition-all group">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-semibold">Card</p>
        </button>
      </div>

      {/* Portfolio */}
      <div className="glass rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Portfolio</h3>
        <div className="space-y-4">
          {portfolio.map((asset, index) => (
            <div key={index} className="flex items-center justify-between p-4 hover:bg-white/10 rounded-xl transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{asset.symbol.slice(0, 1)}</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{asset.symbol}</p>
                  <p className="text-gray-400 text-sm">{asset.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{asset.amount}</p>
                <p className="text-gray-400 text-sm">{asset.value}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${asset.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {asset.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AssetsTab = () => (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Virtual Cards</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative">
            <div className="w-full h-56 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-6 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 w-12 h-8 bg-white/20 rounded"></div>
              <div className="absolute bottom-4 left-6 right-6">
                <p className="text-sm opacity-80">Celora Card</p>
                <p className="text-2xl font-mono tracking-wider mb-2">**** **** **** 8432</p>
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs opacity-60">CARDHOLDER</p>
                    <p className="text-sm">CELORA USER</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-60">EXPIRES</p>
                    <p className="text-sm">12/27</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass p-4 rounded-xl">
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className="text-2xl font-bold text-white">$2,450.67</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-gray-400 text-sm">Monthly Spending</p>
              <p className="text-xl font-bold text-emerald-400">$834.29</p>
            </div>
            <button className="w-full glass p-4 rounded-xl hover:bg-white/20 transition-colors text-white font-semibold">
              Manage Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const EarnTab = () => (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Earning Opportunities</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-dark p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Staking Rewards</h4>
              <span className="text-emerald-400 font-bold">12.5% APY</span>
            </div>
            <p className="text-gray-400 mb-4">Stake your SOL and earn rewards automatically</p>
            <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 rounded-xl text-white font-semibold">
              Start Staking
            </button>
          </div>
          <div className="glass-dark p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Liquidity Pool</h4>
              <span className="text-cyan-400 font-bold">8.2% APY</span>
            </div>
            <p className="text-gray-400 mb-4">Provide liquidity and earn trading fees</p>
            <button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 p-3 rounded-xl text-white font-semibold">
              Add Liquidity
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const SendTab = () => (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Quick Send</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
            <input
              type="text"
              placeholder="Enter wallet address or ENS name"
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Amount</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 pr-20 text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <select className="absolute right-3 top-3 bg-transparent text-emerald-400 font-semibold">
                <option>SOL</option>
                <option>ETH</option>
                <option>USDC</option>
              </select>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 p-4 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity">
            Send Transaction
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'wallet':
        return <WalletTab />;
      case 'assets':
        return <AssetsTab />;
      case 'earn':
        return <EarnTab />;
      case 'send':
        return <SendTab />;
      default:
        return <WalletTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/20 via-gray-900 to-cyan-900/20"></div>
      
      {/* Header */}
      <header className="relative z-10 glass-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Celora
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm font-semibold text-white">
                CU
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 glass rounded-2xl p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {renderTabContent()}
        </div>

        {/* Recent Transactions */}
        <div className="mt-8 glass rounded-3xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <div key={index} className="flex items-center justify-between p-4 hover:bg-white/10 rounded-xl transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'receive' ? 'bg-green-500/20 text-green-400' :
                    tx.type === 'send' ? 'bg-red-500/20 text-red-400' : 
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {tx.type === 'receive' ? '↓' : tx.type === 'send' ? '↑' : '💳'}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{tx.amount}</p>
                    <p className="text-gray-400 text-sm">{tx.from || tx.to}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{tx.time}</p>
                  <p className="text-green-400 text-sm">✓ {tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}