/**
 * UNIFIED ANALYTICS HOOK
 * IP-Based Unique Tracking for All Modules
 * Future-Proof & Plug-and-Play
 */

import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { UAParser } from 'ua-parser-js';

// Declare gtag for GA4
declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void;
  }
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

export type ModuleName =
  | 'wallpaper'
  | 'song'
  | 'video'
  | 'sparkle'
  | 'photo'
  | 'ask_gugan'
  | 'banner'
  | 'auth';

export type EventType =
  | 'view'
  | 'like'
  | 'unlike'
  | 'download'
  | 'share'
  | 'play'
  | 'watch_complete'
  | 'read'
  | 'add_to_playlist'
  | 'play_video_inline'
  | 'click'
  | 'open_in_youtube'
  | 'auth_viewed'
  | 'otp_requested'
  | 'otp_verified_fast2sms_success'
  | 'login_completed'
  | 'signup_completed'
  | 'phone_submit'
  | 'otp_sent'
  | 'otp_verified'
  | 'login_success'
  | 'session_start';

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

  // Auth analytics
  otp_requested?: number;
  otp_verified_fast2sms_success?: number;
  login_completed?: number;
  signup_completed?: number;
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
  const { user } = useAuth();
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
        // Automatically inject user city and other common metadata
        const userCity = user?.user_metadata?.city || localStorage.getItem('last_selected_city');

        // Parse Device Info
        const parser = new UAParser();
        const result = parser.getResult();
        const isMobile = result.device.type === 'mobile' || result.device.type === 'tablet';

        // Construct detailed device info
        const deviceInfo = isMobile
          ? `${result.device.vendor || ''} ${result.device.model || 'Unknown Mobile'}`.trim()
          : `${result.os.name || 'Desktop'} (${result.browser.name || 'Unknown Browser'})`;

        // Construct Platform (iOS, Android, Web)
        const platform = result.os.name === 'iOS' || result.os.name === 'Android'
          ? result.os.name
          : 'Web';

        const enrichedMetadata = {
          city: userCity,
          device_info: deviceInfo,
          platform: platform,
          device_model: result.device.model,
          browser: result.browser.name,
          os: result.os.name,
          ...metadata,
        };

        // Ensure we have a valid user before making API call
        if (!user?.id) {
          console.warn('[Analytics] No user available for tracking');
          return {
            success: false,
            tracked: false,
            already_tracked: false,
            unique_count: 0,
          };
        }

        const response = await fetch(`${API_BASE}/api/t/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            module_name: moduleName,
            event_type: eventType,
            item_id: itemId,
            user_id: user.id,
            metadata: enrichedMetadata,
          }),
        });

        // UNIFIED LOGGING: Backend handles this via /api/t/log (Removed client-side dup)

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Tracking failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // NEW: Also send to GA4 for hybrid tracking
        if (typeof window.gtag !== 'undefined') {
          try {
            window.gtag('event', `${moduleName}_${eventType}`, {
              event_category: moduleName,
              event_label: itemId,
              custom_parameters: enrichedMetadata,
              app_name: 'Tamil Kadavul Murugan',
              platform: 'Android'
            });
          } catch (gaError) {
            console.warn('[GA4] Track error:', gaError);
          }
        }

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
        // Ignore duplicate key errors (idempotency)
        if (err.message && (
          err.message.includes("duplicate key") ||
          err.message.includes("unique constraint")
        )) {
          // console.warn('[Analytics] Duplicate event ignored:', eventType);
          return {
            success: true,
            tracked: false,
            already_tracked: true,
            unique_count: 0, // Unfortunately we don't know the count, but UI might not update
          };
        }

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
          const errorText = await response.text();
          throw new Error(`Untracking failed: ${response.status} ${errorText}`);
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
          `${API_BASE}/api/analytics/check/${moduleName}/${eventType}?content_id=${itemId}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Check failed: ${response.status} ${errorText}`);
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
        const errorText = await response.text();
        throw new Error(`Fetch stats failed: ${response.status} ${response.statusText} - ${errorText}`);
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
      // 1. Try to get user from Supabase session
      let userId: string | null = null;
      let userCity: string | null = null;

      try {
        const { supabase } = await import('../../utils/supabase/client');
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          userId = data.session.user.id;
          userCity = data.session.user.user_metadata?.city;
        }
      } catch (e) {
        console.warn('Error resolving user for tracker:', e);
      }

      // 2. Fallback to localStorage mock session if dev/test
      if (!userId) {
        const mockSession = localStorage.getItem('murugan_mock_session');
        if (mockSession) {
          try {
            const parsed = JSON.parse(mockSession);
            userCity = parsed.user_metadata?.city;
          } catch (e) { }
        }
      }

      // Parse Device Info (Static Tracker)
      const parser = new UAParser();
      const result = parser.getResult();
      const isMobile = result.device.type === 'mobile' || result.device.type === 'tablet';

      const deviceInfo = isMobile
        ? `${result.device.vendor || ''} ${result.device.model || 'Unknown Mobile'}`.trim()
        : `${result.os.name || 'Desktop'} (${result.browser.name || 'Unknown Browser'})`;

      const platform = result.os.name === 'iOS' || result.os.name === 'Android'
        ? result.os.name
        : 'Web';

      const enrichedMetadata = {
        city: userCity || localStorage.getItem('last_selected_city'),
        device_info: deviceInfo,
        platform: platform,
        device_model: result.device.model,
        browser: result.browser.name,
        os: result.os.name,
        ...metadata
      };

      const response = await fetch(`${API_BASE}/api/t/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: moduleName,
          item_id: itemId,
          event_type: eventType,
          metadata: enrichedMetadata,
          user_id: userId // Now correctly populated
        }),
      });

      // AUTH EVENTS LOGGING REMOVED - Backend handles this via /api/t/log

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tracking failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // NEW: Also send to GA4 for hybrid tracking
      if (typeof window.gtag !== 'undefined') {
        try {
          window.gtag('event', `${moduleName}_${eventType}`, {
            event_category: moduleName,
            event_label: itemId,
            custom_parameters: enrichedMetadata,
            app_name: 'Tamil Kadavul Murugan',
            platform: 'Android'
          });
        } catch (gaError) {
          console.warn('[GA4] Track error:', gaError);
        }
      }

      return {
        success: data.success,
        tracked: data.tracked,
        already_tracked: data.already_tracked,
        unique_count: data.unique_count,
      };
    } catch (err: any) {
      // Robustly check for duplicate key errors
      const errorMessage = err?.message || err?.toString() || JSON.stringify(err);

      if (
        errorMessage.includes("duplicate key") ||
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("P2002") || // Prisma code (just in case)
        errorMessage.includes("23505") // Postgres code
      ) {
        return {
          success: true,
          tracked: false,
          already_tracked: true,
          unique_count: 0,
        };
      }

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
      // 1. Try to get user from Supabase session (same logic as track)
      let userId: string | null = null;
      try {
        const { supabase } = await import('../../utils/supabase/client');
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          userId = data.session.user.id;
        }
      } catch (e) { }

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
          user_id: userId // Added user_id to request body
        }),
      });

      // ALSO REMOVE FROM AUTH EVENTS IF AUTHENTICATED
      if (userId) {
        try {
          const { supabase } = await import('../../utils/supabase/client');
          const authEventType = moduleName === 'auth'
            ? `auth_${eventType}`
            : `module_${moduleName}_${eventType}`;

          // Note: Hard delete or soft delete? For now, we don't delete from auth_events history, 
          // as that is an audit log. We only untrack from the aggregate counters (via the API above).
          // If we wanted to "undo" an action in the feed, we might want to log an 'unlike' event instead.
          // But for now, we just leave the history as is.
        } catch (dbErr) {
          console.error('[Analytics] DB Untrack Error:', dbErr);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Untracking failed: ${response.status} ${errorText}`);
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

export const useAuthAnalytics = () =>
  useAnalytics('auth', '00000000-0000-0000-0000-000000000001'); // Fixed: Use valid UUID instead of string 'auth_flow'
