import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Database,
  Bell,
  Activity,
  Image,
  Music,
  Sparkles,
  Camera,
  Eye,
  Download,
  Share2,
  Heart,
  AlertTriangle,
  HardDrive,
  Zap,
  RefreshCw,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { SuperDashboardKPI } from './SuperDashboardKPI';
import { useSuperDashboardData } from './hooks/useSuperDashboardData';

export function AdminDashboardHome({ onNavigate }: { onNavigate: (view: any, queryId?: string) => void }) {
  const { northStar, engagement, content, notifications, operations, lastRefreshed, refresh } = useSuperDashboardData();
  const [dauView, setDauView] = useState<'7d' | '30d'>('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [sortColumn, setSortColumn] = useState<'views' | 'downloads' | 'shares' | 'engagementRate'>('views');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleKPIClick = (queryId: string) => {
    onNavigate('analytics-query-manager', queryId);
  };

  const handleModuleNavigate = (module: string) => {
    const viewMap: Record<string, any> = {
      'wallpapers': 'wallpapers',
      'media': 'media',
      'sparkle': 'sparkle',
      'banners': 'banners',
    };
    const view = viewMap[module.toLowerCase()];
    if (view) {
      onNavigate(view);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'wallpapers':
        return Image;
      case 'media':
        return Music;
      case 'sparkle':
        return Sparkles;
      case 'banners':
        return Camera;
      default:
        return Activity;
    }
  };

  const getModuleColor = (module: string) => {
    switch (module.toLowerCase()) {
      case 'wallpapers':
        return '#818cf8';
      case 'media':
        return '#34d399';
      case 'sparkle':
        return '#fbbf24';
      case 'banners':
        return '#f472b6';
      default:
        return '#10b981';
    }
  };

  const sortedContent = useMemo(() => {
    const sorted = [...content.topContent];
    sorted.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortColumn) {
        case 'views':
          aValue = a.views;
          bValue = b.views;
          break;
        case 'downloads':
          aValue = a.downloads;
          bValue = b.downloads;
          break;
        case 'shares':
          aValue = a.shares;
          bValue = b.shares;
          break;
        case 'engagementRate':
          aValue = a.engagementRate;
          bValue = b.engagementRate;
          break;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  }, [content.topContent, sortColumn, sortDirection]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Calculate DAU trend based on view selection
  const displayedDauTrend = dauView === '7d'
    ? engagement.dauTrend.slice(-7)
    : engagement.dauTrend;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Super Dashboard</h2>
        <p className="text-gray-500 mt-1">
          Real-time business intelligence and operational signals
        </p>
      </div>

      {/* Operational Alerts */}
      {operations.alerts.length > 0 && (
        <div className="space-y-2">
          {operations.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 ${alert.severity === 'critical'
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                }`}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* Section 1: North-Star & Growth Health */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Growth & North-Star Health
            </h3>
            <p className="text-sm text-gray-500 mt-1">Core engagement and user acquisition metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SuperDashboardKPI
            label="Daily Active Users"
            value={northStar.dau.toLocaleString()}
            color="green"
            icon={Users}
            tooltip="Users with >2min session today"
          />

          <SuperDashboardKPI
            label="Monthly Active Users"
            value={northStar.mau.toLocaleString()}
            color="blue"
            icon={Users}
            tooltip="Unique users in last 30 days"
          />

          <SuperDashboardKPI
            label="Stickiness"
            value={`${northStar.stickiness.toFixed(1)}%`}
            subValue={northStar.stickiness > 20 ? 'Target Achieved' : 'Below Target'}
            color={northStar.stickiness > 20 ? 'green' : northStar.stickiness > 10 ? 'orange' : 'red'}
            icon={TrendingUp}
            tooltip="Target: >20% is healthy"
          />

          <SuperDashboardKPI
            label="New Signups Today"
            value={northStar.newUsers.toLocaleString()}
            color="purple"
            icon={Users}
          />

          <SuperDashboardKPI
            label="Returning Users"
            value={northStar.returningUsers.toLocaleString()}
            subValue="Today"
            color="gray"
            icon={Users}
            tooltip="Logins minus new signups"
          />

          <SuperDashboardKPI
            label="Storage Lifespan"
            value={
              northStar.storageHealth.daysRemaining === Infinity
                ? "Healthy"
                : `${northStar.storageHealth.daysRemaining} days`
            }
            subValue={`${(northStar.storageHealth.currentBytes / (1024 ** 3)).toFixed(1)} GB used`}
            color={
              northStar.storageHealth.daysRemaining < 30
                ? 'red'
                : northStar.storageHealth.daysRemaining < 90
                  ? 'orange'
                  : 'green'
            }
            icon={HardDrive}
            tooltip="Days until storage full"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 2: Engagement & Retention Snapshot */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Engagement & Active Retention
            </h3>
            <p className="text-sm text-gray-500 mt-1">D1/D7 retention cycles and active user trends</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* DAU Trend Chart */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-bold text-gray-700">Daily Active Users Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={displayedDauTrend}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Retention Cards */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center group hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">D1 Retention</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900">{engagement.d1Retention.toFixed(1)}%</p>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(engagement.d1Retention * 2.5, 100)}%` }} />
                </div>
                <span className="text-[9px] text-gray-400 font-bold">Target 40%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center group hover:border-purple-200 transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">D7 Retention</span>
                <div className="p-2 rounded-lg bg-purple-50 text-purple-500">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900">{engagement.d7Retention.toFixed(1)}%</p>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(engagement.d7Retention * 5, 100)}%` }} />
                </div>
                <span className="text-[9px] text-gray-400 font-bold">Target 20%</span>
              </div>
            </div>
          </div>
        </div>
        {/* Module Contribution */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-md font-bold text-gray-700 mb-4">Module Contribution to Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={engagement.moduleContribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="module" type="category" stroke="#6b7280" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey="percentage" fill="#10b981" radius={[0, 4, 4, 0]}>
                {engagement.moduleContribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getModuleColor(entry.module)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 3: Content Performance */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-600" />
              High-Performing Content Assets
            </h3>
            <p className="text-sm text-gray-500 mt-1">Top performing wallpapers, media, and sparkles</p>
          </div>
        </div>

        {content.dormantCount > 0 && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <p className="text-xs text-yellow-800">
              <strong>{content.dormantCount}</strong> dormant content items detected (high storage, low engagement)
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-16 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pre</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                  <th
                    className="w-20 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('views')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Views</span>
                      {sortColumn === 'views' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? '' : 'rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th
                    className="w-20 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('downloads')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>DLs</span>
                      {sortColumn === 'downloads' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? '' : 'rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th
                    className="w-20 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('shares')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Share</span>
                      {sortColumn === 'shares' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? '' : 'rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th
                    className="w-24 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('engagementRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Engage</span>
                      {sortColumn === 'engagementRate' && (
                        <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? '' : 'rotate-180'}`} />
                      )}
                    </div>
                  </th>
                  <th className="w-24 px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {content.loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : content.topContent.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No content data available yet.
                    </td>
                  </tr>
                ) : (
                  sortedContent.map((item) => {
                    const ModuleIcon = getModuleIcon(item.module);
                    // Truncation: 6-8 characters + ...
                    const truncatedTitle = item.title.length > 8 ? `${item.title.substring(0, 7)}...` : item.title;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
                            {item.thumbnailUrl ? (
                              <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-[10px] font-bold text-gray-300">N/A</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-gray-800 truncate" title={item.title}>
                            {truncatedTitle}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-100 uppercase tracking-wider">
                            <ModuleIcon className="w-2.5 h-2.5" />
                            {item.module}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {item.views.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {item.downloads.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {item.shares.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-bold">
                            <span className="text-sm text-green-600">
                              {item.engagementRate.toFixed(1)}%
                            </span>
                            {item.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                            {item.trend === 'down' && <TrendingUp className="w-3.5 h-3.5 text-red-500 rotate-180" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleModuleNavigate(item.module)}
                            className="bg-gray-50 text-gray-600 hover:bg-green-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-gray-100 uppercase tracking-wider"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 4: Notification Impact */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Notification Marketing Funnel
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Campaign conversion rates and delivery performance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notification Funnel - Vertical Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Notification Funnel (Today)</h3>
            <div className="flex items-end justify-between gap-4 h-64">
              {[
                { label: 'Sent', value: notifications.funnel.sent, color: 'bg-blue-500', percentage: 100 },
                { label: 'Delivered', value: notifications.funnel.delivered, color: 'bg-indigo-500', percentage: notifications.funnel.sent > 0 ? (notifications.funnel.delivered / notifications.funnel.sent) * 100 : 0 },
                { label: 'Opened', value: notifications.funnel.opened, color: 'bg-purple-500', percentage: notifications.funnel.sent > 0 ? (notifications.funnel.opened / notifications.funnel.sent) * 100 : 0 },
                { label: 'Content Viewed', value: notifications.funnel.contentViewed, color: 'bg-pink-500', percentage: notifications.funnel.opened > 0 ? (notifications.funnel.contentViewed / notifications.funnel.opened) * 100 : 0 },
                { label: 'Downloaded', value: notifications.funnel.downloaded, color: 'bg-red-500', percentage: notifications.funnel.contentViewed > 0 ? (notifications.funnel.downloaded / notifications.funnel.contentViewed) * 100 : 0 },
              ].map((stage, index) => {
                const maxValue = notifications.funnel.sent || 1;
                const heightPercentage = (stage.value / maxValue) * 100;

                return (
                  <div key={stage.label} className="flex-1 flex flex-col items-center">
                    {/* Bar */}
                    <div className="w-full flex flex-col justify-end items-center h-48 mb-3">
                      <div className="w-full flex flex-col justify-end items-center" style={{ height: '100%' }}>
                        <div
                          className={`w-full ${stage.color} rounded-t-lg transition-all relative group cursor-pointer hover:opacity-90`}
                          style={{ height: `${heightPercentage}%`, minHeight: stage.value > 0 ? '24px' : '0px' }}
                        >
                          {/* Value on hover tooltip */}
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {stage.value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Label and Stats */}
                    <div className="text-center w-full">
                      <div className="text-xs font-bold text-gray-700 mb-1">{stage.label}</div>
                      <div className="text-lg font-bold text-gray-900">{stage.value.toLocaleString()}</div>
                      {stage.percentage !== 100 && (
                        <div className="text-xs text-gray-500 mt-0.5">({stage.percentage.toFixed(1)}%)</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best/Worst Performing */}
          <div className="space-y-6">
            {notifications.bestPerforming && (
              <div className="bg-green-50 rounded-xl shadow-sm p-6 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-green-900">Best Performing</h4>
                </div>
                <p className="text-sm text-green-800 mb-2 line-clamp-2">{notifications.bestPerforming?.title}</p>
                <div className="flex items-center justify-between text-xs text-green-700">
                  <span>{notifications.bestPerforming?.sentCount} sent</span>
                  <span className="font-bold">{notifications.bestPerforming?.openRate.toFixed(1)}% open rate</span>
                </div>
              </div>
            )}

            {notifications.worstPerforming && (
              <div className="bg-red-50 rounded-xl shadow-sm p-6 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-bold text-red-900">Needs Improvement</h4>
                </div>
                <p className="text-sm text-red-800 mb-2 line-clamp-2">{notifications.worstPerforming.title}</p>
                <div className="flex items-center justify-between text-xs text-red-700">
                  <span>{notifications.worstPerforming?.sentCount} sent</span>
                  <span className="font-bold">{notifications.worstPerforming?.openRate.toFixed(1)}% open rate</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 5: Cost & Ops Signals */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Infrastructure & Cost Efficiency
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Storage usage, bandwidth, and system health</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Storage by Module */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Storage by Module
            </h4>
            <div className="space-y-2">
              {operations.storageByModule.map((item) => (
                <div key={item.module}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.module}</span>
                    <span className="font-medium text-gray-800">{item.sizeGB.toFixed(2)} GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bandwidth Hotspot */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Bandwidth Hotspot
            </h4>
            {operations.bandwidthHotspot ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{operations.bandwidthHotspot?.module}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((operations.bandwidthHotspot?.bytesTransferred || 0) / (1024 ** 3)).toFixed(2)} GB today
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>

          {/* Files Pending Optimization */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Pending Optimization
            </h4>
            <p className="text-2xl font-bold text-gray-900">{operations.pendingOptimization}</p>
            <p className="text-xs text-gray-500 mt-1">files eligible</p>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Pulse Status
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Active Alerts</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${operations.alerts.length === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {operations.alerts.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">System Health</span>
                <span className={`text-sm font-extrabold ${operations.alerts.length === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {operations.alerts.length === 0 ? 'Optimal' : 'Needs Action'}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                <span>API Status</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  ONLINE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
