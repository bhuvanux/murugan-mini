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
import { deleteFile } from "./storage-init.tsx";

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
      quotes: { published: 0, total: 0, expired: 0, deleted: 0 },
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

    // Rotate daily quotes (publish today's & expire old)
    try {
      const quoteResult = await publishScheduledQuotes(c);
      const quoteData = await quoteResult.json();
      results.quotes = {
        published: quoteData.published || 0,
        total: quoteData.total || 0,
        expired: quoteData.expired || 0,
        deleted: quoteData.deleted || 0,
      };
    } catch (error: any) {
      console.error("[Scheduled Publisher] Error rotating quotes:", error);
    }

    const totalPublished =
      results.wallpapers.published +
      results.banners.published +
      results.quotes.published;

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

function toISODateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function publishScheduledQuotes(c: Context) {
  try {
    const supabase = supabaseClient();
    const now = new Date();
    const today = toISODateUTC(now);

    // 1) Expire old published quotes (and optionally delete)
    const { data: oldQuotes, error: oldError } = await supabase
      .from("daily_quotes")
      .select("id, storage_path, auto_delete")
      .eq("publish_status", "published")
      .lt("scheduled_for", today);

    if (oldError) {
      console.warn("[Scheduled Quotes] Unable to query old quotes:", oldError);
    }

    let expired = 0;
    let deleted = 0;
    const deleteIds: string[] = [];

    for (const q of oldQuotes || []) {
      if ((q as any).auto_delete) {
        deleteIds.push((q as any).id);
        if ((q as any).storage_path) {
          await deleteFile("quotes", (q as any).storage_path);
        }
        deleted++;
      } else {
        const { error: expireErr } = await supabase
          .from("daily_quotes")
          .update({ publish_status: "expired", updated_at: new Date().toISOString() })
          .eq("id", (q as any).id);

        if (!expireErr) expired++;
      }
    }

    if (deleteIds.length) {
      await supabase.from("daily_quotes").delete().in("id", deleteIds);
    }

    // 2) If today already has a published quote, do nothing
    const { data: alreadyPublished, error: publishedError } = await supabase
      .from("daily_quotes")
      .select("id")
      .eq("scheduled_for", today)
      .eq("publish_status", "published")
      .limit(1);

    if (publishedError) {
      console.warn("[Scheduled Quotes] Unable to query published quote:", publishedError);
    }

    if (alreadyPublished && alreadyPublished.length > 0) {
      return c.json({
        success: true,
        message: "Quote already published for today",
        published: 0,
        total: 0,
        expired,
        deleted,
      });
    }

    // 3) Publish the oldest scheduled/draft quote for today
    const { data: candidates, error: candError } = await supabase
      .from("daily_quotes")
      .select("id")
      .eq("scheduled_for", today)
      .in("publish_status", ["scheduled", "draft"])
      .order("created_at", { ascending: true })
      .limit(1);

    if (candError) {
      console.warn("[Scheduled Quotes] Unable to query candidates:", candError);
      return c.json({ success: true, published: 0, total: 0, expired, deleted });
    }

    if (!candidates || candidates.length === 0) {
      return c.json({
        success: true,
        message: "No quotes due for publishing",
        published: 0,
        total: 0,
        expired,
        deleted,
      });
    }

    const targetId = (candidates[0] as any).id;
    const { error: publishErr } = await supabase
      .from("daily_quotes")
      .update({
        publish_status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (publishErr) {
      console.error("[Scheduled Quotes] Publish failed:", publishErr);
      return c.json({ success: false, error: publishErr.message, expired, deleted }, 500);
    }

    return c.json({
      success: true,
      message: "Published today's quote",
      published: 1,
      total: 1,
      expired,
      deleted,
    });
  } catch (error: any) {
    console.error("[Scheduled Quotes] Error:", error);
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
