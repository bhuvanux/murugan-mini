import React, { useState } from 'react';
import { Database, DownloadCloud, Loader2, PlayCircle, StopCircle, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import * as adminAPI from '../../../utils/adminAPI';

interface BackfillProps {
    items: any[];
    onUpdate: () => void;
    type: 'wallpaper' | 'sparkle';
}

export function MetadataBackfill({ items, onUpdate, type }: BackfillProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, updated: 0 });
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

    const startBackfill = async () => {
        // 1. Identify legacy items
        const legacyItems = items.filter(w =>
            !w.metadata?.original_size ||
            w.original_size_bytes === 0 ||
            w.original_size_bytes === null
        );

        if (legacyItems.length === 0) {
            toast.success("No legacy items found! All items have metadata.");
            return;
        }

        if (!confirm(`Found ${legacyItems.length} items without metadata. This will fetch their size from the server and update the database. Continue?`)) {
            return;
        }

        setIsProcessing(true);
        setProgress({ current: 0, total: legacyItems.length, updated: 0 });
        addLog(`Starting scan for ${legacyItems.length} items...`);

        let updatedCount = 0;

        for (let i = 0; i < legacyItems.length; i++) {
            const item = legacyItems[i];
            try {
                setProgress(prev => ({ ...prev, current: i + 1 }));
                addLog(`Checking: ${item.title || item.id}...`);

                // For sparkles, use image_url (or medium/large if available, but image_url is main)
                const urlToFetch = item.image_url;

                if (!urlToFetch) {
                    addLog(`⚠️ No URL for ${item.id}`);
                    continue;
                }

                // Fetch head request to get size
                const response = await fetch(urlToFetch, { method: 'HEAD' });
                const size = parseInt(response.headers.get('content-length') || '0');

                if (size > 0) {
                    // Determine if we should mark this as "compressed" or not
                    // Since it's legacy, we assume current URL is the only version we have.
                    // We'll set both original and optimized to the same size.

                    const updateData = {
                        original_size_bytes: size,
                        optimized_size_bytes: size,
                        metadata: {
                            ...(item.metadata || {}),
                            original_size: size,
                            optimized_size: size,
                            compression_ratio: "0",
                            is_compressed: false, // Mark as not compressed by our engine
                            backfilled_at: new Date().toISOString()
                        }
                    };

                    if (type === 'wallpaper') {
                        await adminAPI.updateWallpaper(item.id, updateData);
                    } else if (type === 'sparkle') {
                        await adminAPI.updateSparkle(item.id, updateData);
                    }

                    updatedCount++;
                    addLog(`✅ Updated: ${size} bytes`);
                } else {
                    addLog(`⚠️ Could not determine size for ${item.id}`);
                }

            } catch (error: any) {
                console.error("Backfill error for item", item.id, error);
                addLog(`❌ Error: ${error.message}`);
            }
        }

        setIsProcessing(false);
        toast.success(`Backfill complete! Updated ${updatedCount} items.`);
        addLog(`Complete. Refreshed data.`);
        onUpdate();
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Database className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Metadata Repair Tool ({type})</h3>
                        <p className="text-sm text-gray-500">Fix missing compression stats for old items</p>
                    </div>
                </div>

                <button
                    onClick={startBackfill}
                    disabled={isProcessing}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    {isProcessing ? 'Processing...' : 'Scan & Fix'}
                </button>
            </div>

            {isProcessing && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Progress: {progress.current} / {progress.total}</span>
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>

                    <div className="bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-xs">
                        {logs.map((log, i) => (
                            <div key={i} className="text-gray-300 border-b border-gray-800 last:border-0 py-1">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
