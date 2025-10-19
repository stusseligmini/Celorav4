'use client';

import React, { useState } from 'react';
import { useAutoLinkTransfers, useWalletAutoLink, autoLinkUtils } from '@/hooks/useAutoLinkTransfers';

interface AutoLinkDashboardProps {
  className?: string;
}

export const AutoLinkDashboard: React.FC<AutoLinkDashboardProps> = ({ className = '' }) => {
  const { 
    autoLinkData, 
    loading, 
    processing, 
    error, 
    processPendingLinks, 
    getAutoLinkStats,
    clearError 
  } = useAutoLinkTransfers();
  
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const stats = getAutoLinkStats();

  const handleProcessAll = async () => {
    await processPendingLinks();
  };

  const handleProcessSpecific = async (signature: string) => {
    await processPendingLinks({ signature });
  };

  return (
    <div className={`auto-link-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">🔗 Auto-Link Transfer System</h2>
        <button
          onClick={handleProcessAll}
          disabled={processing || loading}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? '🔄 Processing...' : '⚡ Process All'}
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 backdrop-blur border border-cyan-400/20 rounded-lg p-4">
          <h3 className="text-cyan-400 font-bold text-sm mb-2">PENDING TRANSFERS</h3>
          <div className="text-2xl font-bold text-white">{stats.totalPending}</div>
          <div className="text-xs text-gray-400">
            {stats.pendingByStatus.pending || 0} pending • {stats.pendingByStatus.manual_review || 0} review needed
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-green-400/20 rounded-lg p-4">
          <h3 className="text-green-400 font-bold text-sm mb-2">RECENT LINKS</h3>
          <div className="text-2xl font-bold text-white">{stats.recentLinksCount}</div>
          <div className="text-xs text-gray-400">
            Avg confidence: {stats.avgConfidence}%
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-blue-400/20 rounded-lg p-4">
          <h3 className="text-blue-400 font-bold text-sm mb-2">ENABLED WALLETS</h3>
          <div className="text-2xl font-bold text-white">{stats.enabledWallets}</div>
          <div className="text-xs text-gray-400">
            of {stats.totalWallets} total wallets
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur border border-purple-400/20 rounded-lg p-4">
          <h3 className="text-purple-400 font-bold text-sm mb-2">SUCCESS RATE</h3>
          <div className="text-2xl font-bold text-white">
            {stats.recentLinksCount > 0 ? '95%' : 'N/A'}
          </div>
          <div className="text-xs text-gray-400">
            Last 24 hours
          </div>
        </div>
      </div>

      {/* Wallet Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Wallet Selection & Settings */}
        <div className="bg-gray-900/30 border border-gray-600 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">⚙️ Wallet Settings</h3>
          
          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="">Select a wallet...</option>
            {autoLinkData.wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.wallet_name} ({wallet.wallet_type.toUpperCase()})
              </option>
            ))}
          </select>

          {selectedWallet && (
            <WalletAutoLinkSettings walletId={selectedWallet} />
          )}
        </div>

        {/* Processing Status */}
        <div className="bg-gray-900/30 border border-gray-600 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">📊 Processing Status</h3>
          
          {processing && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-800">Processing pending transfers...</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Auto-linking enabled:</span>
              <span className="text-green-400">{stats.enabledWallets} wallets</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pending review:</span>
              <span className="text-yellow-400">{stats.pendingByStatus.manual_review || 0} transfers</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Recent successful links:</span>
              <span className="text-green-400">{stats.recentLinksCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Transfers List */}
      <div className="bg-gray-900/30 border border-gray-600 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-4">⏳ Pending Transfers</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            <span className="ml-2 text-gray-400">Loading transfers...</span>
          </div>
        ) : autoLinkData.pending_transfers.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {autoLinkData.pending_transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="p-3 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {autoLinkUtils.getStatusIcon(transfer.auto_link_status)}
                    </span>
                    <span className="font-mono text-sm text-gray-300">
                      {transfer.signature.slice(0, 8)}...{transfer.signature.slice(-8)}
                    </span>
                    <span className={`text-sm font-medium ${autoLinkUtils.getStatusColor(transfer.auto_link_status)}`}>
                      {transfer.auto_link_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">
                      {autoLinkUtils.formatConfidence(transfer.confidence_score)}
                    </span>
                    {transfer.auto_link_status === 'pending' && (
                      <button
                        onClick={() => handleProcessSpecific(transfer.signature)}
                        disabled={processing}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Process
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2 text-white">{autoLinkUtils.formatTransferType(transfer.transfer_type)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Amount:</span>
                    <span className="ml-2 text-white">{transfer.amount} {transfer.token_mint ? 'SPL' : 'SOL'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Attempts:</span>
                    <span className="ml-2 text-white">{transfer.attempts}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Expires:</span>
                    <span className={`ml-2 ${autoLinkUtils.isExpired(transfer.expires_at) ? 'text-red-400' : 'text-white'}`}>
                      {autoLinkUtils.getTimeRemaining(transfer.expires_at)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Wallet: {transfer.wallet_address.slice(0, 8)}...{transfer.wallet_address.slice(-8)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✨</div>
            <div>No pending transfers</div>
            <div className="text-sm mt-1">All transactions are up to date!</div>
          </div>
        )}
      </div>
    </div>
  );
};

interface WalletAutoLinkSettingsProps {
  walletId: string;
}

const WalletAutoLinkSettings: React.FC<WalletAutoLinkSettingsProps> = ({ walletId }) => {
  const { 
    settings, 
    pendingTransfers, 
    loading, 
    error, 
    toggleAutoLink, 
    updateConfidenceThreshold, 
    updateTimeWindow,
    clearError 
  } = useWalletAutoLink(walletId);

  if (!settings) {
    return (
      <div className="p-4 border border-dashed border-gray-500 rounded-lg text-center text-gray-400">
        <div className="text-2xl mb-2">⚙️</div>
        <div>Auto-link not configured for this wallet</div>
        <button
          onClick={() => toggleAutoLink(true)}
          disabled={loading}
          className="mt-2 px-3 py-1 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700 disabled:opacity-50"
        >
          Enable Auto-Link
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="font-bold">×</button>
          </div>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">Auto-Link Enabled</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => toggleAutoLink(e.target.checked)}
            disabled={loading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Confidence Score: {autoLinkUtils.formatConfidence(settings.min_confidence_score)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={settings.min_confidence_score}
              onChange={(e) => updateConfidenceThreshold(parseFloat(e.target.value))}
              disabled={loading}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50% (Risky)</span>
              <span>100% (Safe)</span>
            </div>
          </div>

          {/* Time Window */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Window: {settings.time_window_hours} hours
            </label>
            <select
              value={settings.time_window_hours}
              onChange={(e) => updateTimeWindow(parseInt(e.target.value))}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              <option value={1}>1 hour</option>
              <option value={3}>3 hours</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
            </select>
          </div>

          {/* Pending Transfers for this wallet */}
          {pendingTransfers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Pending for this wallet ({pendingTransfers.length})
              </h4>
              <div className="space-y-1">
                {pendingTransfers.slice(0, 3).map((transfer) => (
                  <div key={transfer.id} className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      {transfer.signature.slice(0, 8)}... • {transfer.amount} SOL
                    </span>
                    <span className={autoLinkUtils.getStatusColor(transfer.auto_link_status)}>
                      {transfer.auto_link_status}
                    </span>
                  </div>
                ))}
                {pendingTransfers.length > 3 && (
                  <div className="text-xs text-gray-500">
                    ...and {pendingTransfers.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AutoLinkDashboard;