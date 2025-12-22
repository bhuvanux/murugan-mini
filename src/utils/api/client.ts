// API Client for User Panel
// This connects the user panel to the admin backend

import { apiCache } from './cache';
import { projectId, publicAnonKey } from '../supabase/info'; // 🔥 FIX: Correct path (was './supabase/info')

// Use the CORRECT credentials from info.tsx
const ADMIN_PROJECT_ID = projectId;
const ADMIN_ANON_KEY = publicAnonKey;

const API_BASE = `https://${ADMIN_PROJECT_ID}.supabase.co/functions/v1/make-server-4a075ebc`;

console.log('[UserAPI] 🔧 Configuration loaded:', {
  projectId: ADMIN_PROJECT_ID,
  hasAnonKey: !!ADMIN_ANON_KEY,
  apiBase: API_BASE
});

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface MediaItem {
  id: string;
  type: "image" | "video";
  is_video?: boolean; // ✅ Add is_video field
  video_url?: string | null; // ✅ Add video_url field
  title: string;
  description?: string;
  tags: string[];
  uploader: string;
  created_at: string;
  storage_path: string;
  thumbnail_url: string;
  duration_seconds?: number;
  downloadable: boolean;
  views: number;
  likes: number;
  downloads?: number;
  shares?: number;
}

export interface YouTubeMedia {
  id: string;
  type: "youtube";
  title: string;
  description?: string;
  tags: string[];
  category: string;
  embedUrl: string;
  thumbnail: string;
  youtubeId?: string;
  stats: {
    views: number;
    likes: number;
    downloads: number;
    shares: number;
  };
  uploadedAt: string;
}

export interface SparkleArticle {
  id: string;
  type: "article" | "photo" | "video";
  title: string;
  snippet: string;
  content: string;
  source: string;
  publishedAt: string;
  url: string;
  image: string;
  tags: string[];
  // Optional video fields for sparkle videos
  videoUrl?: string | null;
  videoId?: string | null;
}

export interface SyncedAudio {
  id: string;
  title: string;
  filename: string;
  url: string;
  duration_seconds: number | null;
  created_at: string;
  uploaded_by?: string | null;
}

export interface LyricsBlock {
  id: string;
  audio_id: string;
  index: number;
  start: number;
  end: number;
  text: string;
  created_at: string;
  edited_by?: string | null;
}

export interface TrackAnalyticsEventParams {
  module_name: string;
  item_id: string;
  event_type: string;
  metadata?: Record<string, any>;
}

// ========================================
// API CLIENT CLASS
// ========================================

class UserAPI {
  private userToken: string | null = null;

  setUserToken(token: string) {
    this.userToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("user_token", token);
    }
  }

  getUserToken() {
    if (this.userToken) return this.userToken;
    if (typeof window !== "undefined") {
      return localStorage.getItem("user_token");
    }
    return null;
  }

  // ========================================
  // SYNCED LYRICS AUDIO
  // ========================================

  async importAudioFromUrl(params: {
    url: string;
    title: string;
    uploaded_by?: string;
  }): Promise<{ success: boolean; data: SyncedAudio }> {
    return await this.request(
      `/api/audio/import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
      0,
      false,
    );
  }

  async uploadAudio(formData: FormData): Promise<{ success: boolean; data: SyncedAudio }> {
    return await this.request(
      `/api/audio/upload`,
      {
        method: "POST",
        body: formData,
      },
      0,
      false,
    );
  }

  async getAudio(id: string): Promise<{ success: boolean; data: SyncedAudio }> {
    return await this.request(`/api/audio/${id}`, {}, 0, false);
  }

  async getAudioStatus(id: string): Promise<{ success: boolean; status: any }> {
    return await this.request(`/api/audio/${id}/status`, {}, 0, false);
  }

  async getLyrics(audioId: string): Promise<{ success: boolean; data: LyricsBlock[] }> {
    return await this.request(`/api/audio/${audioId}/lyrics`, {}, 0, false);
  }

  async ingestLyricsFromText(
    audioId: string,
    params: { text: string; edited_by?: string },
  ): Promise<{ success: boolean; count: number }> {
    return await this.request(
      `/api/audio/${audioId}/lyrics/ingest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
      0,
      false,
    );
  }

  async saveLyricsBlocks(
    audioId: string,
    params: {
      blocks: Array<{ index: number; start: number; end: number; text: string }>;
      edited_by?: string;
    },
  ): Promise<{ success: boolean; count: number }> {
    return await this.request(
      `/api/audio/${audioId}/lyrics`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
      0,
      false,
    );
  }

  async processAudio(audioId: string): Promise<{ success: boolean; audio_id: string; segments: number }> {
    return await this.request(
      `/api/audio/${audioId}/process`,
      {
        method: "POST",
      },
      0,
      false,
    );
  }

  // ========================================
  // UNIFIED ANALYTICS
  // ========================================

  async trackAnalyticsEvent(params: TrackAnalyticsEventParams): Promise<any> {
    return await this.request(
      `/api/analytics/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
      0,
      false,
    );
  }

  async getAnalyticsItemStats(module_name: string, item_id: string): Promise<any> {
    return await this.request(`/api/analytics/stats/${module_name}/${item_id}`, {}, 0, false);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
    useCache = true, // Enable caching by default for GET requests
  ): Promise<T> {
    const isGetRequest = !options.method || options.method === 'GET';

    // Check cache for GET requests
    if (isGetRequest && useCache) {
      const cached = apiCache.get<T>(endpoint);
      if (cached) {
        return cached;
      }

      // Check if request is already pending (deduplication)
      if (apiCache.isPending(endpoint)) {
        console.log(`[UserAPI] Request already pending, waiting: ${endpoint}`);
        const pending = apiCache.getPending<T>(endpoint);
        if (pending) {
          return pending;
        }
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // ✅ IMPORTANT: Backend DOES require Authorization header!
      // Use the correct anon key from info.tsx (not hardcoded)
      Authorization: `Bearer ${ADMIN_ANON_KEY}`,
      ...(options.headers as Record<string, string>),
    };

    const token = this.getUserToken();
    if (token) {
      headers["X-User-Token"] = token;
    }

    // IMPORTANT: For public endpoints, we use the admin anon key without user token
    // This allows unauthenticated browsing of public content

    const maxRetries = 1; // Reduced to 1 for faster fallback
    const timeoutMs = 60000; // Increased to 60s to handle SEVERE cold starts

    console.log(`[UserAPI] Requesting: ${endpoint}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);

    // Create the request promise
    const requestPromise = (async (): Promise<T> => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ message: "Request failed" }));

          // Check if it's an authentication error (unauthorized/invalid token)
          const isAuthError = error.error === 'unauthorized' ||
            error.message?.includes('Invalid token') ||
            error.message?.includes('unauthorized') ||
            response.status === 401;

          // For auth errors on public endpoints, throw a special error that can be caught
          if (isAuthError) {
            // Don't log here - will be logged once when handled by calling function
            const authError: any = new Error(error.message || 'Authentication required');
            authError.isAuthError = true;
            authError.statusCode = response.status;
            throw authError;
          }

          // Check if it's a resource limit error
          const isResourceLimit = error.code === 'WORKER_LIMIT' ||
            error.message?.includes('compute resources') ||
            error.message?.includes('timeout') ||
            error.message?.includes('connection pool') ||
            error.error === 'server_error';

          // Retry on resource errors with longer delay
          if (isResourceLimit && retryCount < maxRetries) {
            const delay = 1500; // Fixed delay for single retry
            console.warn(`[UserAPI] Resource limit error, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request<T>(endpoint, options, retryCount + 1, useCache);
          }

          console.error(`[UserAPI] Error:`, error);
          throw new Error(
            error.message || `HTTP ${response.status}`,
          );
        }

        const data = await response.json();

        // Cache successful GET responses
        if (isGetRequest && useCache) {
          // Use longer TTL for media lists (10 minutes)
          const ttl = endpoint.includes('/media/list') ? 10 * 60 * 1000 : 5 * 60 * 1000;
          apiCache.set(endpoint, data, ttl);
        }

        return data;
      } catch (error: any) {
        // Check if it's an abort/timeout error
        if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Failed to fetch')) {
          if (retryCount < maxRetries) {
            const delay = 1500;
            console.warn(`[UserAPI] Request timeout, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request<T>(endpoint, options, retryCount + 1, useCache);
          }
          console.warn(`[UserAPI] Backend not responding after ${maxRetries} retries - will use fallback data`);
          const backendError: any = new Error('Backend timeout - using offline mode');
          backendError.isBackendTimeout = true;
          throw backendError;
        }

        // Don't log auth errors - they'll be handled by the calling function
        if (!error.isAuthError) {
          console.error(`[UserAPI] Request failed for ${endpoint}:`, error);
        }
        throw error;
      }
    })();

    // Register pending request for deduplication
    if (isGetRequest && useCache) {
      apiCache.setPending(endpoint, requestPromise);
    }

    return requestPromise;
  }

  // ========================================
  // AUTHENTICATION
  // ========================================

  async signup(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) {
    const result = await this.request<any>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, phone }),
    }, 0, false); // Don't cache auth requests

    if (result.success && result.access_token) {
      this.setUserToken(result.access_token);
    }

    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, 0, false); // Don't cache auth requests

    if (result.success && result.access_token) {
      this.setUserToken(result.access_token);
    }

    return result;
  }

  async checkSession() {
    return this.request<any>("/auth/session", {}, 0, false); // Don't cache auth checks
  }

  // Clear cache (useful for admin or when data changes)
  clearCache() {
    apiCache.clear();
    console.log('[UserAPI] Cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return apiCache.getStats();
  }

  // ========================================
  // WALLPAPERS (Photos & Videos)
  // ========================================

  async getWallpapers(
    params: {
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: MediaItem[]; pagination: any }> {
    // MANDATORY: Always use POST (never GET)
    const body = {
      page: params.page || 1,
      limit: params.limit || 20,
      search: params.search || undefined,
    };

    console.log(`[UserAPI] MOBILE MODE - POST /wallpapers/list`, body);

    try {
      // 🔥 COLD START FIX: Warm up edge function with health check first
      console.log('[UserAPI] 🔥 Warming up edge function with health check...');
      try {
        const warmupStart = Date.now();
        await fetch(`${API_BASE}/health`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${ADMIN_ANON_KEY}` },
          signal: AbortSignal.timeout(15000) // 15 second timeout for warmup
        });
        const warmupTime = Date.now() - warmupStart;
        console.log(`[UserAPI] ✅ Edge function warmed up in ${warmupTime}ms`);
      } catch (warmupError) {
        console.warn('[UserAPI] ⚠️ Warmup failed, proceeding anyway:', warmupError);
        // Continue even if warmup fails - the main request might still work
      }

      // MANDATORY: Mobile App does NOT send Authorization header
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_ANON_KEY}`, // ✅ Include auth header
      };

      const result = await this.request<any>(
        `/wallpapers/list`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
      );

      console.log(`[UserAPI] Admin backend response:`, {
        success: result.success,
        dataLength: result.data?.length || 0,
        firstItem: result.data?.[0],
        pagination: result.pagination
      });

      // Check if admin backend returned data
      if (!result.data || !Array.isArray(result.data)) {
        console.error('[UserAPI] Admin backend did not return data array:', result);
        throw new Error('Invalid response from admin backend: missing data array');
      }

      // Transform admin data to user panel format
      const transformedData = (result.data || []).map(
        this.transformMediaToUserFormat,
      );

      console.log(`[UserAPI] Transformed ${transformedData.length} media items`);
      if (transformedData.length > 0) {
        console.log(`[UserAPI] Sample transformed item:`, transformedData[0]);
      }

      return {
        data: transformedData,
        pagination: result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
        },
      };
    } catch (error: any) {
      // REMOVED DEMO DATA FALLBACK - Show real error to admin
      console.error('[UserAPI] ❌ Failed to fetch wallpapers from admin backend:', error);

      // Log detailed error for debugging
      console.error('[UserAPI] Error details:', {
        message: error.message,
        isBackendTimeout: error.isBackendTimeout,
        isAuthError: error.isAuthError,
        statusCode: error.statusCode
      });

      // Return empty data with error indication
      // This will show "No content found" in user app
      return {
        data: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          hasMore: false,
        },
      };
    }
  }

  // ========================================
  // MEDIA (YouTube Songs & Videos)
  // ========================================

  async getYouTubeMedia(
    params: {
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: YouTubeMedia[]; pagination: any }> {
    // ✅ FIX: Use the ADMIN API endpoint with correct parameters
    // Admin backend: GET /api/media?mediaType=audio OR mediaType=video
    // We need to fetch BOTH audio and video, then filter in frontend

    try {
      console.log('[UserAPI] Fetching media from admin backend...');

      // Fetch ALL media (both audio and video)
      const result = await this.request<any>(`/api/media`, {}, 0, false); // Disable cache for fresh data

      console.log('[UserAPI] Admin backend raw response:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        firstItem: result.data?.[0]
      });

      if (!result.success || !result.data) {
        console.error('[UserAPI] Invalid response from admin backend:', result);
        return {
          data: [],
          pagination: { page: 1, limit: 100, total: 0, hasMore: false }
        };
      }

      // Transform admin media data to YouTube format
      const transformedData = (result.data || []).map(
        this.transformAdminMediaToYouTube,
      );

      console.log(`[UserAPI] ✅ Transformed ${transformedData.length} media items`);
      if (transformedData.length > 0) {
        console.log('[UserAPI] Sample transformed item:', transformedData[0]);
      }

      return {
        data: transformedData,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 100,
          total: transformedData.length,
          hasMore: false,
        },
      };
    } catch (error: any) {
      console.error('[UserAPI] ❌ Failed to fetch media from admin backend:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 100, total: 0, hasMore: false }
      };
    }
  }

  // ========================================
  // SPARKLE (Articles)
  // ========================================

  async getSparkleArticles(
    params: {
      type?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: SparkleArticle[]; pagination: any }> {
    // ✅ FIX: Use the ADMIN API endpoint with correct parameters
    // Admin backend: GET /api/sparkle?publishStatus=published

    try {
      console.log('[UserAPI] Fetching sparkles from admin backend...');

      // Fetch published sparkles only
      // Backend now supports both /api/sparkle and /api/sparkles
      const result = await this.request<any>(`/api/sparkles?publishStatus=published`, {}, 0, false); // Disable cache for fresh data


      console.log('[UserAPI] Admin backend raw response:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        firstItem: result.data?.[0]
      });

      if (!result.success || !result.data) {
        console.error('[UserAPI] Invalid response from admin backend:', result);
        return {
          data: [],
          pagination: { page: 1, limit: 100, total: 0, hasMore: false }
        };
      }

      // Transform admin sparkle data to user format
      const transformedData = (result.data || []).map(
        this.transformSparkleToUserFormat,
      );

      console.log(`[UserAPI] ✅ Transformed ${transformedData.length} sparkle articles`);
      if (transformedData.length > 0) {
        console.log('[UserAPI] Sample transformed item:', transformedData[0]);
      }

      return {
        data: transformedData,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 100,
          total: transformedData.length,
          hasMore: false,
        },
      };
    } catch (error: any) {
      console.error('[UserAPI] ❌ Failed to fetch sparkles from admin backend:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 100, total: 0, hasMore: false }
      };
    }
  }

  // ========================================
  // INTERACTIONS (Likes, Downloads, Shares)
  // ========================================

  // Get or generate anonymous user ID
  private getAnonymousUserId(): string {
    if (typeof window === 'undefined') return 'server';

    let userId = localStorage.getItem('murugan_anonymous_user_id');
    if (!userId) {
      // Generate unique anonymous ID
      userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('murugan_anonymous_user_id', userId);
    }
    return userId;
  }

  async likeMedia(mediaId: string) {
    try {
      const user_id = this.getAnonymousUserId();
      const result = await this.request<any>(`/media/${mediaId}/like`, {
        method: "POST",
        body: JSON.stringify({ user_id }),
      }, 0, false); // Don't cache POST requests

      // Return standardized response
      return {
        success: true,
        action: result.result?.action || 'liked',
        like_count: result.result?.like_count || 0,
        ...result
      };
    } catch (error: any) {
      // Gracefully handle auth errors for likes
      console.warn(`[UserAPI] Like failed (may need auth):`, error);
      // Return success locally even if backend fails
      return { success: false, error: error?.message || String(error) };
    }
  }

  async unlikeMedia(mediaId: string) {
    try {
      const user_id = this.getAnonymousUserId();
      // Use the same toggle endpoint (it handles both like and unlike)
      const result = await this.request<any>(`/media/${mediaId}/like`, {
        method: "POST",
        body: JSON.stringify({ user_id }),
      }, 0, false); // Don't cache POST requests

      return {
        success: true,
        action: result.result?.action || 'unliked',
        like_count: result.result?.like_count || 0,
        ...result
      };
    } catch (error: any) {
      console.warn(`[UserAPI] Unlike failed:`, error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  // Toggle like (idempotent)
  async toggleLike(mediaId: string) {
    try {
      const user_id = this.getAnonymousUserId();
      const result = await this.request<any>(`/media/${mediaId}/like`, {
        method: "POST",
        body: JSON.stringify({ user_id }),
      }, 0, false); // Don't cache POST requests

      // Clear the check-like cache for this media
      apiCache.delete(`/media/${mediaId}/check-like?user_id=${user_id}`);

      // ✅ NEW: Clear wallpapers list cache to force refetch with updated counts
      // This ensures when user closes and reopens, they see the updated count
      apiCache.clearByPattern('/wallpapers/list');

      return {
        success: true,
        action: result.result?.action || 'liked',
        like_count: result.result?.like_count || 0,
        ...result
      };
    } catch (error) {
      console.warn(`[UserAPI] Toggle like failed:`, error);
      throw error;
    }
  }

  async downloadMedia(mediaId: string) {
    try {
      return await this.request<any>(`/media/${mediaId}/download`, {
        method: "POST",
      }, 0, false); // Don't cache POST requests
    } catch (error) {
      console.warn(`[UserAPI] Download tracking failed:`, error);
      // Don't block download if tracking fails
      return { success: true };
    }
  }

  async trackShare(mediaId: string) {
    try {
      return await this.request<any>(`/media/${mediaId}/share`, {
        method: "POST",
      }, 0, false); // Don't cache POST requests
    } catch (error) {
      console.warn(`[UserAPI] Share tracking failed:`, error);
      // Don't block share if tracking fails
      return { success: true };
    }
  }

  async trackView(mediaId: string) {
    try {
      // Track view by POSTing to the view endpoint
      return await this.request<any>(`/media/${mediaId}/view`, {
        method: "POST",
      }, 0, false); // Don't cache POST requests
    } catch (error) {
      console.warn(`[UserAPI] View tracking failed:`, error);
      return { success: true };
    }
  }

  // Check if current user has liked a wallpaper
  async checkIfLiked(mediaId: string): Promise<boolean> {
    try {
      const user_id = this.getAnonymousUserId();
      const result = await this.request<any>(`/media/${mediaId}/check-like?user_id=${user_id}`, {
        method: "GET",
      }, 0, true); // Cache like status
      return result?.liked || false;
    } catch (error) {
      console.warn(`[UserAPI] Check like failed:`, error);
      return false;
    }
  }

  // ========================================
  // DATA TRANSFORMERS (Arrow functions to preserve 'this')
  // ========================================

  private transformMediaToUserFormat = (
    adminMedia: any,
  ): MediaItem => {
    // ENHANCED LOGGING: Log the raw admin media to help with debugging
    console.log('[UserAPI] 🔍 Transforming admin media:', {
      id: adminMedia.id,
      title: adminMedia.title,
      rawFields: Object.keys(adminMedia),
      image_url: adminMedia.image_url,  // ← The field backend sends
      thumbnail_url: adminMedia.thumbnail_url, // ← The field backend sends
      is_video: adminMedia.is_video, // ← Check if it's a video
      video_url: adminMedia.video_url, // ← Video URL field
      publish_status: adminMedia.publish_status,
      visibility: adminMedia.visibility,
    });

    if (!adminMedia.url && !adminMedia.storagePath && !adminMedia.storage_path && !adminMedia.imageUrl && !adminMedia.image_url && !adminMedia.originalUrl && !adminMedia.original_url && !adminMedia.video_url) {
      console.error('[UserAPI] ❌ Media missing ALL possible URL fields:', adminMedia);
    }

    // Try ALL possible field name variations from different backends
    // For videos, prioritize video_url
    const imageUrl = adminMedia.video_url || // Video URL takes priority for videos
      adminMedia.url ||
      adminMedia.imageUrl ||
      adminMedia.image_url ||
      adminMedia.originalUrl ||
      adminMedia.original_url ||
      adminMedia.storagePath ||
      adminMedia.storage_path ||
      adminMedia.largeUrl ||
      adminMedia.large_url ||
      "";

    const thumbUrl = adminMedia.thumbnail ||
      adminMedia.thumbnailUrl ||
      adminMedia.thumbnail_url ||
      adminMedia.smallUrl ||
      adminMedia.small_url ||
      adminMedia.mediumUrl ||
      adminMedia.medium_url ||
      imageUrl || // Fallback to main image
      "";

    const result: MediaItem = {
      id: adminMedia.id,
      type:
        adminMedia.is_video || adminMedia.type === "video"
          ? "video"
          : adminMedia.type === "photo"
            ? "image"
            : "image",
      is_video: adminMedia.is_video || false, // ✅ Add is_video field
      video_url: adminMedia.video_url || null, // ✅ Add video_url field
      title: adminMedia.title || "Untitled",
      description: adminMedia.description || "",
      tags: Array.isArray(adminMedia.tags) ? adminMedia.tags : [],
      uploader: adminMedia.uploadedBy || adminMedia.uploader || adminMedia.uploaded_by || "unknown",
      created_at:
        adminMedia.uploadedAt || adminMedia.uploaded_at || adminMedia.created_at || adminMedia.createdAt || new Date().toISOString(),
      storage_path: imageUrl,
      thumbnail_url: thumbUrl,
      duration_seconds: adminMedia.duration || adminMedia.duration_seconds || 0,
      downloadable: adminMedia.downloadable !== false && !adminMedia.isPremium,
      views: adminMedia.stats?.views || adminMedia.view_count || adminMedia.views || 0,
      likes: adminMedia.stats?.likes || adminMedia.like_count || adminMedia.likes || 0,
      downloads: adminMedia.stats?.downloads || adminMedia.download_count || adminMedia.downloads || 0,
      shares: adminMedia.stats?.shares || adminMedia.share_count || adminMedia.shares || 0,
    };

    console.log('[UserAPI] ✅ Transformed result:', {
      id: result.id,
      title: result.title,
      type: result.type,
      is_video: result.is_video,
      storage_path: result.storage_path,
      video_url: result.video_url,
      thumbnail_url: result.thumbnail_url,
    });

    return result;
  };

  private transformAdminMediaToYouTube = (
    adminMedia: any,
  ): YouTubeMedia => {
    // ✅ Transform admin backend media format to user YouTube format
    console.log('[UserAPI] 🔍 Transforming admin media to YouTube format:', {
      id: adminMedia.id,
      title: adminMedia.title,
      media_type: adminMedia.media_type,
      youtube_url: adminMedia.youtube_url,
      file_url: adminMedia.file_url,
      thumbnail_url: adminMedia.thumbnail_url,
      category_name: adminMedia.categories?.name
    });

    // Determine category: if media_type is audio → "songs", if video → "videos"
    const category = adminMedia.media_type === 'audio' ? 'songs' :
      adminMedia.media_type === 'video' ? 'videos' :
        'uncategorized';

    // Use youtube_url if available, otherwise use file_url
    const embedUrl = adminMedia.youtube_url || adminMedia.file_url || '';

    // Extract YouTube ID from URL
    const youtubeId = this.extractYouTubeId(embedUrl);

    // Use provided thumbnail or generate from YouTube ID
    const thumbnail = adminMedia.thumbnail_url ||
      (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : '');

    return {
      id: adminMedia.id,
      type: "youtube",
      title: adminMedia.title || "Untitled",
      description: adminMedia.description || "",
      tags: Array.isArray(adminMedia.tags) ? adminMedia.tags : [],
      category: category,
      embedUrl: embedUrl,
      thumbnail: thumbnail,
      youtubeId: youtubeId,
      stats: {
        views: adminMedia.play_count || 0,
        likes: adminMedia.like_count || 0,
        downloads: adminMedia.download_count || 0,
        shares: adminMedia.share_count || 0,
      },
      uploadedAt: adminMedia.created_at || new Date().toISOString(),
    };
  };

  private transformSparkleToUserFormat = (
    adminSparkle: any,
  ): SparkleArticle => {
    // ✅ Transform admin backend sparkle format to user format
    console.log('[UserAPI] 🔍 Transforming admin sparkle:', {
      id: adminSparkle.id,
      title: adminSparkle.title,
      subtitle: adminSparkle.subtitle,
      cover_image_url: adminSparkle.cover_image_url,
      thumbnail_url: adminSparkle.thumbnail_url,
      video_url: adminSparkle.video_url,
      video_id: adminSparkle.video_id,
      publish_status: adminSparkle.publish_status
    });

    // Determine if this sparkle is a video-based item
    const hasVideo = !!(adminSparkle.video_url || adminSparkle.videoId || adminSparkle.video_id);
    
    // For video-only sparkles without cover image, use a placeholder or the video URL itself
    const imageUrl = adminSparkle.cover_image_url || 
                     adminSparkle.thumbnail_url || 
                     adminSparkle.thumbnail || 
                     (hasVideo ? adminSparkle.video_url : "") || 
                     "";

    const resolvedTitle = typeof adminSparkle.title === "string" ? adminSparkle.title.trim() : "";
    const resolvedSnippet = typeof adminSparkle.subtitle === "string" ? adminSparkle.subtitle.trim() : "";

    const transformed: SparkleArticle = {
      id: adminSparkle.id,
      type: hasVideo ? "video" : "article",
      title: resolvedTitle,
      snippet: resolvedSnippet || adminSparkle.content?.substring(0, 200)?.trim() || "",
      content: typeof adminSparkle.content === "string" ? adminSparkle.content : "",
      source: adminSparkle.source || "Murugan Wallpapers",
      publishedAt: adminSparkle.published_at || adminSparkle.created_at || new Date().toISOString(),
      url: adminSparkle.external_link || "#", // External link if present
      image: imageUrl,
      tags: Array.isArray(adminSparkle.tags) ? adminSparkle.tags : [],
      videoUrl: adminSparkle.video_url || null,
      videoId: adminSparkle.video_id || adminSparkle.videoId || null,
    };

    console.log('[UserAPI] ✨ Transformed result:', {
      id: transformed.id,
      type: transformed.type,
      hasVideo,
      videoUrl: transformed.videoUrl,
      image: transformed.image,
      imageUrl
    });

    return transformed;
  };

  private extractYouTubeId = (url: string): string => {
    if (!url) return "";

    // Extract YouTube ID from various URL formats
    const watchPattern = /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
    const shortPattern = /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const embedPattern = /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const directIdPattern = /^([a-zA-Z0-9_-]{11})$/;

    const patterns = [watchPattern, shortPattern, embedPattern, directIdPattern];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return "";
  };
}

// Export singleton
export const userAPI = new UserAPI();