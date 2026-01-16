import { projectId, publicAnonKey } from "./supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

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

// =====================================================
// MEDIA API
// =====================================================

export async function getMedia() {
  const response = await fetch(`${BASE_URL}/api/media`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    cache: "no-store",
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
  const response = await fetch(`${BASE_URL}/api/sparkle`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    cache: "no-store",
  });
  return response.json();
}

export async function createSparkle(data: any) {
  const response = await fetch(`${BASE_URL}/api/sparkle`, {
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

export async function publishSparkle(id: string) {
  const response = await fetch(`${BASE_URL}/api/sparkle/${id}/publish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function unpublishSparkle(id: string) {
  const response = await fetch(`${BASE_URL}/api/sparkle/${id}/unpublish`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
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
      if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
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
      if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/banner`, {
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
      if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
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
      if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
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
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
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

export async function getAnalyticsDashboard() {
  const response = await fetch(`${BASE_URL}/api/analytics/admin/dashboard`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

// =====================================================
// NOTIFICATIONS API
// =====================================================

export async function getNotifications() {
  const response = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    cache: "no-store",
  });
  return response.json();
}

export async function createNotification(data: any) {
  const response = await fetch(`${BASE_URL}/api/notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateNotification(id: string, data: any) {
  const response = await fetch(`${BASE_URL}/api/notifications/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteNotification(id: string) {
  const response = await fetch(`${BASE_URL}/api/notifications/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function sendNotification(id: string) {
  const response = await fetch(`${BASE_URL}/api/notifications/${id}/send`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function uploadNotification(imageFile: File, data: any) {
  const formData = new FormData();
  formData.append("file", imageFile);
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  const response = await fetch(`${BASE_URL}/api/upload/notification`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
    body: formData,
  });
  return response.json();
}

export async function getNotificationStats() {
  const response = await fetch(`${BASE_URL}/api/notifications/stats`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function getNotificationAnalytics(
  notificationId: string,
  startDate: Date | null,
  endDate: Date | null
) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate.toISOString());
  if (endDate) params.append('end_date', endDate.toISOString());

  const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/analytics?${params}`, {
    headers: { "Authorization": `Bearer ${publicAnonKey}` },
  });
  return response.json();
}

export async function bulkDeleteNotifications(ids: string[]) {
  const response = await fetch(`${BASE_URL}/api/notifications/bulk-delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({ ids }),
  });
  return response.json();
}
