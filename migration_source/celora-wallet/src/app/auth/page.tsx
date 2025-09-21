'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import { useSupabase } from '@/context/SupabaseContext';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useSupabase();
  
  // Omdiriger til dashboardet hvis brukeren er pålogget
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Vis lasteside mens vi sjekker autentiseringsstatus
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Velkommen til Celora</h1>
        <AuthForm />
      </div>
    </div>
  );
}
