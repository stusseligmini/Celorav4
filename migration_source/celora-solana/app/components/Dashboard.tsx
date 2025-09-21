'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletButton } from './PhantomWalletButton';
import Link from 'next/link';

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [isBlockchainSynced, setIsBlockchainSynced] = useState(true);
  const [isWalletsConnected, setIsWalletsConnected] = useState(false);
  
  useEffect(() => {
    setIsWalletsConnected(connected);
  }, [connected]);

  return (
    <div className="min-h-screen bg-[#041c24]">
      {/* Header Navigation */}
      <header className="border-b border-white/10 bg-[#062830] backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-primary text-2xl font-bold">Celora</h1>
              <p className="text-primary/70 text-xs">Advanced Digital Wallet</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/wallet" className="px-6 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-all">
              Wallet
            </Link>
            <Link href="/assets" className="px-6 py-2 text-primary/70 hover:text-primary transition-all">
              Assets & Card
            </Link>
            <Link href="/earn" className="px-6 py-2 text-primary/70 hover:text-primary transition-all">
              Earn & Borrow
            </Link>
            <Link href="/api" className="px-6 py-2 text-primary/70 hover:text-primary transition-all">
              Send & API
            </Link>
          </nav>
          
          <div className="flex items-center gap-2">
            <div className="bg-[#062830] rounded-full px-4 py-1 flex items-center gap-2 border border-primary/20">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-primary text-sm">Mainnet</span>
            </div>
            {connected ? (
              <div className="bg-green-500 rounded-full px-4 py-1 flex items-center gap-2 text-white">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                <span>Quantum Connected</span>
              </div>
            ) : (
              <PhantomWalletButton className="w-auto" />
            )}
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-16 text-center">
        <h2 className="text-6xl font-bold text-primary mb-4">Your Gateway to Web3</h2>
        <p className="text-primary/70 max-w-3xl mx-auto">
          Experience the future of finance with secure, fast, and intuitive cryptocurrency
          management. Trade, earn, borrow, and send with zero fees within the Celora
          ecosystem.
        </p>
        
        <div className="max-w-2xl mx-auto mt-8 bg-[#062830]/50 rounded-xl border border-primary/10 p-4 flex justify-around">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            <span className="text-primary">Backend: Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            <span className="text-primary">Blockchain: Synced</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            <span className="text-primary">Wallets: Connected</span>
          </div>
        </div>
      </section>
      
      {/* Dashboard Section */}
      <section className="container mx-auto px-4 py-8 grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3 bg-[#062830]/70 rounded-xl border border-primary/10 p-6">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Portfolio Balance</h3>
              <p className="text-primary/70">AI-optimized multi-chain assets</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-primary/10 rounded-full text-primary hover:bg-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"></path>
                </svg>
              </button>
              <button className="p-2 bg-primary/10 rounded-full text-primary hover:bg-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </button>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold text-primary mb-4">$47,523.89</h2>
          <div className="flex items-center gap-2 mb-8">
            <span className="text-green-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6-6 6 6"></path>
                <path d="M6 12h12"></path>
                <path d="M6 15h12"></path>
                <path d="M6 18h12"></path>
              </svg>
              +12.5% (24h)
            </span>
            <span className="text-primary/70">Rewards Earned: $89.45</span>
          </div>
          
          <div className="bg-[#041c24] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <span className="text-primary">Wallet Status</span>
            </div>
            <span className="text-primary/70">{connected ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-[#062830]/70 rounded-xl border border-primary/10 p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-primary/70">Total Assets</span>
                <span className="text-primary font-bold">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary/70">Active Positions</span>
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary/70">24h Volume</span>
                <span className="text-primary font-bold">$1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary/70">Rewards Earned</span>
                <span className="text-primary font-bold">$89.45</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#062830]/70 rounded-xl border border-primary/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Live Markets</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">
                    B
                  </div>
                  <div>
                    <div className="text-white">Bitcoin</div>
                    <div className="text-primary/70 text-sm">BTC/USD</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white">$67,234</div>
                  <div className="text-green-400 text-sm">+3.2%</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div>
                    <div className="text-white">Solana</div>
                    <div className="text-primary/70 text-sm">SOL/USD</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white">$156.78</div>
                  <div className="text-green-400 text-sm">+5.7%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}