'use client';

import React, { useState, useEffect } from 'react';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';
import { Currency } from '@/lib/multiCurrency';
import { useRouter, usePathname } from 'next/navigation';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencySwitcherProps {
  userId?: string;
  variant?: 'dropdown' | 'tabs' | 'buttons';
  size?: 'sm' | 'md' | 'lg';
  showCode?: boolean;
  showSymbol?: boolean;
  showFlag?: boolean;
  showType?: boolean;
  defaultOpen?: boolean;
  onCurrencyChange?: (currencyCode: string) => void;
  className?: string;
  currencies?: string[]; // Custom list of currency codes to display
}

/**
 * Currency Switcher component that allows users to switch between currencies
 */
export default function CurrencySwitcher({
  userId,
  variant = 'dropdown',
  size = 'md',
  showCode = true,
  showSymbol = true,
  showFlag = true,
  showType = false,
  defaultOpen = false,
  onCurrencyChange,
  className,
  currencies: customCurrencies
}: CurrencySwitcherProps) {
  const {
    currencies,
    userPreferences,
    updatePreferences,
    loading,
    error
  } = useMultiCurrency(userId);
  
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [displayCurrencies, setDisplayCurrencies] = useState<Currency[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // Set initial selected currency based on user preferences
  useEffect(() => {
    if (userPreferences) {
      setSelectedCurrency(userPreferences.primaryCurrency);
    }
  }, [userPreferences]);

  // Filter currencies to only show active ones and prioritize display currencies
  useEffect(() => {
    if (!currencies.length) return;
    
    let filtered = currencies.filter(c => c.isActive);
    
    // If custom currencies are provided, filter to only those
    if (customCurrencies?.length) {
      filtered = filtered.filter(c => customCurrencies.includes(c.code));
      // Sort according to the order in customCurrencies
      filtered = filtered.sort((a, b) => {
        const aIndex = customCurrencies.indexOf(a.code);
        const bIndex = customCurrencies.indexOf(b.code);
        return aIndex - bIndex;
      });
    }
    else if (userPreferences?.displayCurrencies?.length) {
      // Sort so that display currencies come first, in the order specified by the user
      filtered = filtered.sort((a, b) => {
        const aIndex = userPreferences.displayCurrencies.indexOf(a.code);
        const bIndex = userPreferences.displayCurrencies.indexOf(b.code);
        
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } else {
      // Default sorting: fiat first, then crypto, alphabetically by code
      filtered = filtered.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'fiat' ? -1 : 1;
        }
        return a.code.localeCompare(b.code);
      });
    }
    
    setDisplayCurrencies(filtered);
  }, [currencies, userPreferences, customCurrencies]);

  // Handle currency selection
  const handleCurrencySelect = async (currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    setIsOpen(false);
    
    // Update user preferences if logged in
    if (userId) {
      await updatePreferences({
        primaryCurrency: currencyCode
      });
    }
    
    // Call external handler if provided
    if (onCurrencyChange) {
      onCurrencyChange(currencyCode);
    }
    
    // Refresh the current page to update currency display
    router.refresh();
  };

  if (loading) {
    return (
      <div className="animate-pulse flex items-center space-x-2">
        <div className="h-4 w-8 bg-gray-200 rounded"></div>
        <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
      </div>
    );
  }

  if (error || !displayCurrencies.length) {
    return (
      <div className="text-sm text-gray-500 flex items-center">
        <Globe size={16} className="mr-1" />
        USD
      </div>
    );
  }

  const currentCurrency = displayCurrencies.find(c => c.code === selectedCurrency) || 
                         displayCurrencies[0];

  if (variant === 'tabs') {
    return (
      <div className={cn("flex overflow-x-auto scrollbar-hide", className)}>
        {displayCurrencies.slice(0, 5).map((currency) => (
          <button
            key={currency.code}
            onClick={() => handleCurrencySelect(currency.code)}
            className={cn(
              "px-3 py-2 text-sm whitespace-nowrap",
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
              selectedCurrency === currency.code 
                ? "border-b-2 border-primary font-medium text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {showSymbol && currency.symbol}{' '}
            {showCode && currency.code}
            {showType && <span className="ml-1 text-xs opacity-50">({currency.type})</span>}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {displayCurrencies.slice(0, 8).map((currency) => (
          <button
            key={currency.code}
            onClick={() => handleCurrencySelect(currency.code)}
            className={cn(
              "px-2 py-1 rounded-md text-sm transition-colors",
              size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-base px-3 py-1.5' : 'text-sm',
              selectedCurrency === currency.code 
                ? "bg-primary text-primary-foreground font-medium" 
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {showSymbol && currency.symbol}{' '}
            {showCode && currency.code}
          </button>
        ))}
      </div>
    );
  }

  // Default: dropdown variant
  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          size === 'sm' ? 'text-xs px-2 py-1' : size === 'lg' ? 'text-base px-4 py-3' : 'text-sm',
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
        )}
      >
        <span className="flex items-center">
          {showSymbol && <span className="mr-1">{currentCurrency.symbol}</span>}
          {showCode && currentCurrency.code}
          {showType && <span className="ml-1 text-xs opacity-50">({currentCurrency.type})</span>}
        </span>
        <ChevronsUpDown size={16} className="ml-2 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute mt-1 w-full rounded-md border border-input bg-popover shadow-md z-10 max-h-60 overflow-auto">
          <div className="p-1">
            {displayCurrencies.map((currency) => (
              <div
                key={currency.code}
                onClick={() => handleCurrencySelect(currency.code)}
                className={cn(
                  "flex items-center justify-between rounded-sm px-2 py-1.5 text-sm cursor-pointer",
                  selectedCurrency === currency.code 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="flex items-center">
                  {showSymbol && <span className="mr-1">{currency.symbol}</span>}
                  {showCode && <span className="mr-1">{currency.code}</span>}
                  <span className="text-xs text-muted-foreground">{currency.name}</span>
                  {showType && <span className="ml-1 text-xs opacity-50">({currency.type})</span>}
                </span>
                {selectedCurrency === currency.code && (
                  <Check size={16} className="text-primary" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}