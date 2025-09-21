'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSupabase } from '@/context/SupabaseContext';
import { 
  Wallet, 
  Menu, 
  X, 
  Home, 
  Send, 
  Settings,
  Coins,
  History,
  Zap,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { connected, publicKey } = useWallet();
  const { user, signOut } = useSupabase();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Send', href: '/send', icon: Send },
    { name: 'History', href: '/history', icon: History },
    { name: 'Stake', href: '/stake', icon: Zap },
    { name: 'Profile', href: '/profile', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-teal-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Celora
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">Advanced Digital Wallet</span>
            </Link>
          </div>

          {/* Desktop navigation - Beautiful teal theme */}
          <div className="hidden md:flex items-center space-x-1">
            <button className="px-4 py-2 bg-teal-600/20 text-teal-300 rounded-lg border border-teal-600/50 hover:bg-teal-600/30 transition-colors text-sm font-medium">
              Wallet
            </button>
            <button className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">
              Assets & Card
            </button>
            <button className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">
              Earn & Borrow
            </button>
            <button className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">
              Send & API
            </button>
          </div>

          {/* Right side - Network and Connection Status */}
          <div className="flex items-center space-x-4">
            {/* Network indicator */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">Mainnet</span>
              </div>
              
              {/* Wallet connection button with teal theme */}
              <div className="wallet-adapter-button-wrapper">
                <WalletMultiButton className="!bg-green-600 hover:!bg-green-500 !rounded-lg !px-4 !py-2 !text-sm !font-medium !text-white transition-colors" />
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-dark-surface border-t border-dark-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-dark-text-secondary hover:text-dark-text hover:bg-dark-card transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
          {/* Auth buttons in mobile menu */}
          {!user ? (
            <div className="px-2 py-3 border-t border-dark-border">
              <Link
                href="/auth"
                className="flex items-center space-x-3 px-3 py-3 rounded-lg text-dark-text-secondary hover:text-dark-text hover:bg-dark-card transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <LogIn className="w-5 h-5" />
                <span className="text-base font-medium">Logg inn</span>
              </Link>
            </div>
          ) : (
            <div className="px-2 py-3 border-t border-dark-border">
              <button
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center space-x-3 px-3 py-3 rounded-lg text-dark-text-secondary hover:text-red-400 hover:bg-dark-card transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-base font-medium">Logg ut</span>
              </button>
              <div className="px-3 pt-2">
                <div className="text-xs text-dark-text-secondary">Innlogget som:</div>
                <div className="text-sm text-primary-400 truncate">{user?.email}</div>
              </div>
            </div>
          )}
          
          {/* Wallet connection info */}
          {connected && publicKey && (
            <div className="px-5 py-3 border-t border-dark-border">
              <div className="text-xs text-dark-text-secondary">Connected:</div>
              <div className="text-sm font-mono text-primary-400">
                {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
