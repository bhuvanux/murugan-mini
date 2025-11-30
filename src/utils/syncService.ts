/**
 * Sync Service - Admin to User Panel
 * Manages real-time data synchronization between Admin Panel and User App
 */

import { projectId, publicAnonKey } from "./supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

export interface SyncedContent {
  id: string;
  type: "banner" | "wallpaper" | "media" | "photo" | "sparkle";
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  smallUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  originalUrl?: string;
  category?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Fetch all content from a specific module for the user app
 */
export async function fetchUserContent(
  type: "banners" | "wallpapers" | "media" | "photos" | "sparkles"
): Promise<SyncedContent[]> {
  try {
    const response = await fetch(`${API_BASE}/user/${type}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching user ${type}:`, error);
    return [];
  }
}

/**
 * Fetch content by category
 */
export async function fetchContentByCategory(
  type: "wallpapers" | "media" | "photos" | "sparkles",
  category: string
): Promise<SyncedContent[]> {
  try {
    const response = await fetch(`${API_BASE}/user/${type}?category=${encodeURIComponent(category)}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} by category: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching ${type} by category:`, error);
    return [];
  }
}

/**
 * Upload image from Admin Panel and get optimized URLs
 */
export async function uploadAndOptimizeImage(
  file: File,
  type: "banner" | "wallpaper" | "media" | "photo" | "sparkle"
): Promise<{
  thumbnailUrl: string;
  smallUrl: string;
  mediumUrl: string;
  largeUrl: string;
  originalUrl: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);

  try {
    const response = await fetch(`${API_BASE}/admin/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.urls;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Sync content from Admin to User (publish/unpublish)
 */
export async function syncContentToUser(
  type: "banner" | "wallpaper" | "media" | "photo" | "sparkle",
  contentId: string,
  action: "publish" | "unpublish"
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/admin/sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        contentId,
        action,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error syncing content:", error);
    return false;
  }
}

/**
 * Real-time listener for content updates
 */
export function subscribeToContentUpdates(
  type: "banners" | "wallpapers" | "media" | "photos" | "sparkles",
  callback: (content: SyncedContent[]) => void
): () => void {
  let intervalId: NodeJS.Timeout;

  const poll = async () => {
    const content = await fetchUserContent(type);
    callback(content);
  };

  // Initial fetch
  poll();

  // Poll every 5 seconds for updates
  intervalId = setInterval(poll, 5000);

  // Return unsubscribe function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Get image optimization status
 */
export async function getOptimizationStatus(imageId: string): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
}> {
  try {
    const response = await fetch(`${API_BASE}/admin/optimize-status/${imageId}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get optimization status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting optimization status:", error);
    return { status: "failed", progress: 0 };
  }
}
