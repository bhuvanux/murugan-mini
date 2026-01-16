/**
 * ADMIN CACHE RESET UTILITY
 * Run this in browser console when you need to clear all cached data
 * Use case: After resetting database analytics, this ensures admin panel shows fresh data
 */

// Import and clear API cache
import { apiCache } from './api/cache';

export function resetAdminCache() {
    console.log('[Admin] Clearing all caches...');

    // 1. Clear API cache (in-memory + localStorage)
    apiCache.clearAll();

    // 2. Clear any admin-specific localStorage keys
    const adminKeys = Object.keys(localStorage).filter(key =>
        key.includes('admin') ||
        key.includes('cache') ||
        key.includes('banner') ||
        key.includes('analytics')
    );

    adminKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[Admin] Removed: ${key}`);
    });

    console.log('[Admin] ✅ All caches cleared! Please refresh the page.');

    // Auto-refresh the page
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Make it globally available in dev
if (typeof window !== 'undefined') {
    (window as any).resetAdminCache = resetAdminCache;
    console.log('[Admin] Cache reset utility loaded. Run resetAdminCache() to clear all caches.');
}
