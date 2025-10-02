'use client';

import React, { useEffect } from 'react';

/**
 * Component to handle WebSocket connection issues
 * This will automatically attempt to reconnect when WebSocket issues occur
 */
export default function WebSocketErrorHandler() {
  useEffect(() => {
    let reconnectAttempt = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds
    
    // Listen for WebSocket errors
    const handleWebSocketError = (event: Event) => {
      if (event instanceof CloseEvent) {
        console.warn('WebSocket connection closed unexpectedly:', event);
        
        if (reconnectAttempt < maxReconnectAttempts) {
          reconnectAttempt++;
          console.log(`Attempting to refresh page to restore WebSocket connection (attempt ${reconnectAttempt}/${maxReconnectAttempts})`);
          
          // Wait a bit before attempting reconnection
          setTimeout(() => {
            // Try to reconnect by refreshing the page
            window.location.reload();
          }, reconnectDelay);
        }
      }
    };
    
    // Check if the connection to Supabase is broken
    const checkSupabaseConnection = () => {
      // Check the connection by verifying WebSocket readyState if possible
      const wsElements = document.querySelectorAll('script[src*="supabase"]');
      if (wsElements.length === 0) {
        console.log('No Supabase scripts found, assuming connection is OK');
        return;
      }
      
      // Look for connection errors in the console
      const originalError = console.error;
      let hasConnectionError = false;
      
      console.error = (...args: any[]) => {
        const errorString = args.join(' ');
        if (errorString.includes('WebSocket') && 
            (errorString.includes('closed') || errorString.includes('failed'))) {
          hasConnectionError = true;
        }
        originalError.apply(console, args);
      };
      
      // Restore original error handler
      setTimeout(() => {
        console.error = originalError;
        
        if (hasConnectionError && reconnectAttempt < maxReconnectAttempts) {
          reconnectAttempt++;
          console.log(`WebSocket connection issues detected. Attempting refresh (${reconnectAttempt}/${maxReconnectAttempts})`);
          window.location.reload();
        }
      }, 1000);
    };
    
    // Check the connection periodically
    const intervalId = setInterval(checkSupabaseConnection, 30000); // Every 30 seconds
    
    // Add global event listeners for WebSocket errors
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('WebSocket')) {
        handleWebSocketError(event);
      }
    });
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  return null; // This component doesn't render anything
}
