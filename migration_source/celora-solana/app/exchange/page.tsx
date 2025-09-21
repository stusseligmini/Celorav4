'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletButton } from '../components/PhantomWalletButton';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  DollarSign,
  BarChart3,
  RefreshCw,
  Settings,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface SwapPair {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  rate: number;
  slippage: number;
  impact: number;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

const POPULAR_TOKENS = [
  { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'USDT', name: 'Tether USD', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
  { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6 },
  { symbol: 'SRM', name: 'Serum', mint: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt', decimals: 6 },
];

const MOCK_MARKET_DATA: MarketData[] = [
  { symbol: 'SOL', price: 150.25, change24h: 5.2, volume24h: 890000000, marketCap: 71000000000 },
  { symbol: 'USDC', price: 1.00, change24h: 0.01, volume24h: 2800000000, marketCap: 25000000000 },
  { symbol: 'USDT', price: 1.00, change24h: -0.02, volume24h: 1900000000, marketCap: 83000000000 },
  { symbol: 'RAY', price: 2.45, change24h: -3.1, volume24h: 45000000, marketCap: 780000000 },
  { symbol: 'SRM', price: 0.89, change24h: 1.8, volume24h: 12000000, marketCap: 89000000 },
];

// Import our new Dashboard component
import Dashboard from '../components/Dashboard';

export default function ExchangePage() {
  const { connected, publicKey } = useWallet();
  const { balance, tokenBalances, isLoading } = useSolanaWallet();
  
  // Show the new dashboard if connected
  if (connected) {
    return <Dashboard />;
  }
  
  const [swapPair, setSwapPair] = useState<SwapPair>({
    inputToken: 'SOL',
    outputToken: 'USDC',
    inputAmount: 0,
    outputAmount: 0,
    rate: 150.25,
    slippage: 0.5,
    impact: 0.1
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('0.5');
  const [swapMode, setSwapMode] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');

  // Calculate output amount based on input
  useEffect(() => {
    if (swapPair.inputAmount > 0) {
      const marketData = MOCK_MARKET_DATA.find(m => m.symbol === swapPair.inputToken);
      const outputMarketData = MOCK_MARKET_DATA.find(m => m.symbol === swapPair.outputToken);
      
      if (marketData && outputMarketData) {
        const rate = marketData.price / outputMarketData.price;
        const outputAmount = swapPair.inputAmount * rate * (1 - swapPair.slippage / 100);
        
        setSwapPair(prev => ({
          ...prev,
          outputAmount,
          rate,
          impact: swapPair.inputAmount > 100 ? 0.3 : 0.1
        }));
      }
    } else {
      setSwapPair(prev => ({ ...prev, outputAmount: 0 }));
    }
  }, [swapPair.inputAmount, swapPair.inputToken, swapPair.outputToken, swapPair.slippage]);

  const handleSwapTokens = () => {
    setSwapPair(prev => ({
      ...prev,
      inputToken: prev.outputToken,
      outputToken: prev.inputToken,
      inputAmount: prev.outputAmount,
      outputAmount: prev.inputAmount
    }));
  };

  const handleSwap = async () => {
    if (!connected) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // This would integrate with a DEX aggregator like Jupiter
      alert('Swap functionality will be implemented with Jupiter DEX integration');
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed: ' + (error as Error).message);
    }
  };

  const getTokenBalance = (symbol: string) => {
    if (symbol === 'SOL') return balance;
    const token = tokenBalances.find(t => t.symbol === symbol);
    return token ? token.uiAmount : 0;
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    return num.toFixed(decimals);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center max-w-md w-full border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowUpDown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Celora DEX</h1>
          <p className="text-gray-300 mb-8">Connect your wallet to start trading</p>
          <PhantomWalletButton className="!py-3 !px-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Celora DEX</h1>
              <p className="text-gray-300">Decentralized exchange powered by Solana</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
              <PhantomWalletButton />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Swap Interface */}
          <div className="xl:col-span-2 space-y-6">
            {/* Swap Mode Toggle */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <div className="flex items-center space-x-4 mb-6">
                <button
                  onClick={() => setSwapMode('market')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    swapMode === 'market'
                      ? 'bg-gradient-to-r from-primary to-secondary text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  Market Order
                </button>
                <button
                  onClick={() => setSwapMode('limit')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    swapMode === 'limit'
                      ? 'bg-gradient-to-r from-primary to-secondary text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Limit Order
                </button>
              </div>

              {/* Swap Interface */}
              <div className="space-y-4">
                {/* Input Token */}
                <div className="bg-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-300 text-sm font-medium">You pay</span>
                    <span className="text-gray-300 text-sm">
                      Balance: {getTokenBalance(swapPair.inputToken).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      value={swapPair.inputAmount || ''}
                      onChange={(e) => setSwapPair(prev => ({ ...prev, inputAmount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-gray-400 focus:outline-none"
                    />
                    <select
                      value={swapPair.inputToken}
                      onChange={(e) => setSwapPair(prev => ({ ...prev, inputToken: e.target.value }))}
                      className="bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white font-semibold"
                    >
                      {POPULAR_TOKENS.map(token => (
                        <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwapTokens}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <ArrowUpDown className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Output Token */}
                <div className="bg-white/5 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-300 text-sm font-medium">You receive</span>
                    <span className="text-gray-300 text-sm">
                      Balance: {getTokenBalance(swapPair.outputToken).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      value={swapPair.outputAmount.toFixed(6)}
                      readOnly
                      className="flex-1 bg-transparent text-2xl font-bold text-white focus:outline-none"
                    />
                    <select
                      value={swapPair.outputToken}
                      onChange={(e) => setSwapPair(prev => ({ ...prev, outputToken: e.target.value }))}
                      className="bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white font-semibold"
                    >
                      {POPULAR_TOKENS.map(token => (
                        <option key={token.symbol} value={token.symbol} className="bg-gray-800">
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Limit Price (for limit orders) */}
                {swapMode === 'limit' && (
                  <div className="bg-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-300 text-sm font-medium">Limit Price</span>
                      <span className="text-gray-300 text-sm">
                        Market: {swapPair.rate.toFixed(4)}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={swapPair.rate.toFixed(4)}
                      className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* Swap Details */}
                <div className="bg-white/5 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Rate</span>
                    <span className="text-white">
                      1 {swapPair.inputToken} = {swapPair.rate.toFixed(4)} {swapPair.outputToken}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Price Impact</span>
                    <span className={`${swapPair.impact > 2 ? 'text-red-400' : 'text-green-400'}`}>
                      {swapPair.impact.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Slippage Tolerance</span>
                    <span className="text-white">{swapPair.slippage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Minimum Received</span>
                    <span className="text-white">
                      {(swapPair.outputAmount * (1 - swapPair.slippage / 100)).toFixed(6)} {swapPair.outputToken}
                    </span>
                  </div>
                </div>

                {/* Advanced Settings */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Advanced Settings</span>
                </button>

                {showAdvanced && (
                  <div className="bg-white/5 rounded-2xl p-4 space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Slippage Tolerance (%)
                      </label>
                      <div className="flex space-x-2">
                        {['0.1', '0.5', '1.0'].map(value => (
                          <button
                            key={value}
                            onClick={() => {
                              setCustomSlippage(value);
                              setSwapPair(prev => ({ ...prev, slippage: parseFloat(value) }));
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              customSlippage === value
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                          >
                            {value}%
                          </button>
                        ))}
                        <input
                          type="number"
                          value={customSlippage}
                          onChange={(e) => {
                            setCustomSlippage(e.target.value);
                            setSwapPair(prev => ({ ...prev, slippage: parseFloat(e.target.value) || 0.5 }));
                          }}
                          placeholder="Custom"
                          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  disabled={!swapPair.inputAmount || !connected}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg transition-all"
                >
                  {!connected ? 'Connect Wallet' : 
                   !swapPair.inputAmount ? 'Enter Amount' :
                   swapMode === 'market' ? 'Swap Tokens' : 'Place Limit Order'}
                </button>

                {/* Price Impact Warning */}
                {swapPair.impact > 2 && (
                  <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-200 text-sm">
                      High price impact! Consider reducing swap amount.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Market Data Sidebar */}
          <div className="space-y-6">
            {/* Top Tokens */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Top Tokens</h2>
              <div className="space-y-3">
                {MOCK_MARKET_DATA.slice(0, 5).map((token) => (
                  <div
                    key={token.symbol}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setSwapPair(prev => ({ ...prev, inputToken: token.symbol }))}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {token.symbol.substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{token.symbol}</p>
                        <p className="text-gray-400 text-xs">{formatCurrency(token.price)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center space-x-1 text-xs ${
                        token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {token.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(token.change24h).toFixed(2)}%</span>
                      </div>
                      <p className="text-gray-400 text-xs">
                        Vol: {formatNumber(token.volume24h)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Stats */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">24h Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-gray-300 text-sm">Total Volume</span>
                  </div>
                  <span className="text-white font-semibold">
                    {formatNumber(MOCK_MARKET_DATA.reduce((sum, token) => sum + token.volume24h, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    <span className="text-gray-300 text-sm">Total Market Cap</span>
                  </div>
                  <span className="text-white font-semibold">
                    {formatNumber(MOCK_MARKET_DATA.reduce((sum, token) => sum + token.marketCap, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    <span className="text-gray-300 text-sm">Active Pairs</span>
                  </div>
                  <span className="text-white font-semibold">156</span>
                </div>
              </div>
            </div>

            {/* Recent Swaps */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Recent Swaps</h2>
              <div className="space-y-3">
                {[
                  { from: 'SOL', to: 'USDC', amount: '12.5', time: '2m ago' },
                  { from: 'USDC', to: 'RAY', amount: '1,850', time: '5m ago' },
                  { from: 'RAY', to: 'SOL', amount: '245.8', time: '8m ago' },
                  { from: 'SOL', to: 'USDT', amount: '8.2', time: '12m ago' },
                ].map((swap, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm font-semibold">
                        {swap.from} → {swap.to}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">{swap.amount}</p>
                      <p className="text-gray-400 text-xs">{swap.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}