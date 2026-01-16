import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { supabase } from '../../utils/supabase/client';
import { Loader2, HardDrive, TrendingDown, Image as ImageIcon, Award } from 'lucide-react';
import { toast } from 'sonner';

interface OptimizationStats {
    totalFiles: number;
    totalOriginalBytes: number;
    totalOptimizedBytes: number;
    savedBytes: number;
    savedPercentage: number;
}

export function MediaOptimizationSettings() {
    const [stats, setStats] = useState<OptimizationStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch all media items requiring metrics
            // Note: In a real production app with millions of rows, this should be an RPC or Edge Function
            // For now, client-side calculation is fine for < 10k items
            const { data, error } = await supabase
                .from('media')
                .select('original_size_bytes, optimized_size_bytes')
                .not('original_size_bytes', 'is', null);

            if (error) throw error;

            let totalFiles = 0;
            let totalOriginalBytes = 0;
            let totalOptimizedBytes = 0;

            if (data) {
                totalFiles = data.length;
                data.forEach(item => {
                    // Safe parsing in case of weird data types
                    const orig = Number(item.original_size_bytes) || 0;
                    const opt = Number(item.optimized_size_bytes) || 0;
                    totalOriginalBytes += orig;
                    totalOptimizedBytes += opt;
                });
            }

            const savedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
            const savedPercentage = totalOriginalBytes > 0
                ? (savedBytes / totalOriginalBytes) * 100
                : 0;

            setStats({
                totalFiles,
                totalOriginalBytes,
                totalOptimizedBytes,
                savedBytes,
                savedPercentage
            });

        } catch (error) {
            console.error('Error fetching optimization stats:', error);
            toast.error('Failed to load optimization metrics');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Media Optimization</h2>
                    <p className="text-gray-500">Track storage savings from Smart Upload compression.</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="p-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                    Refresh Stats
                </button>
            </div>

            {!stats || stats.totalFiles === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-gray-900">No Optimized Media Yet</h3>
                        <p className="text-gray-500 mt-1 max-w-sm">
                            Upload images via the Admin Portal to start tracking compression savings.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-900">Storage Saved</CardTitle>
                            <HardDrive className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{formatBytes(stats.savedBytes)}</div>
                            <p className="text-xs text-green-600 mt-1">
                                From {formatBytes(stats.totalOriginalBytes)} original
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Optimization Rate</CardTitle>
                            <TrendingDown className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{stats.savedPercentage.toFixed(1)}%</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Reduction per file (avg)
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Files Optimized</CardTitle>
                            <ImageIcon className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalFiles}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Processed via Smart Upload
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Footprint</CardTitle>
                            <Award className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{formatBytes(stats.totalOptimizedBytes)}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                Actual storage used
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {stats && stats.totalFiles > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="flex items-start gap-4 p-6">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Award className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-900">Optimization Insight</h3>
                            <p className="text-sm text-blue-800 mt-1">
                                You’ve reduced media size by <strong>{stats.savedPercentage.toFixed(0)}%</strong>, significantly saving on storage and bandwidth costs.
                                Without optimization, you would be using <strong>{formatBytes(stats.totalOriginalBytes)}</strong> instead of <strong>{formatBytes(stats.totalOptimizedBytes)}</strong>.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
