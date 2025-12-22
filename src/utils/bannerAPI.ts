import { projectId, publicAnonKey } from "./supabase/info";

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
  type: "home" | "wallpaper" | "songs" | "photos" | "spark" | "temple";
  banner_type?: "home" | "wallpaper" | "songs" | "photos" | "spark" | "temple";
  category?: string;
  category_id?: string;
  visibility: "public" | "private" | "true" | "false" | boolean;
  publish_status: "draft" | "published" | "scheduled" | "archived";
  published_at?: string;
  expires_at?: string;
  order_index: number;
  click_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL = `https://${projectId}.supabase.co`;
// Reduced cache duration to 5 minutes for better responsiveness during updates
const CACHE_DURATION = 5 * 60 * 1000;
const CACHE_KEY_ALL = "banners_all_v3";

/**
 * Fetch banners for a specific module
 * Filters by type, visibility (public), and publish_status (published)
 */
export async function fetchModuleBanners(
  bannerType: Banner["type"]
): Promise<Banner[]> {
  try {
    console.log(`[Banner API] Fetching banners for type: ${bannerType}`);

    // 1. Try to get data from cache (or network if stale)
    const allBanners = await fetchAllBanners();

    // 2. Filter client-side to ensure correct data is shown
    const filteredBanners = allBanners.filter(banner => {
      // Filter by type
      // Fix: Allow 'home' and 'wallpaper' to be interchangeable to ensure all banners show
      // The admin panel might default to 'home', but we want them in the 'wallpaper' carousel too
      const typeMatch =
        banner.type === bannerType ||
        (!banner.type && bannerType === 'home') ||
        (bannerType === 'wallpaper' && banner.type === 'home') ||
        (bannerType === 'home' && banner.type === 'wallpaper');

      // Filter by status (must be published)
      // If status is missing, assume published (legacy compatibility)
      const statusMatch = !banner.publish_status || banner.publish_status === 'published';

      // Filter by visibility (must be public)
      // If visibility is missing, assume public (legacy compatibility)
      // Fix: Handle boolean true, string "true", and "public" as valid
      const visibilityMatch =
        !banner.visibility ||
        banner.visibility === 'public' ||
        banner.visibility === true ||
        banner.visibility === 'true';

      if (!typeMatch || !statusMatch || !visibilityMatch) {
        console.log(`[Banner API] Filtered out banner ${banner.id}:`, {
          title: banner.title,
          reason: { typeMatch, statusMatch, visibilityMatch },
          values: { type: banner.type, status: banner.publish_status, visibility: banner.visibility, reqType: bannerType }
        });
      }

      return typeMatch && statusMatch && visibilityMatch;
    });

    // Sort by order_index
    filteredBanners.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    console.log(`[Banner API] Filtered ${filteredBanners.length} valid banners for ${bannerType}`);
    return filteredBanners;
  } catch (error) {
    console.error(`[Banner API] Error fetching banners:`, error);
    return [];
  }
}

/**
 * Fetch ALL banners from server or cache
 */
async function fetchAllBanners(): Promise<Banner[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/make-server-4a075ebc/api/banners?t=${Date.now()}`,
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

    if (!result.success || !result.data) {
      console.log(`[Banner API] No banners found`);
      return [];
    }

    // Map raw DB response (banner_type) to client interface (type)
    const banners: Banner[] = result.data.map((b: any) => ({
      ...b,
      type: b.banner_type || b.type || 'home' // Map banner_type to type
    }));

    // Cache the results
    cacheBanners(CACHE_KEY_ALL, banners);

    return banners;
  } catch (error) {
    console.error("[Banner API] Network request failed:", error);
    // If network fails, return fresh cache if available, otherwise stale cache
    const cached = getBannersFromCache(CACHE_KEY_ALL);
    if (cached) {
      console.log(`[Banner API] Network failed; returning ${cached.length} cached banners`);
      return cached;
    }
    const stale = getBannersFromCache(CACHE_KEY_ALL, true);
    return stale || [];
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
 * Since we share one cache key for all types, any invalidation clears everything.
 */
export function invalidateBannerCache(bannerType?: Banner["type"]): void {
  console.log("[Banner API] Invalidating banner cache");
  localStorage.removeItem(CACHE_KEY_ALL);
  localStorage.removeItem(`${CACHE_KEY_ALL}_timestamp`);

  // Also clear legacy keys just in case
  if (bannerType) {
    localStorage.removeItem(`banners_${bannerType}`);
    localStorage.removeItem(`banners_${bannerType}_timestamp`);
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
      if (age > CACHE_DURATION) {
        console.log(`[Banner API] Cache expired (age: ${Math.round(age / 1000)}s)`);
        return null;
      }
    }

    return JSON.parse(cached);
  } catch (error) {
    console.warn("[Banner API] Failed to read cache:", error);
    return null;
  }
}