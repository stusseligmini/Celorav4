import type { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MfaRecoveryAdminDashboard from '@/components/MfaRecoveryAdminDashboard';

export const metadata: Metadata = {
  title: 'MFA Recovery Admin - Celora',
  description: 'Manage MFA recovery requests',
};

export default async function AdminMfaRecoveryPage() {
  // Initialize Supabase client
  const supabase = createServerComponentClient({ cookies });
  
  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check if user is admin
  const isAdmin = session?.user?.app_metadata?.admin === true;
  
  // If not authenticated or not admin, redirect to 403 page
  if (!session || !isAdmin) {
    redirect('/403');
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="bg-gray-900/60 rounded-lg shadow-xl border border-gray-800 p-6">
        <MfaRecoveryAdminDashboard />
      </div>
    </div>
  );
}
