'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createLogger } from '../lib/logger';

// Create component-specific logger
const logger = createLogger('NetworkStatusHandler');

export default function NetworkStatusHandler({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const lastPingTime = useRef<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Function to check server connectivity by pinging the API
  const checkServerConnectivity = async () => {
    const startTime = performance.now();
    try {
      // Use a lightweight endpoint for ping
      const response = await fetch('/api/status/ping', { 
        method: 'GET',
        headers: { 'x-ping': 'true' },
        // Short timeout to detect poor connections quickly
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        // Determine connection quality based on latency
        if (latency < 300) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('poor');
          logger.warn(`Slow network detected. Latency: ${latency.toFixed(2)}ms`);
        }
        
        lastPingTime.current = Date.now();
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful ping
        return true;
      }
    } catch (error) {
      logger.error('Server connectivity check failed', {}, { error });
      setConnectionQuality('poor');
      return false;
    }
    return false;
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Network connection restored');
      // Check actual connectivity to our server
      checkServerConnectivity();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('Network connection lost');
      setConnectionQuality('unknown');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);
    
    // Start periodic connectivity check
    pingIntervalRef.current = setInterval(async () => {
      if (navigator.onLine) {
        await checkServerConnectivity();
      }
    }, 30000); // Check every 30 seconds

    // Initial connectivity check
    checkServerConnectivity();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // Handle reconnection attempts
  const attemptReconnection = async () => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current += 1;
      logger.info(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      
      const success = await checkServerConnectivity();
      if (success) {
        setIsOnline(true);
        logger.info('Reconnection successful');
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        logger.warn(`Max reconnection attempts reached (${maxReconnectAttempts})`);
      }
    }
  };

  // Offline state UI
  if (!isOnline) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-90 p-4">
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">You're offline</h2>
          <p className="text-slate-300 mb-4 text-center">
            Please check your internet connection and try again.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={attemptReconnection}
              disabled={reconnectAttempts.current >= maxReconnectAttempts}
            >
              {reconnectAttempts.current < maxReconnectAttempts ? 'Try Again' : 'Too Many Attempts'}
            </button>
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
          {reconnectAttempts.current > 0 && (
            <p className="text-slate-400 mt-4 text-sm text-center">
              Reconnection attempt {reconnectAttempts.current} of {maxReconnectAttempts}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Poor connection warning
  if (connectionQuality === 'poor' && isOnline) {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-40 bg-yellow-600 text-white px-4 py-2 rounded shadow-lg max-w-xs">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Poor connection detected. Some features may be slower.</span>
          </div>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}