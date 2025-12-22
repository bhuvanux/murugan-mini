import { projectId, publicAnonKey } from "./supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

export async function getUniversalAnalyticsOverview(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/overview${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getUniversalAnalyticsFeatures(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/features${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getUniversalAnalyticsFeatureDetail(
  featureKey: string,
  params?: { from?: string; to?: string },
) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(
    `/api/admin/analytics/features/${encodeURIComponent(featureKey)}${suffix}`,
    {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    },
  );
}

export async function getUniversalAnalyticsPages(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/pages${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getUniversalAnalyticsPageDetail(route: string, params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(
    `/api/admin/analytics/pages/${encodeURIComponent(route)}${suffix}`,
    {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    },
  );
}

export async function getUniversalAnalyticsSessions(params?: { from?: string; to?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/sessions${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getUniversalAnalyticsSessionDetail(sessionId: string) {
  return fetchWith404Fallback(`/api/admin/analytics/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getAdminExperiments() {
  return fetchWith404Fallback(`/api/admin/experiments`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getAdminExperimentDetail(id: string) {
  return fetchWith404Fallback(`/api/admin/experiments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function createAdminExperiment(payload: {
  name: string;
  description?: string | null;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
}) {
  return fetchWith404Fallback(`/api/admin/experiments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminExperiment(
  id: string,
  payload: {
    name?: string;
    description?: string | null;
    status?: string;
    start_date?: string | null;
    end_date?: string | null;
  },
) {
  return fetchWith404Fallback(`/api/admin/experiments/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function upsertAdminExperimentVariants(
  id: string,
  variants: Array<{ variant_key: string; traffic_percent: number; config: any }>,
) {
  return fetchWith404Fallback(`/api/admin/experiments/${encodeURIComponent(id)}/variants`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ variants }),
  });
}

export async function aggregateUniversalPageStats(params?: { from?: string; to?: string }) {
  return fetchWith404Fallback(`/api/admin/analytics/page-stats/aggregate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(params || {}),
  });
}

const LEGACY_ROUTE_PREFIX = "/make-server-4a075ebc";
const EDGE_FUNCTION_BASE_URLS = [
  BASE_URL,
  `https://${projectId}.supabase.co/functions/v1/server`,
];

function getUserTokenFromStorage(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("user_token");
  } catch {
    return null;
  }
}

function withUserTokenHeaders(init?: RequestInit): RequestInit | undefined {
  const token = getUserTokenFromStorage();

  const merged: Record<string, string> = {
    apikey: publicAnonKey,
  };
  const existing = (init?.headers || {}) as any;
  if (existing) {
    try {
      if (existing instanceof Headers) {
        existing.forEach((v: string, k: string) => {
          merged[k] = v;
        });
      } else {
        Object.assign(merged, existing);
      }
    } catch {
      // ignore
    }
  }

  if (token) merged["X-User-Token"] = token;
  return { ...(init || {}), headers: merged };
}

export async function fetchAdminResponseWith404Fallback(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const nextInit = withUserTokenHeaders(init);
  const candidates: string[] = [];
  for (const base of EDGE_FUNCTION_BASE_URLS) {
    candidates.push(`${base}${normalizedPath}`);
    candidates.push(`${base}${LEGACY_ROUTE_PREFIX}${normalizedPath}`);
  }

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, nextInit);
      lastResponse = response;
      if (response.status === 404) continue;
      return response;
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  if (lastResponse) return lastResponse;
  if (lastError) throw lastError;
  throw new Error("Request failed");
}

async function fetchWith404Fallback(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const nextInit = withUserTokenHeaders(init);
  const candidates: string[] = [];
  for (const base of EDGE_FUNCTION_BASE_URLS) {
    candidates.push(`${base}${normalizedPath}`);
    candidates.push(`${base}${LEGACY_ROUTE_PREFIX}${normalizedPath}`);
  }

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, nextInit);
      lastResponse = response;
      if (response.ok) return parseResponse(response);
      if (response.status === 404) continue;
      return parseResponse(response);
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  if (lastResponse) return parseResponse(lastResponse);
  if (lastError) throw lastError;
  throw new Error("Request failed");
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && (body as any).error) ||
      (typeof body === "string" && body) ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return body;
}

// =====================================================
// WALLPAPERS API
// =====================================================

export async function getWallpapers() {
  const response = await fetch(`${BASE_URL}/api/wallpapers`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function createWallpaper(data: any) {
  const response = await fetch(`${BASE_URL}/api/wallpapers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateWallpaper(id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/wallpapers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteWallpaper(id: string) {
  const response = await fetch(`${BASE_URL}/api/wallpapers/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function publishWallpaper(id: string) {
  const response = await fetch(`${BASE_URL}/api/wallpapers/${id}/publish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function unpublishWallpaper(id: string) {
  const response = await fetch(`${BASE_URL}/api/wallpapers/${id}/unpublish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

// =====================================================
// BANNERS API
// =====================================================

export async function getBanners() {
  const response = await fetch(`${BASE_URL}/api/banners`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function createBanner(data: any) {
  const response = await fetch(`${BASE_URL}/api/banners`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateBanner(id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/banners/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteBanner(id: string) {
  const response = await fetch(`${BASE_URL}/api/banners/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function publishBanner(id: string) {
  const response = await fetch(`${BASE_URL}/api/banners/${id}/publish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function unpublishBanner(id: string) {
  const response = await fetch(`${BASE_URL}/api/banners/${id}/unpublish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}


// MEDIA API
// =====================================================

export async function getMedia() {
  const response = await fetch(`${BASE_URL}/api/media`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function createMedia(data: any) {
  const response = await fetch(`${BASE_URL}/api/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateMedia(id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/media/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteMedia(id: string) {
  const response = await fetch(`${BASE_URL}/api/media/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function publishMedia(id: string) {
  const response = await fetch(`${BASE_URL}/api/media/${id}/publish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function unpublishMedia(id: string) {
  const response = await fetch(`${BASE_URL}/api/media/${id}/unpublish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

// =====================================================
// SPARKLES API
// =====================================================

export async function getSparkles() {
  const response = await fetch(`${BASE_URL}/api/sparkles`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function createSparkle(data: any) {
  const response = await fetch(`${BASE_URL}/api/sparkles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateSparkle(id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/sparkle/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteSparkle(id: string) {
  const response = await fetch(`${BASE_URL}/api/sparkle/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

// Convenience helpers that reuse updateSparkle
export async function publishSparkle(id: string) {
  return updateSparkle(id, {
    publish_status: "published",
    published_at: new Date().toISOString(),
    scheduled_at: null,
  });
}

export async function unpublishSparkle(id: string) {
  return updateSparkle(id, {
    publish_status: "draft",
  });
}

// =====================================================
// FOLDERS API (Generic for all modules)
// =====================================================

export async function getFolders(moduleName: 'wallpaper' | 'banner' | 'media' | 'sparkle') {
  const response = await fetch(`${BASE_URL}/api/${moduleName}-folders`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function createFolder(moduleName: 'wallpaper' | 'banner' | 'media' | 'sparkle', data: any) {
  const response = await fetch(`${BASE_URL}/api/${moduleName}-folders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateFolder(moduleName: 'wallpaper' | 'banner' | 'media' | 'sparkle', id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/${moduleName}-folders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteFolder(moduleName: 'wallpaper' | 'banner' | 'media' | 'sparkle', id: string) {
  const response = await fetch(`${BASE_URL}/api/${moduleName}-folders/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

// =====================================================
// UPLOAD API (File uploads with FormData)
// =====================================================

export async function uploadWallpaper(file: File | null, data: any) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/wallpaper`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

export async function uploadBanner(file: File | null, data: any) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/banner`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

export async function uploadPopupBanner(file: File | null, data: any) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/popup-banner`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

export async function getPopupBanners() {
  const response = await fetch(`${BASE_URL}/api/popup-banners`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function updatePopupBanner(id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/popup-banners/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deletePopupBanner(id: string) {
  const response = await fetch(`${BASE_URL}/api/popup-banners/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function pushPopupBanner(id: string) {
  const response = await fetch(`${BASE_URL}/api/popup-banners/${id}/push`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function updatePopupBannerImage(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/api/popup-banners/${id}/image`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });

  return response.json();
}

export async function uploadMedia(file: File | null, data: any) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/media`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

export async function uploadPhoto(file: File | null, data: any) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/photo`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

export async function uploadSparkle(file: File | null, data: any) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  // Attach optional sparkle video file (from UploadModal) as separate `video` field
  if (data && data.videoFile instanceof File) {
    formData.append("video", data.videoFile);
  }

  Object.keys(data).forEach((key) => {
    if (key === "videoFile") return; // avoid sending the File object as a regular field
    if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/sparkle`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

// =====================================================
// ANALYTICS API (Generic for all modules)
// =====================================================

export async function getAggregateAnalytics(startDate: Date | null, endDate: Date | null) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate.toISOString());
  if (endDate) params.append('end_date', endDate.toISOString());

  const response = await fetch(`${BASE_URL}/api/analytics/aggregate?${params}`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function getItemAnalytics(
  moduleName: 'wallpaper' | 'banner' | 'media' | 'sparkle',
  itemId: string,
  startDate: Date | null,
  endDate: Date | null
) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate.toISOString());
  if (endDate) params.append('end_date', endDate.toISOString());

  const response = await fetch(`${BASE_URL}/api/${moduleName}s/${itemId}/analytics?${params}`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

// =====================================================
// STORAGE API
// =====================================================

export async function getStorageStats() {
  const response = await fetch(`${BASE_URL}/api/storage/stats`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}



// =====================================================
// UNIVERSAL ANALYTICS (New Engine)
// =====================================================

export async function getUniversalAnalyticsEvents(params?: {
  event_name?: string;
  feature_key?: string;
  page?: string;
  route?: string;
  from?: string;
  to?: string;
  before?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.event_name) qs.set("event_name", params.event_name);
  if (params?.feature_key) qs.set("feature_key", params.feature_key);
  if (params?.page) qs.set("page", params.page);
  if (params?.route) qs.set("route", params.route);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.before) qs.set("before", params.before);
  if (params?.limit != null) qs.set("limit", String(params.limit));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return fetchWith404Fallback(`/api/admin/analytics/events${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getUniversalFeatureStats(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/feature-stats${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getUniversalRouteStats(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/route-stats${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getAdminContentCalendarUsage(params?: {
  page?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", params.page);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/content/calendar-usage${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getAdminAnalyticsInsights(params?: {
  acknowledged?: boolean;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.acknowledged != null) qs.set("acknowledged", String(params.acknowledged));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/analytics/insights${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getAdminAnalyticsTopInsight() {
  return fetchWith404Fallback(`/api/admin/analytics/insights/top`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function acknowledgeAdminAnalyticsInsight(id: string) {
  return fetchWith404Fallback(`/api/admin/analytics/insights/${encodeURIComponent(id)}/acknowledge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

// =====================================================
// DIVINE GUARD: MEDIA DASHBOARD (Read-only)
// =====================================================

export async function getDivineGuardReleaseVersions() {
  return fetchWith404Fallback(`/api/admin/divine-guard/release-versions`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getDivineGuardMediaOverview(params?: {
  from?: string;
  to?: string;
  app_version?: string;
  screen?: string;
  feature_key?: string;
  network_state?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.app_version) qs.set("app_version", params.app_version);
  if (params?.screen) qs.set("screen", params.screen);
  if (params?.feature_key) qs.set("feature_key", params.feature_key);
  if (params?.network_state) qs.set("network_state", params.network_state);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/divine-guard/media/overview${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getDivineGuardMediaAssets(params?: {
  from?: string;
  to?: string;
  app_version?: string;
  screen?: string;
  feature_key?: string;
  network_state?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.app_version) qs.set("app_version", params.app_version);
  if (params?.screen) qs.set("screen", params.screen);
  if (params?.feature_key) qs.set("feature_key", params.feature_key);
  if (params?.network_state) qs.set("network_state", params.network_state);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/divine-guard/media/assets${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getDivineGuardMediaCompare(params: {
  version_a: string;
  version_b: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("version_a", params.version_a);
  qs.set("version_b", params.version_b);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/admin/divine-guard/media/compare${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function getDivineGuardControlSnapshot(params?: {
  app_version?: string;
  feature_key?: string;
  network_state?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.app_version) qs.set("app_version", params.app_version);
  if (params?.feature_key) qs.set("feature_key", params.feature_key);
  if (params?.network_state) qs.set("network_state", params.network_state);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return fetchWith404Fallback(`/api/divine-guard/control-snapshot${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function listDivineGuardAdminRules(params?: { scope?: string }) {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set("scope", params.scope);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return fetchWith404Fallback(`/api/admin/divine-guard/rules${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}

export async function upsertDivineGuardAdminRule(payload: {
  rule_key?: string | null;
  scope: string;
  enabled: boolean;
  priority: number;
  match?: any;
  action: any;
}) {
  return fetchWith404Fallback(`/api/admin/divine-guard/rules/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify(payload),
  });
}

export async function listDivineGuardAdminRuleAudit(params?: { rule_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.rule_id) qs.set("rule_id", params.rule_id);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return fetchWith404Fallback(`/api/admin/divine-guard/rules/audit${suffix}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
}
