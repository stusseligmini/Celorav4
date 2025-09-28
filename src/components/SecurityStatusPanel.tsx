'use client';

import React, { useState, useEffect } from 'react';
import { logSecurity } from '@/lib/logger';

interface SecurityStatusProps {
  showDetails?: boolean;
}

interface SecurityStatus {
  status: 'operational' | 'warning' | 'error' | 'pending';
  timestamp: string;
  correlationId: string;
  responseTime: string;
  components: Record<string, { status: string; message?: string }>;
}

/**
 * Component that displays the current security status of the application
 * This is useful for debugging and development purposes
 */
export default function SecurityStatusPanel({ showDetails = false }: SecurityStatusProps) {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(showDetails);
  
  useEffect(() => {
    async function checkSecurityStatus() {
      try {
        const response = await fetch('/api/health/security');
        
        if (!response.ok) {
          throw new Error(`Security check failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        setSecurityStatus(data);
        setLoading(false);
        
        // Log security check to the console in development
        if (process.env.NODE_ENV === 'development') {
          console.info('Security status check:', data);
        }
        
        // If there are errors or warnings, log them
        if (data.status !== 'operational') {
          logSecurity('Security status check detected issues', {
            action: 'security_check',
            componentName: 'SecurityStatusPanel'
          }, data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error checking security status');
        setLoading(false);
        
        logSecurity('Security status check failed', {
          action: 'security_check_error',
          componentName: 'SecurityStatusPanel'
        }, { error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }
    
    checkSecurityStatus();
    
    // Refresh security status every 60 seconds
    const intervalId = setInterval(checkSecurityStatus, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  if (loading) {
    return (
      <div className="rounded-lg bg-slate-800 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Security Status</h3>
          <div className="animate-pulse h-3 w-3 rounded-full bg-gray-500"></div>
        </div>
        <p className="text-sm text-slate-400 mt-2">Loading security status...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rounded-lg bg-slate-800 p-4 shadow-lg border border-red-500">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Security Status</h3>
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
        </div>
        <p className="text-sm text-red-400 mt-2">{error}</p>
      </div>
    );
  }
  
  if (!securityStatus) {
    return null;
  }
  
  return (
    <div className="rounded-lg bg-slate-800 p-4 shadow-lg">
      <div 
        className="flex items-center justify-between cursor-pointer" 
        onClick={() => setExpanded(prev => !prev)}
      >
        <h3 className="font-semibold text-white">Security Status</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${getStatusColor(securityStatus.status)}`}></div>
          <span className="text-xs text-slate-300">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Last checked:</span>
            <span className="text-slate-300">
              {new Date(securityStatus.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Response time:</span>
            <span className="text-slate-300">{securityStatus.responseTime}</span>
          </div>
          
          <div className="mt-2">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Components:</h4>
            <div className="space-y-1">
              {Object.entries(securityStatus.components).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-400">{key}:</span>
                  <span className={`${
                    value.status === 'operational' ? 'text-green-400' :
                    value.status === 'warning' ? 'text-yellow-400' :
                    value.status === 'error' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {value.status}{value.message ? ` - ${value.message}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-2 text-xs text-slate-500">
            <p>Correlation ID: {securityStatus.correlationId.substring(0, 8)}...</p>
          </div>
        </div>
      )}
    </div>
  );
}