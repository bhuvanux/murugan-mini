import React, { useState, useEffect } from 'react';
import {
    Download,
    Smartphone,
    Monitor,
    Tablet,
    Calendar,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCcw,
    Search,
    ChevronDown,
    ChevronDown,
    Info,
    MapPin,
    Users,
    Activity,
    AlertCircle
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { supabase } from '../../utils/supabase/client';

const COLORS = ['#084C28', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];

interface InstallStats {
    timeSeries: any[];
    platformBreakdown: Record<string, number>;
    all: any[];
    retention: {
        active: number;
        churned: number;
        total: number;
        stale: number;
    };
    locations: Record<string, number>;
    kpis: {
        total: number;
        thisMonth: number;
        lastMonth: number;
        growth: number;
    };
}

export function AdminInstallAnalytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<InstallStats | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [platformFilter, setPlatformFilter] = useState<string>('all');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        fetchData();
    }, [dateRange, refreshKey]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const projectUrl = import.meta.env.VITE_SUPABASE_URL || '';
            const response = await fetch(`${projectUrl}/functions/v1/server/make-server-4a075ebc/api/analytics/admin/installs?period=day&limit=90`);
            const result = await response.json();

            if (result.success) {
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching install stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw className="w-8 h-8 text-[#084C28] animate-spin" />
                    <p className="text-gray-500 font-medium">Loading install analytics...</p>
                </div>
            </div>
        );
    }

    const kpis = data?.kpis || { total: 0, thisMonth: 0, lastMonth: 0, growth: 0 };
    const platformData = data?.platformBreakdown
        ? Object.entries(data.platformBreakdown).map(([name, value]) => ({ name, value }))
        : [];

    const timeSeriesData = data?.timeSeries?.map(item => ({
        date: format(new Date(item.period_start), 'MMM dd'),
        installs: parseInt(item.install_count)
    })).reverse() || [];

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Install Analytics</h1>
                    <p className="text-gray-500">Track and analyze app installations across platforms</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRefreshKey(prev => prev + 1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        title="Refresh Data"
                    >
                        <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                        {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${dateRange === range
                                    ? 'bg-[#084C28] text-white'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Download className="w-6 h-6 text-blue-600" />
                        </div>
                        {kpis.growth !== 0 && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${kpis.growth > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {kpis.growth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(Math.round(kpis.growth))}%
                            </div>
                        )}
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Installs</p>
                    <h3 className="text-3xl font-bold text-gray-900">{kpis.total.toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Lifetime unique installs across all platforms
                    </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <Calendar className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Installs This Month</p>
                    <h3 className="text-3xl font-bold text-gray-900">{kpis.thisMonth.toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-4">
                        Vs {kpis.lastMonth.toLocaleString()} last month
                    </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Smartphone className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Most Popular Platform</p>
                    <h3 className="text-3xl font-bold text-gray-900 capitalize">
                        {platformData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-4">
                        Leading by {platformData.sort((a, b) => b.value - a.value).length > 1
                            ? `${Math.round((platformData.sort((a, b) => b.value - a.value)[0].value / kpis.total) * 100)}% share`
                            : '100% share'}
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* main Install Trend Area Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Install Trend</h3>
                            <p className="text-sm text-gray-500">Daily installations over time</p>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorInstalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#084C28" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#084C28" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="installs"
                                    stroke="#084C28"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorInstalls)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Platform Breakdown Pie Chart */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900">Platform Split</h3>
                        <p className="text-sm text-gray-500">Distribution by OS</p>
                    </div>

                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={platformData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
                                <p className="text-xs text-gray-500">Total</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {platformData.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-sm font-medium text-gray-600 capitalize">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-gray-900">{item.value.toLocaleString()}</span>
                                    <span className="text-xs text-gray-400 w-10 text-right">
                                        {Math.round((item.value / kpis.total) * 100)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Retention & Location Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Retention/Churn Analysis */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">User Retention</h3>
                            <p className="text-sm text-gray-500">Activity status based on last 30 days</p>
                        </div>
                        <Activity className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs font-bold text-green-700 uppercase mb-1">Active</p>
                            <h4 className="text-2xl font-bold text-gray-900">{data?.retention?.active || 0}</h4>
                            <p className="text-[10px] text-green-600 mt-1">seen in 7 days</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Stale</p>
                            <h4 className="text-2xl font-bold text-gray-900">{data?.retention?.stale || 0}</h4>
                            <p className="text-[10px] text-yellow-600 mt-1">7-30 days inactive</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-xs font-bold text-red-700 uppercase mb-1">Churned</p>
                            <h4 className="text-2xl font-bold text-gray-900">{data?.retention?.churned || 0}</h4>
                            <p className="text-[10px] text-red-600 mt-1">&gt;30 days inactive</p>
                        </div>
                    </div>

                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex">
                        <div style={{ width: `${(data?.retention?.active! / data?.retention?.total!) * 100}%` }} className="bg-green-500 h-full" />
                        <div style={{ width: `${(data?.retention?.stale! / data?.retention?.total!) * 100}%` }} className="bg-yellow-400 h-full" />
                        <div style={{ width: `${(data?.retention?.churned! / data?.retention?.total!) * 100}%` }} className="bg-red-400 h-full" />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>Active</span>
                        <span>Churned</span>
                    </div>
                </div>

                {/* Top Locations */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Top Locations</h3>
                            <p className="text-sm text-gray-500">Distribution by Country</p>
                        </div>
                        <MapPin className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="space-y-4">
                        {data?.locations && Object.keys(data.locations).length > 0 ? (
                            Object.entries(data.locations)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5)
                                .map(([country, count], index) => (
                                    <div key={country} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-900">{country === 'null' ? 'Unknown' : country}</span>
                                                <span className="text-sm text-gray-500">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${(count / data.retention.total) * 100}%` }}
                                                    className="bg-indigo-500 h-full rounded-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[180px] text-gray-400">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm">No location data available yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Device Insights */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Recent Installations</h3>
                        <p className="text-sm text-gray-500">Last 10 unique devices tracked</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Device</th>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Platform</th>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">OS Version</th>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">App Version</th>
                                <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Installed At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {/* This would ideally come from the 'all' data we fetched */}
                            {data?.all?.slice(0, 10).map((install: any) => (
                                <tr key={install.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors">
                                                {install.platform === 'ios' ? <Monitor className="w-4 h-4 text-gray-600" /> : <Smartphone className="w-4 h-4 text-gray-600" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{install.model || 'Unknown Device'}</p>
                                                <p className="text-xs text-gray-500 uppercase">{install.manufacturer || 'Generic'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${install.platform === 'ios' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                            }`}>
                                            {install.platform}
                                        </span>
                                    </td>
                                    <td className="py-4 text-sm text-gray-600">{install.os_version || 'N/A'}</td>
                                    <td className="py-4 text-sm text-gray-600">{install.app_version || 'N/A'}</td>
                                    <td className="py-4 text-sm text-gray-500">
                                        {format(new Date(install.created_at), 'MMM dd, HH:mm')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
