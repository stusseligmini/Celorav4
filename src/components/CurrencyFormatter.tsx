'use client';

import React, { useState, useEffect } from 'react';
import { useCurrencyPreferences, useCurrencyConversion } from '@/hooks/useCurrencyPreferences';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';
import { Currency } from '@/lib/multiCurrency';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencyFormatProps {
  amount: number;
  currency: string;
  showSymbol?: boolean;
  showCode?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
  className?: string;
  locale?: string;
}

/**
 * Component to format and display currency amounts
 */
export function CurrencyFormat({
  amount,
  currency,
  showSymbol = true,
  showCode = false,
  variant = 'default',
  className,
  locale
}: CurrencyFormatProps) {
  const { formatCurrency } = useMultiCurrency();
  
  return (
    <span className={className}>
      {formatCurrency(amount, currency, locale)}
      {showCode && variant !== 'compact' && ` ${currency}`}
    </span>
  );
}

interface CurrencyAmountProps {
  amount: number;
  currency: string;
  targetCurrency?: string;
  autoConvert?: boolean;
  showConvertedValue?: boolean;
  showCurrencyCode?: boolean;
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  onClick?: () => void;
}

/**
 * Component to display currency amounts with optional conversion
 */
export function CurrencyAmount({
  amount,
  currency,
  targetCurrency,
  autoConvert = false,
  showConvertedValue = true,
  showCurrencyCode = false,
  className,
  tooltipPosition = 'top',
  onClick
}: CurrencyAmountProps) {
  const { convert } = useCurrencyConversion();
  const { formatCurrency } = useMultiCurrency();
  const { primaryCurrency } = useCurrencyPreferences();
  
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(!autoConvert);
  
  const finalTargetCurrency = targetCurrency || primaryCurrency || 'USD';
  const needsConversion = currency !== finalTargetCurrency;
  
  // Convert currency if needed
  useEffect(() => {
    let isMounted = true;
    
    if (needsConversion && (showConvertedValue || autoConvert)) {
      setIsConverting(true);
      
      convert(amount, currency, finalTargetCurrency)
        .then(result => {
          if (isMounted && result) {
            setConvertedAmount(result.toAmount);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsConverting(false);
          }
        });
    }
    
    return () => {
      isMounted = false;
    };
  }, [amount, currency, finalTargetCurrency, needsConversion, convert, showConvertedValue, autoConvert]);
  
  // Toggle between original and converted values
  const handleToggle = () => {
    if (needsConversion && convertedAmount !== null) {
      setShowingOriginal(!showingOriginal);
    }
    
    if (onClick) {
      onClick();
    }
  };
  
  const displayedCurrency = showingOriginal ? currency : finalTargetCurrency;
  const displayedAmount = showingOriginal ? amount : convertedAmount;
  const canToggle = needsConversion && convertedAmount !== null;
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 group", 
        canToggle ? "cursor-pointer" : "",
        className
      )}
      onClick={canToggle ? handleToggle : onClick}
      role={canToggle ? "button" : undefined}
      tabIndex={canToggle ? 0 : undefined}
    >
      {isConverting ? (
        <span className="inline-flex items-center">
          <RefreshCw size={14} className="animate-spin mr-1" />
          {formatCurrency(amount, currency)}
        </span>
      ) : (
        <span>
          {formatCurrency(displayedAmount || 0, displayedCurrency)}
          {showCurrencyCode && ` ${displayedCurrency}`}
        </span>
      )}
      
      {canToggle && (
        <ArrowUpDown 
          size={14} 
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground" 
        />
      )}
      
      {needsConversion && !showingOriginal && (
        <span 
          className="text-xs text-muted-foreground hidden group-hover:inline ml-1"
          data-tooltip-position={tooltipPosition}
        >
          ({formatCurrency(amount, currency)})
        </span>
      )}
    </div>
  );
}

interface CurrencyConverterProps {
  defaultFromCurrency?: string;
  defaultToCurrency?: string;
  defaultAmount?: number;
  showRate?: boolean;
  showFee?: boolean;
  onConversionComplete?: (result: any) => void;
  className?: string;
}

/**
 * Interactive currency converter component
 */
export function CurrencyConverter({
  defaultFromCurrency = 'USD',
  defaultToCurrency = 'EUR',
  defaultAmount = 100,
  showRate = true,
  showFee = true,
  onConversionComplete,
  className
}: CurrencyConverterProps) {
  const { currencies } = useMultiCurrency();
  const { convert } = useCurrencyConversion();
  const [fromCurrency, setFromCurrency] = useState(defaultFromCurrency);
  const [toCurrency, setToCurrency] = useState(defaultToCurrency);
  const [amount, setAmount] = useState(defaultAmount);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter active currencies
  const activeCurrencies = currencies.filter(c => c.isActive);

  // Perform conversion when inputs change
  useEffect(() => {
    async function performConversion() {
      if (!fromCurrency || !toCurrency || amount <= 0) return;
      
      setIsConverting(true);
      setError(null);
      
      try {
        const result = await convert(amount, fromCurrency, toCurrency, showFee);
        
        if (result) {
          setConvertedAmount(result.toAmount);
          setRate(result.rate);
          setFee(result.fee);
          
          if (onConversionComplete) {
            onConversionComplete(result);
          }
        } else {
          setError('Could not perform conversion. Check exchange rates.');
        }
      } catch (err) {
        console.error('Conversion error:', err);
        setError('An error occurred during conversion.');
      } finally {
        setIsConverting(false);
      }
    }
    
    performConversion();
  }, [fromCurrency, toCurrency, amount, showFee, convert, onConversionComplete]);

  // Swap currencies
  const handleSwapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <div className={cn("p-4 bg-background rounded-lg border", className)}>
      <h3 className="text-lg font-medium mb-4">Currency Converter</h3>
      
      <div className="space-y-4">
        {/* Amount input */}
        <div className="flex flex-col">
          <label htmlFor="amount" className="text-sm mb-1">Amount</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="border rounded-md p-2"
          />
        </div>
        
        {/* Currency selectors with swap button */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="fromCurrency" className="text-sm mb-1 block">From</label>
            <select
              id="fromCurrency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              {activeCurrencies.map((currency: Currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleSwapCurrencies}
            className="mt-6 p-2 rounded-full hover:bg-muted"
            aria-label="Swap currencies"
          >
            <ArrowUpDown size={20} />
          </button>
          
          <div className="flex-1">
            <label htmlFor="toCurrency" className="text-sm mb-1 block">To</label>
            <select
              id="toCurrency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              {activeCurrencies.map((currency: Currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Result */}
        <div className="p-3 bg-muted rounded-md">
          {isConverting ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw size={24} className="animate-spin mr-2" />
              <span>Converting...</span>
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result:</span>
                <span className="font-medium text-lg">
                  <CurrencyFormat 
                    amount={convertedAmount || 0} 
                    currency={toCurrency} 
                    showCode 
                  />
                </span>
              </div>
              
              {showRate && rate !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate:</span>
                  <span>
                    1 {fromCurrency} = {rate.toFixed(6)} {toCurrency}
                  </span>
                </div>
              )}
              
              {showFee && fee !== null && fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee:</span>
                  <span>
                    <CurrencyFormat 
                      amount={fee} 
                      currency={toCurrency}
                    />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
