'use client';

import React, { useState, useEffect } from 'react';
import { useSPLTokenCache, SPLToken, formatTokenAmount, getTokenDisplayInfo } from '@/hooks/useSPLTokenCache';
import { featureFlags } from '@/lib/featureFlags';

interface SPLTokenListProps {
  onTokenSelect?: (token: SPLToken) => void;
  showPrices?: boolean;
  showVerifiedOnly?: boolean;
  limit?: number;
  className?: string;
}

export const SPLTokenList: React.FC<SPLTokenListProps> = ({
  onTokenSelect,
  showPrices = true,
  showVerifiedOnly = false,
  limit = 50,
  className = ''
}) => {
  const { tokens, loading, error, searchTokens, refreshCache, updatePrices, clearError } = useSPLTokenCache();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load tokens on mount
  useEffect(() => {
    searchTokens({
      verified: showVerifiedOnly,
      withPrices: showPrices,
      limit
    });
  }, [searchTokens, showPrices, showVerifiedOnly, limit]);

  // Search functionality
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchTokens({
        symbol: searchQuery,
        verified: showVerifiedOnly,
        withPrices: showPrices,
        limit
      });
    } else {
      await searchTokens({
        verified: showVerifiedOnly,
        withPrices: showPrices,
        limit
      });
    }
  };

  // Refresh cache
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshCache('jupiter', false);
      if (showPrices) {
        await updatePrices();
      }
      // Reload the current view
      await searchTokens({
        symbol: searchQuery || undefined,
        verified: showVerifiedOnly,
        withPrices: showPrices,
        limit
      });
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`spl-token-list ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-cyan-400">SPL Token Cache</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search tokens by symbol..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          🔍 Search
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <span>❌ {error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-2 text-gray-600">Loading tokens...</span>
        </div>
      )}

      {/* Token List */}
      {!loading && tokens.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tokens.map((token) => {
            const displayInfo = getTokenDisplayInfo(token);
            
            return (
              <div
                key={token.mint_address}
                onClick={() => onTokenSelect?.(token)}
                className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                  onTokenSelect ? 'cursor-pointer' : ''
                } ${token.verified ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  {/* Token Info */}
                  <div className="flex items-center space-x-3">
                    {displayInfo?.logo && (
                      <img
                        src={displayInfo.logo}
                        alt={displayInfo.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {displayInfo?.symbol || 'UNKNOWN'}
                        </span>
                        {token.verified && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                        {token.tags && token.tags.includes('community') && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                            Community
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {displayInfo?.name || token.name}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {token.mint_address.slice(0, 8)}...{token.mint_address.slice(-8)}
                      </div>
                    </div>
                  </div>

                  {/* Price Info */}
                  {showPrices && displayInfo?.price && (
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${displayInfo.price.toFixed(6)}
                      </div>
                      {displayInfo.change24h !== null && displayInfo.change24h !== undefined && (
                        <div className={`text-sm ${
                          displayInfo.isPositiveChange ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {displayInfo.isPositiveChange ? '▲' : '▼'} {Math.abs(displayInfo.change24h).toFixed(2)}%
                        </div>
                      )}
                      {token.daily_volume && (
                        <div className="text-xs text-gray-500">
                          Vol: ${token.daily_volume.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="mt-2 text-xs text-gray-500">
                  Decimals: {token.decimals}
                  {token.supply && (
                    <span className="ml-4">
                      Supply: {formatTokenAmount(token.supply, token.decimals)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && tokens.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? (
            <>
              <div className="text-4xl mb-2">🔍</div>
              <div>No tokens found for "{searchQuery}"</div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchTokens({ verified: showVerifiedOnly, withPrices: showPrices, limit });
                }}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">📦</div>
              <div>No tokens in cache</div>
              <button
                onClick={handleRefresh}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Load tokens from Jupiter
              </button>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && tokens.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {tokens.length} token{tokens.length !== 1 ? 's' : ''} • 
          {showVerifiedOnly ? ' Verified only' : ' All tokens'} • 
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

interface SPLTokenSelectorProps {
  selectedToken: SPLToken | null;
  onTokenChange: (token: SPLToken | null) => void;
  className?: string;
}

export const SPLTokenSelector: React.FC<SPLTokenSelectorProps> = ({
  selectedToken,
  onTokenChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTokenSelect = (token: SPLToken) => {
    onTokenChange(token);
    setIsOpen(false);
  };

  const displayInfo = getTokenDisplayInfo(selectedToken);

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 hover:border-gray-400 transition-colors"
      >
        {selectedToken ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {displayInfo?.logo && (
                <img
                  src={displayInfo.logo}
                  alt={displayInfo.symbol}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="font-medium">{displayInfo?.symbol}</span>
              {selectedToken.verified && <span className="text-green-500 text-sm">✓</span>}
            </div>
            <span className="text-gray-400">▼</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Select a token...</span>
            <span className="text-gray-400">▼</span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <SPLTokenList
            onTokenSelect={handleTokenSelect}
            showPrices={true}
            showVerifiedOnly={true}
            limit={20}
            className="p-4"
          />
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SPLTokenList;