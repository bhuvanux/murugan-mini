import React, { useState } from 'react';
import { Activity, BarChart3, Bug, Settings as SettingsIcon } from 'lucide-react';
import { EventManagerDashboard } from './analytics/EventManagerDashboard';
import { DiagnosticsTool } from './analytics/DiagnosticsTool';
import { LiveEventStream } from './analytics/LiveEventStream';
import { EventRegistry } from './analytics/EventRegistry';

type Tab = 'dashboard' | 'diagnostics' | 'events' | 'registry';

export function AnalyticsEventManager() {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
        { id: 'diagnostics' as const, label: 'Diagnostics', icon: Bug },
        { id: 'events' as const, label: 'Live Events', icon: Activity },
        { id: 'registry' as const, label: 'Event Registry', icon: SettingsIcon },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition ${isActive
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                            >
                                <Icon
                                    className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500'
                                        }`}
                                />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && <EventManagerDashboard />}
                {activeTab === 'diagnostics' && <DiagnosticsTool />}
                {activeTab === 'events' && <LiveEventStream />}
                {activeTab === 'registry' && <EventRegistry />}
            </div>
        </div>
    );
}
