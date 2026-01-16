import React, { useMemo, useState } from "react";
import {
    Database,
    X,
    Eye,
    Download,
    Share2,
    AlertCircle,
    CheckCircle,
    Clock,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Zap,
    ExternalLink,
} from "lucide-react";
import { ThumbnailImage } from "../ThumbnailImage";
import { formatBytes } from "../../utils/storageUtils";
import { toast } from "sonner";

interface FileTypeExplorerProps {
    fileType: 'thumbnail' | 'video' | 'audio';
    files: any[];
    onClose: () => void;
}

type SortField = 'name' | 'module' | 'uploaded' | 'size' | 'saved' | 'views' | 'downloads' | 'shares' | 'bandwidth' | 'status';
type SortDirection = 'asc' | 'desc';

export function FileTypeExplorer({ fileType, files, onClose }: FileTypeExplorerProps) {
    const [sortField, setSortField] = useState<SortField>('size');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [optimizingFiles, setOptimizingFiles] = useState<Set<string>>(new Set());
    const [localFiles, setLocalFiles] = useState(files);

    // Update local files when props change
    React.useEffect(() => {
        setLocalFiles(files);
    }, [files]);

    // Filter files by the selected type - IMPROVED LOGIC
    const filteredFiles = useMemo(() => {
        return localFiles.filter((file) => {
            const fileName = (file.title || '').toLowerCase();
            const fileUrl = (file.file_url || file.image_url || '').toLowerCase();
            const mediaType = (file.media_type || file.type || '').toLowerCase();
            const moduleName = (file.moduleName || '').toLowerCase();

            if (fileType === 'video') {
                return file.is_video === true ||
                    mediaType === 'video' ||
                    (moduleName === 'media' && mediaType !== 'audio' && mediaType !== 'song') ||
                    fileUrl.includes('.mp4') || fileUrl.includes('.mov') || fileUrl.includes('.webm');
            } else if (fileType === 'audio') {
                return mediaType === 'audio' ||
                    mediaType === 'song' ||
                    moduleName === 'songs' ||
                    fileUrl.includes('.mp3') || fileUrl.includes('.wav') || fileUrl.includes('.m4a');
            } else if (fileType === 'thumbnail') {
                return (file.thumbnailUrl && !file.is_video && mediaType !== 'video') ||
                    fileName.includes('thumb') ||
                    (moduleName === 'wallpapers' && !file.is_video && mediaType !== 'video') ||
                    (file.optimizedSize > 0 && file.optimizedSize < 500 * 1024 && moduleName === 'wallpapers');
            }
            return false;
        });
    }, [localFiles, fileType]);

    // Sorted files
    const sortedFiles = useMemo(() => {
        const sorted = [...filteredFiles].sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'name':
                    aVal = a.title || '';
                    bVal = b.title || '';
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);

                case 'module':
                    aVal = a.moduleName || '';
                    bVal = b.moduleName || '';
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);

                case 'uploaded':
                    aVal = new Date(a.uploadedAt || 0).getTime();
                    bVal = new Date(b.uploadedAt || 0).getTime();
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'size':
                    aVal = a.optimizedSize || 0;
                    bVal = b.optimizedSize || 0;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'saved':
                    aVal = a.compressionRatio || 0;
                    bVal = b.compressionRatio || 0;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'views':
                    aVal = a.views || 0;
                    bVal = b.views || 0;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'downloads':
                    aVal = a.downloads || 0;
                    bVal = b.downloads || 0;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'shares':
                    aVal = a.shares || 0;
                    bVal = b.shares || 0;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'bandwidth':
                    aVal = (a.views + a.downloads) * (a.optimizedSize || 0);
                    bVal = (b.views + b.downloads) * (b.optimizedSize || 0);
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                case 'status':
                    aVal = (a.compressionRatio > 0 && a.optimizedSize < a.originalSize) ? 1 : 0;
                    bVal = (b.compressionRatio > 0 && b.optimizedSize < b.originalSize) ? 1 : 0;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;

                default:
                    return 0;
            }
        });

        return sorted;
    }, [filteredFiles, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            onClick={() => handleSort(field)}
            className="px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none text-left"
        >
            <div className="flex items-center gap-2">
                {children}
                {sortField === field ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                )}
            </div>
        </th>
    );

    const typeLabels = {
        thumbnail: 'Thumbnails',
        video: 'Videos',
        audio: 'Audios',
    };

    // Helper to format relative date
    const formatRelativeDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    };

    const handleOptimize = async (file: any) => {
        const fileId = file.id;

        // Add to optimizing set
        setOptimizingFiles(prev => new Set(prev).add(fileId));

        try {
            toast.loading(`Optimizing ${file.title}...`, { id: `optimize-${fileId}` });

            // Call the optimization API based on module type
            // This is a placeholder - you'll need to implement the actual API calls
            let result;
            switch (file.moduleName) {
                case 'wallpapers':
                    // TODO: Call wallpaper optimization endpoint
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
                    result = { success: true, compressionRatio: 35 };
                    break;
                case 'media':
                    // TODO: Call media optimization endpoint
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    result = { success: true, compressionRatio: 42 };
                    break;
                default:
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    result = { success: true, compressionRatio: 28 };
            }

            if (result.success) {
                // Update local file state with new compression ratio
                setLocalFiles(prevFiles =>
                    prevFiles.map(f =>
                        f.id === fileId
                            ? { ...f, compressionRatio: result.compressionRatio, optimizedSize: f.originalSize * (1 - result.compressionRatio / 100) }
                            : f
                    )
                );

                toast.success(`✅ Optimized ${file.title} - Saved ${result.compressionRatio}%`, {
                    id: `optimize-${fileId}`,
                    duration: 4000
                });
            } else {
                toast.error(`Failed to optimize ${file.title}`, { id: `optimize-${fileId}` });
            }
        } catch (error) {
            console.error('Optimization error:', error);
            toast.error(`Error optimizing ${file.title}`, { id: `optimize-${fileId}` });
        } finally {
            // Remove from optimizing set
            setOptimizingFiles(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    const handleNavigateToModule = (file: any) => {
        toast.info(`Navigate to ${file.moduleName} module`);
        // TODO: Implement navigation
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Database className="w-6 h-6 text-purple-600" />
                            {typeLabels[fileType]}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {sortedFiles.length} file{sortedFiles.length !== 1 ? 's' : ''} • {formatBytes(sortedFiles.reduce((sum, f) => sum + (f.optimizedSize || 0), 0))} total
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* File Table */}
                <div className="flex-1 overflow-auto">
                    {sortedFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <Database className="w-16 h-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No {typeLabels[fileType].toLowerCase()} found</p>
                            <p className="text-sm text-gray-400 mt-2">Files may not have the correct type metadata</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0 z-10 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-3 py-3 w-16 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                                    <th className="px-3 py-3 w-24 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <SortHeader field="module">Module</SortHeader>
                                    <SortHeader field="uploaded">Date</SortHeader>
                                    <SortHeader field="size">Size</SortHeader>
                                    <SortHeader field="saved">Saved</SortHeader>
                                    <SortHeader field="views">Views</SortHeader>
                                    <SortHeader field="downloads">DL</SortHeader>
                                    <SortHeader field="shares">Share</SortHeader>
                                    <SortHeader field="bandwidth">Bandwidth</SortHeader>
                                    <SortHeader field="status">Status</SortHeader>
                                    <th className="px-3 py-3 w-24 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedFiles.map((file) => {
                                    const isOptimized = file.compressionRatio > 0 && file.optimizedSize < file.originalSize;

                                    return (
                                        <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                            {/* Preview */}
                                            <td className="px-3 py-3 w-16">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    {file.thumbnailUrl || file.imageUrl ? (
                                                        <ThumbnailImage
                                                            src={file.thumbnailUrl || file.imageUrl}
                                                            alt={file.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Database className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* File Name - Truncated to 5 chars */}
                                            <td className="px-3 py-3 w-24">
                                                <p className="font-medium text-sm text-gray-900" title={file.title}>
                                                    {file.title.length > 5 ? `${file.title.substring(0, 5)}...` : file.title}
                                                </p>
                                            </td>

                                            {/* Module */}
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize whitespace-nowrap">
                                                    {file.moduleName}
                                                </span>
                                            </td>

                                            {/* Uploaded Date */}
                                            <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                                {formatRelativeDate(file.uploadedAt)}
                                            </td>

                                            {/* Size */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatBytes(file.optimizedSize || 0)}
                                                </div>
                                            </td>

                                            {/* Saved % */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <span className="text-sm font-semibold text-green-600">
                                                    {file.compressionRatio || 0}%
                                                </span>
                                            </td>

                                            {/* Views - Separate Column */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1 text-sm text-gray-700">
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                    {file.views || 0}
                                                </div>
                                            </td>

                                            {/* Downloads - Separate Column */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1 text-sm text-gray-700">
                                                    <Download className="w-4 h-4 text-gray-400" />
                                                    {file.downloads || 0}
                                                </div>
                                            </td>

                                            {/* Shares - Separate Column */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1 text-sm text-gray-700">
                                                    <Share2 className="w-4 h-4 text-gray-400" />
                                                    {file.shares || 0}
                                                </div>
                                            </td>

                                            {/* Bandwidth */}
                                            <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium whitespace-nowrap">
                                                {formatBytes((file.views + file.downloads) * (file.optimizedSize || 0))}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {isOptimized ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Optimized
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                        <Clock className="w-3 h-3" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {!isOptimized && (
                                                        <button
                                                            onClick={() => handleOptimize(file)}
                                                            disabled={optimizingFiles.has(file.id)}
                                                            className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={optimizingFiles.has(file.id) ? "Optimizing..." : "Optimize"}
                                                        >
                                                            {optimizingFiles.has(file.id) ? (
                                                                <div className="animate-spin">
                                                                    <Zap className="w-4 h-4 text-green-600" />
                                                                </div>
                                                            ) : (
                                                                <Zap className="w-4 h-4 text-green-600" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleNavigateToModule(file)}
                                                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Go to module"
                                                    >
                                                        <ExternalLink className="w-4 h-4 text-blue-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing {sortedFiles.length} {typeLabels[fileType].toLowerCase()}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
