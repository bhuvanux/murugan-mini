import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, Download, Save, Info, Clock, Database, MoreVertical, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { QueryExecutionResult } from '../../../utils/analytics/queryExecutor';
import { ResultType } from '../../../utils/analytics/queryTemplates';
import { format } from 'date-fns';

interface ResultRendererProps {
    result: QueryExecutionResult | null;
    resultType: ResultType;
    loading?: boolean;
    onSave?: () => void;
    onExport?: () => void;
}

export function ResultRenderer({
    result,
    resultType,
    loading = false,
    onSave,
    onExport
}: ResultRendererProps) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
                <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium text-gray-600">Executing query...</p>
                    <p className="text-xs text-gray-400 mt-1">Fetching analytics data</p>
                </div>
            </div>
        );
    }

    // Empty state
    if (!result) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-16">
                <div className="text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingUp className="w-8 h-8 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to explore?</h3>
                    <p className="text-sm text-gray-500 leading-relaxed text-center">
                        Select any of the 54 professional query templates from the sidebar to start seeing real-time data.
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (!result.success) {
        return (
            <div className="bg-red-50 rounded-xl border border-red-200 p-8">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-semibold text-red-900 mb-1">Query Execution Failed</h3>
                        <p className="text-sm text-red-700 mb-3">{result.error}</p>
                        <div className="text-xs text-red-600">
                            <span className="font-semibold">Query:</span> {result.metadata.queryName}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success - render based on result type
    return (
        <div className="space-y-4">
            {/* Clean Context Banner Sync'd with Storage Module */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-3 gap-4 mr-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5 truncate">Active Query</p>
                                <p className="text-sm font-semibold text-gray-900 leading-none truncate">{result.metadata.queryName}</p>
                            </div>
                        </div>

                        {result.metadata.timeRange && (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5 truncate">Time Range</p>
                                    <p className="text-sm font-semibold text-gray-900 leading-none truncate">{result.metadata.timeRange}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <Database className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5 truncate">Data Source</p>
                                <p className="text-sm font-semibold text-gray-900 leading-none truncate">{result.metadata.dataSource}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in duration-200">
                                {onSave && (
                                    <button
                                        onClick={() => { onSave(); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Query
                                    </button>
                                )}
                                {onExport && (
                                    <button
                                        onClick={() => { onExport(); setShowMenu(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Standardized Result Container Sync'd with Storage Module */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {resultType === 'kpi' ? (
                    <div className="p-8">
                        <KPIResult data={result.data} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {resultType === 'table' && <TableResult data={result.data} />}
                        {resultType === 'chart' && <ChartResult data={result.data} />}
                        {resultType === 'list' && <ListResult data={result.data} />}
                    </div>
                )}
            </div>
        </div>
    );
}

// KPI Result Component
function KPIResult({ data }: { data: any }) {
    const value = typeof data === 'number' ? data : (data?.value ?? 0);
    const label = (data?.label as string) ?? 'Total Result Count';
    const formattedValue = typeof value === 'number'
        ? value.toLocaleString()
        : value;

    return (
        <div className="py-10 text-center">
            <div className="inline-flex flex-col items-center">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-6xl font-bold text-gray-900 tracking-tight leading-none">
                    {formattedValue}
                </div>
                <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mt-6">
                    {label}
                </div>
            </div>
        </div>
    );
}

// Table Result Component with Sorting
function TableResult({ data }: { data: any[] }) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    if (!data || data.length === 0) {
        return (
            <div className="p-20 text-center bg-gray-50/30">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
                    <Database className="w-6 h-6 text-gray-300" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">No data available</h4>
                <p className="text-xs text-gray-500">There are no records found for the selected time range.</p>
            </div>
        );
    }

    const columns = Object.keys(data[0]);

    const sortedData = React.useMemo(() => {
        if (!sortConfig) return data;
        return [...data].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [data, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    {columns.map((col, idx) => (
                        <th
                            key={col}
                            onClick={() => handleSort(col)}
                            className={`px-6 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none ${idx === 0 ? 'text-left' : 'text-right'
                                }`}
                        >
                            <div className={`flex items-center gap-1 ${idx === 0 ? 'justify-start' : 'justify-end'}`}>
                                {col.replace(/_/g, ' ')}
                                <div className="text-gray-400">
                                    {sortConfig?.key === col ? (
                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3 h-3 text-gray-700" />
                                    ) : (
                                        <ArrowUpDown className="w-3 h-3 text-gray-300" />
                                    )}
                                </div>
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {sortedData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                        {columns.map((col, colIdx) => (
                            <td
                                key={colIdx}
                                className={`px-6 py-4 whitespace-nowrap text-sm ${colIdx === 0
                                    ? 'font-medium text-gray-900 text-left'
                                    : 'text-gray-500 text-right'
                                    }`}
                            >
                                {formatCellValue(row[col])}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// Chart Result Component (Simplified)
function ChartResult({ data }: { data: any[] }) {
    // For now, display as table - can be enhanced with actual charts later
    return <TableResult data={data} />;
}

// List Result Component
function ListResult({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center">
                <p className="text-sm text-gray-400">No items found</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-50">
            {data.map((item, idx) => (
                <div key={idx} className="py-4 flex flex-col gap-2">
                    {Object.entries(item).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-medium text-gray-900">{formatCellValue(value)}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// Helper function to format cell values
function formatCellValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
        // Simple percentage detection - if it's a small number that looks like a percentage
        if (value > 0 && value <= 100 && value % 1 !== 0) {
            return `${value.toFixed(1)}%`;
        }
        return value.toLocaleString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return format(value, 'MMM d, yyyy');
    return String(value);
}
