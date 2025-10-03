'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side redirect for the route-group index.
 * Keeping this as a client component forces Next to emit a client-reference-manifest
 * which avoids the ENOENT during Vercel build.
 */
export default function MfaMobileIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mfa-router');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-sm text-gray-400">Sender deg til riktig MFA-side…</p>
      </div>
    </div>
  );
}
 
