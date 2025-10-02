'use client';

/**
 * Admin MFA Monitoring Page
 * 
 * This page displays MFA statistics and monitoring tools for administrators.
 */

import React from 'react';
import MfaStatsDashboard from '@/components/MfaStatsDashboard';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseSingleton';

export default function AdminMfaMonitoringPage() {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  // Check if the current user has admin privileges
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setIsAdmin(false);
          router.push('/signin');
          return;
        }
        
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
          
        if (profileError || !profile) {
          setIsAdmin(false);
        } else {
          setIsAdmin(profile.is_admin === true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [supabase, router]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-cyan-400 mt-4">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  // Show unauthorized message for non-admin users
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md p-8 bg-gray-800/50 rounded-lg border border-red-500/30">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 text-red-500 mx-auto mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-4">
            You do not have permission to access the admin MFA monitoring dashboard.
            Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Show the admin dashboard for admin users
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Admin MFA Monitoring</h1>
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
        >
          Back to Admin
        </button>
      </div>
      
      <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
        <MfaStatsDashboard />
      </div>
      
      {/* Additional admin actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">MFA POLICY SETTINGS</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Require MFA for all users</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Require MFA for admin users</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Lock account after failed attempts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
            
            <button
              className="mt-4 w-full px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-md text-white font-mono"
              onClick={() => alert('Policy settings would be saved here')}
            >
              SAVE POLICY SETTINGS
            </button>
          </div>
        </div>
        
        <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">SECURITY ALERTS</h3>
          <div className="space-y-3">
            <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-md p-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-500 font-medium">Multiple Failed Verifications</span>
                </div>
                <span className="text-xs text-gray-400">2h ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1 ml-7">
                3 failed verification attempts from same IP address.
              </p>
            </div>
            
            <div className="bg-red-900/20 border border-red-900/50 rounded-md p-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-500 font-medium">Unusual Recovery Code Usage</span>
                </div>
                <span className="text-xs text-gray-400">1d ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1 ml-7">
                Unusual pattern of recovery code usage detected.
              </p>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-md p-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-blue-500 font-medium">Admin MFA Disabled</span>
                </div>
                <span className="text-xs text-gray-400">3d ago</span>
              </div>
              <p className="text-sm text-gray-300 mt-1 ml-7">
                Admin user disabled their MFA. Security review recommended.
              </p>
            </div>
            
            <button
              className="mt-2 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-sm"
              onClick={() => alert('This would show all alerts')}
            >
              View All Alerts
            </button>
          </div>
        </div>
        
        <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">USER MFA MANAGEMENT</h3>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by user email..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2 text-white placeholder-gray-500"
            />
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-md">
              <div>
                <div className="font-medium text-white">admin@example.com</div>
                <div className="text-xs text-green-400">MFA Enabled</div>
              </div>
              <button className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded">
                Reset MFA
              </button>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-md">
              <div>
                <div className="font-medium text-white">user@example.com</div>
                <div className="text-xs text-red-400">MFA Disabled</div>
              </div>
              <button className="text-xs px-2 py-1 bg-cyan-600/50 hover:bg-cyan-600 text-white rounded">
                Enforce MFA
              </button>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-md">
              <div>
                <div className="font-medium text-white">finance@example.com</div>
                <div className="text-xs text-green-400">MFA Enabled</div>
              </div>
              <button className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded">
                Reset MFA
              </button>
            </div>
          </div>
          <button
            className="mt-4 w-full px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-md text-white font-mono"
            onClick={() => alert('This would show detailed user management')}
          >
            MANAGE ALL USERS
          </button>
        </div>
      </div>
    </div>
  );
}
