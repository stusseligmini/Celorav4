'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { SupabaseService } from '@celora/infrastructure/client';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: 'purchase' | 'refund' | 'fee' | 'topup' | 'withdrawal';
  merchant_name?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export function TransactionHistory() {
  const { user } = useSupabase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [svc, setSvc] = useState<SupabaseService | null>(null);

  useEffect(() => {
    const s = new SupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    setSvc(s);
  }, []);

  useEffect(() => {
    async function load() {
      if (!user || !svc) { setLoading(false); return; }
      const tx = await svc.getTransactions(user.id, 25);
      setTransactions(tx);
      setLoading(false);
    }
    load();
  }, [user, svc]);

  useEffect(() => {
    if (!user || !svc) return; 
    const ch = svc.subscribeToTransactions(user.id, async () => {
      const tx = await svc.getTransactions(user.id, 25);
      setTransactions(tx);
    });
    return () => { ch.unsubscribe?.(); };
  }, [user, svc]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '🛒';
      case 'topup':
        return '💰';
      case 'refund':
        return '↩️';
      case 'fee':
        return '💳';
      case 'withdrawal':
        return '🏧';
      default:
        return '💱';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
        <p className="text-gray-600">Please sign in to view your transaction history.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          View All
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <p className="text-gray-600">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">{getTransactionIcon(transaction.transaction_type)}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.merchant_name || 
                     transaction.transaction_type.charAt(0).toUpperCase() + 
                     transaction.transaction_type.slice(1)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-medium ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {transaction.amount >= 0 ? '+' : ''}
                  {transaction.currency} {Math.abs(transaction.amount).toFixed(2)}
                </p>
                <p className={`text-sm capitalize ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}