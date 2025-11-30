import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Calendar,
  TrendingUp, 
  TrendingDown,
  Minus,
  Image,
  Sparkles,
  Music,
  Layout,
  MessageCircle,
  User,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Eye
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrackingModule, TrackingStats, TRACKING_MODULES, ModuleConfig } from '../../types/tracking';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const iconMap: Record<string, any> = {
  Image,
  Sparkles,
  Music,
  Layout,
  MessageCircle,
  User,
  Smartphone
};

export function TrackingSystemDashboard() {
  const [stats, setStats] = useState<TrackingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedModule, setSelectedModule] = useState<TrackingModule | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const loadStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/stats`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      setStats(data.stats || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getModuleConfig = (moduleId: TrackingModule): ModuleConfig => {
    return TRACKING_MODULES.find(m => m.id === moduleId) || TRACKING_MODULES[0];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const totalEvents = stats.reduce((sum, s) => sum + s.total_events, 0);
  const todayEvents = stats.reduce((sum, s) => sum + s.today_events, 0);
  const activeModules = stats.filter(s => s.status === 'active').length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0d5e38]" style={{ fontFamily: 'var(--font-english)' }}>
            Tracking System
          </h1>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
            Unified analytics and event tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCalendar(!showCalendar)}
            variant={showCalendar ? "default" : "outline"}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </Button>
          <Button
            onClick={loadStats}
            variant="outline"
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-[#0d5e38]">{totalEvents.toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-[#0d5e38] opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Events</p>
              <p className="text-[#0d5e38]">{todayEvents.toLocaleString()}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-[#0d5e38] opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Modules</p>
              <p className="text-[#0d5e38]">{activeModules} / {TRACKING_MODULES.length}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#0d5e38] opacity-20" />
          </div>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((moduleStat) => {
          const config = getModuleConfig(moduleStat.module);
          const Icon = iconMap[config.icon] || Activity;

          return (
            <Card
              key={moduleStat.module}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedModule(moduleStat.module)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 text-${config.color.replace('bg-', '')}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{config.name}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>
                {getStatusIcon(moduleStat.status)}
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Events</span>
                  <span className="font-semibold">{moduleStat.total_events.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Today</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{moduleStat.today_events}</span>
                    {moduleStat.trend !== 'stable' && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(moduleStat.trend)}
                        <span className={`text-xs ${
                          moduleStat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {moduleStat.trend_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="font-semibold">{moduleStat.active_users}</span>
                </div>
              </div>

              {/* Top Actions */}
              {moduleStat.top_actions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Top Actions</p>
                  <div className="flex flex-wrap gap-1">
                    {moduleStat.top_actions.slice(0, 3).map((action) => (
                      <Badge
                        key={action.action}
                        variant="secondary"
                        className="text-xs"
                      >
                        {action.action}: {action.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Event */}
              {moduleStat.last_event && (
                <div className="mt-3 text-xs text-gray-400">
                  Last event: {new Date(moduleStat.last_event).toLocaleString()}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Module Detail View (Optional) */}
      {selectedModule && (
        <ModuleDetailView
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0d5e38]" />
        </div>
      )}
    </div>
  );
}

// Module Detail View Component
function ModuleDetailView({ 
  module, 
  onClose 
}: { 
  module: TrackingModule; 
  onClose: () => void;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [module]);

  const loadEvents = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/events/${module}?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const config = TRACKING_MODULES.find(m => m.id === module);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#0d5e38]">{config?.name} - Recent Events</h2>
              <p className="text-sm text-gray-600">{config?.description}</p>
            </div>
            <Button onClick={onClose} variant="ghost">Close</Button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0d5e38]" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={event.id || index}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{event.action}</Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  {event.content_id && (
                    <p className="text-sm text-gray-600">Content ID: {event.content_id}</p>
                  )}
                  {event.user_id && (
                    <p className="text-sm text-gray-600">User ID: {event.user_id}</p>
                  )}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}