/**
 * Storage Analytics Type Definitions
 * All types for the Storage Monitor module
 */

export interface StorageStats {
    totalOriginal: number;
    totalOptimized: number;
    totalSaved: number;
    percentSaved: number;
    totalFiles: number;
    filesWithOptimization: number;
}

export interface ModuleStats {
    moduleName: string;
    displayName: string;
    totalFiles: number;
    originalFiles: number;
    optimizedFiles: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    storageSaved: number;
    storageSavedPercent: number;
    avgFileSize: number;
    lastUploadDate: string | null;
    // Analytics
    totalViews: number;
    totalDownloads: number;
    totalLikes: number;
    totalShares: number;
    engagementScore: number;
}

export interface MediaTypeStats {
    type: 'image' | 'video' | 'audio' | 'thumbnail' | 'unknown';
    count: number;
    totalSize: number;
    avgSize: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    compressionRatio: number;
}

export interface FileWithAnalytics {
    id: string;
    title: string;
    moduleName: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    views: number;
    downloads: number;
    likes: number;
    shares: number;
    engagementScore: number;
    uploadedAt: string;
    lastAccessedAt?: string;
    // Optional properties for file type detection
    media_type?: string;
    type?: string;
    file_url?: string;
    image_url?: string;
    is_video?: boolean;
}

export interface OptimizationInsight {
    type:
    | 'large_file'
    | 'low_compression'
    | 'missing_optimization'
    | 'high_bandwidth'
    | 'zero_engagement'
    | 'low_engagement'
    | 'high_impact';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    affectedFiles: FileWithAnalytics[];
    potentialSavings?: number;
    actionable: string;
}

export interface BandwidthStats {
    totalBandwidth: number; // in bytes
    totalBandwidthSaved: number;
    bandwidthByModule: {
        moduleName: string;
        bandwidth: number;
    }[];
    topAccessedFiles: FileWithAnalytics[];
    peakHours: {
        hour: number;
        bandwidth: number;
    }[];
}

export interface EngagementMetrics {
    viewToDownloadRate: number;
    viewToLikeRate: number;
    shareRate: number;
    avgEngagementScore: number;
}

export interface WasteDetection {
    zeroEngagementFiles: FileWithAnalytics[];
    lowEngagementLargeFiles: FileWithAnalytics[];
    staleBandwidthHogs: FileWithAnalytics[];
    totalWastedSpace: number;
}
