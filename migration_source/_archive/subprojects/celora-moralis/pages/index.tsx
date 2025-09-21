import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Inter } from 'next/font/google';
import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });

  return (
    <div className={`${inter.className} min-h-screen bg-gray-900 text-white`}>
      {/* Neural network background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="neural-bg">
          {/* Quantum particles would be generated here */}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gray-900/80 backdrop-blur-sm border-b border-teal-500/20 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-400">
            🌊 Celora Wallet
          </h1>
          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="bg-gray-800/50 rounded-lg px-3 py-1 text-sm border border-teal-500/20">
                <span className="text-teal-400">●</span> Connected
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </header>

      {!isConnected ? (
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-teal-400 mb-4">
              Welcome to Celora
            </h2>
            <p className="text-gray-400 mb-8">
              Connect your wallet to access the modern crypto trading platform
            </p>
            <ConnectButton />
          </div>
        </div>
      ) : (
        <>
          {/* Navigation */}
          <nav className="relative z-10 bg-gray-900/80 backdrop-blur-sm border-b border-teal-500/20">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                    activeTab === 'dashboard'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
                  }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('send')}
                  className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                    activeTab === 'send'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
                  }`}
                >
                  ⚡ Send
                </button>
                <button
                  onClick={() => setActiveTab('receive')}
                  className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                    activeTab === 'receive'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
                  }`}
                >
                  💎 Receive
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                    activeTab === 'settings'
                      ? 'text-teal-400 border-teal-500'
                      : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
                  }`}
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="relative z-10 p-4 max-w-6xl mx-auto w-full">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6 hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-teal-400">Wallet Balance</h3>
                      <span className="text-2xl">💰</span>
                    </div>
                    <div className="text-3xl font-bold text-teal-400">
                      {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                      Connected via {address?.slice(0, 6)}...{address?.slice(-4)}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6 hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-teal-400">Portfolio Value</h3>
                      <span className="text-2xl">📈</span>
                    </div>
                    <div className="text-3xl font-bold text-green-400">$0.00</div>
                    <div className="text-sm text-green-400 mt-2">+0.0% (24h)</div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6 hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-teal-400">NFTs</h3>
                      <span className="text-2xl">🎨</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-400">0</div>
                    <div className="text-sm text-gray-400 mt-2">Digital collectibles</div>
                  </div>
                </div>

                {/* Web3 Features */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-teal-400 mb-6 flex items-center">
                    <span className="mr-3">🔗</span>
                    Web3 Features
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4 text-center hover:bg-teal-500/10 transition-colors cursor-pointer">
                      <div className="text-2xl mb-2">🏦</div>
                      <div className="font-medium">DeFi</div>
                      <div className="text-xs text-gray-400 mt-1">Decentralized Finance</div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4 text-center hover:bg-teal-500/10 transition-colors cursor-pointer">
                      <div className="text-2xl mb-2">🎮</div>
                      <div className="font-medium">Gaming</div>
                      <div className="text-xs text-gray-400 mt-1">Play-to-Earn</div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4 text-center hover:bg-teal-500/10 transition-colors cursor-pointer">
                      <div className="text-2xl mb-2">🌐</div>
                      <div className="font-medium">Metaverse</div>
                      <div className="text-xs text-gray-400 mt-1">Virtual Worlds</div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4 text-center hover:bg-teal-500/10 transition-colors cursor-pointer">
                      <div className="text-2xl mb-2">⚡</div>
                      <div className="font-medium">Lightning</div>
                      <div className="text-xs text-gray-400 mt-1">Fast Transactions</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'send' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-teal-400 mb-6 flex items-center">
                    <span className="mr-3">⚡</span>
                    Send Cryptocurrency
                  </h2>
                  <p className="text-gray-400">Send functionality with Moralis Web3 integration</p>
                  <div className="mt-4 p-4 bg-teal-500/10 rounded-lg border border-teal-500/20">
                    <p className="text-sm text-teal-400">
                      💡 Connected to multi-chain networks via RainbowKit
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'receive' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-teal-400 mb-6 flex items-center">
                    <span className="mr-3">💎</span>
                    Receive Cryptocurrency
                  </h2>
                  <div className="text-center space-y-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-2">Your Wallet Address:</p>
                      <code className="text-sm text-green-400 break-all">
                        {address}
                      </code>
                    </div>
                    <p className="text-gray-400">Share this address to receive payments</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-teal-400 mb-4 flex items-center">
                    <span className="mr-3">⚙️</span>
                    Web3 Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-700">
                      <div>
                        <div className="font-medium">Connected Network</div>
                        <div className="text-sm text-gray-400">Current blockchain network</div>
                      </div>
                      <div className="text-teal-400">Ethereum</div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-700">
                      <div>
                        <div className="font-medium">Wallet Provider</div>
                        <div className="text-sm text-gray-400">Connected via RainbowKit</div>
                      </div>
                      <div className="text-purple-400">Multi-Chain</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      <style jsx global>{`
        .neural-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(circle at 20% 30%, rgba(20, 184, 166, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(45, 212, 191, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 60% 20%, rgba(20, 184, 166, 0.05) 0%, transparent 50%);
        }
      `}</style>
    </div>
  );
}
