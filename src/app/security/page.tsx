'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/lib/auth';
import MFASettings from '@/components/MFASettings';

export default function SecuritySettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          router.push('/signin');
          return;
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error('Error checking auth status:', err);
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to signin in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-mono font-bold text-cyan-400 mb-8">SECURITY SETTINGS</h1>
      
      <div className="mb-8">
        <MFASettings />
      </div>
      
      <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-mono font-bold text-cyan-400 mb-4">PASSWORD SECURITY</h2>
        <p className="text-gray-300 mb-4">
          It's recommended to use a strong, unique password for your Celora account.
        </p>
        <button 
          onClick={() => router.push('/update-password')}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-md font-mono"
        >
          CHANGE PASSWORD
        </button>
      </div>
      
      <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
        <h2 className="text-xl font-mono font-bold text-cyan-400 mb-4">RECENT SECURITY ACTIVITY</h2>
        <p className="text-gray-300">
          Monitor your account's security activity for any suspicious logins or changes.
        </p>
        <div className="mt-4 border-t border-gray-700/50 pt-4">
          <p className="text-sm text-gray-400">
            This feature is coming soon. You will be able to view login history and security-related activities.
          </p>
        </div>
      </div>
    </div>
  );
}