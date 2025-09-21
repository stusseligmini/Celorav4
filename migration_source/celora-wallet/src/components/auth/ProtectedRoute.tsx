'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/context/SupabaseContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useSupabase();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Omdiriger til login-siden hvis brukeren ikke er pålogget
        router.push('/auth');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, loading, router]);

  // Vis lasteside mens vi sjekker autentiseringsstatus
  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Hvis brukeren er autentisert, vis innholdet
  return <>{children}</>;
}
