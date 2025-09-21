'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  Eye,
  EyeOff,
  TrendingUp
} from 'lucide-react';

export default function Home() {
  const { connected } = useWallet();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);



  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 30%, #115e59 70%, #042f2e 100%)' }}>
      {/* Main Content */}
      <div className="relative px-6 pt-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Header Text */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-300 via-teal-300 to-cyan-400 bg-clip-text text-transparent mb-6">
              Your Gateway to Web3
            </h1>
            <p className="text-lg text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Experience the future of finance with secure, fast, and intuitive cryptocurrency 
              management. Trade, earn, borrow, and send with zero fees within the Celora ecosystem.
            </p>
          </div>

          {/* Status Indicators - exactly like your image */}
          <div className="flex justify-center mb-8">
            <div className="bg-teal-800/40 backdrop-blur-sm rounded-2xl border border-teal-600/50 px-8 py-4">
              <div className="flex items-center space-x-8 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">Backend: Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">Blockchain: Synced</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">Wallets: Connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout - Two Column like your image */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Portfolio Balance (spans 2 columns) */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-teal-600/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-200 mb-1">Portfolio Balance</h2>
                    <p className="text-slate-400">AI-optimized multi-chain assets</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                    </div>
                    <button 
                      onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                      className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400"
                    >
                      {isBalanceVisible ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="text-5xl font-bold text-slate-100 mb-3">
                    {isBalanceVisible ? `$47,523.89` : '••••••••'}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-green-400">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      <span className="text-lg font-semibold">+12.5% (24h)</span>
                      <span className="text-slate-400 ml-6">Rewards Earned: $89.45</span>
                    </div>
                  </div>
                </div>
                
                {/* Wallet Status Button - exactly like your image */}
                <div>
                  <button className="w-full bg-teal-600/20 border border-teal-500 text-teal-300 py-4 rounded-xl hover:bg-teal-600/30 transition-colors text-lg font-medium">
                    Wallet Status: Not Connected
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Quick Stats */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-teal-600/50 p-6">
                <h3 className="text-xl font-bold text-slate-200 mb-6">Quick Stats</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Assets</span>
                    <span className="text-slate-200 font-bold text-lg">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Active Positions</span>
                    <span className="text-slate-200 font-bold text-lg">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">24h Volume</span>
                    <span className="text-slate-200 font-bold text-lg">$1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rewards Earned</span>
                    <span className="text-green-400 font-bold text-lg">$89.45</span>
                  </div>
                </div>
              </div>
              
              {/* Live Markets */}
              <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-teal-600/50 p-6">
                <h4 className="text-xl font-bold text-slate-200 mb-6">Live Markets</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">₿</span>
                      </div>
                      <div>
                        <div className="text-slate-200 font-bold">Bitcoin</div>
                        <div className="text-xs text-slate-400">BTC/USD</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-200 font-bold text-lg">$67,234</div>
                      <div className="text-green-400 text-sm font-medium">+3.2%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">◎</span>
                      </div>
                      <div>
                        <div className="text-slate-200 font-bold">Solana</div>
                        <div className="text-xs text-slate-400">SOL/USD</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-200 font-bold text-lg">$156.78</div>
                      <div className="text-green-400 text-sm font-medium">+5.7%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
