'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MfaDeviceRouter from '@/components/MfaDeviceRouter';

/**
 * MFA Router Page
 * 
 * Smart router som omdirigerer brukere til riktig versjon av MFA-sidene
 * basert på enhetstype, brukerpreferanser og tilstand
 */
export default function MfaRouterPage() {
  const router = useRouter();

  return (
    <MfaDeviceRouter
      mobileRoute="/mfa-mobile"
      desktopRoute="/mfa"
    >
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-lg">Optimaliserer MFA-opplevelsen for enheten din...</p>
          <p className="text-sm text-gray-400 mt-2">Du blir snart omdirigert til riktig side.</p>
        </div>
      </div>
    </MfaDeviceRouter>
  );
}
