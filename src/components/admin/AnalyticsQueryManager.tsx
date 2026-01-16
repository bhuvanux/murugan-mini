import React, { useState } from 'react';
import { BarChart3, Info, Calendar } from 'lucide-react';
import { QueryBar } from './analytics/QueryBar';
import { ResultRenderer } from './analytics/ResultRenderer';
import { SavedQueries } from './analytics/SavedQueries';
import {
    executeQuery,
    saveQuery as saveSavedQuery,
    QueryExecutionResult
} from '../../utils/analytics/queryExecutor';
import {
    QueryTemplate,
    getTemplateById
} from '../../utils/analytics/queryTemplates';
import { startOfDay, endOfDay, subDays } from 'date-fns';

interface AnalyticsQueryManagerProps {
    initialQueryId?: string;
}

export function AnalyticsQueryManager({ initialQueryId }: AnalyticsQueryManagerProps) {
    const [currentResult, setCurrentResult] = useState<QueryExecutionResult | null>(null);
    const [currentTemplate, setCurrentTemplate] = useState<QueryTemplate | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [savingQuery, setSavingQuery] = useState(false);
    const [customQueryName, setCustomQueryName] = useState('');
    const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d'>('today');
    const [showInfoBanner, setShowInfoBanner] = useState(true);

    // Auto-execute if initialQueryId is provided
    React.useEffect(() => {
        if (initialQueryId) {
            const template = getTemplateById(initialQueryId);
            if (template) {
                handleExecuteQuery(template, {});
            }
        }
    }, [initialQueryId]);

    const handleExecuteQuery = async (template: QueryTemplate, userParams: any) => {
        setLoading(true);
        setCurrentTemplate(template);
        setCurrentResult(null);

        try {
            const params = {
                ...userParams,
                ...getDateRangeParams(datePreset)
            };

            console.log('[AnalyticsQueryManager] Executing query:', template.id, params);

            const result = await executeQuery(template, params);
            setCurrentResult(result);
        } catch (error) {
            console.error('[AnalyticsQueryManager] Error executing query:', error);
            setCurrentResult({
                success: false,
                data: null,
                error: 'Failed to execute query',
                metadata: {
                    queryName: template.name,
                    queryId: template.id,
                    executedAt: new Date().toISOString(),
                    dataSource: template.dataSource
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteSavedQuery = (templateId: string, params: any) => {
        const template = getTemplateById(templateId);
        if (template) {
            handleExecuteQuery(template, params);
        }
    };

    const handleSaveQuery = () => {
        if (!currentTemplate) return;
        setCustomQueryName(currentTemplate.name + ' - Saved');
        setShowSaveModal(true);
    };

    const handleConfirmSave = async () => {
        if (!currentTemplate || !customQueryName.trim()) return;

        try {
            setSavingQuery(true);
            await saveSavedQuery(
                customQueryName,
                currentTemplate.id,
                getDateRangeParams(datePreset),
                currentTemplate.category
            );
            setShowSaveModal(false);
            setCustomQueryName('');
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
                                onClick={() => setDatePreset(preset)}
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

            {/* Collapsible Info Banner */}
            {showInfoBanner && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Info className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-blue-900 mb-2">
                                    Quick Start Guide
                                </p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-blue-800">
                                    <div>• Search queries by typing keywords</div>
                                    <div>• View results as KPI cards or tables</div>
                                    <div>• Save frequently used queries</div>
                                    <div>• Export results to CSV files</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowInfoBanner(false)}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content - 20/80 Sidebar Split */}
            <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
                {/* Left Sidebar - Query Selector (20%) */}
                <div className="w-1/5 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
                    <QueryBar
                        onExecute={handleExecuteQuery}
                        loading={loading}
                        activeQueryId={currentTemplate?.id}
                    />
                </div>

                {/* Right Area - Results (80%) */}
                <div className="w-4/5 flex flex-col gap-6 overflow-y-auto pr-2">
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
            )
            }
        </div >
    );
}

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
