import type { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

// Create Supabase client
function supabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ========================================
// WALLPAPER FOLDERS ENDPOINTS
// ========================================

/**
 * Get all wallpaper folders
 * GET /admin/wallpaper-folders
 */
export async function getWallpaperFolders(c: Context) {
  try {
    const supabase = supabaseClient();

    // Get folders with wallpaper count
    const { data: folders, error } = await supabase
      .from("wallpaper_folders")
      .select(`
        *,
        wallpapers:wallpapers(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Folders] Error:", error);

      // Check if it's a "table not found" error
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('wallpaper_folders')) {
        return c.json({
          success: false,
          error: error.message,
          code: error.code || 'PGRST205',
          setup_required: true,
          message: 'Database tables not set up. Please run the setup SQL script.'
        }, 404);
      }

      return c.json({
        success: false,
        error: error.message
      }, 500);
    }

    // Transform to include count
    const foldersWithCount = (folders || []).map(folder => ({
      ...folder,
      wallpaper_count: folder.wallpapers?.[0]?.count || 0,
    }));

    return c.json({
      success: true,
      data: foldersWithCount
    });
  } catch (error: any) {
    console.error("[Get Folders] Exception:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Create wallpaper folder
 * POST /admin/wallpaper-folders
 */
export async function createWallpaperFolder(c: Context) {
  try {
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({
        success: false,
        error: "Folder name is required"
      }, 400);
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("wallpaper_folders")
      .insert({
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Create Folder] Error:", error);

      // Check if it's a "table not found" error
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('wallpaper_folders')) {
        return c.json({
          success: false,
          error: error.message,
          code: error.code || 'PGRST205',
          setup_required: true,
          message: 'Database tables not set up. Please run the setup SQL script.'
        }, 404);
      }

      return c.json({
        success: false,
        error: error.message
      }, 500);
    }

    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("[Create Folder] Exception:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Update wallpaper folder
 * PUT /admin/wallpaper-folders/:id
 */
export async function updateWallpaperFolder(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, description } = body;

    if (!name) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("wallpaper_folders")
      .update({
        name,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Update Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("[Update Folder] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Delete wallpaper folder
 * DELETE /admin/wallpaper-folders/:id
 */
export async function deleteWallpaperFolder(c: Context) {
  try {
    const id = c.req.param("id");
    const supabase = supabaseClient();

    // First, move all wallpapers in this folder to "uncategorized" (null folder_id)
    await supabase
      .from("wallpapers")
      .update({ folder_id: null })
      .eq("folder_id", id);

    // Then delete the folder
    const { error } = await supabase
      .from("wallpaper_folders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Delete Folder] Error:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true
    });
  } catch (error: any) {
    console.error("[Delete Folder] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

// ========================================
// WALLPAPER ANALYTICS ENDPOINTS
// ========================================

/**
 * Get analytics for a specific wallpaper
 * GET /admin/wallpapers/:id/analytics
 */
export async function getWallpaperAnalytics(c: Context) {
  try {
    const wallpaperId = c.req.param("id");
    const supabase = supabaseClient();

    // Get date range from query params or default to last 30 days
    const startDateParam = c.req.query("start_date");
    const endDateParam = c.req.query("end_date");

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      console.log(`[Wallpaper Analytics] Using custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      console.log(`[Wallpaper Analytics] Using default date range (last 30 days)`);
    }

    // Get wallpaper basic info
    const { data: wallpaper, error: wallpaperError } = await supabase
      .from("wallpapers")
      .select("id, title, image_url, thumbnail_url, created_at, view_count, download_count, like_count")
      .eq("id", wallpaperId)
      .maybeSingle();

    if (wallpaperError) {
      console.error("[Wallpaper Analytics] Wallpaper error:", wallpaperError);
      return c.json({ error: wallpaperError.message }, 500);
    }

    if (!wallpaper) {
      return c.json({ error: "Wallpaper not found" }, 404);
    }

    // Get view/download/like events from analytics_tracking table with date range
    let events: any[] = [];

    // [FIX] Changed from unified_analytics to analytics_tracking to get real-time data
    const { data: unifiedEvents, error: unifiedError } = await supabase
      .from("analytics_tracking")
      .select("event_type, created_at, metadata")
      .eq("module_name", "wallpaper")
      .eq("item_id", wallpaperId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (!unifiedError && unifiedEvents) {
      console.log(`[Wallpaper Analytics] ✅ Found ${unifiedEvents.length} events from analytics_tracking`);
      events = unifiedEvents;
    } else {
      console.log(`[Wallpaper Analytics] ⚠️ Unified analytics query failed, trying legacy table:`, unifiedError);

      // Fallback to legacy wallpaper_analytics table
      const { data: legacyEvents, error: eventsError } = await supabase
        .from("wallpaper_analytics")
        .select("event_type, created_at, metadata")
        .eq("wallpaper_id", wallpaperId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (!eventsError && legacyEvents) {
        console.log(`[Wallpaper Analytics] ✅ Found ${legacyEvents.length} events from legacy table`);
        events = legacyEvents;
      } else {
        console.error("[Wallpaper Analytics] ⚠️ No events found in any table");
        events = [];
      }
    }

    // Calculate metrics within the selected date range
    const eventsList = events || [];

    // Count events by type within the date range
    const viewsInRange = eventsList.filter(e => e.event_type === 'view').length;
    const downloadsInRange = eventsList.filter(e => e.event_type === 'download').length;
    const likesInRange = eventsList.filter(e => e.event_type === 'like').length;
    const sharesInRange = eventsList.filter(e => e.event_type === 'share').length;

    // Also calculate daily stats for the "Today" column if date range includes today
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const viewsToday = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const viewsWeek = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const viewsMonth = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    const downloadsToday = eventsList.filter(e =>
      e.event_type === 'download' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const downloadsWeek = eventsList.filter(e =>
      e.event_type === 'download' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const downloadsMonth = eventsList.filter(e =>
      e.event_type === 'download' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    const likesMonth = eventsList.filter(e =>
      e.event_type === 'like' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    const sharesMonth = eventsList.filter(e =>
      e.event_type === 'share' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    // Calculate conversion and engagement rates
    const totalViews = wallpaper.view_count || 0;
    const totalDownloads = wallpaper.download_count || 0;
    const totalLikes = wallpaper.like_count || 0;
    const totalShares = sharesMonth; // Only count recent shares

    const conversionRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;
    const engagementRate = totalViews > 0 ? ((totalLikes + totalShares) / totalViews) * 100 : 0;

    // Daily stats for the selected date range (limit to 30 days for chart readability)
    const dailyStats = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysToShow = Math.min(daysDiff, 30); // Max 30 days for chart

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEvents = eventsList.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= date && eventDate < nextDate;
      });

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        views: dayEvents.filter(e => e.event_type === 'view').length,
        downloads: dayEvents.filter(e => e.event_type === 'download').length,
        likes: dayEvents.filter(e => e.event_type === 'like').length,
      });
    }

    // Peak hours analysis
    const hourlyActivity: Record<number, number> = {};
    eventsList.forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        activity_count: count,
      }))
      .sort((a, b) => b.activity_count - a.activity_count)
      .slice(0, 5);

    // Location data (if available in metadata)
    const locationCounts: Record<string, number> = {};
    eventsList.forEach(event => {
      if (event.metadata && event.metadata.location) {
        const location = event.metadata.location;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    const topLocations = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Last interaction
    const lastInteraction = eventsList.length > 0 ? eventsList[0].created_at : null;

    // Return complete analytics
    return c.json({
      success: true,
      data: {
        wallpaper_id: wallpaper.id,
        title: wallpaper.title,
        image_url: wallpaper.image_url,
        thumbnail_url: wallpaper.thumbnail_url,

        // Date range info
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: daysDiff,
        },

        // Core metrics (from wallpaper table - all time)
        total_views: totalViews,
        total_downloads: totalDownloads,
        total_likes: totalLikes,
        total_shares: totalShares,

        // Range-specific metrics
        range_views: viewsInRange,
        range_downloads: downloadsInRange,
        range_likes: likesInRange,
        range_shares: sharesInRange,

        // Time-based metrics (rolling windows)
        views_today: viewsToday,
        views_week: viewsWeek,
        views_month: viewsMonth,
        downloads_today: downloadsToday,
        downloads_week: downloadsWeek,
        downloads_month: downloadsMonth,

        // Engagement metrics (calculated from range data OR all-time if range is empty)
        conversion_rate: viewsInRange > 0
          ? parseFloat(((downloadsInRange / viewsInRange) * 100).toFixed(2))
          : (totalViews > 0 ? parseFloat(((totalDownloads / totalViews) * 100).toFixed(2)) : 0),
        engagement_rate: viewsInRange > 0
          ? parseFloat((((likesInRange + sharesInRange) / viewsInRange) * 100).toFixed(2))
          : (totalViews > 0 ? parseFloat((((totalLikes + totalShares) / totalViews) * 100).toFixed(2)) : 0),

        // Time series
        daily_stats: dailyStats,
        peak_hours: peakHours,
        top_locations: topLocations.length > 0 ? topLocations : undefined,

        // Timestamps
        created_at: wallpaper.created_at,
        last_interaction: lastInteraction,
      },
    });
  } catch (error: any) {
    console.error("[Wallpaper Analytics] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Track wallpaper analytics event
 * POST /admin/wallpapers/:id/track
 */
export async function trackWallpaperEvent(c: Context) {
  try {
    const wallpaperId = c.req.param("id");
    const body = await c.req.json();
    const { event_type, metadata } = body;

    if (!event_type) {
      return c.json({ error: "Event type is required" }, 400);
    }

    const supabase = supabaseClient();

    // Insert analytics event
    const { error: analyticsError } = await supabase
      .from("wallpaper_analytics")
      .insert({
        wallpaper_id: wallpaperId,
        event_type,
        metadata: metadata || {},
      });

    if (analyticsError) {
      console.error("[Track Event] Analytics error:", analyticsError);
      // Don't fail the request if analytics table doesn't exist
    }

    // Update counters on wallpaper record
    if (event_type === 'view') {
      await supabase.rpc('increment_wallpaper_views', { wallpaper_id: wallpaperId });
    } else if (event_type === 'download') {
      await supabase.rpc('increment_wallpaper_downloads', { wallpaper_id: wallpaperId });
    } else if (event_type === 'like') {
      await supabase.rpc('increment_wallpaper_likes', { wallpaper_id: wallpaperId });
    }

    return c.json({
      success: true
    });
  } catch (error: any) {
    console.error("[Track Event] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

/**
 * Get aggregate analytics across all wallpapers for a date range
 * GET /api/analytics/aggregate?start_date=<ISO>&end_date=<ISO>
 */
export async function getAggregateAnalytics(c: Context) {
  try {
    const supabase = supabaseClient();

    // Get date range from query params or default to last 30 days
    const startDateParam = c.req.query("start_date");
    const endDateParam = c.req.query("end_date");
    const contentType = c.req.query("content_type") || "wallpaper"; // Default to wallpaper for backward compatibility

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      console.log(`[Aggregate Analytics] Using custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      console.log(`[Aggregate Analytics] Using default date range (last 30 days)`);
    }

    console.log(`[Aggregate Analytics] Content type: ${contentType}`);

    // Get all analytics events from analytics_tracking table within date range (renamed from unified_analytics)
    const { data: unifiedEvents, error: unifiedError } = await supabase
      .from("analytics_tracking")
      .select("event_type, created_at")
      .eq("module_name", contentType)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    let events: any[] = [];

    if (!unifiedError && unifiedEvents) {
      console.log(`[Aggregate Analytics] ✅ Found ${unifiedEvents.length} events from analytics_tracking for ${contentType}`);
      events = unifiedEvents;
    } else {
      console.log(`[Aggregate Analytics] ⚠️ Unified analytics query failed, trying legacy table:`, unifiedError);

      // Fallback to legacy table only for wallpaper
      if (contentType === "wallpaper") {
        const { data: legacyEvents, error: legacyError } = await supabase
          .from("wallpaper_analytics")
          .select("event_type, created_at")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        if (!legacyError && legacyEvents) {
          console.log(`[Aggregate Analytics] ✅ Found ${legacyEvents.length} events from legacy table`);
          events = legacyEvents;
        } else {
          console.error("[Aggregate Analytics] ⚠️ No events found in any table");
          events = [];
        }
      } else {
        console.log(`[Aggregate Analytics] ⚠️ No legacy table for ${contentType}, using empty events`);
        events = [];
      }
    }

    // Count events by type based on content type
    const totalViews = events.filter(e => e.event_type === 'view').length;
    const totalClicks = events.filter(e => e.event_type === 'click').length;
    const totalDownloads = events.filter(e => e.event_type === 'download').length;
    const totalLikes = events.filter(e => e.event_type === 'like').length;
    const totalShares = events.filter(e => e.event_type === 'share').length;
    const totalPlays = events.filter(e => e.event_type === 'play').length;
    const totalPlaylistAdds = events.filter(e => e.event_type === 'add_to_playlist').length;
    const totalYoutubeOpens = events.filter(e => e.event_type === 'open_in_youtube').length;

    console.log(`[Aggregate Analytics] Results for ${contentType} - Views: ${totalViews}, Plays: ${totalPlays}, Downloads: ${totalDownloads}, Likes: ${totalLikes}`);

    // Return different metrics based on content type
    const data: any = {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
    };

    // Add content-specific metrics
    if (contentType === "banner") {
      data.total_views = totalViews;
      data.total_clicks = totalClicks;
    } else if (contentType === "wallpaper") {
      data.total_views = totalViews;
      data.total_downloads = totalDownloads;
      data.total_likes = totalLikes;
      data.total_shares = totalShares;
    } else if (contentType === "media") {
      data.total_plays = totalPlays;
      data.total_likes = totalLikes;
      data.total_downloads = totalDownloads;
      data.total_shares = totalShares;
      data.total_add_to_playlist = totalPlaylistAdds;
      data.total_youtube_opens = totalYoutubeOpens;
    } else {
      data.total_views = totalViews;
    }

    return c.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[Aggregate Analytics] Exception:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

// ========================================
// BANNER ANALYTICS ENDPOINTS
// ========================================

/**
 * Get analytics for a specific banner
 * GET /api/analytics/banner/:id
 */
export async function getBannerAnalytics(c: Context) {
  try {
    const bannerId = c.req.param("id");
    const supabase = supabaseClient();

    // Get date range from query params or default to last 30 days
    const startDateParam = c.req.query("start_date");
    const endDateParam = c.req.query("end_date");

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      console.log(`[Banner Analytics] Using custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      console.log(`[Banner Analytics] Using default date range (last 30 days)`);
    }

    // Get banner basic info
    const { data: banner, error: bannerError } = await supabase
      .from("banners")
      .select("id, title, image_url, thumbnail_url, created_at, view_count, click_count")
      .eq("id", bannerId)
      .maybeSingle();

    if (bannerError) {
      console.error("[Banner Analytics] Banner error:", bannerError);
      return c.json({ success: false, error: bannerError.message }, 500);
    }

    if (!banner) {
      return c.json({ success: false, error: "Banner not found" }, 404);
    }

    // Get view/click events from analytics_tracking table with date range
    let events: any[] = [];

    const { data: unifiedEvents, error: unifiedError } = await supabase
      .from("analytics_tracking")
      .select("event_type, created_at, metadata")
      .eq("module_name", "banner")
      .eq("item_id", bannerId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (!unifiedError && unifiedEvents) {
      console.log(`[Banner Analytics] ✅ Found ${unifiedEvents.length} events from analytics_tracking`);
      events = unifiedEvents;
    } else {
      console.log(`[Banner Analytics] ⚠️ Unified analytics query failed:`, unifiedError);
      events = [];
    }

    // Calculate metrics within the selected date range
    const eventsList = events || [];

    // Count events by type within the date range
    const viewsInRange = eventsList.filter(e => e.event_type === 'view').length;
    const clicksInRange = eventsList.filter(e => e.event_type === 'click').length;

    // Also calculate daily stats for the "Today" column if date range includes today
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const viewsToday = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const viewsWeek = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const viewsMonth = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    const clicksToday = eventsList.filter(e =>
      e.event_type === 'click' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const clicksWeek = eventsList.filter(e =>
      e.event_type === 'click' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const clicksMonth = eventsList.filter(e =>
      e.event_type === 'click' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    // Calculate CTR and engagement rates
    const totalViews = banner.view_count || 0;
    const totalClicks = banner.click_count || 0;

    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const engagementRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    // Daily stats for the selected date range (limit to 30 days for chart readability)
    const dailyStats = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysToShow = Math.min(daysDiff, 30); // Max 30 days for chart

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEvents = eventsList.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= date && eventDate < nextDate;
      });

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        views: dayEvents.filter(e => e.event_type === 'view').length,
        clicks: dayEvents.filter(e => e.event_type === 'click').length,
      });
    }

    // Peak hours analysis
    const hourlyActivity: Record<number, number> = {};
    eventsList.forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        activity_count: count,
      }))
      .sort((a, b) => b.activity_count - a.activity_count)
      .slice(0, 5);

    // Location data (if available in metadata)
    const locationCounts: Record<string, number> = {};
    eventsList.forEach(event => {
      if (event.metadata && event.metadata.location) {
        const location = event.metadata.location;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    const topLocations = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Last interaction
    const lastInteraction = eventsList.length > 0 ? eventsList[0].created_at : null;

    // Return complete analytics
    return c.json({
      success: true,
      data: {
        banner_id: banner.id,
        title: banner.title,
        image_url: banner.image_url,
        thumbnail_url: banner.thumbnail_url,

        // Date range info
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: daysDiff,
        },

        // Core metrics (from banner table - all time)
        total_views: totalViews,
        total_clicks: totalClicks,

        // Range-specific metrics
        range_views: viewsInRange,
        range_clicks: clicksInRange,

        // Time-based metrics (rolling windows)
        views_today: viewsToday,
        views_week: viewsWeek,
        views_month: viewsMonth,
        clicks_today: clicksToday,
        clicks_week: clicksWeek,
        clicks_month: clicksMonth,

        // Engagement metrics (calculated from range data)
        ctr: viewsInRange > 0 ? parseFloat(((clicksInRange / viewsInRange) * 100).toFixed(2)) : 0,
        engagement_rate: viewsInRange > 0 ? parseFloat(((clicksInRange / viewsInRange) * 100).toFixed(2)) : 0,

        // Time series
        daily_stats: dailyStats,
        peak_hours: peakHours,
        top_locations: topLocations.length > 0 ? topLocations : undefined,

        // Timestamps
        created_at: banner.created_at,
        last_interaction: lastInteraction,
      },
    });
  } catch (error: any) {
    console.error("[Banner Analytics] Exception:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

// ========================================
// SPARKLE ANALYTICS ENDPOINTS
// ========================================

/**
 * Get analytics for a specific sparkle item
 * GET /api/analytics/sparkle/:id
 */
export async function getSparkleAnalytics(c: Context) {
  try {
    const sparkleId = c.req.param("id");
    const supabase = supabaseClient();

    // Get date range from query params or default to last 30 days
    const startDateParam = c.req.query("start_date");
    const endDateParam = c.req.query("end_date");

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      console.log(`[Sparkle Analytics] Using custom date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      console.log(`[Sparkle Analytics] Using default date range (last 30 days)`);
    }

    // Get sparkle basic info
    const { data: sparkle, error: sparkleError } = await supabase
      .from("sparkles") // [FIX] Updated from "sparkle" to "sparkles"
      .select("id, title, storage_path, created_at, view_count, read_count, download_count, like_count, share_count")
      .eq("id", sparkleId)
      .maybeSingle();

    if (sparkleError) {
      console.error("[Sparkle Analytics] Sparkle error:", sparkleError);
      return c.json({ error: sparkleError.message }, 500);
    }

    if (!sparkle) {
      console.warn(`[Sparkle Analytics] Sparkle content not found for ID: ${sparkleId}`);
      return c.json({ error: "Sparkle content not found" }, 404);
    }

    // Get events from analytics_tracking table with date range and module_name filter
    let events: any[] = [];

    const { data: trackingEvents, error: trackingError } = await supabase
      .from("analytics_tracking")
      .select("event_type, created_at, metadata")
      .in("module_name", ["sparkle", "spark"]) // Filter by module_name
      .eq("item_id", sparkleId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (!trackingError && trackingEvents) {
      console.log(`[Sparkle Analytics] ✅ Found ${trackingEvents.length} events from analytics_tracking`);
      events = trackingEvents;
    } else {
      console.log(`[Sparkle Analytics] ⚠️ Analytics tracking query failed:`, trackingError);
      events = [];
    }

    // Calculate metrics within the selected date range
    const eventsList = events || [];

    // Count events by type within the date range
    const viewsInRange = eventsList.filter(e => e.event_type === 'view').length;
    const downloadsInRange = eventsList.filter(e => e.event_type === 'download').length;
    const readsInRange = eventsList.filter(e => e.event_type === 'read').length;
    const likesInRange = eventsList.filter(e => e.event_type === 'like').length;
    const sharesInRange = eventsList.filter(e => e.event_type === 'share').length;

    // Also calculate daily stats for the "Today" column if date range includes today
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const viewsToday = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const viewsWeek = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const viewsMonth = eventsList.filter(e =>
      e.event_type === 'view' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    const readsToday = eventsList.filter(e =>
      e.event_type === 'read' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const readsWeek = eventsList.filter(e =>
      e.event_type === 'read' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const readsMonth = eventsList.filter(e =>
      e.event_type === 'read' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    const downloadsToday = eventsList.filter(e =>
      e.event_type === 'download' && new Date(e.created_at) >= oneDayAgo
    ).length;

    const downloadsWeek = eventsList.filter(e =>
      e.event_type === 'download' && new Date(e.created_at) >= oneWeekAgo
    ).length;

    const downloadsMonth = eventsList.filter(e =>
      e.event_type === 'download' && new Date(e.created_at) >= oneMonthAgo
    ).length;

    // Calculate lifetime totals from analytics_tracking (real-time)
    const { count: lifetimeViews } = await supabase
      .from("analytics_tracking")
      .select("id", { count: "exact", head: true })
      .eq("item_id", sparkleId)
      .in("module_name", ["sparkle", "spark"])
      .eq("event_type", "view");

    const { count: lifetimeReads } = await supabase
      .from("analytics_tracking")
      .select("id", { count: "exact", head: true })
      .eq("item_id", sparkleId)
      .in("module_name", ["sparkle", "spark"])
      .eq("event_type", "read");

    const { count: lifetimeDownloads } = await supabase
      .from("analytics_tracking")
      .select("id", { count: "exact", head: true })
      .eq("item_id", sparkleId)
      .in("module_name", ["sparkle", "spark"])
      .eq("event_type", "download");

    const { count: lifetimeLikes } = await supabase
      .from("analytics_tracking")
      .select("id", { count: "exact", head: true })
      .eq("item_id", sparkleId)
      .in("module_name", ["sparkle", "spark"])
      .eq("event_type", "like");

    const { count: lifetimeShares } = await supabase
      .from("analytics_tracking")
      .select("id", { count: "exact", head: true })
      .eq("item_id", sparkleId)
      .in("module_name", ["sparkle", "spark"])
      .eq("event_type", "share");

    // Calculate engagement rates using real-time totals
    const totalViews = lifetimeViews || 0;
    const totalReads = lifetimeReads || 0;
    const totalDownloads = lifetimeDownloads || 0;
    const totalLikes = lifetimeLikes || 0;
    const totalShares = lifetimeShares || 0;

    const readRate = totalViews > 0 ? (totalReads / totalViews) * 100 : 0;
    const downloadRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;
    const engagementRate = totalViews > 0 ? ((totalLikes + totalShares + totalDownloads) / totalViews) * 100 : 0;

    // Daily stats for the selected date range
    const dailyStats = [];
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysToShow = Math.min(daysDiff, 30); // Max 30 days for chart

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEvents = eventsList.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= date && eventDate < nextDate;
      });

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        views: dayEvents.filter(e => e.event_type === 'view').length,
        reads: dayEvents.filter(e => e.event_type === 'read').length,
        downloads: dayEvents.filter(e => e.event_type === 'download').length,
        likes: dayEvents.filter(e => e.event_type === 'like').length,
      });
    }

    // Peak hours analysis
    const hourlyActivity: Record<number, number> = {};
    eventsList.forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        activity_count: count,
      }))
      .sort((a, b) => b.activity_count - a.activity_count)
      .slice(0, 5);

    // Location data
    const locationCounts: Record<string, number> = {};
    eventsList.forEach(event => {
      if (event.metadata && event.metadata.location) {
        const location = event.metadata.location;
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    const topLocations = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Last interaction
    const lastInteraction = eventsList.length > 0 ? eventsList[0].created_at : null;

    // Return complete analytics
    return c.json({
      success: true,
      data: {
        sparkle_id: sparkle.id,
        title: sparkle.title,
        image_url: sparkle.storage_path, // Sparkle usually has storage_path or cover_image_url
        thumbnail_url: sparkle.thumbnail_url,

        // Date range info
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: daysDiff,
        },

        // Core metrics
        total_views: totalViews,
        total_reads: totalReads,
        total_downloads: totalDownloads,
        total_likes: totalLikes,
        total_shares: totalShares,

        // Range-specific metrics
        range_views: viewsInRange,
        range_reads: readsInRange,
        range_downloads: downloadsInRange,
        range_likes: likesInRange,
        range_shares: sharesInRange,

        // Time-based metrics
        views_today: viewsToday,
        views_week: viewsWeek,
        views_month: viewsMonth,
        reads_today: readsToday,
        reads_week: readsWeek,
        reads_month: readsMonth,
        downloads_today: downloadsToday,
        downloads_week: downloadsWeek,
        downloads_month: downloadsMonth,

        // Engagement
        read_rate: parseFloat(readRate.toFixed(2)),
        download_rate: parseFloat(downloadRate.toFixed(2)),
        engagement_rate: parseFloat(engagementRate.toFixed(2)),

        // Time series
        daily_stats: dailyStats,
        peak_hours: peakHours,
        top_locations: topLocations.length > 0 ? topLocations : undefined,

        // Timestamps
        created_at: sparkle.created_at,
        last_interaction: lastInteraction,
      },
    });
  } catch (error: any) {
    console.error("[Sparkle Analytics] Exception:", error);
    return c.json({ error: error.message }, 500);
  }
}

