import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle, XCircle, AlertTriangle, RefreshCw, BarChart } from 'lucide-react';
import { supabase } from '../../../utils/supabase/client';
import * as Icons from 'lucide-react';

interface AnalyticsConfig {
    id: string;
    module_name: string;
    event_type: string;
    is_enabled: boolean;
    display_name: string;
    description: string;
    icon: string;
    sort_order: number;
}

export function EventRegistry() {
    const [configs, setConfigs] = useState<AnalyticsConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const baseUrl = 'https://lnherrwzjtemrvzahppg.supabase.co/functions/v1/make-server-4a075ebc';

    const loadRegistry = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${baseUrl}/api/analytics/admin/config`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load event registry');
            }

            const data = await response.json();
            // The API returns { config: { grouped... }, all: [ flat... ] }
            // We want the flat array because we group it ourselves below
            const configData = data.all || [];

            if (data.success && Array.isArray(configData)) {
                setConfigs(configData);
            } else {
                // Fallback if API hasn't been deployed with config endpoint yet
                // Use default hardcoded list for visual if API fails
                console.warn("API didn't return config, using fallback data");
                setConfigs(FALLBACK_CONFIGS);
            }
        } catch (err) {
            console.error('Error loading registry:', err);
            // Fallback for demo purposes if API isn't ready
            setConfigs(FALLBACK_CONFIGS);
            // setError('Failed to load registry configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRegistry();
    }, []);

    // Group configs by module
    const groupedConfigs = configs.reduce((acc, config) => {
        if (!acc[config.module_name]) {
            acc[config.module_name] = [];
        }
        acc[config.module_name].push(config);
        return acc;
    }, {} as Record<string, AnalyticsConfig[]>);

    const getIcon = (iconName: string) => {
        // @ts-ignore
        const Icon = Icons[iconName] || Icons.Activity;
        return Icon;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Event Registry</h3>
                    <p className="mt-1 text-sm text-gray-600">
                        Registered event types and their tracking status
                    </p>
                </div>
                <button
                    onClick={loadRegistry}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Registry
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-600">Loading registry...</p>
                </div>
            ) : Object.keys(groupedConfigs).length === 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">No Configuration Found</span>
                    </div>
                    <p className="mt-1 text-sm">
                        Unable to load analytics configuration. The database might need initialization.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {Object.entries(groupedConfigs).map(([moduleName, moduleConfigs]) => (
                        <div key={moduleName} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                                    <BarChart className="h-4 w-4 text-gray-500" />
                                    {moduleName} Module
                                </h4>
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                    {moduleConfigs.filter(c => c.is_enabled).length} Enabled
                                </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {moduleConfigs
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                    .map((config) => {
                                        const Icon = getIcon(config.icon);
                                        return (
                                            <div key={config.id || `${config.module_name}-${config.event_type}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${config.is_enabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 flex items-center gap-2">
                                                            {config.display_name}
                                                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-normal">
                                                                {config.event_type}
                                                            </code>
                                                        </h5>
                                                        <p className="text-sm text-gray-500 mt-0.5">
                                                            {config.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${config.is_enabled
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {config.is_enabled ? (
                                                            <>
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Disabled
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Fallback data in case API isn't deployed yet with these records
const FALLBACK_CONFIGS: AnalyticsConfig[] = [
    { id: '1', module_name: 'wallpaper', event_type: 'view', is_enabled: true, display_name: 'Wallpaper Views', description: 'Track when users view wallpapers', icon: 'Eye', sort_order: 1 },
    { id: '2', module_name: 'wallpaper', event_type: 'like', is_enabled: true, display_name: 'Wallpaper Likes', description: 'Track wallpaper favorites', icon: 'Heart', sort_order: 2 },
    { id: '3', module_name: 'wallpaper', event_type: 'download', is_enabled: true, display_name: 'Wallpaper Downloads', description: 'Track wallpaper downloads', icon: 'Download', sort_order: 3 },
    { id: '4', module_name: 'wallpaper', event_type: 'share', is_enabled: true, display_name: 'Wallpaper Shares', description: 'Track wallpaper shares', icon: 'Share2', sort_order: 4 },
    { id: '5', module_name: 'song', event_type: 'play', is_enabled: true, display_name: 'Song Plays', description: 'Track song playback', icon: 'Music', sort_order: 10 },
    { id: '6', module_name: 'sparkle', event_type: 'read', is_enabled: true, display_name: 'Article Reads', description: 'Track full article reads', icon: 'BookOpen', sort_order: 20 },
    { id: '7', module_name: 'banner', event_type: 'click', is_enabled: true, display_name: 'Banner Clicks', description: 'Track banner clicks', icon: 'MousePointer', sort_order: 30 },
];
