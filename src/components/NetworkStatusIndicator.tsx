'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';
import { useCurrencyPreferences } from '@/hooks/useCurrencyPreferences';

type NetworkStatusIndicatorProps = {
  className?: string;
  showText?: boolean;
  showIcon?: boolean;
  variant?: 'minimal' | 'badge' | 'full';
};

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className,
  showText = true,
  showIcon = true,
  variant = 'badge',
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { lastExchangeRateUpdate, refreshExchangeRates } = useMultiCurrency();
  const { primaryCurrency } = useCurrencyPreferences();
  
  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh exchange rates when coming back online
      refreshExchangeRates();
      setLastUpdated(new Date());
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial state
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshExchangeRates]);

  // Format last updated time
  const getLastUpdatedText = () => {
    if (!lastExchangeRateUpdate) return 'Never updated';
    
    const date = new Date(lastExchangeRateUpdate);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Determine if rates are stale (more than 15 minutes old)
  const isRatesStale = () => {
    if (!lastExchangeRateUpdate) return true;
    
    const date = new Date(lastExchangeRateUpdate);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    return diffMinutes > 15;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isRatesStale()) return 'Rates outdated';
    return 'Online';
  };

  const handleRefresh = () => {
    if (isOnline) {
      refreshExchangeRates();
      setLastUpdated(new Date());
    }
  };

  // Render based on variant
  if (variant === 'minimal') {
    return (
      <div 
        className={cn(
          "flex items-center",
          isOnline ? "text-green-500" : "text-red-500",
          className
        )}
        title={`Network: ${isOnline ? 'Online' : 'Offline'}, Rates: ${getLastUpdatedText()}`}
      >
        <div className={cn(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-green-500" : "bg-red-500"
        )}/>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        variant === 'badge' ? "px-2 py-1 rounded-full text-xs" : "text-sm",
        isOnline 
          ? isRatesStale() 
            ? "bg-amber-100 text-amber-800" 
            : "bg-green-100 text-green-800" 
          : "bg-red-100 text-red-800",
        className
      )}
      onClick={handleRefresh}
      role="button"
      title={`Click to refresh rates for ${primaryCurrency}`}
    >
      {showIcon && (
        isOnline 
          ? isRatesStale() 
            ? <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" /> 
            : <CheckCircleIcon className="h-4 w-4 text-green-500" />
          : <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      )}
      
      {showText && (
        <div className="flex flex-col">
          <span className="font-medium">{getStatusText()}</span>
          {variant === 'full' && (
            <span className="text-xs opacity-80">
              Rates: {getLastUpdatedText()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;