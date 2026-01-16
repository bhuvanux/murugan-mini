/**
 * Complete API Routes for Murugan Admin Panel
 * Full CRUD operations with image upload, optimization, and database integration
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { uploadFile, getPublicUrl, deleteFile } from "./storage-init.tsx";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

/**
 * Generate unique filename
 */
function generateFilename(originalName: string, prefix: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const ext = originalName.split(".").pop();
  return `${prefix}/${timestamp}-${random}.${ext}`;
}

/**
 * Log admin activity
 */
async function logAdminActivity(
  action: string,
  resourceType: string,
  resourceId: string,
  details: any,
  c: Context
) {
  const supabase = supabaseClient();
  await supabase.from("admin_activity_log").insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for"),
    user_agent: c.req.header("user-agent"),
  });
}

// ====================================================================
// BANNER ROUTES - All category_id references removed
// ====================================================================

export async function uploadBanner(c: Context) {
  try {
    console.log("[Banner Upload] Starting upload process...");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const folderId = formData.get("folder_id") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";
    const scheduledAt = formData.get("scheduled_at") as string;
    const bannerType = formData.get("bannerType") as string || "home";
    const targetUrl = formData.get("target_url") as string;

    console.log("[Banner Upload] Form data:", { title, publishStatus, bannerType, folderId, scheduledAt });

    if (!file || !title) {
      return c.json({ error: "File and title are required" }, 400);
    }

    // Upload original file
    const filename = generateFilename(file.name, "banners");
    console.log("[Banner Upload] Uploading to storage:", filename);

    const uploadResult = await uploadFile("banners", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      console.error("[Banner Upload] Storage upload failed:", uploadResult.error);
      return c.json({ error: uploadResult.error }, 500);
    }

    // Generate public URL using Supabase storage
    const supabase = supabaseClient();
    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    console.log("[Banner Upload] Storage success! Public URL:", publicUrl);

    // Save to database - MINIMAL SAFE INSERT
    // Only using columns that should exist in basic banners table
    console.log("[Banner Upload] Attempting database insert with minimal fields...");

    const insertData: any = {
      title,
      description,
      image_url: publicUrl,
      thumbnail_url: publicUrl,
      order_index: 0,
      publish_status: publishStatus,
    };

    // Add optional fields if provided
    if (folderId) insertData.folder_id = folderId;
    if (scheduledAt) insertData.scheduled_at = scheduledAt;
    if (targetUrl) insertData.target_url = targetUrl;

    const { data, error } = await supabase
      .from("banners")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[Banner Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[Banner Upload] Database insert success! ID:", data.id);

    // Trigger sync engine to update user cache
    if (publishStatus === "published") {
      console.log("[Banner Upload] Triggering sync for published banner...");
      await syncUserBanners(supabase);
    }

    await logAdminActivity("upload", "banner", data.id, { title, bannerType }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Banner Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Sync published banners to user cache
 */
async function syncUserBanners(supabase: any) {
  try {
    console.log("[Sync Engine] Syncing published BANNERS to user cache...");

    // Use minimal columns to avoid schema errors
    const { data: banners, error } = await supabase
      .from("banners")
      .select("id, title, description, image_url, thumbnail_url, order_index")
      .eq("publish_status", "published")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("[Sync Engine] Failed to fetch banners:", error);
      return;
    }

    // Store in KV store for fast user access - KEY: user_banners
    const kv = await import("./kv_store.tsx");
    await kv.set("user_banners", JSON.stringify(banners || []));
    await kv.set("user_banners_timestamp", Date.now().toString());

    console.log(`[Sync Engine] ✅ Synced ${banners?.length || 0} BANNERS to user_banners cache`);
  } catch (error) {
    console.error("[Sync Engine] Sync banners error:", error);
  }
}

export async function getBanners(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;

    let query = supabase.from("banners").select("*").order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Get Banners] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Banners] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    console.log("[Banner Update] Updating banner:", id, body);

    // Remove any fields that might not exist in the schema
    const { published_at, visibility, original_url, banner_type, ...safeBody } = body;

    console.log("[Banner Update] Safe update fields:", Object.keys(safeBody));

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banners")
      .update(safeBody)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Banner Update] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[Banner Update] Success! New status:", data.publish_status);

    // Trigger sync whenever banner is updated
    console.log("[Banner Update] Triggering sync...");
    await syncUserBanners(supabase);

    await logAdminActivity("update", "banner", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Banner Update] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteBanner(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    // Get banner to delete file from storage
    const { data: banner } = await supabase.from("banners").select("storage_path").eq("id", id).single();

    if (banner?.storage_path) {
      await deleteFile("banners", banner.storage_path);
    }

    const { error } = await supabase.from("banners").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "banner", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// WALLPAPER ROUTES
// ====================================================================

export async function uploadWallpaper(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";
    const folderId = formData.get("folder_id") as string;
    const scheduledAt = formData.get("scheduled_at") as string;
    const isVideo = file.type.startsWith("video/");

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    // Title is optional - use filename if not provided
    const finalTitle = title || file.name.replace(/\.[^/.]+$/, "");

    const filename = generateFilename(file.name, "wallpapers");
    const uploadResult = await uploadFile("wallpapers", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const imageUrl = getPublicUrl("wallpapers", filename);
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("wallpapers")
      .insert({
        title: finalTitle,
        description,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        small_url: imageUrl,
        medium_url: imageUrl,
        large_url: imageUrl,
        original_url: imageUrl,
        storage_path: filename,
        is_video: isVideo,
        video_url: isVideo ? imageUrl : null,
        folder_id: folderId || null,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        visibility: "public", // 🔥 CRITICAL FIX: Always set visibility to public
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, // 🔥 FIX: Save scheduled_at to database
      })
      .select()
      .single();

    if (error) {
      console.error("[Wallpaper Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[uploadWallpaper] ✅ Wallpaper created with scheduled_at:`, {
      id: data.id,
      publish_status: data.publish_status,
      scheduled_at: data.scheduled_at
    });

    await logAdminActivity("upload", "wallpaper", data.id, { title: finalTitle, isVideo }, c);

    // Trigger sync engine to update user cache
    console.log("[Wallpaper Upload] Triggering wallpaper sync...");
    await syncUserWallpapers(supabase);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Wallpaper Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Sync published wallpapers to user cache (SEPARATE from banners)
 */
async function syncUserWallpapers(supabase: any) {
  try {
    console.log("[Sync Engine] Syncing published WALLPAPERS to user cache...");

    const { data: wallpapers, error } = await supabase
      .from("wallpapers")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Sync Engine] Failed to fetch wallpapers:", error);
      return;
    }

    // Store in KV store for fast user access - KEY: user_wallpapers
    const kv = await import("./kv_store.tsx");
    await kv.set("user_wallpapers", JSON.stringify(wallpapers || []));
    await kv.set("user_wallpapers_timestamp", Date.now().toString());

    console.log(`[Sync Engine] ✅ Synced ${wallpapers?.length || 0} WALLPAPERS to user_wallpapers cache`);
  } catch (error) {
    console.error("[Sync Engine] Sync wallpapers error:", error);
  }
}

export async function getWallpapers(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const featured = c.req.query("featured") || null;

    let query = supabase
      .from("wallpapers")
      .select("*")
      .order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    if (featured) {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // scheduled_at is now stored in database
    console.log(`[getWallpapers] ✅ Fetched ${data?.length || 0} wallpapers from database`);

    // ✅ FIX: Fetch real-time analytics stats 
    // We need to fetch counts from the analytics_tracking table because legacy columns aren't updated
    try {
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("analytics_tracking")
        .select("item_id, event_type")
        .eq("module_name", "wallpaper");

      if (!analyticsError && analyticsData) {
        // Aggregate counts in memory (faster than N+1 queries, okay for < 10k rows)
        const statsMap = new Map<string, { views: number; likes: number; downloads: number }>();

        analyticsData.forEach((event: any) => {
          if (!event.item_id) return;

          if (!statsMap.has(event.item_id)) {
            statsMap.set(event.item_id, { views: 0, likes: 0, downloads: 0 });
          }

          const stats = statsMap.get(event.item_id)!;
          if (event.event_type === 'view') stats.views++;
          else if (event.event_type === 'like') stats.likes++;
          else if (event.event_type === 'download') stats.downloads++;
        });

        // Merge stats into wallpapers
        const enrichedData = (data || []).map((wallpaper: any) => {
          const stats = statsMap.get(wallpaper.id);
          if (stats) {
            return {
              ...wallpaper,
              // ✅ FIX: Use real-time stats if available, do NOT add to legacy counts (prevents double counting)
              view_count: stats.views > 0 ? stats.views : (wallpaper.view_count || 0),
              like_count: stats.likes > 0 ? stats.likes : (wallpaper.like_count || 0),
              download_count: stats.downloads > 0 ? stats.downloads : (wallpaper.download_count || 0),
            };
          }
          return wallpaper;
        });

        console.log(`[getWallpapers] ✅ Enriched ${enrichedData.length} wallpapers with real-time analytics`);
        return c.json({ success: true, data: enrichedData });
      }
    } catch (statsError) {
      console.error("[getWallpapers] Failed to fetch real-time stats:", statsError);
      // Fallback to basic data if analytics fetch fails
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updateWallpaper(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    console.log(`[updateWallpaper] Updating wallpaper ${id} with body:`, body);

    const supabase = supabaseClient();

    // Prepare update object - include scheduled_at in database update
    const updateData: any = { ...body };

    // Convert scheduled_at to ISO string if present
    if (updateData.scheduled_at !== undefined) {
      updateData.scheduled_at = updateData.scheduled_at ? new Date(updateData.scheduled_at).toISOString() : null;
    }

    console.log(`[updateWallpaper] Updating database fields:`, updateData);
    const result = await supabase
      .from("wallpapers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (result.error) {
      console.error(`[updateWallpaper] Database update error:`, result.error);
      return c.json({ error: result.error.message }, 500);
    }

    console.log(`[updateWallpaper] ✅ Wallpaper updated:`, {
      id: result.data.id,
      publish_status: result.data.publish_status,
      scheduled_at: result.data.scheduled_at
    });

    await logAdminActivity("update", "wallpaper", id, body, c);

    const response = {
      success: true,
      data: {
        ...result.data,
        scheduled_at: result.data.scheduled_at || null
      }
    };

    console.log(`[updateWallpaper] ✅ Success! Returning:`, response);
    return c.json(response);
  } catch (error: any) {
    console.error(`[updateWallpaper] ❌ Error:`, error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteWallpaper(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: wallpaper } = await supabase.from("wallpapers").select("storage_path").eq("id", id).single();

    if (wallpaper?.storage_path) {
      await deleteFile("wallpapers", wallpaper.storage_path);
    }

    const { error } = await supabase.from("wallpapers").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // Clean up scheduling info from KV store
    const kv = await import("./kv_store.tsx");
    await kv.del(`wallpaper:schedule:${id}`);

    await logAdminActivity("delete", "wallpaper", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// MEDIA ROUTES (Audio, Video, YouTube)
// ====================================================================

// ✅ NEW: Fetch YouTube metadata endpoint
export async function fetchYouTubeMetadata(c: Context) {
  try {
    const body = await c.req.json();
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      return c.json({ error: "YouTube URL is required" }, 400);
    }

    // Extract YouTube ID
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    const youtubeId = match ? match[1] : null;

    if (!youtubeId) {
      return c.json({ error: "Invalid YouTube URL" }, 400);
    }

    // Fetch metadata from YouTube oEmbed API (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;

    try {
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch YouTube metadata");
      }

      const data = await response.json();

      return c.json({
        success: true,
        data: {
          youtubeId,
          title: data.title || "Untitled",
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          video_url: youtubeUrl,
          channel: data.author_name || "Unknown",
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          type: "video", // Can be changed to "song" by user
        },
      });
    } catch (fetchError: any) {
      console.error("[YouTube Fetch] oEmbed API error:", fetchError);

      // Fallback: Return basic info from URL
      return c.json({
        success: true,
        data: {
          youtubeId,
          title: "YouTube Video", // User will need to edit this
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          video_url: youtubeUrl,
          channel: "Unknown",
          embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
          type: "video",
        },
      });
    }
  } catch (error: any) {
    console.error("[YouTube Fetch] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function uploadMedia(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const artist = formData.get("artist") as string;
    const mediaType = formData.get("mediaType") as string; // audio, video, youtube
    const youtubeUrl = formData.get("youtubeUrl") as string;
    const category = formData.get("category") as string; // ✅ Changed from categoryId
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";
    const contentType = formData.get("contentType") as string; // ✅ NEW: for youtube uploads (audio/video)

    console.log("[Media Upload] Received:", { title, mediaType, category, publishStatus, contentType });

    if (!title || !mediaType) {
      return c.json({ error: "Title and media type are required" }, 400);
    }

    let fileUrl = null;
    let storagePath = null;
    let youtubeId = null;
    let thumbnailUrl = null;

    // ✅ FIX: Determine the actual media type to store in database
    // For YouTube, use contentType (audio/video), not "youtube"
    let actualMediaType = mediaType;
    if (mediaType === "youtube") {
      // Use contentType if provided (audio/video), otherwise default to "video"
      actualMediaType = contentType || "video";
    }

    // Handle YouTube
    if (mediaType === "youtube") {
      if (!youtubeUrl) {
        return c.json({ error: "YouTube URL is required" }, 400);
      }
      // Extract YouTube ID
      const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      youtubeId = match ? match[1] : null;
      fileUrl = youtubeUrl;
      thumbnailUrl = formData.get("thumbnailUrl") as string || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    } else {
      // Handle file upload
      if (!file) {
        return c.json({ error: "File is required for non-YouTube media" }, 400);
      }

      const filename = generateFilename(file.name, "media");
      const uploadResult = await uploadFile("media", filename, file, {
        contentType: file.type,
      });

      if (!uploadResult.success) {
        return c.json({ error: uploadResult.error }, 500);
      }

      storagePath = filename;
      fileUrl = getPublicUrl("media", filename);
      thumbnailUrl = formData.get("thumbnailUrl") as string || fileUrl;
    }

    const supabase = supabaseClient();

    // ✅ Handle category: Look up or create
    let categoryId = null;
    if (category) {
      // Generate slug first (for lookup and potential insert)
      const slug = category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      // First, try to find existing category by slug (more reliable than name)
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .eq("type", "media")
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
        console.log("[Media Upload] Found existing category:", categoryId);
      } else {
        // Try to create new category, but handle duplicate slug gracefully
        const { data: newCategory, error: catError } = await supabase
          .from("categories")
          .insert({
            name: category,
            slug: slug,
            type: "media",
          })
          .select()
          .single();

        if (catError) {
          console.error("[Media Upload] Category creation error:", catError);

          // If duplicate slug error (23505), try to fetch the existing category one more time
          if (catError.code === "23505") {
            console.log("[Media Upload] Duplicate slug detected, fetching existing category...");
            const { data: retryCategory } = await supabase
              .from("categories")
              .select("id")
              .eq("slug", slug)
              .eq("type", "media")
              .single();

            if (retryCategory) {
              categoryId = retryCategory.id;
              console.log("[Media Upload] Retrieved existing category after duplicate:", categoryId);
            }
          }
          // If still no category, continue without it (categoryId remains null)
        } else {
          categoryId = newCategory.id;
          console.log("[Media Upload] Created new category:", categoryId);
        }
      }
    }

    // ✅ Insert media record with correct media_type
    console.log("[Media Upload] Inserting with media_type:", actualMediaType);
    const { data, error } = await supabase
      .from("media")
      .insert({
        title,
        description,
        artist,
        media_type: actualMediaType, // ✅ FIX: Use "audio" or "video", not "youtube"
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        youtube_id: youtubeId,
        youtube_url: youtubeUrl || null,
        storage_path: storagePath,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Media Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log("[Media Upload] Success:", data.id);

    await logAdminActivity("upload", "media", data.id, { title, mediaType: actualMediaType }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Media Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getMedia(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const mediaType = c.req.query("mediaType") || null;
    const categoryId = c.req.query("categoryId") || null;

    let query = supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    if (mediaType) {
      query = query.eq("media_type", mediaType);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    // ✅ FIX: Fetch real-time analytics stats for media
    // We need to fetch counts from the analytics_tracking table
    try {
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("analytics_tracking")
        .select("item_id, event_type")
        .in("module_name", ["media", "song", "video"]);

      if (!analyticsError && analyticsData) {
        // Aggregate counts in memory
        const statsMap = new Map<string, { plays: number; likes: number; downloads: number; shares: number; playlist_adds: number }>();

        analyticsData.forEach((event: any) => {
          if (!event.item_id) return;

          if (!statsMap.has(event.item_id)) {
            statsMap.set(event.item_id, { plays: 0, likes: 0, downloads: 0, shares: 0, playlist_adds: 0 });
          }

          const stats = statsMap.get(event.item_id)!;
          if (event.event_type === 'play' || event.event_type === 'play_video_inline') stats.plays++;
          else if (event.event_type === 'like') stats.likes++;
          else if (event.event_type === 'download') stats.downloads++;
          else if (event.event_type === 'share') stats.shares++;
          else if (event.event_type === 'add_to_playlist') stats.playlist_adds++;
        });

        // Merge stats into media items
        const enrichedData = (data || []).map((item: any) => {
          const stats = statsMap.get(item.id);
          if (stats) {
            return {
              ...item,
              // ✅ FIX: Use real-time stats if available, do NOT add to legacy counts (prevents double counting)
              play_count: stats.plays > 0 ? stats.plays : (item.play_count || 0),
              like_count: stats.likes > 0 ? stats.likes : (item.like_count || 0),
              download_count: stats.downloads > 0 ? stats.downloads : (item.download_count || 0),
              share_count: stats.shares > 0 ? stats.shares : (item.share_count || 0),
              add_to_playlist_count: stats.playlist_adds > 0 ? stats.playlist_adds : (item.add_to_playlist_count || 0),
            };
          }
          return item;
        });

        console.log(`[getMedia] ✅ Enriched ${enrichedData.length} media items with real-time analytics`);
        return c.json({ success: true, data: enrichedData });
      }
    } catch (statsError) {
      console.error("[getMedia] Failed to fetch real-time stats:", statsError);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updateMedia(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "media", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteMedia(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: media } = await supabase.from("media").select("storage_path").eq("id", id).single();

    if (media?.storage_path) {
      await deleteFile("media", media.storage_path);
    }

    const { error } = await supabase.from("media").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "media", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// PHOTO ROUTES
// ====================================================================

export async function uploadPhoto(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";

    if (!file || !title) {
      return c.json({ error: "File and title are required" }, 400);
    }

    const filename = generateFilename(file.name, "photos");
    const uploadResult = await uploadFile("photos", filename, file, {
      contentType: file.type,
    });

    if (!uploadResult.success) {
      return c.json({ error: uploadResult.error }, 500);
    }

    const imageUrl = getPublicUrl("photos", filename);
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("photos")
      .insert({
        title,
        description,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        small_url: imageUrl,
        medium_url: imageUrl,
        large_url: imageUrl,
        original_url: imageUrl,
        storage_path: filename,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Photo Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("upload", "photo", data.id, { title }, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Photo Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getPhotos(c: Context) {
  try {
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const categoryId = c.req.query("categoryId") || null;

    let query = supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updatePhoto(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("photos")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "photo", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deletePhoto(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: photo } = await supabase.from("photos").select("storage_path").eq("id", id).single();

    if (photo?.storage_path) {
      await deleteFile("photos", photo.storage_path);
    }

    const { error } = await supabase.from("photos").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "photo", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// SPARKLE (NEWS/ARTICLES) ROUTES
// ====================================================================

export async function uploadSparkle(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const subtitle = formData.get("subtitle") as string;
    const content = formData.get("content") as string;
    const contentJson = formData.get("contentJson") as string;
    const author = formData.get("author") as string;
    const categoryId = formData.get("categoryId") as string;
    const tags = formData.get("tags") as string;
    const publishStatus = formData.get("publishStatus") as string || "draft";

    if (!title || !content) {
      return c.json({ error: "Title and content are required" }, 400);
    }

    let coverImageUrl = null;
    let storagePath = null;

    if (file) {
      const filename = generateFilename(file.name, "sparkle");
      const uploadResult = await uploadFile("sparkle", filename, file, {
        contentType: file.type,
      });

      if (!uploadResult.success) {
        return c.json({ error: uploadResult.error }, 500);
      }

      storagePath = filename;
      coverImageUrl = getPublicUrl("sparkle", filename);
    }

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkles")
      .insert({
        title,
        subtitle,
        content,
        content_json: contentJson ? JSON.parse(contentJson) : null,
        cover_image_url: coverImageUrl,
        thumbnail_url: coverImageUrl,
        storage_path: storagePath,
        author,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        publish_status: publishStatus,
        published_at: publishStatus === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Sparkle Upload] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    try {
      await logAdminActivity("upload", "sparkle", data.id, { title }, c);
    } catch (e) {
      console.warn("[Sparkle Upload] Admin logging failed (non-fatal):", e);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Sparkle Upload] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function getSparkle(c: Context) {
  try {
    console.log("[API V2.5] getSparkle called - using 'sparkles' table");
    const supabase = supabaseClient();
    const publishStatus = c.req.query("publishStatus") || null;
    const categoryId = c.req.query("categoryId") || null;
    const featured = c.req.query("featured") || null;

    let query = supabase
      .from("sparkles")
      .select("*")
      .order("published_at", { ascending: false });

    if (publishStatus) {
      query = query.eq("publish_status", publishStatus);
    }

    if (featured) {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function updateSparkle(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkles")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("update", "sparkle", id, body, c);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteSparkle(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    const { data: sparkle } = await supabase.from("sparkles").select("storage_path").eq("id", id).single();

    if (sparkle?.storage_path) {
      await deleteFile("sparkle", sparkle.storage_path);
    }

    const { error } = await supabase.from("sparkles").delete().eq("id", id);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    await logAdminActivity("delete", "sparkle", id, {}, c);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// BANNER FOLDERS ROUTES
// ====================================================================

export async function getBannerFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("banner_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Banner Folders] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Banner Folders] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createBannerFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("banner_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("[Create Banner Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Banner Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateBannerFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const { data, error } = await supabase
      .from("banner_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Banner Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Banner Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteBannerFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("banner_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Banner Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Banner Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// MEDIA FOLDERS ROUTES
// ====================================================================

export async function getMediaFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("media_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Media Folders] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Media Folders] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createMediaFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("media_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("[Create Media Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Media Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateMediaFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const { data, error } = await supabase
      .from("media_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Media Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Media Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteMediaFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("media_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Media Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Media Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// SPARKLE FOLDERS ROUTES
// ====================================================================

export async function getSparkleFolders(c: Context) {
  try {
    const supabase = supabaseClient();
    const { data, error } = await supabase
      .from("sparkle_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Sparkle Folders] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Get Sparkle Folders] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function createSparkleFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("sparkle_folders")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("[Create Sparkle Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Create Sparkle Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function updateSparkleFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    const { data, error } = await supabase
      .from("sparkle_folders")
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Sparkle Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Update Sparkle Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

export async function deleteSparkleFolder(c: Context) {
  try {
    const supabase = supabaseClient();
    const id = c.req.param("id");

    const { error } = await supabase
      .from("sparkle_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Sparkle Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Sparkle Folder] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ====================================================================
// CATEGORIES ROUTES
// ====================================================================

export async function getCategories(c: Context) {
  try {
    const supabase = supabaseClient();
    const type = c.req.query("type") || null;

    let query = supabase.from("categories").select("*").order("name");

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
}
// ====================================================================
// SUPPORT MESSAGES ROUTES
// ====================================================================

export async function submitSupportMessage(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body = await c.req.json();
    const { subject, message, user_id } = body;

    if (!subject || !message) {
      return c.json({ error: "Subject and message are required" }, 400);
    }

    // Sanitize user_id: if it's an anonymous ID (starts with 'anon_'), 
    // it can't be stored in the UUID column. We'll store it in metadata instead.
    let db_user_id = null;
    let metadata = body.metadata || {};

    if (user_id && !user_id.startsWith('anon_')) {
      db_user_id = user_id;
    } else if (user_id) {
      metadata.anonymous_id = user_id;
    }

    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        subject,
        message,
        user_id: db_user_id,
        status: 'pending',
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error("[Support Message] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error("[Support Message] Error:", error);
    return c.json({ error: error.message }, 500);
  }
}
