'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SpendingInsights {
  current_month: {
    spending: number;
    change_from_last_month: number;
    transaction_count: number;
  };
  weekly: {
    spending: number;
    daily_average: number;
  };
  categories: {
    breakdown: Record<string, number>;
    top_categories: Array<{ name: string; amount: number }>;
  };
  trends: {
    daily_spending: Array<{ date: string; amount: number }>;
    projected_monthly: number;
    avg_daily: number;
  };
}

interface CryptoHolding {
  id: string;
  crypto_symbol: string;
  amount: number;
  average_cost: number;
  current_price: number;
  current_value: number;
  cost_basis: number;
  gain_loss: number;
  gain_loss_percent: number;
}

interface Portfolio {
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  holding_count: number;
}

export default function AnalyticsDashboard() {
  const [spendingData, setSpendingData] = useState<SpendingInsights | null>(null);
  const [cryptoData, setCryptoData] = useState<{ holdings: CryptoHolding[]; portfolio: Portfolio } | null>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'spending' | 'crypto' | 'market'>('spending');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        
        // Fetch spending insights
        const spendingResponse = await fetch('/api/analytics/spending');
        const spendingResult = await spendingResponse.json();
        if (spendingResult.success) {
          setSpendingData(spendingResult.insights);
        }

        // Fetch crypto portfolio
        const cryptoResponse = await fetch('/api/crypto/holdings');
        const cryptoResult = await cryptoResponse.json();
        if (cryptoResult.success) {
          setCryptoData({
            holdings: cryptoResult.holdings,
            portfolio: cryptoResult.portfolio
          });
        }

        // Fetch market data
        const marketResponse = await fetch('/api/market/crypto');
        const marketResult = await marketResponse.json();
        if (marketResult.success) {
          setMarketData(marketResult.data);
        }

      } catch (error) {
        console.error('Analytics fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="mt-4 text-cyan-400 font-mono">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-mono font-bold text-cyan-400 mb-2">
            ANALYTICS DASHBOARD
          </h1>
          <p className="text-gray-400">Real-time insights into your financial data</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-900/50 rounded-lg p-1 mb-8 backdrop-blur">
          {[
            { id: 'spending', label: 'SPENDING', icon: '💳' },
            { id: 'crypto', label: 'CRYPTO', icon: '₿' },
            { id: 'market', label: 'MARKET', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 text-sm font-mono font-bold rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-400/20 text-cyan-400 shadow-lg shadow-cyan-400/20'
                  : 'text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Spending Analytics */}
          {activeTab === 'spending' && spendingData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Monthly Overview */}
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-cyan-400 font-mono font-bold mb-4">MONTHLY OVERVIEW</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(spendingData.current_month.spending)}
                    </div>
                    <div className="text-sm text-gray-400">Current Month</div>
                  </div>
                  <div className={`text-sm ${
                    spendingData.current_month.change_from_last_month >= 0 
                      ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {formatPercent(spendingData.current_month.change_from_last_month)} vs last month
                  </div>
                  <div className="text-sm text-gray-400">
                    {spendingData.current_month.transaction_count} transactions
                  </div>
                </div>
              </div>

              {/* Weekly Stats */}
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-cyan-400 font-mono font-bold mb-4">WEEKLY STATS</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(spendingData.weekly.spending)}
                    </div>
                    <div className="text-sm text-gray-400">This Week</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-cyan-400">
                      {formatCurrency(spendingData.weekly.daily_average)}
                    </div>
                    <div className="text-sm text-gray-400">Daily Average</div>
                  </div>
                </div>
              </div>

              {/* Projections */}
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-cyan-400 font-mono font-bold mb-4">PROJECTIONS</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(spendingData.trends.projected_monthly)}
                    </div>
                    <div className="text-sm text-gray-400">Projected Monthly</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-400">
                      {formatCurrency(spendingData.trends.avg_daily)}
                    </div>
                    <div className="text-sm text-gray-400">Average Daily</div>
                  </div>
                </div>
              </div>

              {/* Top Categories */}
              <div className="md:col-span-2 lg:col-span-3 bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-cyan-400 font-mono font-bold mb-4">TOP SPENDING CATEGORIES</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {spendingData.categories.top_categories.map((category, index) => (
                    <div key={category.name} className="text-center">
                      <div className="text-lg font-bold text-white">
                        {formatCurrency(category.amount)}
                      </div>
                      <div className="text-sm text-gray-400">{category.name}</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-cyan-400 h-2 rounded-full"
                          style={{
                            width: `${(category.amount / spendingData.categories.top_categories[0].amount) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Crypto Portfolio */}
          {activeTab === 'crypto' && cryptoData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Portfolio Overview */}
              <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-cyan-400 font-mono font-bold mb-4">PORTFOLIO</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(cryptoData.portfolio.total_value)}
                    </div>
                    <div className="text-sm text-gray-400">Total Value</div>
                  </div>
                  <div className={`text-lg font-bold ${
                    cryptoData.portfolio.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercent(cryptoData.portfolio.total_gain_loss_percent)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {cryptoData.portfolio.holding_count} holdings
                  </div>
                </div>
              </div>

              {/* Holdings */}
              <div className="md:col-span-2 bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                <h3 className="text-cyan-400 font-mono font-bold mb-4">HOLDINGS</h3>
                <div className="space-y-3">
                  {cryptoData.holdings.map((holding) => (
                    <div key={holding.id} className="flex items-center justify-between py-3 border-b border-gray-700/50">
                      <div>
                        <div className="font-bold text-white">{holding.crypto_symbol}</div>
                        <div className="text-sm text-gray-400">{holding.amount} tokens</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">
                          {formatCurrency(holding.current_value)}
                        </div>
                        <div className={`text-sm ${
                          holding.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercent(holding.gain_loss_percent)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Market Data */}
          {activeTab === 'market' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketData.map((crypto) => (
                <div key={crypto.symbol} className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cyan-400 font-mono font-bold">{crypto.symbol}</h3>
                    <div className={`text-sm px-2 py-1 rounded ${
                      crypto.change_24h >= 0 
                        ? 'bg-green-400/20 text-green-400' 
                        : 'bg-red-400/20 text-red-400'
                    }`}>
                      {formatPercent(crypto.change_24h)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {formatCurrency(crypto.price)}
                      </div>
                      <div className="text-sm text-gray-400">Current Price</div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Vol: {formatCurrency(crypto.volume_24h || 0)}
                    </div>
                    <div className="text-sm text-gray-400">
                      MCap: {formatCurrency(crypto.market_cap || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}