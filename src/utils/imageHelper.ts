/**
 * Helper to optimize Supabase Storage URLs using Image Transformations
 * Transforms /storage/v1/object/public/ -> /storage/v1/render/image/public/
 */
export const optimizeSupabaseUrl = (url: string, width: number = 1200): string => {
    if (!url || typeof url !== 'string') return '';

    // Only optimize Supabase Storage URLs
    if (!url.includes('/storage/v1/object/public/')) return url;

    // Check if already a render URL (avoid double transformation)
    if (url.includes('/render/image/')) return url;

    // Check for common non-image extensions (to avoid breaking videos/audio)
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.avi') || lowerUrl.includes('.mp3') || lowerUrl.includes('.wav') || lowerUrl.includes('.webm') || lowerUrl.includes('.mkv') || lowerUrl.includes('.m4v')) {
        return url;
    }

    try {
        // Replace standard storage path with render path
        // Standard: .../storage/v1/object/public/bucket/folder/file.jpg
        // Render:   .../storage/v1/render/image/public/bucket/folder/file.jpg
        const optimizedUrl = url.replace(
            '/storage/v1/object/public/',
            '/storage/v1/render/image/public/'
        );

        // Append width parameter (and quality/format if needed)
        // We use 'origin' resize mode to maintain aspect ratio
        const separator = optimizedUrl.includes('?') ? '&' : '?';
        return `${optimizedUrl}${separator}width=${width}&resize=contain&quality=80`;
    } catch (e) {
        console.warn('[ImageHelper] Failed to optimize URL:', url, e);
        return url;
    }
};
