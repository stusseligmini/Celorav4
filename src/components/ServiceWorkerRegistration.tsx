'use client';

import { useEffect, useState } from 'react';
import { createLogger } from '../lib/logger';

// Create component-specific logger
const logger = createLogger('ServiceWorkerRegistration');

export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only register in secure contexts (HTTPS or localhost)
    const isSecureContext = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost';
    
    if ('serviceWorker' in navigator && (isSecureContext || process.env.NODE_ENV === 'development')) {
      registerServiceWorker();
    } else {
      logger.warn('Service Worker not supported or not in secure context');
    }
    
    // Listen for controlling service worker changes
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      logger.info('Service Worker controller changed - page will reload');
      window.location.reload();
    });
    
    // Listen for custom messages from service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      logger.debug('Received message from Service Worker', {}, event.data);
      
      if (event.data.type === 'CACHE_UPDATED') {
        setUpdateAvailable(true);
      } else if (event.data.type === 'OFFLINE_READY') {
        setOfflineReady(true);
        // Auto-hide the offline ready notification after 5 seconds
        setTimeout(() => setOfflineReady(false), 5000);
      }
    });
    
    return () => {
      // Clean up event listeners if needed
    };
  }, []);
  
  const registerServiceWorker = async () => {
    try {
      logger.info('Registering service worker');
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        // Update service worker when page loads
        updateViaCache: 'none'
      });
      
      setRegistration(reg);
      logger.info('Service Worker registered successfully', {}, { scope: reg.scope });
      
      // Check if there's an update available
      if (reg.waiting) {
        logger.info('New service worker waiting');
        setUpdateAvailable(true);
      }
      
      // Handle updates to the service worker
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        
        if (!newWorker) return;
        
        logger.info('New service worker installing');
        
        newWorker.addEventListener('statechange', () => {
          logger.info(`Service worker state changed: ${newWorker.state}`);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.info('New service worker installed and waiting');
            setUpdateAvailable(true);
          }
        });
      });
      
    } catch (error) {
      logger.error('Service Worker registration failed', {}, { error });
    }
  };
  
  const updateServiceWorker = () => {
    if (!registration) return;
    
    logger.info('Updating service worker');
    
    if (registration.waiting) {
      // Send a message to the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    } else {
      // Force an update check
      registration.update().catch(error => {
        logger.error('Service worker update failed', {}, { error });
      });
    }
  };
  
  if (!updateAvailable && !offlineReady) {
    return null; // Don't render anything if no notifications
  }
  
  return (
    <div className="fixed bottom-4 left-4 z-40 animate-fade-in">
      {updateAvailable && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>Update available!</span>
            </div>
            <button 
              onClick={updateServiceWorker}
              className="ml-4 px-2 py-1 bg-white text-blue-600 rounded hover:bg-blue-100 text-sm font-medium"
            >
              Update now
            </button>
          </div>
        </div>
      )}
      
      {offlineReady && (
        <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>App ready for offline use!</span>
          </div>
        </div>
      )}
    </div>
  );
}