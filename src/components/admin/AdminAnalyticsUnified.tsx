/**
 * ANALYTICS UNIFIED TRACKING MANAGER
 * Master control panel for IP-based analytics system
 * Shows all modules, event types, toggles, reset buttons, and real-time counts
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Eye, Heart, Download, Share2, Play, CheckCircle, 
  HeartOff, BookOpen, Music, Send, MessageCircle, 
  MousePointer, RefreshCw, Trash2, AlertCircle, 
  CheckCircle2, XCircle, Loader2, Database, 
  BarChart3, Settings, TrendingUp
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface AnalyticsConfig {
  id: string;
  module_name: string;
  event_type: string;
  display_name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_enabled: boolean;
  track_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

interface ModuleStats {
  total_events: number;
  unique_items: number;
  unique_ips: number;
  events_by_type: Record<string, number>;
}

interface DashboardData {
  total_events: number;
  unique_ips: number;
  modules: Record<string, ModuleStats>;
}

const iconMap: Record<string, any> = {
  Eye, Heart, HeartOff, Download, Share2, Play, CheckCircle,
  BookOpen, Music, Send, MessageCircle, MousePointer
};

export default function AdminAnalyticsUnified() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<AnalyticsConfig[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  async function loadAnalyticsData() {
    setLoading(true);
    setError(null);
    
    try {
      // Check system status first
      const statusRes = await fetch(`${baseUrl}/api/analytics/admin/status`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const statusData = await statusRes.json();
      setSystemStatus(statusData.status);

      if (!statusData.status?.installed) {
        setError('Analytics system is not installed. Please run the migration SQL file.');
        setLoading(false);
        return;
      }

      // Load configuration
      const configRes = await fetch(`${baseUrl}/api/analytics/admin/config`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const configData = await configRes.json();
      
      if (configData.success) {
        setConfigs(configData.all || []);
      }

      // Load dashboard
      const dashboardRes = await fetch(`${baseUrl}/api/analytics/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const dashboardData = await dashboardRes.json();
      
      if (dashboardData.success) {
        setDashboard(dashboardData.dashboard);
      }
    } catch (err: any) {
      console.error('Load analytics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEventTracking(config: AnalyticsConfig) {
    try {
      const res = await fetch(`${baseUrl}/api/analytics/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: config.module_name,
          event_type: config.event_type,
          updates: { is_enabled: !config.is_enabled }
        })
      });

      const data = await res.json();
      
      if (data.success) {
        // Update local state
        setConfigs(prev => prev.map(c => 
          c.id === config.id ? { ...c, is_enabled: !c.is_enabled } : c
        ));
      } else {
        alert(`Failed to update: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function resetModuleStats(moduleName: string, itemId?: string, eventType?: string) {
    if (!confirm(`Are you sure you want to reset ${eventType || 'all'} stats for ${moduleName}${itemId ? ` (${itemId})` : ' (all items)'}?`)) {
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/analytics/admin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: moduleName,
          item_id: itemId || '00000000-0000-0000-0000-000000000000', // Placeholder if resetting all
          event_type: eventType || null
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert(`Reset successful! Deleted ${data.result.deleted_count} records.`);
        loadAnalyticsData();
      } else {
        alert(`Reset failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function refreshCache() {
    setRefreshing(true);
    try {
      const res = await fetch(`${baseUrl}/api/analytics/admin/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Analytics cache refreshed successfully!');
        loadAnalyticsData();
      } else {
        alert(`Refresh failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function initializeSystem() {
    if (!confirm('This will attempt to initialize the analytics system. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/analytics/admin/initialize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Analytics system initialized! Please check the migration status.');
        loadAnalyticsData();
      } else {
        alert(`Initialization failed: ${data.message}\n\nPlease run the migration SQL file manually.`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Group configs by module
  const configsByModule = configs.reduce((acc, config) => {
    if (!acc[config.module_name]) {
      acc[config.module_name] = [];
    }
    acc[config.module_name].push(config);
    return acc;
  }, {} as Record<string, AnalyticsConfig[]>);

  const modules = Object.keys(configsByModule).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0d5e38]" />
          <p className="text-gray-600">Loading analytics system...</p>
        </div>
      </div>
    );
  }

  if (error && !systemStatus?.installed) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Analytics System Not Installed</strong>
            <p className="mt-2">The unified analytics database has not been set up yet.</p>
            <p className="mt-2">Please open Supabase SQL Editor and run the migration file:</p>
            <code className="block bg-black/10 p-2 rounded mt-2 text-sm">
              /MIGRATION_READY_TO_COPY.sql
            </code>
          </AlertDescription>
        </Alert>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Installation Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open your <strong>User Panel Supabase</strong> project (not Admin)</li>
            <li>Navigate to <strong>SQL Editor</strong></li>
            <li>Copy the entire contents of <code>/MIGRATION_READY_TO_COPY.sql</code></li>
            <li>Paste into SQL Editor and click <strong>RUN</strong></li>
            <li>Wait for "Analytics system installed successfully!" message</li>
            <li>Return here and click the "Verify Installation" button below</li>
          </ol>
          
          <div className="flex gap-3 mt-6">
            <Button onClick={loadAnalyticsData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verify Installation
            </Button>
            <Button onClick={initializeSystem} variant="default">
              <Database className="h-4 w-4 mr-2" />
              Auto-Initialize (Experimental)
            </Button>
          </div>
        </Card>

        {systemStatus && (
          <Card className="p-4 bg-gray-50">
            <h4 className="font-semibold mb-2 text-sm">System Status</h4>
            <pre className="text-xs overflow-auto">{JSON.stringify(systemStatus, null, 2)}</pre>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Unified Analytics Manager</h2>
          <p className="text-gray-600 mt-1">
            IP-based tracking system for all modules
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={loadAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button onClick={refreshCache} variant="outline" size="sm" disabled={refreshing}>
            <Database className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Cache
          </Button>
        </div>
      </div>

      {/* System Health */}
      {systemStatus && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Analytics System Active</p>
              <p className="text-sm text-green-700">
                All tables and functions are operational
              </p>
            </div>
            {dashboard && (
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="font-bold text-green-900">{dashboard.total_events?.toLocaleString()}</p>
                  <p className="text-green-700">Total Events</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-900">{dashboard.unique_ips?.toLocaleString()}</p>
                  <p className="text-green-700">Unique IPs</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modules.map(moduleName => {
                const stats = dashboard.modules?.[moduleName];
                if (!stats) return null;

                return (
                  <Card key={moduleName} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold capitalize">{moduleName}</h3>
                      <Button
                        onClick={() => resetModuleStats(moduleName)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Events</span>
                        <span className="font-semibold">{stats.total_events?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unique Items</span>
                        <span className="font-semibold">{stats.unique_items?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unique IPs</span>
                        <span className="font-semibold">{stats.unique_ips?.toLocaleString()}</span>
                      </div>
                    </div>

                    {stats.events_by_type && (
                      <>
                        <Separator className="my-3" />
                        <div className="space-y-1">
                          {Object.entries(stats.events_by_type).map(([eventType, count]) => (
                            <div key={eventType} className="flex justify-between text-xs">
                              <span className="text-gray-500 capitalize">{eventType}</span>
                              <Badge variant="secondary" className="text-xs">
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6 mt-6">
          {modules.map(moduleName => {
            const moduleConfigs = configsByModule[moduleName];
            const stats = dashboard?.modules?.[moduleName];

            return (
              <Card key={moduleName} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">{moduleName}</h3>
                    {stats && (
                      <p className="text-sm text-gray-600 mt-1">
                        {stats.total_events} events • {stats.unique_items} items • {stats.unique_ips} unique users
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => resetModuleStats(moduleName)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset All
                  </Button>
                </div>

                <div className="space-y-2">
                  {moduleConfigs.map(config => {
                    const Icon = iconMap[config.icon] || Eye;
                    const eventCount = stats?.events_by_type?.[config.event_type] || 0;

                    return (
                      <div key={config.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50">
                        <Icon className="h-5 w-5 text-gray-400" />
                        
                        <div className="flex-1">
                          <p className="font-medium">{config.display_name}</p>
                          <p className="text-xs text-gray-500">{config.description}</p>
                        </div>

                        <Badge variant={config.is_enabled ? 'default' : 'secondary'}>
                          {eventCount.toLocaleString()}
                        </Badge>

                        <Switch
                          checked={config.is_enabled}
                          onCheckedChange={() => toggleEventTracking(config)}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Event Types Configuration</h3>
            
            <div className="space-y-3">
              {configs.map(config => {
                const Icon = iconMap[config.icon] || Eye;
                
                return (
                  <div key={config.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <Icon className="h-4 w-4 text-gray-400" />
                    
                    <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">{config.module_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{config.event_type}</p>
                      </div>
                      <div>
                        <p>{config.display_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={config.is_enabled ? 'default' : 'secondary'} className="text-xs">
                          {config.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant={config.track_anonymous ? 'outline' : 'secondary'} className="text-xs">
                          {config.track_anonymous ? 'Anonymous' : 'Auth Only'}
                        </Badge>
                      </div>
                    </div>

                    <Switch
                      checked={config.is_enabled}
                      onCheckedChange={() => toggleEventTracking(config)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
