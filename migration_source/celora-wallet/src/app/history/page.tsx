'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  Zap,
  ExternalLink,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

type TransactionType = 'send' | 'receive' | 'swap' | 'stake' | 'unstake';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  token: string;
  hash: string;
  timestamp: Date;
  status: 'confirmed' | 'pending' | 'failed';
  from?: string;
  to?: string;
  fee?: number;
}

export default function HistoryPage() {
  const { publicKey } = useWallet();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');

  // Mock transaction data - replace with real transaction fetching
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'receive',
      amount: 0.5,
      token: 'SOL',
      hash: '3Kx9nBPKmHEtZ8sJQwXm7vFb2c6tA9hR...',
      timestamp: new Date('2024-01-15T10:30:00'),
      status: 'confirmed',
      from: '7BgT5nJ2hQ3kL8mS1xY4pF9tR6eW2vA...',
      fee: 0.000005
    },
    {
      id: '2',
      type: 'send',
      amount: 1.2,
      token: 'SOL',
      hash: '4Ly8mAPLnHFuZ9tKRwYn8gGb3d7uB0hS...',
      timestamp: new Date('2024-01-15T09:15:00'),
      status: 'confirmed',
      to: '9ChU6oK3iR4lM9qV2yX5rH8wS7fT3bE...',
      fee: 0.000005
    },
    {
      id: '3',
      type: 'swap',
      amount: 250,
      token: 'USDC',
      hash: '5Nz7nCQMoIGvA8uLSxZo9hHc4e8vD1iT...',
      timestamp: new Date('2024-01-15T08:45:00'),
      status: 'confirmed',
      fee: 0.0001
    },
    {
      id: '4',
      type: 'stake',
      amount: 10.0,
      token: 'SOL',
      hash: '6Pq8oFRNpJHwB9vMTyAp0iId5f9wE2jU...',
      timestamp: new Date('2024-01-14T16:20:00'),
      status: 'confirmed',
      fee: 0.000005
    },
    {
      id: '5',
      type: 'receive',
      amount: 2.3,
      token: 'SOL',
      hash: '7Rr9qHTOpKIxC0wOUzBq1jJe6g0xF3kV...',
      timestamp: new Date('2024-01-14T14:10:00'),
      status: 'pending',
      from: '8StV7pK4rL5yD1xPVaCs2kKf7h1yG4lW...',
      fee: 0.000005
    },
    {
      id: '6',
      type: 'send',
      amount: 0.8,
      token: 'SOL',
      hash: '8TtW8qL5sM6zE2yQWbDt3lLg8i2zH5mX...',
      timestamp: new Date('2024-01-14T12:30:00'),
      status: 'failed',
      to: '9UuX9sN6tO7AF3zRXcEu4mMh9j3AH6nY...',
      fee: 0.000005
    }
  ];

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight className="w-5 h-5" />;
      case 'receive':
        return <ArrowDownLeft className="w-5 h-5" />;
      case 'swap':
        return <Coins className="w-5 h-5" />;
      case 'stake':
      case 'unstake':
        return <Zap className="w-5 h-5" />;
      default:
        return <ArrowUpRight className="w-5 h-5" />;
    }
  };

  const getTransactionColor = (type: TransactionType, status: string) => {
    if (status === 'failed') return 'text-error bg-error/10';
    if (status === 'pending') return 'text-warning bg-warning/10';
    
    switch (type) {
      case 'receive':
        return 'text-success bg-success/10';
      case 'send':
        return 'text-error bg-error/10';
      case 'swap':
        return 'text-accent-400 bg-accent-500/10';
      case 'stake':
      case 'unstake':
        return 'text-primary-400 bg-primary-500/10';
      default:
        return 'text-dark-text-secondary bg-dark-surface/50';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-card pt-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4 p-2 hover:bg-dark-card rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Transaction History</h1>
        </div>

        {!publicKey ? (
          <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-8 text-center">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-dark-text-secondary mb-4">
              Please connect your wallet to view your transaction history.
            </p>
            <Link 
              href="/" 
              className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Go Back Home
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by hash, token, or type..."
                    className="w-full pl-10 pr-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  />
                </div>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as TransactionType | 'all')}
                  className="px-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors min-w-[120px]"
                >
                  <option value="all">All Types</option>
                  <option value="send">Send</option>
                  <option value="receive">Receive</option>
                  <option value="swap">Swap</option>
                  <option value="stake">Stake</option>
                  <option value="unstake">Unstake</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'confirmed' | 'pending' | 'failed')}
                  className="px-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors min-w-[120px]"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="mt-4 text-sm text-dark-text-secondary">
                Showing {filteredTransactions.length} of {mockTransactions.length} transactions
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-dark-text-secondary mb-2">No transactions found</div>
                  <div className="text-sm text-dark-text-secondary">
                    {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Start making transactions to see your history here'
                    }
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-dark-border">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 hover:bg-dark-surface/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Transaction Icon */}
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTransactionColor(tx.type, tx.status)}`}>
                            {getTransactionIcon(tx.type)}
                          </div>

                          {/* Transaction Details */}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium capitalize">{tx.type}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tx.status === 'confirmed' ? 'bg-success/10 text-success' :
                                tx.status === 'pending' ? 'bg-warning/10 text-warning' :
                                'bg-error/10 text-error'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                            <div className="text-sm text-dark-text-secondary flex items-center space-x-2">
                              <span>{formatDate(tx.timestamp)}</span>
                              <span>•</span>
                              <button
                                onClick={() => window.open(`https://solscan.io/tx/${tx.hash}`, '_blank')}
                                className="hover:text-primary-400 transition-colors flex items-center"
                              >
                                {truncateHash(tx.hash)}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Amount and Details */}
                        <div className="text-right">
                          <div className="font-semibold">
                            {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.token}
                          </div>
                          <div className="text-sm text-dark-text-secondary">
                            Fee: {tx.fee} SOL
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {(tx.from || tx.to) && (
                        <div className="mt-2 pl-16 text-sm text-dark-text-secondary">
                          {tx.from && (
                            <div>From: {truncateHash(tx.from)}</div>
                          )}
                          {tx.to && (
                            <div>To: {truncateHash(tx.to)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Load More Button */}
            {filteredTransactions.length > 0 && (
              <div className="text-center">
                <button className="bg-dark-surface hover:bg-dark-border border border-dark-border text-dark-text font-semibold px-8 py-3 rounded-xl transition-colors">
                  Load More Transactions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
