'use client';

import { useSolanaWallet, TokenBalance } from '../hooks/useSolanaWallet';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Search, Filter } from 'lucide-react';

interface TokenBalanceWithPriceData extends TokenBalance {
  priceUsd?: number;
  change24h?: number;
  volumeUsd?: number;
  marketCap?: number;
}

export const TokenBalances = () => {
  const { connected } = useWallet();
  const { tokenBalances, isLoading, refreshAll } = useSolanaWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'amount' | 'symbol'>('value');
  const [filterZero, setFilterZero] = useState(true);

  // Mock price data - in production, this would come from a price API
  const mockPriceData: Record<string, { price: number; change24h: number; volume: number; marketCap: number }> = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { // USDC
      price: 1.00,
      change24h: 0.01,
      volume: 2500000000,
      marketCap: 25000000000
    },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { // USDT
      price: 1.00,
      change24h: -0.02,
      volume: 1800000000,
      marketCap: 83000000000
    },
    'So11111111111111111111111111111111111111112': { // Wrapped SOL
      price: 150.0,
      change24h: 5.2,
      volume: 400000000,
      marketCap: 70000000000
    }
  };

  // Enhance token balances with price data
  const enhancedTokenBalances: TokenBalanceWithPriceData[] = useMemo(() => {
    return tokenBalances.map(token => {
      const priceData = mockPriceData[token.mint];
      return {
        ...token,
        priceUsd: priceData?.price || 0,
        change24h: priceData?.change24h || 0,
        volumeUsd: priceData?.volume || 0,
        marketCap: priceData?.marketCap || 0
      };
    });
  }, [tokenBalances]);

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = enhancedTokenBalances.filter(token => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           token.name.toLowerCase().includes(searchTerm.toLowerCase());
      const hasBalance = filterZero ? token.uiAmount > 0 : true;
      return matchesSearch && hasBalance;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          const valueA = (a.priceUsd || 0) * a.uiAmount;
          const valueB = (b.priceUsd || 0) * b.uiAmount;
          return valueB - valueA;
        case 'amount':
          return b.uiAmount - a.uiAmount;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });

    return filtered;
  }, [enhancedTokenBalances, searchTerm, sortBy, filterZero]);

  const totalPortfolioValue = useMemo(() => {
    return enhancedTokenBalances.reduce((total, token) => {
      return total + ((token.priceUsd || 0) * token.uiAmount);
    }, 0);
  }, [enhancedTokenBalances]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
  };

  if (!connected) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center border border-white/20">
        <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to view token balances</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Portfolio Overview</h2>
          <button
            onClick={refreshAll}
            disabled={isLoading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50"
          >
            <BarChart3 className={`w-5 h-5 text-white ${isLoading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-gray-300 text-sm">Total Value</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalPortfolioValue)}
            </div>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300 text-sm">Tokens</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {enhancedTokenBalances.filter(t => t.uiAmount > 0).length}
            </div>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300 text-sm">24h Change</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              +2.34%
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tokens..."
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'value' | 'amount' | 'symbol')}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="value" className="bg-gray-800">Sort by Value</option>
            <option value="amount" className="bg-gray-800">Sort by Amount</option>
            <option value="symbol" className="bg-gray-800">Sort by Symbol</option>
          </select>
          
          <label className="flex items-center space-x-2 text-white">
            <input
              type="checkbox"
              checked={filterZero}
              onChange={(e) => setFilterZero(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
            />
            <span className="text-sm">Hide zero balances</span>
          </label>
        </div>
      </div>

      {/* Token List */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4">Token Balances</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">Loading token balances...</p>
          </div>
        ) : filteredAndSortedTokens.length > 0 ? (
          <div className="space-y-3">
            {filteredAndSortedTokens.map((token) => {
              const value = (token.priceUsd || 0) * token.uiAmount;
              const isPositiveChange = (token.change24h || 0) >= 0;
              
              return (
                <div
                  key={token.mint}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-white font-bold text-sm">
                          {token.symbol.substring(0, 3)}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-white font-semibold">{token.symbol}</h3>
                        <span className="text-gray-400 text-sm">{token.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>{formatCurrency(token.priceUsd || 0)}</span>
                        <span className={`flex items-center space-x-1 ${
                          isPositiveChange ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isPositiveChange ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{Math.abs(token.change24h || 0).toFixed(2)}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      {formatNumber(token.uiAmount, token.decimals > 6 ? 6 : token.decimals)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatCurrency(value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">
              {searchTerm ? 'No tokens found matching your search' : 'No SPL tokens found in your wallet'}
            </p>
          </div>
        )}
      </div>

      {/* Token Statistics */}
      {filteredAndSortedTokens.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Market Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAndSortedTokens.slice(0, 4).map((token) => (
              <div key={token.mint} className="bg-white/5 rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-white font-semibold">{token.symbol}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volume 24h:</span>
                    <span className="text-white">{formatNumber(token.volumeUsd || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market Cap:</span>
                    <span className="text-white">{formatNumber(token.marketCap || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};