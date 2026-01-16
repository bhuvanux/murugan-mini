import React, { useEffect, useState } from 'react';
import { Activity, Database, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '../../../utils/supabase/client';

interface DashboardStats {
    totalEvents: number;
    moduleBreakdown: Record<string, number>;
    eventTypeBreakdown: Record<string, number>;
    recentEventCount: number;
}

export function EventManagerDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get auth token from Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('You must be logged in to view analytics');
            }

            const baseUrl = 'https://lnherrwzjtemrvzahppg.supabase.co/functions/v1/make-server-4a075ebc';
            const response = await fetch(`${baseUrl}/api/admin/analytics/stats`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to load stats: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format - expected JSON');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error loading stats:', err);
            setError(err instanceof Error ? err.message : 'Failed to load stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <Activity className="mx-auto h-8 w-8 animate-pulse text-emerald-600" />
                    <p className="mt-2 text-sm text-gray-600">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-900">Error loading dashboard</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                    onClick={loadStats}
                    className="mt-3 text-sm font-medium text-red-800 hover:text-red-900"
                >
                    Try again
                </button>
            </div>
        );
    }

    const StatCard = ({
        icon: Icon,
        label,
        value,
        color,
    }: {
        icon: any;
        label: string;
        value: number | string;
        color: string;
    }) => (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-3 ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
                <p className="mt-1 text-sm text-gray-600">
                    System-wide analytics health and statistics
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={Database}
                    label="Total Events"
                    value={stats?.totalEvents || 0}
                    color="bg-blue-600"
                />
                <StatCard
                    icon={Activity}
                    label="Modules Tracked"
                    value={Object.keys(stats?.moduleBreakdown || {}).length}
                    color="bg-emerald-600"
                />
                <StatCard
                    icon={Zap}
                    label="Event Types"
                    value={Object.keys(stats?.eventTypeBreakdown || {}).length}
                    color="bg-purple-600"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Recent Events (24h)"
                    value={stats?.recentEventCount || 0}
                    color="bg-orange-600"
                />
            </div>

            {/* Warning if no data */}
            {stats && stats.totalEvents === 0 && (
                <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex gap-3">
                        <div className="text-yellow-600">⚠️</div>
                        <div>
                            <p className="font-semibold text-yellow-900">No Analytics Data Found</p>
                            <p className="mt-1 text-sm text-yellow-800">
                                The analytics system appears to have no recorded events. This could indicate:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                                <li>• Analytics tracking is not configured correctly</li>
                                <li>• No user activity has occurred yet</li>
                                <li>• Database connection issues</li>
                            </ul>
                            <p className="mt-3 text-sm font-medium text-yellow-900">
                                → Use the <strong>Diagnostics</strong> tab to identify the issue
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Module Breakdown */}
            {stats && stats.totalEvents > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="font-semibold text-gray-900">Events by Module</h4>
                    <div className="mt-4 space-y-3">
                        {Object.entries(stats.moduleBreakdown).map(([module, count]) => (
                            <div key={module} className="flex items-center justify-between">
                                <span className="capitalize text-gray-700">{module}</span>
                                <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Event Type Breakdown */}
            {stats && stats.totalEvents > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="font-semibold text-gray-900">Events by Type</h4>
                    <div className="mt-4 space-y-3">
                        {Object.entries(stats.eventTypeBreakdown).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                                <span className="capitalize text-gray-700">{type}</span>
                                <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={loadStats}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                Refresh Data
            </button>
        </div>
    );
}
