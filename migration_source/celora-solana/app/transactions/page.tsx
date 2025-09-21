'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletButton } from '../components/PhantomWalletButton';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter,
  Download,
  Search,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface Transaction {
  signature: string;
  blockTime: number;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake' | 'nft';
  amount: number;
  token: string;
  from?: string;
  to?: string;
  status: 'success' | 'failed' | 'pending';
  fee: number;
  description: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    signature: '3mQpF7ZjJ9vN8kL5xY2wR6tE4uI9oP8qS7dF1gH3mKjL',
    blockTime: Date.now() - 1800000, // 30 minutes ago
    type: 'send',
    amount: 5.25,
    token: 'SOL',
    to: '8x9YzQ3R7mN2kL5wP6tE4uI1oP8qS7dF1gH3mKjLvBcZ',
    status: 'success',
    fee: 0.000005,
    description: 'Sent SOL to wallet'
  },
  {
    signature: '7nRqG8ZkK1vO9mM6yZ3xS8tF5vJ0pQ9rT8eG2hI4nLmK',
    blockTime: Date.now() - 3600000, // 1 hour ago
    type: 'receive',
    amount: 150.0,
    token: 'USDC',
    from: '2A9YzQ3R7mN8kL5wP6tE4uI1oP8qS7dF1gH3mKjLvBcZ',
    status: 'success',
    fee: 0.000005,
    description: 'Received USDC payment'
  },
  {
    signature: '1pStH9ZlL2wP0nN7zA4yT9uG6wK1qR0sU9fH3iJ5oNnL',
    blockTime: Date.now() - 7200000, // 2 hours ago
    type: 'swap',
    amount: 2.5,
    token: 'SOL → RAY',
    status: 'success',
    fee: 0.0025,
    description: 'Swapped SOL for RAY on DEX'
  },
  {
    signature: '5tWvI0ZmM3yQ1oO8zA5yU0vH7yL2rS1tV0gI4jK6pOoM',
    blockTime: Date.now() - 10800000, // 3 hours ago
    type: 'stake',
    amount: 10.0,
    token: 'SOL',
    status: 'success',
    fee: 0.000005,
    description: 'Staked SOL with validator'
  },
  {
    signature: '9xYzJ1ZnN4zR2pP9zB6yV1wI8zM3sT2uW1hJ5kL7qPpN',
    blockTime: Date.now() - 14400000, // 4 hours ago
    type: 'nft',
    amount: 0.5,
    token: 'SOL',
    status: 'success',
    fee: 0.01,
    description: 'Purchased NFT from marketplace'
  },
  {
    signature: '2qStI2ZoO5zS3qQ0zC7yW2xJ9zN4tU3vX2iK6lM8rQqO',
    blockTime: Date.now() - 18000000, // 5 hours ago
    type: 'send',
    amount: 25.0,
    token: 'USDC',
    to: '4B0YzQ3R7mN9kL5wP6tE4uI1oP8qS7dF1gH3mKjLvBcZ',
    status: 'failed',
    fee: 0.000005,
    description: 'Failed to send USDC - insufficient balance'
  },
  {
    signature: '6uVwK3ZpP6zT4rR1zD8yX3yK0zO5uV4wY3jL7mN9sRrP',
    blockTime: Date.now() - 86400000, // 1 day ago
    type: 'receive',
    amount: 3.75,
    token: 'SOL',
    from: '6C1YzQ3R7mN0kL5wP6tE4uI1oP8qS7dF1gH3mKjLvBcZ',
    status: 'success',
    fee: 0.000005,
    description: 'Received SOL reward from staking'
  },
  {
    signature: '8yXzL4ZqQ7zU5sS2zE9yY4zL1zP6vW5xZ4kM8nO0tSsQ',
    blockTime: Date.now() - 172800000, // 2 days ago
    type: 'unstake',
    amount: 15.0,
    token: 'SOL',
    status: 'success',
    fee: 0.000005,
    description: 'Unstaked SOL from validator'
  }
];

export default function TransactionsPage() {
  const { connected, publicKey } = useWallet();
  const { balance, tokenBalances, isLoading } = useSolanaWallet();
  
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter transactions based on search and filters
  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.token.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = Date.now();
      const timeMap = {
        '1h': 3600000,
        '24h': 86400000,
        '7d': 604800000,
        '30d': 2592000000
      };
      const timeRange = timeMap[timeFilter as keyof typeof timeMap];
      if (timeRange) {
        filtered = filtered.filter(tx => now - tx.blockTime <= timeRange);
      }
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, typeFilter, statusFilter, timeFilter]);

  const refreshTransactions = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-400" />;
    if (status === 'pending') return <AlertCircle className="w-5 h-5 text-yellow-400" />;

    switch (type) {
      case 'send':
        return <ArrowUpRight className="w-5 h-5 text-red-400" />;
      case 'receive':
        return <ArrowDownLeft className="w-5 h-5 text-green-400" />;
      case 'swap':
        return <RefreshCw className="w-5 h-5 text-blue-400" />;
      case 'stake':
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      case 'unstake':
        return <TrendingDown className="w-5 h-5 text-orange-400" />;
      case 'nft':
        return <div className="w-5 h-5 bg-gradient-to-r from-pink-400 to-purple-400 rounded" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-500/20 text-green-400 border-green-500/50',
      failed: 'bg-red-500/20 text-red-400 border-red-500/50',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else { // More than 1 day
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Signature', 'Date', 'Type', 'Amount', 'Token', 'Status', 'Fee', 'Description'],
      ...filteredTransactions.map(tx => [
        tx.signature,
        new Date(tx.blockTime).toISOString(),
        tx.type,
        tx.amount.toString(),
        tx.token,
        tx.status,
        tx.fee.toString(),
        tx.description
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celora-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center max-w-md w-full border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Transaction History</h1>
          <p className="text-gray-300 mb-8">Connect your wallet to view transaction history</p>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
              <p className="text-gray-300">Track all your Solana transactions</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshTransactions}
                disabled={isRefreshing}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportTransactions}
                className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 rounded-xl text-white font-semibold transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <PhantomWalletButton />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all" className="bg-gray-800">All Types</option>
              <option value="send" className="bg-gray-800">Send</option>
              <option value="receive" className="bg-gray-800">Receive</option>
              <option value="swap" className="bg-gray-800">Swap</option>
              <option value="stake" className="bg-gray-800">Stake</option>
              <option value="unstake" className="bg-gray-800">Unstake</option>
              <option value="nft" className="bg-gray-800">NFT</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all" className="bg-gray-800">All Status</option>
              <option value="success" className="bg-gray-800">Success</option>
              <option value="failed" className="bg-gray-800">Failed</option>
              <option value="pending" className="bg-gray-800">Pending</option>
            </select>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all" className="bg-gray-800">All Time</option>
              <option value="1h" className="bg-gray-800">Last Hour</option>
              <option value="24h" className="bg-gray-800">Last 24h</option>
              <option value="7d" className="bg-gray-800">Last 7 days</option>
              <option value="30d" className="bg-gray-800">Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <ArrowDownLeft className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Received</p>
                <p className="text-white text-xl font-bold">
                  {filteredTransactions
                    .filter(tx => tx.type === 'receive' && tx.status === 'success')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <ArrowUpRight className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Sent</p>
                <p className="text-white text-xl font-bold">
                  {filteredTransactions
                    .filter(tx => tx.type === 'send' && tx.status === 'success')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <RefreshCw className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Swaps</p>
                <p className="text-white text-xl font-bold">
                  {filteredTransactions.filter(tx => tx.type === 'swap').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Fees</p>
                <p className="text-white text-xl font-bold">
                  {filteredTransactions
                    .reduce((sum, tx) => sum + tx.fee, 0)
                    .toFixed(6)} SOL
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Recent Transactions ({filteredTransactions.length})
              </h2>
              <div className="flex items-center space-x-2 text-gray-300 text-sm">
                <Filter className="w-4 h-4" />
                <span>Filtered results</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-300">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredTransactions.map((transaction, index) => (
                <div key={transaction.signature} className="p-6 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getTransactionIcon(transaction.type, transaction.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <p className="text-white font-semibold capitalize">
                            {transaction.type}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-gray-300 text-sm mb-1">{transaction.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>Signature: {formatAddress(transaction.signature)}</span>
                          {transaction.from && (
                            <span>From: {formatAddress(transaction.from)}</span>
                          )}
                          {transaction.to && (
                            <span>To: {formatAddress(transaction.to)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-lg font-bold ${
                          transaction.type === 'receive' ? 'text-green-400' : 
                          transaction.type === 'send' ? 'text-red-400' : 
                          'text-white'
                        }`}>
                          {transaction.type === 'receive' ? '+' : 
                           transaction.type === 'send' ? '-' : ''}
                          {transaction.amount} {transaction.token}
                        </span>
                        <button
                          onClick={() => window.open(`https://explorer.solana.com/tx/${transaction.signature}`, '_blank')}
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>{formatTime(transaction.blockTime)}</div>
                        <div>Fee: {transaction.fee} SOL</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 20 && (
          <div className="mt-6 flex justify-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20">
              <div className="flex items-center space-x-2">
                <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-semibold transition-colors">
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-300 text-sm">Page 1 of 1</span>
                <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-semibold transition-colors">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
