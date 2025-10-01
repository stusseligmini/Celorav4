'use client'

import { getSupabaseClient } from '@/lib/supabaseSingleton';
import { useEffect, useState } from 'react';
import SecurityStatusPanel from './SecurityStatusPanel';

interface DebugInfo {
  supabaseConnected: boolean;
  userSession: any;
  realTimeConnections: string[];
  apiEndpoints: { [key: string]: 'online' | 'offline' | 'error' };
  performanceMetrics: {
    pageLoadTime: number;
    apiLatency: { [key: string]: number };
    memoryUsage?: number;
  };
}

export function useDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    supabaseConnected: false,
    userSession: null,
    realTimeConnections: [],
    apiEndpoints: {},
    performanceMetrics: {
      pageLoadTime: 0,
      apiLatency: {}
    }
  });

  useEffect(() => {
    const startTime = performance.now();
    
    async function checkConnections() {
      let supabase: ReturnType<typeof getSupabaseClient> | null = null;
      try {
        supabase = getSupabaseClient();
      } catch (e) {
        // Likely missing env or init error; reflect in debug info and bail early
        setDebugInfo(prev => ({
          ...prev,
          supabaseConnected: false,
          performanceMetrics: {
            ...prev.performanceMetrics,
            pageLoadTime: performance.now() - startTime,
          }
        }));
        return;
      }

      try {
        // Test Supabase connection
        const { data, error } = await supabase.auth.getSession();
        const supabaseConnected = !error;
        
        // Test API endpoints
        const endpoints = ['/api/health', '/api/cards/fund', '/api/transactions/create'];
        const apiStatus: { [key: string]: 'online' | 'offline' | 'error' } = {};
        
        for (const endpoint of endpoints) {
          try {
            const start = performance.now();
            const response = await fetch(endpoint, { method: 'GET' });
            const latency = performance.now() - start;
            
            setDebugInfo(prev => ({
              ...prev,
              performanceMetrics: {
                ...prev.performanceMetrics,
                apiLatency: { ...prev.performanceMetrics.apiLatency, [endpoint]: latency }
              }
            }));
            
            apiStatus[endpoint] = response.ok ? 'online' : 'error';
          } catch {
            apiStatus[endpoint] = 'offline';
          }
        }

        // Get memory info if available
        const memoryUsage = (performance as any).memory?.usedJSHeapSize;

        setDebugInfo({
          supabaseConnected,
          userSession: data.session?.user || null,
          realTimeConnections: [], // Would track active subscriptions
          apiEndpoints: apiStatus,
          performanceMetrics: {
            pageLoadTime: performance.now() - startTime,
            apiLatency: debugInfo.performanceMetrics.apiLatency,
            memoryUsage
          }
        });
      } catch (error) {
        console.error('Debug info check failed:', error);
      }
    }

    checkConnections();
    
    // Update every 30 seconds
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  return debugInfo;
}

export function DebugPanel() {
  const debugInfo = useDebugInfo();
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <>
      {/* Debug toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50 hover:bg-gray-700"
        title="Debug Panel"
      >
        🐛
      </button>

      {/* Debug panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">Debug Info</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {/* Connection Status */}
            <div>
              <h4 className="font-semibold mb-1">Connections</h4>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${debugInfo.supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Supabase: {debugInfo.supabaseConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>

            {/* User Session */}
            <div>
              <h4 className="font-semibold mb-1">User Session</h4>
              <div className="text-xs bg-gray-100 p-2 rounded">
                {debugInfo.userSession ? (
                  <div>
                    <div>ID: {debugInfo.userSession.id.slice(0, 8)}...</div>
                    <div>Email: {debugInfo.userSession.email}</div>
                  </div>
                ) : (
                  'Not authenticated'
                )}
              </div>
            </div>

            {/* API Endpoints */}
            <div>
              <h4 className="font-semibold mb-1">API Endpoints</h4>
              <div className="space-y-1">
                {Object.entries(debugInfo.apiEndpoints).map(([endpoint, status]) => (
                  <div key={endpoint} className="flex items-center justify-between">
                    <span className="text-xs">{endpoint}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      status === 'online' ? 'bg-green-100 text-green-800' :
                      status === 'offline' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="font-semibold mb-1">Performance</h4>
              <div className="text-xs space-y-1">
                <div>Page Load: {debugInfo.performanceMetrics.pageLoadTime.toFixed(2)}ms</div>
                {debugInfo.performanceMetrics.memoryUsage && (
                  <div>Memory: {(debugInfo.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
                )}
                {Object.entries(debugInfo.performanceMetrics.apiLatency).map(([endpoint, latency]) => (
                  <div key={endpoint}>
                    {endpoint}: {latency.toFixed(2)}ms
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time monitoring */}
            <div>
              <h4 className="font-semibold mb-1">Real-time</h4>
              <div className="text-xs">
                Active channels: {debugInfo.realTimeConnections.length}
              </div>
            </div>
            
            {/* Security Status */}
            <div className="pt-3 border-t border-gray-200">
              <SecurityStatusPanel showDetails={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}