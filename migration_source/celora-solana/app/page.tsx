'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import CeloraDashboard from './components/CeloraDashboard';

export default function Home() {
  const { connected } = useWallet();

  if (connected) {
    return <CeloraDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/20 via-gray-900 to-cyan-900/20"></div>
      
      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold text-white">C</span>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Celora
          </h1>
          <p className="text-xl text-gray-400 max-w-md mx-auto">
            The future of Web3 wallets and DeFi management
          </p>
        </div>
        
        <div className="glass rounded-2xl p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your Solana wallet to access your dashboard
          </p>
          <WalletMultiButton className="w-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          <div className="glass p-6 rounded-2xl text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure</h3>
            <p className="text-gray-400 text-sm">Your keys, your crypto. All transactions are encrypted locally</p>
          </div>
          
          <div className="glass p-6 rounded-2xl text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Fast</h3>
            <p className="text-gray-400 text-sm">Lightning-fast transactions on Solana and Ethereum networks</p>
          </div>
          
          <div className="glass p-6 rounded-2xl text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Cards</h3>
            <p className="text-gray-400 text-sm">Virtual cards for seamless crypto-to-fiat spending</p>
          </div>
        </div>
      </div>
    </div>
  );
}