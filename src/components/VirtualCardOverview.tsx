'use client';

import React from 'react';

export function VirtualCardOverview() {
  return (
    <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg p-6 border border-cyan-primary/20 hover:shadow-neon-sm transition-all duration-300">
      <h2 className="text-xl font-semibold text-cyan-primary neon-text mb-4">Virtual Cards</h2>
      <div className="text-center py-8">
        <p className="text-gray-300">Virtual cards overview - under construction</p>
        <p className="text-sm text-gray-500 mt-2">Connect with Supabase for real-time data</p>
        <button className="mt-4 bg-cyan-primary/20 border border-cyan-primary/50 text-cyan-primary py-2 px-6 rounded-lg hover:bg-cyan-primary/30 hover:shadow-neon-sm transition-all duration-300">
          Set Up Cards
        </button>
      </div>
    </div>
  );
}