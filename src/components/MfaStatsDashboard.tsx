'use client';

/**
 * MFA Statistics Component
 * 
 * This component displays statistics about MFA usage in the system.
 * It is intended for administrators to monitor MFA adoption and security events.
 */

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseSingleton';

interface MfaStats {
  totalUsers: number;
  mfaEnabledUsers: number;
  mfaAdoptionRate: number;
  verificationAttempts: {
    total: number;
    successful: number;
    failed: number;
    failureRate: number;
  };
  recoveryCodeUsage: {
    total: number;
    last30Days: number;
  };
}

interface MfaVerificationData {
  date: string;
  successful: number;
  failed: number;
}

const MfaStatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<MfaStats | null>(null);
  const [verificationTrend, setVerificationTrend] = useState<MfaVerificationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7days' | '30days' | '90days'>('30days');
  
  const supabase = getSupabaseClient();
  
  // Fetch MFA statistics
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get total users and MFA enabled users
        const { data: userStats, error: userError } = await supabase.rpc('get_mfa_user_stats');
        
        if (userError) throw new Error(`Failed to fetch user stats: ${userError.message}`);
        
        // Get verification attempts
        const { data: verificationStats, error: verificationError } = await supabase.rpc(
          'get_mfa_verification_stats', 
          { days_back: timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : 90 }
        );
        
        if (verificationError) throw new Error(`Failed to fetch verification stats: ${verificationError.message}`);
        
        // Get recovery code usage
        const { data: recoveryStats, error: recoveryError } = await supabase.rpc('get_mfa_recovery_code_stats');
        
        if (recoveryError) throw new Error(`Failed to fetch recovery code stats: ${recoveryError.message}`);
        
        // Get verification trend data
        const { data: trendData, error: trendError } = await supabase.rpc(
          'get_mfa_verification_trend', 
          { days_back: timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : 90 }
        );
        
        if (trendError) throw new Error(`Failed to fetch trend data: ${trendError.message}`);
        
        // Set all stats
        if (userStats && verificationStats && recoveryStats) {
          setStats({
            totalUsers: userStats.total_users || 0,
            mfaEnabledUsers: userStats.mfa_enabled_users || 0,
            mfaAdoptionRate: userStats.mfa_adoption_rate || 0,
            verificationAttempts: {
              total: verificationStats.total_attempts || 0,
              successful: verificationStats.successful_attempts || 0,
              failed: verificationStats.failed_attempts || 0,
              failureRate: verificationStats.failure_rate || 0
            },
            recoveryCodeUsage: {
              total: recoveryStats.total_used || 0,
              last30Days: recoveryStats.last_30_days_used || 0
            }
          });
        }
        
        // Set trend data
        if (trendData) {
          setVerificationTrend(trendData);
        }
      } catch (err) {
        console.error('Error fetching MFA stats:', err);
        setError((err as Error)?.message || 'Failed to load MFA statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [timeframe, supabase]);
  
  if (loading) {
    return (
      <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800 text-white">
        <div className="flex items-center justify-center space-x-2">
          <div className="h-5 w-5 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="h-5 w-5 bg-blue-600 rounded-full animate-pulse delay-150"></div>
          <div className="h-5 w-5 bg-blue-600 rounded-full animate-pulse delay-300"></div>
          <span className="ml-2">Loading MFA statistics...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-900/20 rounded-lg border border-red-800 text-white">
        <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Statistics</h2>
        <p className="text-red-200">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!stats) return null;
  
  return (
    <div className="text-white">
      <h2 className="text-2xl font-mono font-bold text-cyan-400 mb-6">MFA STATISTICS & MONITORING</h2>
      
      {/* Timeframe selector */}
      <div className="mb-6">
        <div className="flex space-x-2 bg-gray-800/50 p-1 rounded-md inline-flex">
          <button
            onClick={() => setTimeframe('7days')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === '7days' 
                ? 'bg-cyan-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeframe('30days')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === '30days' 
                ? 'bg-cyan-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeframe('90days')}
            className={`px-3 py-1 rounded-md text-sm ${
              timeframe === '90days' 
                ? 'bg-cyan-700 text-white' 
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* MFA Adoption */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">ADOPTION RATE</h3>
          <div className="flex items-end">
            <div className="text-4xl font-bold">{stats.mfaAdoptionRate.toFixed(1)}%</div>
            <div className="ml-4 text-gray-400">
              {stats.mfaEnabledUsers} / {stats.totalUsers} users
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
              style={{ width: `${stats.mfaAdoptionRate}%` }}
            ></div>
          </div>
        </div>
        
        {/* Verification Success Rate */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">VERIFICATION SUCCESS</h3>
          <div className="flex items-end">
            <div className="text-4xl font-bold">
              {(100 - stats.verificationAttempts.failureRate).toFixed(1)}%
            </div>
            <div className="ml-4 text-gray-400">
              {stats.verificationAttempts.successful} / {stats.verificationAttempts.total} attempts
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                stats.verificationAttempts.failureRate > 10
                  ? 'bg-red-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${100 - stats.verificationAttempts.failureRate}%` }}
            ></div>
          </div>
        </div>
        
        {/* Recovery Code Usage */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">RECOVERY CODE USAGE</h3>
          <div className="flex flex-col">
            <div className="flex justify-between items-center">
              <span>Total Used:</span>
              <span className="font-bold text-xl">{stats.recoveryCodeUsage.total}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span>Last 30 Days:</span>
              <span className="font-bold text-xl">{stats.recoveryCodeUsage.last30Days}</span>
            </div>
          </div>
        </div>
        
        {/* Recent Verification Attempts */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
          <h3 className="text-lg font-mono text-cyan-400 mb-3">RECENT VERIFICATIONS</h3>
          <div className="flex justify-between">
            <div>
              <div className="text-green-400">{stats.verificationAttempts.successful}</div>
              <div className="text-sm text-gray-400">Successful</div>
            </div>
            <div>
              <div className="text-red-400">{stats.verificationAttempts.failed}</div>
              <div className="text-sm text-gray-400">Failed</div>
            </div>
            <div>
              <div className="text-blue-400">{stats.verificationAttempts.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Verification Trend Chart */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4 mb-8">
        <h3 className="text-lg font-mono text-cyan-400 mb-3">VERIFICATION TREND</h3>
        {verificationTrend.length > 0 ? (
          <div className="h-64">
            {/* Simple visual chart representation */}
            <div className="flex h-52 items-end space-x-1">
              {verificationTrend.map((day, index) => {
                const totalForDay = day.successful + day.failed;
                const maxValue = Math.max(
                  ...verificationTrend.map(d => d.successful + d.failed)
                );
                const heightPercent = totalForDay ? (totalForDay / maxValue) * 100 : 0;
                const successPercent = totalForDay ? (day.successful / totalForDay) * 100 : 0;
                const failedPercent = 100 - successPercent;
                
                return (
                  <div 
                    key={index} 
                    className="flex-1 flex flex-col-reverse"
                    title={`${day.date}: ${day.successful} successful, ${day.failed} failed`}
                  >
                    <div className="w-full" style={{ height: `${heightPercent}%` }}>
                      <div 
                        className="w-full bg-red-500" 
                        style={{ height: `${failedPercent}%` }}
                      ></div>
                      <div 
                        className="w-full bg-green-500" 
                        style={{ height: `${successPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* X-axis labels - show only a subset of dates for clarity */}
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              {verificationTrend
                .filter((_, i) => 
                  verificationTrend.length <= 10 ? true : i % Math.ceil(verificationTrend.length / 10) === 0
                )
                .map((day, index) => (
                  <div key={index} className="text-center">
                    {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No verification data available for the selected timeframe
          </div>
        )}
      </div>
      
      {/* Security Recommendations */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
        <h3 className="text-lg font-mono text-cyan-400 mb-3">SECURITY RECOMMENDATIONS</h3>
        <ul className="space-y-2">
          {stats.mfaAdoptionRate < 50 && (
            <li className="flex items-start">
              <div className="text-yellow-400 mr-2">⚠️</div>
              <div>
                <strong>Low MFA Adoption Rate</strong>
                <p className="text-sm text-gray-300">
                  Consider implementing an MFA enforcement policy to increase adoption.
                </p>
              </div>
            </li>
          )}
          
          {stats.verificationAttempts.failureRate > 10 && (
            <li className="flex items-start">
              <div className="text-red-400 mr-2">⚠️</div>
              <div>
                <strong>High Verification Failure Rate</strong>
                <p className="text-sm text-gray-300">
                  Review failed verification attempts for potential security incidents.
                </p>
              </div>
            </li>
          )}
          
          {stats.recoveryCodeUsage.last30Days > 5 && (
            <li className="flex items-start">
              <div className="text-yellow-400 mr-2">⚠️</div>
              <div>
                <strong>High Recovery Code Usage</strong>
                <p className="text-sm text-gray-300">
                  Unusual number of recovery codes used recently. Consider reviewing account activity.
                </p>
              </div>
            </li>
          )}
          
          {/* Default recommendations when everything looks good */}
          {(stats.mfaAdoptionRate >= 50 && 
            stats.verificationAttempts.failureRate <= 10 &&
            stats.recoveryCodeUsage.last30Days <= 5) && (
            <li className="flex items-start">
              <div className="text-green-400 mr-2">✓</div>
              <div>
                <strong>MFA System Healthy</strong>
                <p className="text-sm text-gray-300">
                  No significant security issues detected. Continue monitoring.
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MfaStatsDashboard;
