'use client';

import React, { useState, useEffect } from 'react';
import { useAutoLinkTransfers, AutoLinkSettings } from '@/hooks/useAutoLinkTransfers';

// UI Components (using simple div elements instead of external components)
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow border ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 border-b ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, className = '', variant = 'default', ...props }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded font-medium transition-colors ${
      variant === 'outline' 
        ? 'border border-gray-300 hover:bg-gray-50' 
        : 'bg-blue-600 text-white hover:bg-blue-700'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Alert = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded ${className}`}>
    {children}
  </div>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-yellow-800 text-sm">{children}</p>
);

const Switch = ({ checked, onCheckedChange, ...props }: any) => (
  <label className="inline-flex items-center">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className="sr-only"
      {...props}
    />
    <div className={`relative w-11 h-6 transition-colors rounded-full ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full ${className}`}>
    <div 
      className="bg-blue-600 h-full rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// Icons (simple SVG components)
const Settings = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Activity = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CheckCircle = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingUp = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const Zap = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const Clock = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangle = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const Wallet = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const Eye = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>{children}</span>
);

interface PendingTransfer {
  id: string;
  signature: string;
  wallet_address: string;
  amount: number;
  token_mint?: string;
  transfer_type: 'incoming' | 'outgoing';
  confidence_score: number;
  auto_link_status: 'pending' | 'linked' | 'ignored' | 'manual_review';
  created_at: string;
  expires_at: string;
}

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
    processing,
    error,
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
  const [localSettings, setLocalSettings] = useState<AutoLinkSettings | null>(autoLinkData?.settings?.[0] || null);

  // Use pending_transfers from autoLinkData
  const pendingTransfers = autoLinkData.pending_transfers || [];

  useEffect(() => {
    if (autoLinkData?.pending_transfers && autoLinkData.pending_transfers.length > 0) {
      const totalProcessed = autoLinkData.pending_transfers.length;
      const autoLinked = autoLinkData.pending_transfers.filter((t: any) => t.auto_link_status === 'linked').length;
      const manualReview = autoLinkData.pending_transfers.filter((t: any) => t.auto_link_status === 'manual_review').length;
      const successRate = totalProcessed > 0 ? (autoLinked / totalProcessed) * 100 : 0;
      const avgConfidence = autoLinkData.pending_transfers.reduce((sum: number, t: any) => sum + t.confidence_score, 0) / totalProcessed;

      setStats({
        total_processed: totalProcessed,
        auto_linked: autoLinked,
        manual_review: manualReview,
        success_rate: successRate,
        avg_confidence: avgConfidence * 100
      });
    }
  }, [autoLinkData?.pending_transfers]);

  useEffect(() => {
    setLocalSettings(autoLinkData?.settings?.[0]);
  }, [autoLinkData?.settings]);

  const handleSettingsUpdate = async () => {
    if (localSettings) {
      await updateSettings({
        wallet_id: localSettings.wallet_id,
        enabled: localSettings.enabled,
        min_confidence_score: localSettings.min_confidence_score,
        time_window_hours: localSettings.time_window_hours,
        notification_enabled: localSettings.notification_enabled,
        auto_confirm_enabled: localSettings.auto_confirm_enabled
      });
      setShowSettings(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'linked': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'manual_review': return 'bg-yellow-100 text-yellow-800';
      case 'ignored': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number, tokenMint?: string) => {
    if (tokenMint) {
      return `${amount.toFixed(4)} SPL`;
    }
    return `${amount.toFixed(4)} SOL`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const linkTransferManually = async (transferId: string) => {
    console.log('Manually linking transfer:', transferId);
    // TODO: Implement API call to approve transfer
    await loadAutoLinkData();
  };

  const ignoreTransfer = async (transferId: string) => {
    console.log('Ignoring transfer:', transferId);
    // TODO: Implement API call to ignore transfer
    await loadAutoLinkData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading auto-link data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Auto-Link Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered transaction linking with confidence scoring
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="text-2xl font-bold">{stats.total_processed}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-Linked</p>
                <p className="text-2xl font-bold text-green-600">{stats.auto_linked}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{stats.avg_confidence.toFixed(1)}%</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      {showSettings && localSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Auto-Link Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Enable Auto-Linking</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically link high-confidence transactions
                </p>
              </div>
              <Switch
                checked={localSettings.enabled}
                onCheckedChange={(checked: boolean) => 
                  setLocalSettings((prev: AutoLinkSettings | null) => prev ? { ...prev, enabled: checked } : null)
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Minimum Confidence Score: {((localSettings.min_confidence_score || 0.8) * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={(localSettings.min_confidence_score || 0.8) * 100}
                onChange={(e) => 
                  setLocalSettings((prev: AutoLinkSettings | null) => prev ? { 
                    ...prev, 
                    min_confidence_score: parseInt(e.target.value) / 100 
                  } : null)
                }
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Time Window: {localSettings.time_window_hours || 6} hours
              </label>
              <input
                type="range"
                min="1"
                max="24"
                value={localSettings.time_window_hours || 6}
                onChange={(e) => 
                  setLocalSettings((prev: AutoLinkSettings | null) => prev ? { 
                    ...prev, 
                    time_window_hours: parseInt(e.target.value) 
                  } : null)
                }
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSettingsUpdate} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Transfers ({pendingTransfers.filter(t => t.auto_link_status === 'pending' || t.auto_link_status === 'manual_review').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTransfers.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No pending transfers found. Auto-linking is working smoothly!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingTransfers
                .filter(t => t.auto_link_status === 'pending' || t.auto_link_status === 'manual_review')
                .map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(transfer.auto_link_status)}>
                        {transfer.auto_link_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getConfidenceColor(transfer.confidence_score)}>
                        {(transfer.confidence_score * 100).toFixed(1)}% confidence
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(transfer.created_at)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Amount</p>
                      <p className="text-lg">{formatAmount(transfer.amount, transfer.token_mint)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="capitalize">{transfer.transfer_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Wallet</p>
                      <p className="font-mono text-sm truncate">
                        {transfer.wallet_address}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confidence Score</span>
                      <span>{(transfer.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={transfer.confidence_score * 100} className="h-2" />
                  </div>

                  {transfer.auto_link_status === 'manual_review' && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => linkTransferManually(transfer.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Link
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => ignoreTransfer(transfer.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Ignore
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Recent Auto-Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTransfers
              .filter(t => t.auto_link_status === 'linked')
              .slice(0, 5)
              .map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">{formatAmount(transfer.amount, transfer.token_mint)}</p>
                      <p className="text-sm text-muted-foreground">{transfer.transfer_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800">
                      {(transfer.confidence_score * 100).toFixed(1)}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(transfer.created_at)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}