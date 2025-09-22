'use client';

import { useSupabase } from '../providers/SupabaseProvider';

export function DashboardHeader() {
  const { user, loading } = useSupabase();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Celora</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : user ? (
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">
                  {user.email}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">Not signed in</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}