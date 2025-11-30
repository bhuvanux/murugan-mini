/**
 * UNIFIED ANALYTICS HOOK
 * IP-Based Unique Tracking for All Modules
 * Future-Proof & Plug-and-Play
 */

import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

export type ModuleName = 
  | 'wallpaper' 
  | 'song' 
  | 'video' 
  | 'sparkle' 
  | 'photo' 
  | 'ask_gugan' 
  | 'banner';

export type EventType = 
  | 'view' 
  | 'like' 
  | 'unlike' 
  | 'download' 
  | 'share' 
  | 'play' 
  | 'watch_complete' 
  | 'read' 
  | 'click';

export interface AnalyticsStats {
  view?: number;
  like?: number;
  unlike?: number;
  download?: number;
  share?: number;
  play?: number;
  watch_complete?: number;
  read?: number;
  click?: number;
}

export interface TrackingResult {
  success: boolean;
  tracked: boolean;
  already_tracked: boolean;
  unique_count: number;
}

/**
 * Unified Analytics Hook
 * Provides tracking functions and stats retrieval
 */
export function useAnalytics(moduleName: ModuleName, itemId?: string) {
  const [stats, setStats] = useState<AnalyticsStats>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Track an analytics event
   */
  const trackEvent = useCallback(
    async (eventType: EventType, metadata: any = {}): Promise<TrackingResult> => {
      if (!itemId) {
        console.warn('[Analytics] No item ID provided for tracking');
        return {
          success: false,
          tracked: false,
          already_tracked: false,
          unique_count: 0,
        };
      }

      try {
        const response = await fetch(`${API_BASE}/api/analytics/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            module_name: moduleName,
            item_id: itemId,
            event_type: eventType,
            metadata,
          }),
        });

        if (!response.ok) {
          throw new Error(`Tracking failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Update local stats optimistically
        if (data.success && data.tracked) {
          setStats(prev => ({
            ...prev,
            [eventType]: data.unique_count,
          }));
        }

        return {
          success: data.success,
          tracked: data.tracked,
          already_tracked: data.already_tracked,
          unique_count: data.unique_count,
        };
      } catch (err: any) {
        console.error('[Analytics] Track error:', err);
        setError(err.message);
        return {
          success: false,
          tracked: false,
          already_tracked: false,
          unique_count: 0,
        };
      }
    },
    [moduleName, itemId]
  );

  /**
   * Untrack an analytics event (for unlike)
   */
  const untrackEvent = useCallback(
    async (eventType: EventType): Promise<TrackingResult> => {
      if (!itemId) {
        console.warn('[Analytics] No item ID provided for untracking');
        return {
          success: false,
          tracked: false,
          already_tracked: false,
          unique_count: 0,
        };
      }

      try {
        const response = await fetch(`${API_BASE}/api/analytics/untrack`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            module_name: moduleName,
            item_id: itemId,
            event_type: eventType,
          }),
        });

        if (!response.ok) {
          throw new Error(`Untracking failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Update local stats
        if (data.success) {
          setStats(prev => ({
            ...prev,
            [eventType]: data.unique_count,
          }));
        }

        return {
          success: data.success,
          tracked: false,
          already_tracked: false,
          unique_count: data.unique_count,
        };
      } catch (err: any) {
        console.error('[Analytics] Untrack error:', err);
        setError(err.message);
        return {
          success: false,
          tracked: false,
          already_tracked: false,
          unique_count: 0,
        };
      }
    },
    [moduleName, itemId]
  );

  /**
   * Check if current IP has tracked an event
   */
  const checkTracked = useCallback(
    async (eventType: EventType): Promise<boolean> => {
      if (!itemId) return false;

      try {
        const response = await fetch(
          `${API_BASE}/api/analytics/check/${moduleName}/${itemId}/${eventType}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Check failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.tracked || false;
      } catch (err: any) {
        console.error('[Analytics] Check error:', err);
        return false;
      }
    },
    [moduleName, itemId]
  );

  /**
   * Fetch analytics stats for current item
   */
  const fetchStats = useCallback(async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/stats/${moduleName}/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Fetch stats failed: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats || {});
    } catch (err: any) {
      console.error('[Analytics] Fetch stats error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [moduleName, itemId]);

  /**
   * Auto-fetch stats when item ID changes
   */
  useEffect(() => {
    if (itemId) {
      fetchStats();
    }
  }, [itemId, fetchStats]);

  return {
    stats,
    loading,
    error,
    trackEvent,
    untrackEvent,
    checkTracked,
    fetchStats,
  };
}

/**
 * Standalone tracking functions (for quick one-off tracking)
 */
export const analyticsTracker = {
  /**
   * Track event without hook
   */
  track: async (
    moduleName: ModuleName,
    itemId: string,
    eventType: EventType,
    metadata: any = {}
  ): Promise<TrackingResult> => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: moduleName,
          item_id: itemId,
          event_type: eventType,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tracking failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: data.success,
        tracked: data.tracked,
        already_tracked: data.already_tracked,
        unique_count: data.unique_count,
      };
    } catch (err: any) {
      console.error('[Analytics] Track error:', err);
      return {
        success: false,
        tracked: false,
        already_tracked: false,
        unique_count: 0,
      };
    }
  },

  /**
   * Untrack event without hook
   */
  untrack: async (
    moduleName: ModuleName,
    itemId: string,
    eventType: EventType
  ): Promise<TrackingResult> => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/untrack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: moduleName,
          item_id: itemId,
          event_type: eventType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Untracking failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: data.success,
        tracked: false,
        already_tracked: false,
        unique_count: data.unique_count,
      };
    } catch (err: any) {
      console.error('[Analytics] Untrack error:', err);
      return {
        success: false,
        tracked: false,
        already_tracked: false,
        unique_count: 0,
      };
    }
  },

  /**
   * Get stats for item
   */
  getStats: async (
    moduleName: ModuleName,
    itemId: string
  ): Promise<AnalyticsStats> => {
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/stats/${moduleName}/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Fetch stats failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.stats || {};
    } catch (err: any) {
      console.error('[Analytics] Get stats error:', err);
      return {};
    }
  },
};

/**
 * Convenience hooks for specific modules
 */
export const useWallpaperAnalytics = (wallpaperId?: string) =>
  useAnalytics('wallpaper', wallpaperId);

export const useSongAnalytics = (songId?: string) =>
  useAnalytics('song', songId);

export const useSparkleAnalytics = (sparkleId?: string) =>
  useAnalytics('sparkle', sparkleId);

export const usePhotoAnalytics = (photoId?: string) =>
  useAnalytics('photo', photoId);

export const useBannerAnalytics = (bannerId?: string) =>
  useAnalytics('banner', bannerId);
