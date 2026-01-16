import { projectId, publicAnonKey } from "./supabase/info";
import { supabase } from "./supabase/client";

export interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  small_url?: string;
  medium_url?: string;
  large_url?: string;
  original_url?: string;
  type: "home" | "wallpaper" | "songs" | "photos" | "spark" | "temple" | "media" | "sparkle";
  category?: string;
  category_id?: string;
  visibility: "public" | "private";
  publish_status: "draft" | "published" | "scheduled" | "archived";
  published_at?: string;
  expires_at?: string;
  order_index: number;
  click_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  is_welcome_banner?: boolean;
  display_orientation?: 'vertical' | 'horizontal';
}

const SUPABASE_URL = `https://${projectId}.supabase.co`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch banners for a specific module
 */
export async function fetchModuleBanners(
  bannerType: Banner["type"]
): Promise<Banner[]> {
  try {
    console.log(`[Banner API] Fetching ALL banners (type filter removed)...`);

    // Check cache first
    const cacheKey = `banners_all`;
    const cached = getBannersFromCache(cacheKey);
    if (cached) {
      console.log(`[Banner API] Returning ${cached.length} cached banners`);
      return cached;
    }

    // Fetch from server endpoint - NO TYPE FILTER
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/make-server-4a075ebc/banners/list`,
      {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch banners: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.banners) {
      console.log(`[Banner API] No banners found`);
      return [];
    }

    const banners: Banner[] = result.banners.filter((b: Banner) =>
      b.type === bannerType && b.publish_status === 'published'
    );

    console.log(`[Banner API] Filtered to ${banners.length} '${bannerType}' banners`);
    console.log(`[Banner API] Sample banner URL:`, banners[0]?.original_url);

    // Cache the results
    cacheBanners(cacheKey, banners);

    return banners;
  } catch (error) {
    console.error(`[Banner API] Error fetching banners:`, error);

    // Return cached data as fallback even if expired
    const cacheKey = `banners_all`;
    const fallback = getBannersFromCache(cacheKey, true);
    return fallback || [];
  }
}

/**
 * Track banner view
 */
export async function trackBannerView(bannerId: string): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/functions/v1/make-server-4a075ebc/banners/${bannerId}/view`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );
  } catch (error) {
    console.error("[Banner API] Failed to track view:", error);
  }
}

/**
 * Track banner click
 */
export async function trackBannerClick(bannerId: string): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/functions/v1/make-server-4a075ebc/banners/${bannerId}/click`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );
  } catch (error) {
    console.error("[Banner API] Failed to track click:", error);
  }
}

/**
 * Get optimal image URL based on screen width
 */
export function getOptimalBannerImage(banner: Banner): string {
  const width = typeof window !== "undefined" ? window.innerWidth : 1920;

  if (width < 360 && banner.small_url) return banner.small_url;
  if (width < 720 && banner.medium_url) return banner.medium_url;
  if (banner.large_url) return banner.large_url;

  return banner.image_url || banner.original_url || "";
}

/**
 * Invalidate banner cache for a specific type or all types
 */
export function invalidateBannerCache(bannerType?: Banner["type"]): void {
  if (bannerType) {
    const cacheKey = `banners_${bannerType}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
  } else {
    // Clear all banner caches
    const types: Banner["type"][] = ["home", "wallpaper", "songs", "photos", "spark", "temple", "media", "sparkle"];
    types.forEach((type) => {
      const cacheKey = `banners_${type}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
    });
  }
}

/**
 * Cache banners in localStorage
 */
function cacheBanners(cacheKey: string, banners: Banner[]): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(banners));
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
  } catch (error) {
    console.warn("[Banner API] Failed to cache banners:", error);
  }
}

/**
 * Get banners from cache
 */
function getBannersFromCache(
  cacheKey: string,
  ignoreExpiry = false
): Banner[] | null {
  try {
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);

    if (!cached || !timestamp) return null;

    if (!ignoreExpiry) {
      const age = Date.now() - parseInt(timestamp);
      if (age > CACHE_DURATION) return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.warn("[Banner API] Failed to read cache:", error);
    return null;
  }
}

/**
 * Supabase Realtime subscription for banner changes
 */
let bannerSubscription: any = null;

/**
 * Subscribe to banner table changes via Supabase Realtime
 */
export function subscribeToBannerChanges(): void {
  // Prevent duplicate subscriptions
  if (bannerSubscription) {
    console.log("[Banner API] Already subscribed to banner changes");
    return;
  }

  console.log("[Banner API] Setting up Realtime subscription for banners...");

  try {
    bannerSubscription = supabase
      .channel('banner_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'banners'
        },
        (payload) => {
          console.log("[Banner API] Banner table changed:", payload);

          // Invalidate all banner caches
          invalidateBannerCache();

          // Dispatch custom event for components to listen to
          const event = new CustomEvent('bannersUpdated', {
            detail: {
              event: payload.eventType,
              record: payload.new || payload.old
            }
          });
          window.dispatchEvent(event);

          console.log("[Banner API] ✅ Cache invalidated and event dispatched");
        }
      )
      .subscribe((status) => {
        console.log("[Banner API] Subscription status:", status);
      });
  } catch (error) {
    console.error("[Banner API] Failed to set up Realtime subscription:", error);
  }
}

/**
 * Unsubscribe from banner table changes
 */
export function unsubscribeFromBannerChanges(): void {
  if (bannerSubscription) {
    console.log("[Banner API] Unsubscribing from banner changes...");
    supabase.removeChannel(bannerSubscription);
    bannerSubscription = null;
  }
}