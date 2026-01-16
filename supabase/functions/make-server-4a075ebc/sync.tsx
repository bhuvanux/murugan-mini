/**
 * Sync Routes - Admin to User Panel Data Synchronization
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const BUCKET_NAME = "make-4a075ebc-content";

/**
 * Initialize storage bucket if it doesn't exist
 */
export async function initializeStorage() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    });
    console.log(`[Storage] Created bucket: ${BUCKET_NAME}`);
  }
}

/**
 * Upload and optimize image
 */
export async function uploadImage(c: Context) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${type}-${Date.now()}-${crypto.randomUUID()}`;
    const basePath = `${type}s/${fileName}`;

    // Upload original
    const originalPath = `${basePath}-original.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(originalPath, file);

    if (uploadError) {
      console.error("[Upload] Error:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    // Generate URLs (optimization would happen here in production)
    const { data: originalUrlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(originalPath, 31536000); // 1 year

    // For now, use the same URL for all sizes
    // In production, you'd generate resized versions
    const urls = {
      thumbnailUrl: originalUrlData?.signedUrl || "",
      smallUrl: originalUrlData?.signedUrl || "",
      mediumUrl: originalUrlData?.signedUrl || "",
      largeUrl: originalUrlData?.signedUrl || "",
      originalUrl: originalUrlData?.signedUrl || "",
      storagePath: originalPath,
    };

    return c.json({ success: true, urls });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Fetch published content for user app
 */
export async function fetchUserContent(c: Context, type: string) {
  try {
    const category = c.req.query("category");
    const kvKey = category ? `user_${type}_${category}` : `user_${type}`;

    // Try cache first
    const cached = await kv.get(kvKey);
    if (cached) {
      return c.json({ items: JSON.parse(cached), cached: true });
    }

    // Fetch from KV store with prefix
    const allItems = await kv.getByPrefix(`admin_${type}_`);
    
    // Filter published items
    const publishedItems = allItems
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter((item) => item && item.published);

    // Filter by category if specified
    const filteredItems = category
      ? publishedItems.filter((item) => item.category === category)
      : publishedItems;

    // Sort by creation date (newest first)
    filteredItems.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Cache for 1 minute
    await kv.set(kvKey, JSON.stringify(filteredItems));

    return c.json({ items: filteredItems, cached: false });
  } catch (error: any) {
    console.error(`[Fetch ${type}] Error:`, error);
    return c.json({ error: error.message, items: [] }, 500);
  }
}

/**
 * Sync content from admin to user (publish/unpublish)
 */
export async function syncContent(c: Context) {
  try {
    const body = await c.req.json();
    const { type, contentId, action } = body;

    if (!type || !contentId || !action) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const kvKey = `admin_${type}_${contentId}`;
    const content = await kv.get(kvKey);

    if (!content) {
      return c.json({ error: "Content not found" }, 404);
    }

    const contentData = JSON.parse(content);
    contentData.published = action === "publish";
    contentData.updatedAt = new Date().toISOString();

    await kv.set(kvKey, JSON.stringify(contentData));

    // Invalidate user cache
    const cacheKeys = await kv.getByPrefix(`user_${type}`);
    for (const key of cacheKeys) {
      await kv.del(`user_${type}_${key}`);
    }

    return c.json({ success: true, published: contentData.published });
  } catch (error: any) {
    console.error("[Sync] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Save content from admin panel
 */
export async function saveAdminContent(c: Context, type: string) {
  try {
    const body = await c.req.json();
    const {
      id,
      title,
      imageUrl,
      thumbnailUrl,
      smallUrl,
      mediumUrl,
      largeUrl,
      originalUrl,
      category,
      published,
      metadata,
    } = body;

    if (!id || !title) {
      return c.json({ error: "Missing required fields (id, title)" }, 400);
    }

    const content = {
      id,
      type,
      title,
      imageUrl,
      thumbnailUrl,
      smallUrl,
      mediumUrl,
      largeUrl,
      originalUrl,
      category: category || "general",
      published: published ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: metadata || {},
    };

    const kvKey = `admin_${type}_${id}`;
    await kv.set(kvKey, JSON.stringify(content));

    // Invalidate user cache
    await kv.del(`user_${type}`);
    if (category) {
      await kv.del(`user_${type}_${category}`);
    }

    return c.json({ success: true, content });
  } catch (error: any) {
    console.error(`[Save ${type}] Error:`, error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get all admin content (for admin panel)
 */
export async function getAdminContent(c: Context, type: string) {
  try {
    const items = await kv.getByPrefix(`admin_${type}_`);
    
    const parsedItems = items
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null);

    // Sort by update date (newest first)
    parsedItems.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return c.json({ items: parsedItems });
  } catch (error: any) {
    console.error(`[Get Admin ${type}] Error:`, error);
    return c.json({ error: error.message, items: [] }, 500);
  }
}

/**
 * Delete content
 */
export async function deleteContent(c: Context, type: string, id: string) {
  try {
    const kvKey = `admin_${type}_${id}`;
    await kv.del(kvKey);

    // Invalidate caches
    await kv.del(`user_${type}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`[Delete ${type}] Error:`, error);
    return c.json({ error: error.message }, 500);
  }
}
