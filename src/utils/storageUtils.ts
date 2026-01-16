/**
 * Storage Analytics Utility Functions
 * All calculations for the Storage Monitor module
 */

import {
    StorageStats,
    ModuleStats,
    MediaTypeStats,
    FileWithAnalytics,
    OptimizationInsight,
    BandwidthStats,
    EngagementMetrics,
    WasteDetection,
} from '../types/storageTypes';

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate total storage statistics
 */
export function calculateTotalStorage(items: any[]): StorageStats {
    const stats = items.reduce(
        (acc, item) => {
            const original = getOriginalSize(item);
            const optimized = getOptimizedSize(item);

            acc.totalOriginal += original;
            acc.totalOptimized += optimized;
            acc.totalSaved += (original > optimized ? original - optimized : 0);
            acc.totalFiles += 1;

            if (original > 0 && optimized > 0 && optimized < original) {
                acc.filesWithOptimization += 1;
            }

            return acc;
        },
        { totalOriginal: 0, totalOptimized: 0, totalSaved: 0, totalFiles: 0, filesWithOptimization: 0 }
    );

    const percentSaved =
        stats.totalOriginal > 0
            ? Math.round((stats.totalSaved / stats.totalOriginal) * 100)
            : 0;

    return { ...stats, percentSaved };
}

/**
 * Get original file size from various possible fields
 */
function getOriginalSize(item: any): number {
    return (
        item.original_size_bytes ||
        item.original_size ||
        item.file_size_bytes ||
        item.file_size ||
        item.size_bytes ||
        item.size ||
        item.metadata?.original_size_bytes ||
        item.metadata?.original_size ||
        item.metadata?.file_size ||
        item.metadata?.size ||
        0
    );
}

/**
 * Get optimized file size from various possible fields
 */
function getOptimizedSize(item: any): number {
    return (
        item.optimized_size_bytes ||
        item.optimized_size ||
        item.file_size_bytes ||
        item.file_size ||
        item.size_bytes ||
        item.size ||
        item.metadata?.optimized_size_bytes ||
        item.metadata?.optimized_size ||
        item.metadata?.file_size ||
        item.metadata?.size ||
        0
    );
}

/**
 * Calculate module-specific statistics
 */
export function calculateModuleStats(
    items: any[],
    moduleName: string,
    displayName: string,
    analytics: Map<string, any>
): ModuleStats {
    const moduleItems = items;

    const storage = moduleItems.reduce(
        (acc, item) => {
            const original = getOriginalSize(item);
            const optimized = getOptimizedSize(item);

            acc.totalOriginal += original;
            acc.totalOptimized += optimized;
            acc.storageSaved += (original > optimized ? original - optimized : 0);

            if (original > 0 && optimized > 0 && optimized < original) {
                acc.optimizedFiles += 1;
            }
            if (original > 0) {
                acc.originalFiles += 1;
            }

            return acc;
        },
        { totalOriginal: 0, totalOptimized: 0, storageSaved: 0, originalFiles: 0, optimizedFiles: 0 }
    );

    const storageSavedPercent =
        storage.totalOriginal > 0
            ? Math.round((storage.storageSaved / storage.totalOriginal) * 100)
            : 0;

    const avgFileSize =
        moduleItems.length > 0 ? storage.totalOptimized / moduleItems.length : 0;

    // Get last upload date
    const lastUploadDate = moduleItems.length > 0
        ? moduleItems.reduce((latest, item) => {
            const itemDate = new Date(item.created_at);
            return !latest || itemDate > latest ? itemDate : latest;
        }, null as Date | null)?.toISOString() || null
        : null;

    // Calculate analytics
    const analyticsStats = moduleItems.reduce(
        (acc, item) => {
            const itemAnalytics = analytics.get(item.id) || {};
            acc.totalViews += itemAnalytics.views || item.view_count || 0;
            acc.totalDownloads += itemAnalytics.downloads || item.download_count || 0;
            acc.totalLikes += itemAnalytics.likes || item.like_count || 0;
            acc.totalShares += itemAnalytics.shares || item.share_count || 0;
            return acc;
        },
        { totalViews: 0, totalDownloads: 0, totalLikes: 0, totalShares: 0 }
    );

    const engagementScore =
        analyticsStats.totalViews * 1 +
        analyticsStats.totalDownloads * 3 +
        analyticsStats.totalLikes * 2 +
        analyticsStats.totalShares * 4;

    return {
        moduleName,
        displayName,
        totalFiles: moduleItems.length,
        originalFiles: storage.originalFiles,
        optimizedFiles: storage.optimizedFiles,
        totalOriginalSize: storage.totalOriginal,
        totalOptimizedSize: storage.totalOptimized,
        storageSaved: storage.storageSaved,
        storageSavedPercent,
        avgFileSize,
        lastUploadDate,
        ...analyticsStats,
        engagementScore,
    };
}

/**
 * Group files by media type
 */
export function calculateMediaTypeStats(allFiles: any[]): MediaTypeStats[] {
    const typeMap = new Map<string, any[]>();

    allFiles.forEach((file) => {
        let type: string = 'unknown';

        // Check for video first (most specific)
        if (file.is_video === true || file.media_type === 'video' || file.type === 'video') {
            type = 'video';
        }
        // Then audio/song
        else if (file.media_type === 'audio' || file.media_type === 'song' || file.type === 'audio' || file.moduleName === 'songs') {
            type = 'audio';
        }
        // Then thumbnails (could apply to any type)
        else if (file.thumbnail_url && !file.image_url && !file.file_url) {
            type = 'thumbnail';
        }
        // Default to image
        else {
            type = 'image';
        }

        if (!typeMap.has(type)) {
            typeMap.set(type, []);
        }
        typeMap.get(type)!.push(file);
    });

    const stats: MediaTypeStats[] = [];

    typeMap.forEach((files, type) => {
        const totalOriginalSize = files.reduce((sum, f) => sum + getOriginalSize(f), 0);
        const totalOptimizedSize = files.reduce((sum, f) => sum + getOptimizedSize(f), 0);
        const compressionRatio = totalOriginalSize > 0
            ? Math.round(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100)
            : 0;

        stats.push({
            type: type as any,
            count: files.length,
            totalSize: totalOptimizedSize,
            avgSize: files.length > 0 ? totalOptimizedSize / files.length : 0,
            totalOriginalSize,
            totalOptimizedSize,
            compressionRatio,
        });
    });

    return stats.sort((a, b) => b.totalSize - a.totalSize);
}

/**
 * Convert files to FileWithAnalytics format
 */
export function convertToFileWithAnalytics(
    items: any[],
    moduleName: string,
    analytics: Map<string, any>
): FileWithAnalytics[] {
    return items.map((item) => {
        const original = getOriginalSize(item);
        const optimized = getOptimizedSize(item);
        const compressionRatio = original > 0 ? Math.round(((original - optimized) / original) * 100) : 0;

        const itemAnalytics = analytics.get(item.id) || {};
        const views = itemAnalytics.views || item.view_count || item.play_count || item.views || 0;
        const downloads = itemAnalytics.downloads || item.download_count || item.downloads || 0;
        const likes = itemAnalytics.likes || item.like_count || item.likes || 0;
        const shares = itemAnalytics.shares || item.share_count || item.shares || 0;

        const engagementScore = views * 1 + downloads * 3 + likes * 2 + shares * 4;


        return {
            id: item.id,
            title: item.title || item.file_name || 'Untitled',
            moduleName,
            originalSize: original,
            optimizedSize: optimized,
            compressionRatio,
            views,
            downloads,
            likes,
            shares,
            engagementScore,
            uploadedAt: item.created_at || item.upload_date || new Date().toISOString(),
            lastAccessedAt: itemAnalytics.lastAccessed || item.last_accessed,
            // Preserve original properties for filtering
            media_type: item.media_type || item.type,
            type: item.type || item.media_type,
            file_url: item.file_url,
            image_url: item.image_url,
            is_video: item.is_video,
        };
    });
}

/**
 * Calculate bandwidth statistics
 */
export function calculateBandwidthStats(
    filesWithAnalytics: FileWithAnalytics[],
    moduleStats: ModuleStats[]
): BandwidthStats {
    // Bandwidth = (views + downloads) * file size
    const totalBandwidth = filesWithAnalytics.reduce((sum, file) => {
        return sum + (file.views + file.downloads) * file.optimizedSize;
    }, 0);

    const totalBandwidthSaved = filesWithAnalytics.reduce((sum, file) => {
        const savedPerAccess = file.originalSize - file.optimizedSize;
        return sum + (file.views + file.downloads) * savedPerAccess;
    }, 0);

    const bandwidthByModule = moduleStats.map((module) => ({
        moduleName: module.displayName,
        bandwidth: filesWithAnalytics
            .filter((f) => f.moduleName === module.moduleName)
            .reduce((sum, f) => sum + (f.views + f.downloads) * f.optimizedSize, 0),
    })).sort((a, b) => b.bandwidth - a.bandwidth);

    const topAccessedFiles = [...filesWithAnalytics]
        .sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads))
        .slice(0, 10);

    return {
        totalBandwidth,
        totalBandwidthSaved,
        bandwidthByModule,
        topAccessedFiles,
        peakHours: [], // TODO: Implement if we have hourly analytics data
    };
}

/**
 * Generate optimization insights
 */
export function generateOptimizationInsights(
    filesWithAnalytics: FileWithAnalytics[]
): OptimizationInsight[] {
    const insights: OptimizationInsight[] = [];

    // 1. Large files (>10MB)
    const largeFiles = filesWithAnalytics.filter((f) => f.optimizedSize > 10 * 1024 * 1024);
    if (largeFiles.length > 0) {
        insights.push({
            type: 'large_file',
            severity: 'medium',
            title: 'Large Files Detected',
            description: `${largeFiles.length} files are larger than 10MB and may impact load times.`,
            affectedFiles: largeFiles.sort((a, b) => b.optimizedSize - a.optimizedSize),
            actionable: 'Consider further compression or breaking into smaller chunks.',
        });
    }

    // 2. Low compression ratio (<20%)
    const lowCompression = filesWithAnalytics.filter((f) => f.compressionRatio < 20 && f.originalSize > 1024 * 1024);
    if (lowCompression.length > 0) {
        const potentialSavings = lowCompression.reduce((sum, f) => sum + (f.originalSize - f.optimizedSize), 0);
        insights.push({
            type: 'low_compression',
            severity: 'medium',
            title: 'Low Compression Ratio',
            description: `${lowCompression.length} files have less than 20% compression. Potential for optimization.`,
            affectedFiles: lowCompression.sort((a, b) => a.compressionRatio - b.compressionRatio),
            potentialSavings,
            actionable: 'Re-encode with better compression settings or different format.',
        });
    }

    // 3. High-impact optimization (popular + large)
    const highImpact = filesWithAnalytics.filter(
        (f) => f.optimizedSize > 5 * 1024 * 1024 && (f.views + f.downloads) > 100
    );
    if (highImpact.length > 0) {
        const potentialSavings = highImpact.reduce(
            (sum, f) => sum + (f.views + f.downloads) * (f.originalSize - f.optimizedSize),
            0
        );
        insights.push({
            type: 'high_impact',
            severity: 'high',
            title: 'High-Impact Optimization Opportunity',
            description: `${highImpact.length} popular, large files could save significant bandwidth if further optimized.`,
            affectedFiles: highImpact.sort((a, b) => b.engagementScore - a.engagementScore),
            potentialSavings,
            actionable: 'Priority optimization: These files have high traffic and size.',
        });
    }

    // 4. Files missing optimization
    const missingOptimization = filesWithAnalytics.filter((f) => f.originalSize > 0 && f.optimizedSize === f.originalSize);
    if (missingOptimization.length > 0) {
        insights.push({
            type: 'missing_optimization',
            severity: 'high',
            title: 'Files Not Optimized',
            description: `${missingOptimization.length} files have not been optimized yet.`,
            affectedFiles: missingOptimization.sort((a, b) => b.originalSize - a.originalSize),
            actionable: 'Run optimization process on these files.',
        });
    }

    // 5. Zero engagement
    const zeroEngagement = filesWithAnalytics.filter(
        (f) => f.views === 0 && f.downloads === 0 && f.likes === 0
    );
    if (zeroEngagement.length > 0) {
        const wastedSpace = zeroEngagement.reduce((sum, f) => sum + f.optimizedSize, 0);
        insights.push({
            type: 'zero_engagement',
            severity: 'low',
            title: 'Zero Engagement Files',
            description: `${zeroEngagement.length} files have never been accessed.`,
            affectedFiles: zeroEngagement.sort((a, b) => b.optimizedSize - a.optimizedSize),
            potentialSavings: wastedSpace,
            actionable: 'Consider archiving or removing unused content.',
        });
    }

    // 6. High bandwidth, low engagement
    const bandwidthHogs = filesWithAnalytics.filter(
        (f) => (f.views + f.downloads) * f.optimizedSize > 100 * 1024 * 1024 && f.engagementScore < 500
    );
    if (bandwidthHogs.length > 0) {
        insights.push({
            type: 'high_bandwidth',
            severity: 'medium',
            title: 'Bandwidth Hogs with Low Value',
            description: `${bandwidthHogs.length} files consume significant bandwidth but have low engagement.`,
            affectedFiles: bandwidthHogs.sort((a, b) => (b.views + b.downloads) * b.optimizedSize - (a.views + a.downloads) * a.optimizedSize),
            actionable: 'Review content quality or reduce file size.',
        });
    }

    return insights.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
    });
}

/**
 * Calculate engagement metrics
 */
export function calculateEngagementMetrics(filesWithAnalytics: FileWithAnalytics[]): EngagementMetrics {
    const totalViews = filesWithAnalytics.reduce((sum, f) => sum + f.views, 0);
    const totalDownloads = filesWithAnalytics.reduce((sum, f) => sum + f.downloads, 0);
    const totalLikes = filesWithAnalytics.reduce((sum, f) => sum + f.likes, 0);
    const totalShares = filesWithAnalytics.reduce((sum, f) => sum + f.shares, 0);
    const totalEngagement = filesWithAnalytics.reduce((sum, f) => sum + f.engagementScore, 0);

    return {
        viewToDownloadRate: totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0,
        viewToLikeRate: totalViews > 0 ? (totalLikes / totalViews) * 100 : 0,
        shareRate: totalViews > 0 ? (totalShares / totalViews) * 100 : 0,
        avgEngagementScore: filesWithAnalytics.length > 0 ? totalEngagement / filesWithAnalytics.length : 0,
    };
}

/**
 * Detect waste
 */
export function detectWaste(filesWithAnalytics: FileWithAnalytics[]): WasteDetection {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const zeroEngagementFiles = filesWithAnalytics.filter(
        (f) => f.views === 0 && f.downloads === 0 && f.likes === 0 && f.shares === 0
    );

    const lowEngagementLargeFiles = filesWithAnalytics.filter(
        (f) => f.optimizedSize > 5 * 1024 * 1024 && f.engagementScore < 50
    );

    const staleBandwidthHogs = filesWithAnalytics.filter((f) => {
        const uploadDate = new Date(f.uploadedAt);
        return (
            uploadDate < thirtyDaysAgo &&
            f.optimizedSize > 3 * 1024 * 1024 &&
            (f.views + f.downloads) * f.optimizedSize > 50 * 1024 * 1024 &&
            f.engagementScore < 100
        );
    });

    const totalWastedSpace =
        zeroEngagementFiles.reduce((sum, f) => sum + f.optimizedSize, 0) +
        lowEngagementLargeFiles.reduce((sum, f) => sum + f.optimizedSize, 0);

    return {
        zeroEngagementFiles,
        lowEngagementLargeFiles,
        staleBandwidthHogs,
        totalWastedSpace,
    };
}

/**
 * Estimate storage growth rate and days to full
 */
export function estimateGrowthAndCapacity(
    allFiles: any[],
    currentUsageBytes: number,
    totalCapacityBytes: number = 100 * 1024 * 1024 * 1024 // Default 100GB
): { growthRatePerDay: number; estimatedDaysToFull: number } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get files from last 30 days
    const recentFiles = allFiles.filter((f) => new Date(f.created_at) >= thirtyDaysAgo);

    if (recentFiles.length === 0) {
        return { growthRatePerDay: 0, estimatedDaysToFull: Infinity };
    }

    const recentStorage = recentFiles.reduce((sum, f) => sum + getOptimizedSize(f), 0);
    const growthRatePerDay = recentStorage / 30;

    const remainingSpace = totalCapacityBytes - currentUsageBytes;
    const estimatedDaysToFull = growthRatePerDay > 0 ? Math.floor(remainingSpace / growthRatePerDay) : Infinity;

    return { growthRatePerDay, estimatedDaysToFull };
}
