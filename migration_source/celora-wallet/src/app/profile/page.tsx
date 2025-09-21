'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/context/SupabaseContext';
import { supabase } from '@/lib/supabase';
import WalletConnect from '@/components/wallet/WalletConnect';

export default function ProfilePage() {
  const { user } = useSupabase();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        // Hent profildata fra supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data || { id: user.id, username: '', full_name: '' });
      } catch (error) {
        console.error('Feil ved lasting av profil:', error);
        // Opprett en ny profil hvis det ikke finnes
        setProfile({ id: user.id, username: '', full_name: '' });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Min profil</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-card rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-4">Profilinformasjon</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">
                      E-post
                    </label>
                    <div className="bg-dark-surface px-4 py-2 rounded border border-dark-border">
                      {user?.email}
                    </div>
                  </div>
                  
                  {/* Her kan du legge til flere profilfelt senere */}
                </div>
              </div>
              
              <div className="border-t border-dark-border mt-6 pt-6">
                <h2 className="text-xl font-semibold mb-4">Kontoinnstillinger</h2>
                
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition-colors">
                  Endre passord
                </button>
              </div>
            </div>
            
            <WalletConnect />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
