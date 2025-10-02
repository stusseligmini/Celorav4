'use client';

import React from 'react';
import { useSupabase } from '../providers/SupabaseProvider';

export function WalletOverview() {
  const { user, loading } = useSupabase();

  if (loading) {
    return (
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-neon-sm border border-cyan-primary/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800/50 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-800/50 rounded-lg"></div>
            <div className="h-20 bg-gray-800/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-neon-sm border border-cyan-primary/20 p-6">
        <h2 className="text-lg font-medium text-cyan-primary neon-text mb-4">Account Overview</h2>
        <p className="text-gray-400 mb-4">Please sign in to view your account details.</p>
        <button className="w-full bg-cyan-primary/20 border border-cyan-primary/50 text-cyan-primary py-2 px-4 rounded-lg hover:bg-cyan-primary/30 hover:shadow-neon-sm transition-all duration-300">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Account Overview</h2>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-cyan-primary/10 rounded-lg p-4 border border-cyan-primary/30 hover:shadow-neon-sm transition-all duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-cyan-primary/30 border border-cyan-primary/50 rounded-full flex items-center justify-center">
                <span className="text-cyan-primary text-sm font-medium neon-text">$</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Balance</p>
              <p className="text-lg font-bold text-cyan-primary neon-text">$0.00 USD</p>
              <p className="text-xs text-gray-500">Across all virtual cards</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-glow/10 rounded-lg p-4 border border-purple-glow/30 hover:shadow-neon-purple-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-glow/30 border border-purple-glow/50 rounded-full flex items-center justify-center">
                  <span className="text-purple-glow text-sm font-medium">👤</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Account</p>
                <p className="text-sm font-bold text-white">{user.email}</p>
              </div>
            </div>
            <div className="text-cyan-primary text-sm font-medium neon-text">Active</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="bg-cyan-primary/20 border border-cyan-primary/50 text-cyan-primary py-2 px-4 rounded-lg hover:bg-cyan-primary/30 hover:shadow-neon-sm transition-all duration-300">
          Add Funds
        </button>
        <button className="bg-purple-glow/20 border border-purple-glow/50 text-purple-glow py-2 px-4 rounded-lg hover:bg-purple-glow/30 hover:shadow-neon-purple-sm transition-all duration-300">
          Transfer
        </button>
      </div>
    </div>
  );
}
