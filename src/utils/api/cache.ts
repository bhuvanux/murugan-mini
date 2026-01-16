// API CACHE LAYER
// Reduces load on admin backend by caching responses

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Max entries

  // Get cache key for a request
  private getCacheKey(endpoint: string): string {
    return `api_cache_${endpoint}`;
  }

  // Check if cache entry is valid
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  // Get from cache
  get<T>(endpoint: string): T | null {
    const key = this.getCacheKey(endpoint);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isValid(entry)) {
      console.log(`[Cache] HIT for ${endpoint}`);
      return entry.data as T;
    }

    // Expired, remove it
    this.cache.delete(key);
    console.log(`[Cache] EXPIRED for ${endpoint}`);
    return null;
  }

  // Set cache entry
  set<T>(endpoint: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Limit cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const key = this.getCacheKey(endpoint);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
    console.log(`[Cache] SET for ${endpoint} (TTL: ${ttl}ms)`);
  }

  // Check if request is pending (deduplication)
  isPending(endpoint: string): boolean {
    return this.pendingRequests.has(endpoint);
  }

  // Get pending request
  getPending<T>(endpoint: string): Promise<T> | null {
    return this.pendingRequests.get(endpoint) || null;
  }

  // Set pending request
  setPending<T>(endpoint: string, promise: Promise<T>): void {
    this.pendingRequests.set(endpoint, promise);

    // Clean up when promise resolves
    promise.finally(() => {
      this.pendingRequests.delete(endpoint);
    });
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }

  // Clear EVERYTHING including localStorage (for admin reset)
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    try {
      localStorage.removeItem('api_cache');
      console.log('[Cache] ✅ Cleared all in-memory cache AND localStorage');
    } catch (error) {
      console.error('[Cache] Failed to clear localStorage:', error);
    }
  }

  // Clear specific endpoint
  clearEndpoint(endpoint: string): void {
    const key = this.getCacheKey(endpoint);
    this.cache.delete(key);
    console.log(`[Cache] Cleared ${endpoint}`);
  }

  // Delete specific cache entry (alias for clearEndpoint)
  delete(endpoint: string): void {
    this.clearEndpoint(endpoint);
  }

  // ✅ NEW: Clear all cache entries matching a pattern
  clearByPattern(pattern: string): void {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      // Remove the "api_cache_" prefix to match against endpoint
      const endpoint = key.replace('api_cache_', '');
      if (endpoint.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    console.log(`[Cache] Cleared ${cleared} entries matching pattern: ${pattern}`);
  }

  // Get cache stats
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  // Save cache to localStorage (persist across page refreshes)
  saveToStorage(): void {
    try {
      const cacheData: Record<string, CacheEntry<any>> = {};
      this.cache.forEach((value, key) => {
        // Only save valid entries
        if (this.isValid(value)) {
          cacheData[key] = value;
        }
      });
      localStorage.setItem('api_cache', JSON.stringify(cacheData));
      console.log('[Cache] Saved to localStorage');
    } catch (error) {
      console.error('[Cache] Failed to save to localStorage:', error);
    }
  }

  // Load cache from localStorage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('api_cache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        Object.entries(cacheData).forEach(([key, value]) => {
          const entry = value as CacheEntry<any>;
          // Only load if still valid
          if (this.isValid(entry)) {
            this.cache.set(key, entry);
          }
        });
        console.log('[Cache] Loaded from localStorage:', this.cache.size, 'entries');
      }
    } catch (error) {
      console.error('[Cache] Failed to load from localStorage:', error);
    }
  }
}

// Export singleton
export const apiCache = new APICache();

// Load cache on startup
if (typeof window !== 'undefined') {
  apiCache.loadFromStorage();

  // Save cache periodically
  setInterval(() => {
    apiCache.saveToStorage();
  }, 30000); // Every 30 seconds

  // Save on page unload
  window.addEventListener('beforeunload', () => {
    apiCache.saveToStorage();
  });
}