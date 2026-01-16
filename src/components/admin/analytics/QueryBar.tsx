import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Info, Zap, ChevronRight, Star } from 'lucide-react';
import {
    QUERY_TEMPLATES,
    QUERY_CATEGORIES,
    QueryTemplate,
    QueryCategory,
    searchTemplates,
} from '../../../utils/analytics/queryTemplates';

interface QueryBarProps {
    onExecute: (template: QueryTemplate, params: any) => void;
    loading?: boolean;
    activeQueryId?: string;
}

export function QueryBar({ onExecute, loading = false, activeQueryId }: QueryBarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTemplates, setFilteredTemplates] = useState<QueryTemplate[]>(QUERY_TEMPLATES);
    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('analytics_favorites');
        return saved ? JSON.parse(saved) : [];
    });
    const inputRef = useRef<HTMLInputElement>(null);

    // Save favorites
    useEffect(() => {
        localStorage.setItem('analytics_favorites', JSON.stringify(favorites));
    }, [favorites]);

    // Filter templates
    useEffect(() => {
        if (searchQuery.trim()) {
            setFilteredTemplates(searchTemplates(searchQuery));
        } else {
            setFilteredTemplates(QUERY_TEMPLATES);
        }
    }, [searchQuery]);

    const handleSelectQuery = (template: QueryTemplate) => {
        onExecute(template, {});
    };

    const toggleFavorite = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // Categorize queries
    const favoriteQueries = filteredTemplates.filter(q => favorites.includes(q.id));
    const nonFavoriteQueries = filteredTemplates.filter(q => !favorites.includes(q.id));

    // Only show "Favorites" section if no search or if there are matches in favorites
    const showFavoritesSection = favoriteQueries.length > 0;

    // Split remaining into essentials and others
    const essentials = nonFavoriteQueries.filter(q => q.tier === 1);
    const others = nonFavoriteQueries.filter(q => q.tier !== 1);

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-100">
            {/* Ultra Clean Sticky Search */}
            <div className="p-4 bg-white sticky top-0 z-10">
                <div className="relative group">
                    <Search className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${searchQuery ? 'text-green-500' : 'text-gray-300 group-hover:text-gray-400'
                        }`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search queries..."
                        className="w-full pl-6 pr-8 py-2 bg-transparent border-0 border-b border-gray-100
                                 focus:border-green-500 outline-none text-sm text-gray-900 placeholder-gray-300 
                                 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 p-1 hover:text-red-500 text-gray-300 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Query List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-8 custom-scrollbar pb-8">

                {/* Favorites Section */}
                {showFavoritesSection && (
                    <div className="space-y-2">
                        <div className="px-2 flex items-center justify-between">
                            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Favorites</h3>
                            <span className="text-[9px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full font-semibold uppercase">Starred</span>
                        </div>
                        <div className="space-y-1">
                            {favoriteQueries.map(q => (
                                <QueryCard
                                    key={q.id}
                                    template={q}
                                    isActive={activeQueryId === q.id}
                                    isFavorite={true}
                                    onToggleFavorite={(e) => toggleFavorite(e, q.id)}
                                    onClick={() => handleSelectQuery(q)}
                                    loading={loading}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Daily Essentials Section */}
                {essentials.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-2 flex items-center justify-between">
                            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Daily Essentials</h3>
                            <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold uppercase">Priority</span>
                        </div>
                        <div className="space-y-1">
                            {essentials.map(q => (
                                <QueryCard
                                    key={q.id}
                                    template={q}
                                    isActive={activeQueryId === q.id}
                                    isFavorite={false}
                                    onToggleFavorite={(e) => toggleFavorite(e, q.id)}
                                    onClick={() => handleSelectQuery(q)}
                                    loading={loading}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Other Queries Section */}
                {others.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-2">
                            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">More Insights</h3>
                        </div>
                        <div className="space-y-1">
                            {others.map(q => (
                                <QueryCard
                                    key={q.id}
                                    template={q}
                                    isActive={activeQueryId === q.id}
                                    isFavorite={false}
                                    onToggleFavorite={(e) => toggleFavorite(e, q.id)}
                                    onClick={() => handleSelectQuery(q)}
                                    loading={loading}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {filteredTemplates.length === 0 && (
                    <div className="py-12 bg-gray-50 rounded-xl mx-2 border border-dashed border-gray-200 text-center">
                        <p className="text-xs text-gray-400">No matching queries</p>
                    </div>
                )}
            </div>

            {/* Subtle Footer Stats */}
            <div className="p-3 border-t border-gray-50 bg-white">
                <div className="flex items-center justify-between text-[10px] text-gray-300">
                    <span>Showing {filteredTemplates.length} queries</span>
                    <span>Total 54</span>
                </div>
            </div>
        </div>
    );
}

function QueryCard({ template, isActive, isFavorite, onClick, onToggleFavorite, loading }: {
    template: QueryTemplate,
    isActive: boolean,
    isFavorite: boolean,
    onClick: () => void,
    onToggleFavorite: (e: React.MouseEvent) => void,
    loading: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`w-full p-3 rounded-xl transition-all text-left flex items-center gap-3 border group ${isActive
                ? 'bg-green-600 border-green-600 shadow-lg shadow-green-100'
                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
                }`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                        {template.name}
                    </p>
                    <div className="flex items-center gap-1">
                        <div
                            onClick={onToggleFavorite}
                            className={`p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer ${isFavorite
                                    ? (isActive ? 'text-white' : 'text-yellow-400')
                                    : (isActive ? 'text-white/30 hover:text-white' : 'text-gray-200 hover:text-yellow-400')
                                } ${isActive ? '' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                            <Star className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                        </div>
                        {template.tier === 1 && !isActive && <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                </div>
                <p className={`text-[10px] line-clamp-1 ${isActive ? 'text-green-50' : 'text-gray-400'}`}>
                    {template.description}
                </p>
            </div>
            <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isActive ? 'text-white translate-x-1' : 'text-gray-300'
                }`} />
        </button>
    );
}
