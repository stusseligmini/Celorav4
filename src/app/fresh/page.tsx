'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FreshPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Clear all caches aggressively
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => caches.delete(cacheName));
      });
    }
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to signin after clearing everything
    setTimeout(() => {
      window.location.href = '/signin?v=' + Date.now();
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <h1 className="text-2xl font-mono text-cyan-400 mb-2">CLEARING CACHE...</h1>
        <p className="text-gray-400">Ensuring fresh content for all devices</p>
      </div>
    </div>
  );
}