'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useFeatureFlag } from '@/lib/featureFlags';
import { useMultiCurrency } from '@/hooks/useMultiCurrency';
import { useNotifications } from '@/hooks/useNotifications';

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalVolume: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: string;
}

interface FeatureFlag {
  name: string;
  description: string;
  is_enabled: boolean;
  user_percentage?: number;
  targeting_rules?: any[];
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  timestamp: string;
  resolved: boolean;
}

export default function AdvancedAdminDashboard() {
  // Feature flag checks
  const isAdminDashboardEnabled = useFeatureFlag('admin_dashboard_advanced', { defaultValue: true });
  const isSystemMonitoringEnabled = useFeatureFlag('system_monitoring', { defaultValue: true });
  const isFeatureFlagManagementEnabled = useFeatureFlag('feature_flag_management', { defaultValue: true });

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const { currencies, exchangeRates, loading: currencyLoading } = useMultiCurrency();
  const { notifications, unreadCount } = useNotifications();

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load system metrics
      const metricsResponse = await fetch('/api/admin/metrics');
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        setSystemMetrics(metrics.data);
      }

      // Load feature flags
      const flagsResponse = await fetch('/api/admin/feature-flags');
      if (flagsResponse.ok) {
        const flags = await flagsResponse.json();
        setFeatureFlags(flags.data);
      }

      // Load security events
      const securityResponse = await fetch('/api/admin/security/events');
      if (securityResponse.ok) {
        const events = await securityResponse.json();
        setSecurityEvents(events.data);
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureFlag = async (flagName: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: flagName, is_enabled: enabled })
      });

      if (response.ok) {
        setFeatureFlags(prev => prev.map(flag => 
          flag.name === flagName ? { ...flag, is_enabled: enabled } : flag
        ));
      }
    } catch (err) {
      console.error('Failed to toggle feature flag:', err);
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/security/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      });

      if (response.ok) {
        setSecurityEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, resolved: true } : event
        ));
      }
    } catch (err) {
      console.error('Failed to resolve security event:', err);
    }
  };

  if (!isAdminDashboardEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">Advanced admin dashboard is currently disabled.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !systemMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Advanced system monitoring and management</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} alerts</Badge>
          )}
          <Badge variant={systemMetrics?.systemHealth === 'healthy' ? 'default' : 'destructive'}>
            {systemMetrics?.systemHealth || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{systemMetrics?.totalUsers.toLocaleString() || '0'}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{systemMetrics?.activeUsers.toLocaleString() || '0'}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold">{systemMetrics?.totalTransactions.toLocaleString() || '0'}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold">{systemMetrics?.uptime || '00:00:00'}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="currencies">Multi-Currency</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>CPU Usage</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Memory Usage</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Database Connections</span>
                    <span>23/100</span>
                  </div>
                  <Progress value={23} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">New user registration</span>
                    <span className="text-xs text-gray-500 ml-auto">2 min ago</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Transaction completed</span>
                    <span className="text-xs text-gray-500 ml-auto">5 min ago</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Feature flag updated</span>
                    <span className="text-xs text-gray-500 ml-auto">10 min ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="feature-flags">
          {isFeatureFlagManagementEnabled ? (
            <Card>
              <CardHeader>
                <CardTitle>Feature Flag Management</CardTitle>
                <p className="text-sm text-gray-600">Control feature rollouts across the platform</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {featureFlags.map((flag) => (
                    <div key={flag.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{flag.name}</h3>
                          <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                            {flag.is_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                        {flag.user_percentage && (
                          <p className="text-xs text-gray-500 mt-1">
                            Rollout: {flag.user_percentage}% of users
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={(checked) => toggleFeatureFlag(flag.name, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-gray-600">Feature flag management is currently disabled.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <p className="text-sm text-gray-600">Monitor and respond to security incidents</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          event.severity === 'critical' ? 'destructive' :
                          event.severity === 'high' ? 'destructive' :
                          event.severity === 'medium' ? 'secondary' : 'default'
                        }>
                          {event.severity}
                        </Badge>
                        <span className="font-medium">{event.type}</span>
                        {event.resolved && (
                          <Badge variant="default">Resolved</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!event.resolved && (
                      <Button
                        size="sm"
                        onClick={() => resolveSecurityEvent(event.id)}
                        className="ml-4"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Currency Tab */}
        <TabsContent value="currencies">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Supported Currencies</CardTitle>
              </CardHeader>
              <CardContent>
                {currencyLoading ? (
                  <div className="text-center py-4">Loading currencies...</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currencies.map((currency) => (
                      <div key={currency.code} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{currency.code}</span>
                          <span className="text-sm text-gray-600 ml-2">{currency.name}</span>
                        </div>
                        <Badge variant={currency.type === 'crypto' ? 'secondary' : 'default'}>
                          {currency.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exchange Rate Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Last Update</span>
                    <span className="text-sm text-gray-600">2 minutes ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Pairs</span>
                    <span className="text-sm text-gray-600">
                      {Object.keys(exchangeRates).length} currencies
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Update Frequency</span>
                    <span className="text-sm text-gray-600">5 minutes</span>
                  </div>
                  <Button size="sm" className="w-full mt-4">
                    Force Rate Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
              <p className="text-sm text-gray-600">Monitor system notifications and alerts</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={
                      notification.priority === 'high' ? 'destructive' : 'default'
                    }>
                      {notification.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}