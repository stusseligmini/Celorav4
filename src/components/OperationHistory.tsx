'use client';

import React, { useState, useEffect } from 'react';

// Just import types, not the service implementation
interface CrossPlatformTransaction {
  id: string;
  userId: string;
  cardId?: string;
  walletId?: string;
  transactionType: 'topup' | 'cashout' | 'conversion' | 'payment';
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  fee: number;
  feeCurrency?: string;
  providerRef?: string;
  failureReason?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface OperationHistoryProps {
  userId: string;
  className?: string;
}

interface DisplayTransaction extends CrossPlatformTransaction {
  displayAmount: string;
  statusColor: string;
  typeIcon: string;
}

export function OperationHistory({ userId, className = '' }: OperationHistoryProps) {
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'topup' | 'cashout' | 'conversion'>('all');

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cross-platform/recent', {
        headers: { 'x-user-id': userId }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const displayTxs = data.transactions.map((tx: CrossPlatformTransaction) => ({
          ...tx,
          displayAmount: formatAmount(tx.amount, tx.sourceCurrency),
          statusColor: getStatusColor(tx.status),
          typeIcon: getTypeIcon(tx.transactionType)
        }));
        setTransactions(displayTxs);
      } else {
        setError('Failed to load transaction history');
      }
    } catch (err) {
      setError('Failed to load transaction history');
      console.error('Load transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toFixed(currency === 'USD' ? 2 : 6)} ${currency}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'topup': return '↗️';
      case 'cashout': return '↙️';
      case 'conversion': return '🔄';
      case 'payment': return '💳';
      default: return '📊';
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.transactionType === filter
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadTransactions}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cross-Platform Transaction History
        </h3>
        
        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'topup', label: 'Top-ups' },
            { value: 'cashout', label: 'Cash-outs' },
            { value: 'conversion', label: 'Conversions' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value as any)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">📊</div>
            <p>No {filter === 'all' ? '' : filter} transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">{tx.typeIcon}</div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {tx.transactionType}
                      </div>
                      <div className="text-sm text-gray-500">
                        {tx.sourceCurrency} → {tx.targetCurrency}
                        {tx.exchangeRate && (
                          <span className="ml-2">
                            (Rate: {tx.exchangeRate.toFixed(6)})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {tx.displayAmount}
                    </div>
                    {tx.fee > 0 && (
                      <div className="text-xs text-gray-500">
                        Fee: {tx.fee.toFixed(tx.feeCurrency === 'USD' ? 2 : 6)} {tx.feeCurrency || tx.sourceCurrency}
                      </div>
                    )}
                    <div className={`text-sm font-medium ${tx.statusColor} capitalize`}>
                      {tx.status}
                    </div>
                  </div>
                </div>
                
                {tx.failureReason && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {tx.failureReason}
                  </div>
                )}
                
                {tx.providerRef && (
                  <div className="mt-1 text-xs text-gray-400">
                    Ref: {tx.providerRef}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {filteredTransactions.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button 
            onClick={loadTransactions}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}