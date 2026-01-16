import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Filter, Clock, MapPin } from 'lucide-react';
import { supabase } from '../../../utils/supabase/client';

interface AnalyticsEvent {
    id: string;
    module_name: string;
    item_id: string;
    event_type: string;
    ip_address: string;
    user_agent: string;
    device_type: string;
    created_at: string;
    metadata: Record<string, any>;
}

export function LiveEventStream() {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedModule, setSelectedModule] = useState<string>('all');
    const [selectedEventType, setSelectedEventType] = useState<string>('all');

    const baseUrl = 'https://lnherrwzjtemrvzahppg.supabase.co/functions/v1/make-server-4a075ebc';

    const loadEvents = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let url = `${baseUrl}/api/admin/analytics/live-events?limit=50`;
            if (selectedModule !== 'all') {
                url += `&module=${selectedModule}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error('Error loading live events:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();

        if (autoRefresh) {
            const interval = setInterval(loadEvents, 5000); // Refresh every 5 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh, selectedModule, selectedEventType]);

    const filteredEvents = events.filter(event => {
        if (selectedEventType !== 'all' && event.event_type !== selectedEventType) {
            return false;
        }
        return true;
    });

    const modules = ['all', 'wallpaper', 'song', 'video', 'sparkle', 'photo', 'banner'];
    const eventTypes = ['all', 'view', 'like', 'unlike', 'download', 'share', 'play', 'click'];

    const getEventColor = (eventType: string) => {
        const colors: Record<string, string> = {
            view: 'bg-blue-100 text-blue-800',
            like: 'bg-pink-100 text-pink-800',
            unlike: 'bg-gray-100 text-gray-800',
            download: 'bg-green-100 text-green-800',
            share: 'bg-purple-100 text-purple-800',
            play: 'bg-orange-100 text-orange-800',
            click: 'bg-yellow-100 text-yellow-800',
        };
        return colors[eventType] || 'bg-gray-100 text-gray-800';
    };

    const getModuleIcon = (module: string) => {
        // You can customize icons per module
        return <Activity className="h-4 w-4" />;
    };

    return (
        <div className="space-y-6">
            {/* Header with Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Live Event Stream</h3>
                    <p className="mt-1 text-sm text-gray-600">
                        Real-time analytics events as they occur
                    </p>
                </div>
                <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${autoRefresh
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Filter className="inline h-4 w-4 mr-1" />
                        Module
                    </label>
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        {modules.map((module) => (
                            <option key={module} value={module}>
                                {module === 'all' ? 'All Modules' : module.charAt(0).toUpperCase() + module.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Activity className="inline h-4 w-4 mr-1" />
                        Event Type
                    </label>
                    <select
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        {eventTypes.map((type) => (
                            <option key={type} value={type}>
                                {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Event Stream */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                        <p className="mt-2 text-sm text-gray-600">Loading events...</p>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-900">No Events Yet</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Events will appear here as users interact with your content
                        </p>
                    </div>
                ) : (
                    filteredEvents.map((event) => (
                        <div
                            key={event.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="p-2 rounded-lg bg-gray-100">
                                        {getModuleIcon(event.module_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900 capitalize">
                                                {event.module_name}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEventColor(
                                                    event.event_type
                                                )}`}
                                            >
                                                {event.event_type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">
                                            Item ID: <code className="text-xs bg-gray-100 px-1 rounded">{event.item_id}</code>
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {event.ip_address}
                                            </span>
                                            <span className="capitalize">{event.device_type}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {new Date(event.created_at).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stats Footer */}
            {filteredEvents.length > 0 && (
                <div className="text-center text-sm text-gray-600 py-2">
                    Showing {filteredEvents.length} recent event{filteredEvents.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}
