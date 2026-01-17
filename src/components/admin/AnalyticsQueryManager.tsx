import React, { useState, useRef } from 'react';
import { Search, Save, Play, Download, Trash2, ChevronRight, LayoutGrid, List as ListIcon, Info, X, Clock, Database, TrendingUp, Calendar as CalendarIcon, Filter, MoreHorizontal } from 'lucide-react';
import { QUERY_TEMPLATES as analyticsQueries } from '../../utils/analytics/queryTemplates';
import { executeQuery, QueryExecutionResult } from '../../utils/analytics/queryExecutor';
import { ResultRenderer } from './analytics/ResultRenderer';
import { startOfDay, endOfDay, subDays } from 'date-fns';

type DatePreset = 'today' | '7d' | '30d';

interface QueryBarProps {
    onExecute: (templateId: string, params: any) => void;
    loading: boolean;
    activeQueryId?: string;
    favorites: string[];
    onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

const QueryBar = ({ onExecute, loading, activeQueryId, favorites, onToggleFavorite }: QueryBarProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const filteredQueries = analyticsQueries.filter(q => {
        const matchesSearch = q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || q.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Sort: Favorites first, then Tiers
    const sortedQueries = [...filteredQueries].sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.tier - b.tier;
    });

    const categories = ['all', ...Array.from(new Set(analyticsQueries.map(q => q.category)))];

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search queries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filterCategory === cat
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Query List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="divide-y divide-gray-50">
                    {filteredQueries.map(query => (
                        <button
                            key={query.id}
                            onClick={() => onExecute(query.id, {})}
                            disabled={loading}
                            className={`w-full text-left p-4 hover:bg-gray-50 transition-all group border-l-2 ${activeQueryId === query.id
                                ? 'bg-green-50/50 border-green-600'
                                : 'border-transparent'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <span className={`text-sm font-semibold lines-clamp-1 flex-1 pr-2 ${activeQueryId === query.id ? 'text-green-900' : 'text-gray-900'
                                    }`}>
                                    {query.name}
                                </span>

                                <div
                                    onClick={(e) => onToggleFavorite(e, query.id)}
                                    className="p-1 -m-1 rounded-full hover:bg-gray-100 transition-colors z-10"
                                >
                                    <Star className={`w-3.5 h-3.5 ${favorites.includes(query.id)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300 group-hover:text-gray-400'
                                        }`} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1 mb-2">{query.description}</p>

                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                    {query.category}
                                </span>
                                <ChevronRight className={`w-3 h-3 ${activeQueryId === query.id ? 'text-green-500' : 'text-gray-300 group-hover:text-green-500'
                                    } transition-colors transform ${activeQueryId === query.id ? 'translate-x-0' : '-translate-x-1 group-hover:translate-x-0'
                                    }`} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer Summary */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-center text-gray-400 font-medium">
                {filteredQueries.length} available queries
            </div>
        </div>
    );
};

// Icon imports for tier mapping
import { Star, Zap, Activity } from 'lucide-react';

export const AnalyticsQueryManager = () => {
    const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
    const [currentResult, setCurrentResult] = useState<QueryExecutionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [datePreset, setDatePreset] = useState<DatePreset>('today');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [customQueryName, setCustomQueryName] = useState('');
    const [savingQuery, setSavingQuery] = useState(false);

    // Favorites Logic
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('analytics_favorites');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const toggleFavorite = (e: React.MouseEvent, queryId: string) => {
        e.stopPropagation();
        setFavorites(prev => {
            const newFavorites = prev.includes(queryId)
                ? prev.filter(id => id !== queryId)
                : [...prev, queryId];
            localStorage.setItem('analytics_favorites', JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    // Get current template details
    const currentTemplate = analyticsQueries.find(q => q.id === currentTemplateId);

    const handleExecuteQuery = async (templateId: string) => {
        setLoading(true);
        setCurrentTemplateId(templateId);

        // Calculate date params
        const params: any = getDateRangeParams(datePreset);

        // Find template to get default params
        const template = analyticsQueries.find(q => q.id === templateId);

        if (!template) {
            console.error('Template not found:', templateId);
            setLoading(false);
            return;
        }

        // Merge with default params
        template.parameters.forEach(p => {
            if (p.name === 'days_ago') params['days_ago'] = p.default;
            if (p.name === 'event_type') params['event_type'] = p.default;
        });

        try {
            // FIX: Pass the full template object, not just the ID
            const result = await executeQuery(template, params);
            setCurrentResult(result);
        } catch (error) {
            console.error('[AnalyticsQueryManager] Execution failed:', error);
            setCurrentResult({
                success: false,
                data: null,
                error: 'Execution failed',
                metadata: {
                    queryName: 'Unknown',
                    queryId: templateId,
                    executedAt: new Date().toISOString(),
                    dataSource: 'unknown'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQuery = () => {
        if (currentTemplate) {
            setCustomQueryName(currentTemplate.name);
            setShowSaveModal(true);
        }
    };

    const handleConfirmSave = async () => {
        if (!currentTemplate || !currentResult) return;

        setSavingQuery(true);
        try {
            // Mock save functionality
            await new Promise(resolve => setTimeout(resolve, 800));
            setShowSaveModal(false);
            alert('Query saved successfully! Check the Saved Queries sidebar.');
        } catch (error) {
            console.error('[AnalyticsQueryManager] Error saving query:', error);
            alert('Failed to save query');
        } finally {
            setSavingQuery(false);
        }
    };

    const handleExportCSV = () => {
        if (!currentResult || !currentResult.success || !currentResult.data) {
            alert('No data to export');
            return;
        }

        try {
            let csvData = [];

            if (Array.isArray(currentResult.data)) {
                csvData = currentResult.data;
            } else if (typeof currentResult.data === 'object') {
                csvData = [currentResult.data];
            } else {
                csvData = [{ value: currentResult.data }];
            }

            const headers = Object.keys(csvData[0]);
            const csv = [
                headers.join(','),
                ...csvData.map(row =>
                    headers.map(header => {
                        const value = row[header];
                        const escaped = String(value).replace(/"/g, '""');
                        return `"${escaped}"`;
                    }).join(',')
                )
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${currentTemplate?.id || 'export'}-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[AnalyticsQueryManager] Error exporting CSV:', error);
            alert('Failed to export CSV');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Analytics</h2>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500">
                        Professional insights & decision-ready data
                    </p>
                    {/* Date Presets */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {(['today', '7d', '30d'] as const).map(preset => (
                            <button
                                key={preset}
                                onClick={() => {
                                    setDatePreset(preset);
                                    if (currentTemplateId) handleExecuteQuery(currentTemplateId);
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${datePreset === preset
                                    ? 'bg-green-600 text-white'
                                    : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                {preset === 'today' ? 'Today' : preset === '7d' ? '7 Days' : '30 Days'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content - Fixed Sidebar Sidebar Split */}
            <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px] w-full max-w-full">
                {/* Left Sidebar - Query Selector (Fixed Width) */}
                <div className="w-80 shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
                    <QueryBar
                        onExecute={handleExecuteQuery}
                        loading={loading}
                        activeQueryId={currentTemplateId || undefined}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                    />
                </div>

                {/* Right Area - Results (Remaining Space) */}
                <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto pr-2">
                    <ResultRenderer
                        result={currentResult}
                        resultType={currentTemplate?.resultType || 'kpi'}
                        loading={loading}
                        onSave={currentResult?.success ? handleSaveQuery : undefined}
                        onExport={currentResult?.success ? handleExportCSV : undefined}
                    />
                </div>
            </div>

            {/* Save Query Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Save Query</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Give this query a custom name for easy identification
                        </p>
                        <input
                            type="text"
                            value={customQueryName}
                            onChange={(e) => setCustomQueryName(e.target.value)}
                            placeholder="e.g., Daily Login Check"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                disabled={savingQuery}
                                className="flex-1 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                disabled={!customQueryName.trim() || savingQuery}
                                className="flex-1 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingQuery ? 'Saving...' : 'Save Query'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to get date range parameters based on preset
function getDateRangeParams(preset: 'today' | '7d' | '30d') {
    const now = new Date();

    switch (preset) {
        case 'today':
            return {
                start_date: startOfDay(now).toISOString(),
                end_date: endOfDay(now).toISOString()
            };
        case '7d':
            return {
                start_date: startOfDay(subDays(now, 7)).toISOString(),
                end_date: endOfDay(now).toISOString()
            };
        case '30d':
            return {
                start_date: startOfDay(subDays(now, 30)).toISOString(),
                end_date: endOfDay(now).toISOString()
            };
        default:
            return {
                start_date: startOfDay(now).toISOString(),
                end_date: endOfDay(now).toISOString()
            };
    }
}
