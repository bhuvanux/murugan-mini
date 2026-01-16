/**
 * Scheduled Content Publisher
 * 
 * This module handles automatic publishing of scheduled content (wallpapers, banners, etc.)
 * when their scheduled_at time has been reached.
 * 
 * IMPORTANT: Scheduling information is stored in KV store (wallpaper:schedule:{id})
 * instead of database columns to avoid schema dependency issues.
 */

import type { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

/**
 * Check and publish scheduled wallpapers
 * This should be called periodically (e.g., every minute via cron or manually)
 */
export async function publishScheduledWallpapers(c: Context) {
  try {
    const supabase = supabaseClient();
    const now = new Date();

    // Get all scheduled wallpapers from database
    const { data: scheduledWallpapers, error: fetchError } = await supabase
      .from("wallpapers")
      .select("*")
      .eq("publish_status", "scheduled");

    if (fetchError) {
      console.error("[Scheduled Publisher] Error fetching scheduled wallpapers:", fetchError);
      return c.json({ success: false, error: fetchError.message }, 500);
    }

    if (!scheduledWallpapers || scheduledWallpapers.length === 0) {
      console.log("[Scheduled Publisher] No scheduled wallpapers found");
      return c.json({
        success: true,
        message: "No wallpapers due for publishing",
        published: 0,
      });
    }

    // Check KV store for scheduling information and filter wallpapers due for publishing
    const wallpapersDueForPublishing = [];
    for (const wallpaper of scheduledWallpapers) {
      const scheduleData = await kv.get(`wallpaper:schedule:${wallpaper.id}`);
      if (scheduleData?.scheduled_at) {
        const scheduledTime = new Date(scheduleData.scheduled_at);
        if (scheduledTime <= now) {
          wallpapersDueForPublishing.push(wallpaper);
        }
      }
    }

    if (wallpapersDueForPublishing.length === 0) {
      console.log("[Scheduled Publisher] No wallpapers due for publishing");
      return c.json({
        success: true,
        message: "No wallpapers due for publishing",
        published: 0,
      });
    }

    console.log(`[Scheduled Publisher] Found ${wallpapersDueForPublishing.length} wallpapers to publish`);

    // Update each wallpaper to published status
    const publishPromises = wallpapersDueForPublishing.map(async (wallpaper) => {
      const { error: updateError } = await supabase
        .from("wallpapers")
        .update({
          publish_status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", wallpaper.id);

      if (updateError) {
        console.error(`[Scheduled Publisher] Error publishing wallpaper ${wallpaper.id}:`, updateError);
        return { id: wallpaper.id, success: false, error: updateError.message };
      }

      // Remove scheduling info from KV store
      await kv.del(`wallpaper:schedule:${wallpaper.id}`);

      console.log(`[Scheduled Publisher] ✅ Published wallpaper: ${wallpaper.title} (${wallpaper.id})`);
      return { id: wallpaper.id, success: true };
    });

    const results = await Promise.all(publishPromises);
    const successCount = results.filter((r) => r.success).length;

    // Sync to user cache
    await syncUserWallpapers(supabase);

    return c.json({
      success: true,
      message: `Published ${successCount} of ${wallpapersDueForPublishing.length} wallpapers`,
      published: successCount,
      total: wallpapersDueForPublishing.length,
      results,
    });
  } catch (error: any) {
    console.error("[Scheduled Publisher] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Check and publish scheduled banners
 * Note: Banners still use database column for scheduled_at
 */
export async function publishScheduledBanners(c: Context) {
  try {
    const supabase = supabaseClient();
    const now = new Date().toISOString();

    // Find all scheduled banners where scheduled_at <= now
    const { data: scheduledBanners, error: fetchError } = await supabase
      .from("banners")
      .select("*")
      .eq("publish_status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) {
      console.error("[Scheduled Publisher] Error fetching scheduled banners:", fetchError);
      return c.json({ success: false, error: fetchError.message }, 500);
    }

    if (!scheduledBanners || scheduledBanners.length === 0) {
      console.log("[Scheduled Publisher] No banners due for publishing");
      return c.json({
        success: true,
        message: "No banners due for publishing",
        published: 0,
      });
    }

    console.log(`[Scheduled Publisher] Found ${scheduledBanners.length} banners to publish`);

    // Update each banner to published status
    const publishPromises = scheduledBanners.map(async (banner) => {
      const { error: updateError } = await supabase
        .from("banners")
        .update({
          publish_status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", banner.id);

      if (updateError) {
        console.error(`[Scheduled Publisher] Error publishing banner ${banner.id}:`, updateError);
        return { id: banner.id, success: false, error: updateError.message };
      }

      console.log(`[Scheduled Publisher] ✅ Published banner: ${banner.title} (${banner.id})`);
      return { id: banner.id, success: true };
    });

    const results = await Promise.all(publishPromises);
    const successCount = results.filter((r) => r.success).length;

    return c.json({
      success: true,
      message: `Published ${successCount} of ${scheduledBanners.length} banners`,
      published: successCount,
      total: scheduledBanners.length,
      results,
    });
  } catch (error: any) {
    console.error("[Scheduled Publisher] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Publish all scheduled content (wallpapers, banners, etc.)
 * This is the main endpoint that should be called periodically
 */
export async function publishScheduledContent(c: Context) {
  try {
    console.log("[Scheduled Publisher] Running scheduled content publisher...");

    const results: any = {
      wallpapers: { published: 0, total: 0 },
      banners: { published: 0, total: 0 },
    };

    // Publish scheduled wallpapers
    try {
      const wallpaperResult = await publishScheduledWallpapers(c);
      const wallpaperData = await wallpaperResult.json();
      results.wallpapers = {
        published: wallpaperData.published || 0,
        total: wallpaperData.total || 0,
      };
    } catch (error: any) {
      console.error("[Scheduled Publisher] Error publishing wallpapers:", error);
    }

    // Publish scheduled banners
    try {
      const bannerResult = await publishScheduledBanners(c);
      const bannerData = await bannerResult.json();
      results.banners = {
        published: bannerData.published || 0,
        total: bannerData.total || 0,
      };
    } catch (error: any) {
      console.error("[Scheduled Publisher] Error publishing banners:", error);
    }

    const totalPublished = results.wallpapers.published + results.banners.published;

    console.log(`[Scheduled Publisher] ✅ Completed - Published ${totalPublished} items`);

    return c.json({
      success: true,
      message: `Published ${totalPublished} scheduled items`,
      results,
    });
  } catch (error: any) {
    console.error("[Scheduled Publisher] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Sync published wallpapers to user cache
 */
async function syncUserWallpapers(supabase: any) {
  try {
    console.log("[Sync Engine] Syncing published WALLPAPERS to user cache...");

    const { data: wallpapers, error } = await supabase
      .from("wallpapers")
      .select("*")
      .eq("visibility", "public")
      .eq("publish_status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Sync Engine] Failed to fetch wallpapers:", error);
      return;
    }

    // Store in KV store for fast user access
    await kv.set("user_wallpapers", JSON.stringify(wallpapers || []));
    await kv.set("user_wallpapers_timestamp", Date.now().toString());

    console.log(`[Sync Engine] ✅ Synced ${wallpapers?.length || 0} WALLPAPERS to user_wallpapers cache`);
  } catch (error) {
    console.error("[Sync Engine] Sync wallpapers error:", error);
  }
}
