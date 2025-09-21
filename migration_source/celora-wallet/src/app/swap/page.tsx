'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, ArrowUpDown, Zap, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function SwapPage() {
  const { publicKey } = useWallet();
  
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);

  // Mock token data - replace with real token fetching
  const tokens = [
    { symbol: 'SOL', name: 'Solana', balance: 5.234, price: 98.45, icon: '◎' },
    { symbol: 'USDC', name: 'USD Coin', balance: 1250.50, price: 1.00, icon: '$' },
    { symbol: 'RAY', name: 'Raydium', balance: 123.45, price: 1.85, icon: '⚡' },
    { symbol: 'SRM', name: 'Serum', balance: 45.67, price: 0.32, icon: '📡' },
    { symbol: 'ORCA', name: 'Orca', balance: 89.12, price: 2.15, icon: '🐋' },
  ];

  const fromTokenData = tokens.find(t => t.symbol === fromToken);
  const toTokenData = tokens.find(t => t.symbol === toToken);

  // Mock exchange rate calculation
  const exchangeRate = fromTokenData && toTokenData 
    ? fromTokenData.price / toTokenData.price 
    : 0;

  useEffect(() => {
    if (fromAmount && exchangeRate) {
      const calculated = (parseFloat(fromAmount) * exchangeRate * (1 - slippage / 100)).toFixed(6);
      setToAmount(calculated);
    } else {
      setToAmount('');
    }
  }, [fromAmount, exchangeRate, slippage]);

  const swapTokens = () => {
    const tempToken = fromToken;
    const tempAmount = fromAmount;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const executeSwap = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    
    // Mock swap execution
    setTimeout(() => {
      setIsLoading(false);
      alert('Swap executed successfully!');
      setFromAmount('');
      setToAmount('');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-card pt-20 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4 p-2 hover:bg-dark-card rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Swap Tokens</h1>
        </div>

        <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-6 space-y-4">
          {/* From Token */}
          <div className="bg-dark-surface/50 rounded-xl border border-dark-border/50 p-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium">From</label>
              <div className="text-sm text-dark-text-secondary">
                Balance: {fromTokenData?.balance.toFixed(4)} {fromToken}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2 font-medium min-w-[100px]"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.icon} {token.symbol}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-semibold outline-none"
              />
            </div>
            
            <div className="flex justify-between items-center mt-3">
              <div className="text-sm text-dark-text-secondary">
                ${fromTokenData?.price.toFixed(2)} per {fromToken}
              </div>
              <button
                onClick={() => setFromAmount(fromTokenData?.balance.toString() || '0')}
                className="text-sm text-primary-400 hover:text-primary-300 font-medium"
              >
                Max
              </button>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapTokens}
              className="bg-dark-surface hover:bg-dark-border border border-dark-border rounded-xl p-3 transition-colors"
            >
              <ArrowUpDown className="w-6 h-6" />
            </button>
          </div>

          {/* To Token */}
          <div className="bg-dark-surface/50 rounded-xl border border-dark-border/50 p-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium">To</label>
              <div className="text-sm text-dark-text-secondary">
                Balance: {toTokenData?.balance.toFixed(4)} {toToken}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2 font-medium min-w-[100px]"
              >
                {tokens.filter(t => t.symbol !== fromToken).map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.icon} {token.symbol}
                  </option>
                ))}
              </select>
              
              <div className="flex-1 text-2xl font-semibold text-dark-text-secondary">
                {toAmount || '0.00'}
              </div>
            </div>
            
            <div className="text-sm text-dark-text-secondary mt-3">
              ${toTokenData?.price.toFixed(2)} per {toToken}
            </div>
          </div>

          {/* Exchange Rate & Route Info */}
          {fromAmount && toAmount && (
            <div className="bg-dark-surface/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-text-secondary">Exchange Rate:</span>
                <span className="text-sm font-medium">
                  1 {fromToken} = {exchangeRate.toFixed(6)} {toToken}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-text-secondary">Route:</span>
                <div className="flex items-center text-sm">
                  <span className="text-primary-400">Raydium</span>
                  <TrendingUp className="w-4 h-4 mx-1 text-success" />
                  <span className="text-accent-400">Orca</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-text-secondary">Price Impact:</span>
                <span className="text-sm text-success">{'<'}0.01%</span>
              </div>
            </div>
          )}

          {/* Slippage Settings */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Slippage Tolerance</span>
            <button
              onClick={() => setShowSlippageSettings(!showSlippageSettings)}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              {slippage}% {showSlippageSettings ? '▲' : '▼'}
            </button>
          </div>

          {showSlippageSettings && (
            <div className="bg-dark-surface/30 rounded-xl p-4">
              <div className="flex space-x-2 mb-3">
                {[0.5, 1.0, 2.0, 5.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      slippage === value
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-surface hover:bg-dark-border'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-dark-surface border border-dark-border rounded-lg text-sm"
                placeholder="Custom %"
                step="0.1"
                min="0"
                max="50"
              />
            </div>
          )}

          {/* Warnings */}
          {parseFloat(fromAmount) > (fromTokenData?.balance || 0) && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Insufficient {fromToken} balance
              </div>
            </div>
          )}

          {slippage > 5 && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-warning">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                High slippage tolerance may result in unfavorable rates
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={executeSwap}
            disabled={!publicKey || !fromAmount || !toAmount || parseFloat(fromAmount) > (fromTokenData?.balance || 0) || isLoading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-dark-surface disabled:text-dark-text-secondary text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                {!publicKey ? 'Connect Wallet' : 
                 !fromAmount || !toAmount ? 'Enter Amount' : 
                 `Swap ${fromToken} for ${toToken}`}
              </>
            )}
          </button>
        </div>

        {/* Powered By */}
        <div className="text-center mt-6 text-sm text-dark-text-secondary">
          Powered by <span className="text-primary-400">Jupiter Aggregator</span> • 
          Best rates across all DEXs
        </div>
      </div>
    </div>
  );
}
