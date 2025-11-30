/**
 * Murugan App - Sync Engine Logic
 * Ensures real-time consistency between Admin CMS and User Mobile App
 */

export interface SyncMetadata {
  version: number;
  synced: boolean;
  updatedAt: string;
  createdAt: string;
  published: boolean;
  category?: string;
  priority?: number;
}

export interface SyncConfig {
  lastSyncTimestamp: number;
  collections: string[];
  autoSync: boolean;
  syncInterval: number; // in milliseconds
}

/**
 * Sync Engine Class
 * Manages synchronization between admin panel and user app
 */
export class SyncEngine {
  private lastSyncTimestamp: number = 0;
  private syncInProgress: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(private config: SyncConfig) {
    this.lastSyncTimestamp = config.lastSyncTimestamp || Date.now();
  }

  /**
   * Subscribe to collection changes
   */
  subscribeToCollection(
    collection: string,
    callback: (data: any) => void
  ): () => void {
    if (!this.listeners.has(collection)) {
      this.listeners.set(collection, new Set());
    }
    
    this.listeners.get(collection)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(collection)?.delete(callback);
    };
  }

  /**
   * Notify all listeners of collection change
   */
  private notifyListeners(collection: string, data: any) {
    this.listeners.get(collection)?.forEach((callback) => {
      callback(data);
    });
  }

  /**
   * Check for updates since last sync
   */
  async checkForUpdates(collection: string): Promise<any[]> {
    try {
      const response = await fetch(
        `/api/sync/check?collection=${collection}&since=${this.lastSyncTimestamp}`
      );
      
      if (!response.ok) {
        throw new Error(`Sync check failed: ${response.statusText}`);
      }

      const updates = await response.json();
      return updates;
    } catch (error) {
      console.error(`[SyncEngine] Failed to check updates for ${collection}:`, error);
      return [];
    }
  }

  /**
   * Sync a specific collection
   */
  async syncCollection(collection: string): Promise<void> {
    try {
      const updates = await this.checkForUpdates(collection);
      
      if (updates.length > 0) {
        console.log(`[SyncEngine] Syncing ${updates.length} items in ${collection}`);
        
        // Store updates locally
        await this.storeLocalUpdates(collection, updates);
        
        // Notify listeners
        this.notifyListeners(collection, updates);
        
        // Update last sync timestamp
        this.lastSyncTimestamp = Date.now();
        this.saveLastSyncTimestamp();
      }
    } catch (error) {
      console.error(`[SyncEngine] Failed to sync ${collection}:`, error);
    }
  }

  /**
   * Sync all subscribed collections
   */
  async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[SyncEngine] Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;
    console.log('[SyncEngine] Starting full sync...');

    try {
      for (const collection of this.config.collections) {
        await this.syncCollection(collection);
      }
      console.log('[SyncEngine] Full sync completed successfully');
    } catch (error) {
      console.error('[SyncEngine] Full sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Store updates locally (using localStorage as cache)
   */
  private async storeLocalUpdates(collection: string, updates: any[]): Promise<void> {
    try {
      const existing = JSON.parse(localStorage.getItem(`cache_${collection}`) || '[]');
      
      // Merge updates with existing data using version comparison
      const merged = this.mergeUpdates(existing, updates);
      
      localStorage.setItem(`cache_${collection}`, JSON.stringify(merged));
      console.log(`[SyncEngine] Cached ${merged.length} items for ${collection}`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to cache ${collection}:`, error);
    }
  }

  /**
   * Merge updates using version-based diff algorithm
   */
  private mergeUpdates(existing: any[], updates: any[]): any[] {
    const merged = [...existing];
    
    updates.forEach((update) => {
      const index = merged.findIndex((item) => item.id === update.id);
      
      if (index >= 0) {
        // Update existing item if version is newer
        if (update.version > merged[index].version) {
          merged[index] = update;
        }
      } else {
        // Add new item
        merged.push(update);
      }
    });

    // Remove deleted items (marked with deleted flag)
    return merged.filter((item) => !item.deleted);
  }

  /**
   * Get cached data for a collection
   */
  getCachedData(collection: string): any[] {
    try {
      const cached = localStorage.getItem(`cache_${collection}`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error(`[SyncEngine] Failed to get cached data for ${collection}:`, error);
      return [];
    }
  }

  /**
   * Clear cache for a collection
   */
  clearCache(collection: string): void {
    localStorage.removeItem(`cache_${collection}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.config.collections.forEach((collection) => {
      this.clearCache(collection);
    });
  }

  /**
   * Save last sync timestamp
   */
  private saveLastSyncTimestamp(): void {
    localStorage.setItem('lastSyncTimestamp', this.lastSyncTimestamp.toString());
  }

  /**
   * Enable auto-sync with interval
   */
  enableAutoSync(): void {
    if (this.config.autoSync) {
      setInterval(() => {
        this.syncAll();
      }, this.config.syncInterval);
      
      console.log(`[SyncEngine] Auto-sync enabled (interval: ${this.config.syncInterval}ms)`);
    }
  }

  /**
   * Force sync for a specific item
   */
  async forceSyncItem(collection: string, itemId: string): Promise<void> {
    try {
      const response = await fetch(`/api/sync/item/${collection}/${itemId}`);
      const item = await response.json();
      
      // Update local cache
      const cached = this.getCachedData(collection);
      const index = cached.findIndex((i) => i.id === itemId);
      
      if (index >= 0) {
        cached[index] = item;
      } else {
        cached.push(item);
      }
      
      localStorage.setItem(`cache_${collection}`, JSON.stringify(cached));
      this.notifyListeners(collection, [item]);
      
      console.log(`[SyncEngine] Force synced item ${itemId} in ${collection}`);
    } catch (error) {
      console.error(`[SyncEngine] Failed to force sync item:`, error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    lastSyncTimestamp: number;
    syncInProgress: boolean;
    cachedCollections: string[];
  } {
    return {
      lastSyncTimestamp: this.lastSyncTimestamp,
      syncInProgress: this.syncInProgress,
      cachedCollections: this.config.collections.filter((collection) => {
        return this.getCachedData(collection).length > 0;
      }),
    };
  }
}

/**
 * Create and initialize sync engine
 */
export function createSyncEngine(config?: Partial<SyncConfig>): SyncEngine {
  const defaultConfig: SyncConfig = {
    lastSyncTimestamp: parseInt(localStorage.getItem('lastSyncTimestamp') || '0'),
    collections: ['banners', 'wallpapers', 'media', 'sparkles', 'photos', 'ai_chats', 'categories'],
    autoSync: true,
    syncInterval: 60000, // 1 minute
    ...config,
  };

  const engine = new SyncEngine(defaultConfig);
  
  // Enable auto-sync if configured
  if (defaultConfig.autoSync) {
    engine.enableAutoSync();
  }

  return engine;
}

/**
 * React hook for using sync engine
 */
export function useSyncEngine() {
  const [engine] = React.useState(() => createSyncEngine());
  const [syncStatus, setSyncStatus] = React.useState(engine.getSyncStatus());

  React.useEffect(() => {
    // Initial sync on mount
    engine.syncAll();

    // Update status periodically
    const interval = setInterval(() => {
      setSyncStatus(engine.getSyncStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, [engine]);

  return {
    engine,
    syncStatus,
    syncAll: () => engine.syncAll(),
    syncCollection: (collection: string) => engine.syncCollection(collection),
    getCachedData: (collection: string) => engine.getCachedData(collection),
    subscribeToCollection: (collection: string, callback: Function) =>
      engine.subscribeToCollection(collection, callback),
  };
}

// For non-React usage
declare const React: any;
