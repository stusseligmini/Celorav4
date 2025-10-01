'use client';

import { useSupabase } from '../providers/SupabaseProvider';

export function DashboardHeader() {
  const { user, loading } = useSupabase();

  return (
    <header className="bg-gray-900/70 backdrop-blur-sm shadow-neon-sm border-b border-cyan-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-cyan-primary neon-text">CELORA</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-cyan-primary/70">Loading...</div>
            ) : user ? (
              <div className="flex items-center space-x-2 text-cyan-primary">
                <div className="w-2 h-2 rounded-full bg-cyan-primary animate-pulse"></div>
                <span className="text-sm font-medium font-mono">
                  {user.email}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-purple-glow">
                <div className="w-2 h-2 rounded-full bg-purple-glow animate-pulse"></div>
                <span className="text-sm font-medium font-mono">Not signed in</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}