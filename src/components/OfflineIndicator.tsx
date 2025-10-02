'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import indexedDBManager from '@/lib/indexedDBManager';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

interface OfflineStats {
  pendingTransactions: number;
  pendingAnalytics: number;
  cacheEntries: number;
  preferences: number;
}

/**
 * Offline Indicator Component
 * 
 * Shows network status and offline data statistics
 * Provides visual feedback about app functionality when offline
 */
export default function OfflineIndicator({ 
  className = '',
  showDetails = false 
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineStats, setOfflineStats] = useState<OfflineStats>({
    pendingTransactions: 0,
    pendingAnalytics: 0,
    cacheEntries: 0,
    preferences: 0
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Monitor network status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      
      // Update stats when going offline or online
      updateStats();
      
      // If we just came back online, trigger sync
      if (navigator.onLine) {
        triggerBackgroundSync();
      }
    };

    // Initial status
    setIsOnline(navigator.onLine);
    
    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Update offline statistics
  const updateStats = async () => {
    try {
      setIsUpdating(true);
      const stats = await indexedDBManager.getStats();
      setOfflineStats(stats);
    } catch (error) {
      console.error('Failed to get offline stats:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger background sync when coming back online
  const triggerBackgroundSync = () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        return (registration as any)?.sync?.register('background-sync-transactions');
      }).then(() => {
        return navigator.serviceWorker.ready;
      }).then(registration => {
        return (registration as any)?.sync?.register('background-sync-analytics');
      }).catch(error => {
        console.log('Background sync registration failed:', error);
      });
    }
  };

  // Update stats periodically
  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETED') {
          updateStats();
        }
      });
    }
  }, []);

  const getStatusColor = () => {
    if (isOnline) {
      return offlineStats.pendingTransactions > 0 || offlineStats.pendingAnalytics > 0
        ? 'text-yellow-400' // Online but with pending data
        : 'text-green-400';  // Fully synced
    }
    return 'text-red-400'; // Offline
  };

  const getStatusText = () => {
    if (isOnline) {
      const totalPending = offlineStats.pendingTransactions + offlineStats.pendingAnalytics;
      if (totalPending > 0) {
        return `Syncing (${totalPending} pending)`;
      }
      return 'Online';
    }
    return 'Offline';
  };

  const getTooltipContent = () => {
    const items = [];
    
    if (!isOnline) {
      items.push('You are currently offline');
      items.push('Some features may be limited');
    } else {
      items.push('Connected to internet');
    }
    
    if (offlineStats.pendingTransactions > 0) {
      items.push(`${offlineStats.pendingTransactions} pending transactions`);
    }
    
    if (offlineStats.pendingAnalytics > 0) {
      items.push(`${offlineStats.pendingAnalytics} pending analytics events`);
    }
    
    if (offlineStats.cacheEntries > 0) {
      items.push(`${offlineStats.cacheEntries} cached items`);
    }
    
    return items;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main indicator */}
      <motion.div
        className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700/50 cursor-pointer ${getStatusColor()}`}
        onClick={() => setShowTooltip(!showTooltip)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Status dot */}
        <motion.div
          className={`w-2 h-2 rounded-full ${
            isOnline 
              ? (offlineStats.pendingTransactions > 0 || offlineStats.pendingAnalytics > 0
                  ? 'bg-yellow-400'
                  : 'bg-green-400')
              : 'bg-red-400'
          }`}
          animate={{
            scale: isOnline ? [1, 1.2, 1] : 1,
            opacity: isOnline ? [1, 0.7, 1] : [1, 0.5, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Status text */}
        <span className="text-xs font-mono">
          {getStatusText()}
        </span>
        
        {/* Update indicator */}
        {isUpdating && (
          <motion.div
            className="w-3 h-3 border border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        {/* Details toggle */}
        {showDetails && (
          <motion.div
            className="w-3 h-3 border-l border-b border-current transform"
            animate={{ rotate: showTooltip ? 45 : 225 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>

      {/* Tooltip/Details panel */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-64"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">
                Network Status
              </h4>
              <button
                onClick={() => setShowTooltip(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Status details */}
            <div className="space-y-2 text-xs">
              {getTooltipContent().map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-1 h-1 rounded-full ${
                    item.includes('offline') || item.includes('limited') 
                      ? 'bg-red-400'
                      : item.includes('pending')
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                  }`} />
                  <span className="text-gray-300">{item}</span>
                </div>
              ))}
            </div>
            
            {/* Actions */}
            {!isOnline && (offlineStats.pendingTransactions > 0 || offlineStats.pendingAnalytics > 0) && (
              <div className="mt-3 pt-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    triggerBackgroundSync();
                    setShowTooltip(false);
                  }}
                  className="w-full px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded-md transition-colors"
                >
                  Retry Sync When Online
                </button>
              </div>
            )}
            
            {/* Offline capabilities */}
            {!isOnline && (
              <div className="mt-3 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Available offline:</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• View wallet balance</li>
                  <li>• Browse transaction history</li>
                  <li>• Queue new transactions</li>
                  <li>• Access settings</li>
                </ul>
              </div>
            )}
            
            {/* Stats for debugging */}
            {showDetails && (
              <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
                <div>Cache: {offlineStats.cacheEntries} items</div>
                <div>Preferences: {offlineStats.preferences} items</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
