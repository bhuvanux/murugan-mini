import React, { useState, useEffect } from 'react';
import { Star, Play, Trash2, Pin, PinOff, Clock, Layers } from 'lucide-react';
import {
    getSavedQueries,
    deleteSavedQuery,
    toggleQueryPin,
    markQueryExecuted
} from '../../../utils/analytics/queryExecutor';
import { getTemplateById } from '../../../utils/analytics/queryTemplates';
import { format } from 'date-fns';

interface SavedQueryItem {
    id: string;
    query_name: string;
    query_template_id: string;
    parameters: any;
    created_at: string;
    last_executed_at: string | null;
    execution_count: number;
    is_pinned: boolean;
    category: string;
}

interface SavedQueriesProps {
    onExecute: (templateId: string, params: any) => void;
    onRefresh?: () => void;
}

export function SavedQueries({ onExecute, onRefresh }: SavedQueriesProps) {
    const [savedQueries, setSavedQueries] = useState<SavedQueryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadSavedQueries();
    }, []);

    const loadSavedQueries = async () => {
        try {
            setLoading(true);
            const queries = await getSavedQueries();
            setSavedQueries(queries);
        } catch (error) {
            console.error('Error loading saved queries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async (query: SavedQueryItem) => {
        onExecute(query.query_template_id, query.parameters);
        await markQueryExecuted(query.id);
        loadSavedQueries(); // Refresh to update execution count
    };

    const handleDelete = async (queryId: string) => {
        if (!confirm('Are you sure you want to delete this saved query?')) return;

        try {
            setDeletingId(queryId);
            await deleteSavedQuery(queryId);
            loadSavedQueries();
            onRefresh?.();
        } catch (error) {
            console.error('Error deleting query:', error);
            alert('Failed to delete query');
        } finally {
            setDeletingId(null);
        }
    };

    const handleTogglePin = async (queryId: string) => {
        try {
            await toggleQueryPin(queryId);
            loadSavedQueries();
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    // Group queries by pinned status
    const pinnedQueries = savedQueries.filter(q => q.is_pinned);
    const unpinnedQueries = savedQueries.filter(q => !q.is_pinned);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (savedQueries.length === 0) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-8">
                <div className="text-center">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-gray-600 mb-1">No Saved Queries</h3>
                    <p className="text-xs text-gray-500">
                        Execute a query and click "Save Query" to save it for quick access
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                            <Star className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Saved Queries</h3>
                            <p className="text-xs text-gray-500">{savedQueries.length} saved</p>
                        </div>
                    </div>
                    <button
                        onClick={loadSavedQueries}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <Clock className="w-4 h-4 text-purple-600" />
                    </button>
                </div>
            </div>

            {/* Pinned Queries */}
            {pinnedQueries.length > 0 && (
                <div className="border-b border-gray-200">
                    <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
                        <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide flex items-center gap-1">
                            <Pin className="w-3 h-3" />
                            Pinned ({pinnedQueries.length})
                        </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {pinnedQueries.map((query) => (
                            <SavedQueryItem
                                key={query.id}
                                query={query}
                                onExecute={() => handleExecute(query)}
                                onDelete={() => handleDelete(query.id)}
                                onTogglePin={() => handleTogglePin(query.id)}
                                deleting={deletingId === query.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Regular Queries */}
            {unpinnedQueries.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            All Queries ({unpinnedQueries.length})
                        </p>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {unpinnedQueries.map((query) => (
                            <SavedQueryItem
                                key={query.id}
                                query={query}
                                onExecute={() => handleExecute(query)}
                                onDelete={() => handleDelete(query.id)}
                                onTogglePin={() => handleTogglePin(query.id)}
                                deleting={deletingId === query.id}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Individual saved query item component
function SavedQueryItem({
    query,
    onExecute,
    onDelete,
    onTogglePin,
    deleting
}: {
    query: SavedQueryItem;
    onExecute: () => void;
    onDelete: () => void;
    onTogglePin: () => void;
    deleting: boolean;
}) {
    const template = getTemplateById(query.query_template_id);

    return (
        <div className="p-3 hover:bg-gray-50 transition-colors group">
            <div className="flex items-start gap-3">
                {/* Execute Button */}
                <button
                    onClick={onExecute}
                    disabled={deleting}
                    className="flex-shrink-0 w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110"
                    title="Execute Query"
                >
                    <Play className="w-4 h-4" fill="white" />
                </button>

                {/* Query Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {query.query_name}
                        </h4>
                        {query.is_pinned && (
                            <Pin className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                        )}
                    </div>
                    {template && (
                        <p className="text-xs text-gray-500 truncate mb-1">
                            {template.name}
                        </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        {query.execution_count > 0 && (
                            <span>Ran {query.execution_count}x</span>
                        )}
                        {query.last_executed_at ? (
                            <span>Last: {format(new Date(query.last_executed_at), 'MMM d')}</span>
                        ) : (
                            <span>Never executed</span>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onTogglePin}
                        disabled={deleting}
                        className="p-1.5 hover:bg-yellow-100 rounded transition-colors disabled:opacity-50"
                        title={query.is_pinned ? 'Unpin' : 'Pin'}
                    >
                        {query.is_pinned ? (
                            <PinOff className="w-3.5 h-3.5 text-gray-600" />
                        ) : (
                            <Pin className="w-3.5 h-3.5 text-gray-600" />
                        )}
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={deleting}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                    >
                        {deleting ? (
                            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5 text-gray-600" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
