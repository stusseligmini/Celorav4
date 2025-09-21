'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, prompt user to refresh
              if (confirm('New version available! Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log('Background sync completed');
        }
        
        if (event.data.type === 'PERIODIC_SYNC_COMPLETE') {
          console.log('Periodic sync completed');
        }
      });

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Show install prompt for iOS Safari
  const showIOSInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari && !isInstalled) {
      return (
        <div className="fixed bottom-4 left-4 right-4 bg-[#062830]/90 backdrop-blur-md border border-primary/20 rounded-xl p-4 z-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📱</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-primary font-semibold text-sm mb-1">Install Celora Wallet</h3>
              <p className="text-primary/70 text-xs mb-2">
                Tap the share button <span className="inline-block">📤</span> then "Add to Home Screen"
              </p>
              <button
                onClick={() => {
                  const element = document.querySelector('[data-ios-install]') as HTMLElement;
                  if (element) element.style.display = 'none';
                }}
                className="text-primary/70 text-xs underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Install Button for supported browsers */}
      {isInstallable && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[#062830]/90 backdrop-blur-md border border-primary/20 rounded-xl p-4 z-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📱</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-primary font-semibold mb-1">Install Celora Wallet</h3>
              <p className="text-primary/70 text-sm mb-3">
                Install the app for a better experience and offline access
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Install
                </button>
                <button
                  onClick={() => setIsInstallable(false)}
                  className="text-primary/70 px-4 py-2 rounded-lg text-sm"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Instructions */}
      <div data-ios-install>
        {showIOSInstructions()}
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 z-50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-300 text-sm font-medium">
              You're offline. Some features may be limited.
            </span>
          </div>
        </div>
      )}

      {/* Online Indicator (brief) */}
      {isOnline && (
        <div className="fixed top-4 left-4 right-4 bg-green-500/20 border border-green-500/50 rounded-xl p-3 z-50 animate-fade-in-out">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-300 text-sm font-medium">
              Back online
            </span>
          </div>
        </div>
      )}
    </>
  );
}