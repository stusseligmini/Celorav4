'use client';

import React, { useState, useEffect } from 'react';
import { useAutoLinkTransfers } from '@/hooks/useAutoLinkTransfers';

interface AutoLinkStats {
  total_processed: number;
  auto_linked: number;
  manual_review: number;
  success_rate: number;
  avg_confidence: number;
}

export default function AutoLinkDashboard() {
  const { 
    autoLinkData,
    loading,
    loadAutoLinkData,
    updateSettings,
    clearError
  } = useAutoLinkTransfers();

  const [stats, setStats] = useState<AutoLinkStats>({
    total_processed: 0,
    auto_linked: 0,
    manual_review: 0,
    success_rate: 0,
    avg_confidence: 0
  });

  const [showSettings, setShowSettings] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.8);
  const [autoLinkEnabled, setAutoLinkEnabled] = useState(true);

  useEffect(() => {
    loadAutoLinkData();
  }, [loadAutoLinkData]);

  useEffect(() => {
    if (autoLinkData.pending_transfers.length > 0) {
      const pendingTransfers = autoLinkData.pending_transfers;
      const totalProcessed = pendingTransfers.length;
      const autoLinked = pendingTransfers.filter((t: any) => t.auto_link_status === 'linked').length;
      const manualReview = pendingTransfers.filter((t: any) => t.auto_link_status === 'manual_review').length;
      const successRate = totalProcessed > 0 ? (autoLinked / totalProcessed) * 100 : 0;
      const avgConfidence = pendingTransfers.reduce((sum: number, t: any) => sum + t.confidence_score, 0) / totalProcessed;

      setStats({
        total_processed: totalProcessed,
        auto_linked: autoLinked,
        manual_review: manualReview,
        success_rate: successRate,
        avg_confidence: avgConfidence * 100
      });
    }
  }, [autoLinkData.pending_transfers]);

  const formatAmount = (amount: number, tokenMint?: string) => {
    if (tokenMint) {
      return `${amount.toFixed(4)} SPL`;
    }
    return `${amount.toFixed(4)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'linked':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium';
      case 'pending':
        return 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium';
      case 'manual_review':
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium';
      case 'ignored':
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium';
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium';
    }
  };

  const handleLinkTransfer = async (transferId: string) => {
    // This would call an API to manually approve the transfer
    console.log('Linking transfer:', transferId);
    loadAutoLinkData();
  };

  const handleIgnoreTransfer = async (transferId: string) => {
    // This would call an API to ignore the transfer  
    console.log('Ignoring transfer:', transferId);
    loadAutoLinkData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading auto-link data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Auto-Link Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered transaction linking with confidence scoring
          </p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Processed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_processed}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Auto-Linked</p>
              <p className="text-2xl font-bold text-green-600">{stats.auto_linked}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-blue-600">{stats.success_rate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.avg_confidence.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Auto-Link Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Enable Auto-Linking</h4>
                <p className="text-sm text-gray-600">Automatically link high-confidence transactions</p>
              </div>
              <button
                onClick={() => setAutoLinkEnabled(!autoLinkEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  autoLinkEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    autoLinkEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Minimum Confidence Score: {(minConfidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={minConfidence * 100}
                onChange={(e) => setMinConfidence(parseInt(e.target.value) / 100)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Transfers */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending Transfers ({autoLinkData.pending_transfers.filter((t: any) => t.auto_link_status === 'pending' || t.auto_link_status === 'manual_review').length})
          </h3>
        </div>
        <div className="p-6">
          {autoLinkData.pending_transfers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h4>
              <p className="text-gray-600">No pending transfers found. Auto-linking is working smoothly!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {autoLinkData.pending_transfers
                .filter((t: any) => t.auto_link_status === 'pending' || t.auto_link_status === 'manual_review')
                .map((transfer: any) => (
                <div key={transfer.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={getStatusBadgeClass(transfer.auto_link_status)}>
                        {transfer.auto_link_status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(transfer.confidence_score)} bg-gray-100`}>
                        {(transfer.confidence_score * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(transfer.created_at)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Amount</p>
                      <p className="text-lg font-semibold">{formatAmount(transfer.amount, transfer.token_mint)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Type</p>
                      <p className="capitalize">{transfer.transfer_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Wallet</p>
                      <p className="font-mono text-sm truncate text-gray-600">
                        {transfer.wallet_address}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Confidence Score</span>
                      <span className="font-medium">{(transfer.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${transfer.confidence_score * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {transfer.auto_link_status === 'manual_review' && (
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleLinkTransfer(transfer.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Link
                      </button>
                      <button 
                        onClick={() => handleIgnoreTransfer(transfer.id)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                        Ignore
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Recent Auto-Links
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {autoLinkData.pending_transfers
              .filter((t: any) => t.auto_link_status === 'linked')
              .slice(0, 5)
              .map((transfer: any) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{formatAmount(transfer.amount, transfer.token_mint)}</p>
                      <p className="text-sm text-gray-600 capitalize">{transfer.transfer_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      {(transfer.confidence_score * 100).toFixed(1)}%
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(transfer.created_at)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}