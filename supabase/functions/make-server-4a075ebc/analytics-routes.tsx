/**
 * UNIFIED ANALYTICS API ROUTES
 * IP-Based Unique Tracking for All Modules
 * Future-Proof & Plug-and-Play Architecture
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

/**
 * Get client IP address from request
 */
function getClientIP(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0] ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

/**
 * Get Location Info from Headers (Supabase/Deno Deploy specific)
 */
function getLocationInfo(c: Context) {
  return {
    country: c.req.header("cf-ipcountry") || null,
    city: c.req.header("cf-ipcity") || null,
    region: c.req.header("cf-region-code") || null,
    country_name: c.req.header("cf-ipcountry-name") || null, // Some providers
  };
}

/**
 * Get device type from user agent
 */
function getDeviceType(userAgent: string | undefined): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return "mobile";
  }
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "tablet";
  }
  return "desktop";
}

// ====================================================================
// PUBLIC TRACKING ENDPOINTS (User Panel)
// ====================================================================

/**
 * Universal Track Event Endpoint
 * POST /api/analytics/track
 * Body: { module_name, item_id, event_type, metadata?, user_id? }
 */
export async function trackEvent(c: Context) {
  try {
    const body = await c.req.json();
    const { module_name, item_id, event_type, metadata = {}, user_id } = body;

    if (!module_name || !item_id || !event_type) {
      return c.json(
        {
          success: false,
          error: "Missing required fields: module_name, item_id, event_type"
        },
        400
      );
    }

    const supabase = supabaseClient();
    const ipAddress = getClientIP(c);
    const userAgent = c.req.header("user-agent");
    const deviceType = getDeviceType(userAgent);

    console.log(`[Analytics] Tracking ${event_type} for ${module_name}:${item_id} from IP ${ipAddress}, User: ${user_id || 'anon'}`);

    // Call database function for tracking (Using V2 to fix type issues)
    const { data, error } = await supabase.rpc("track_analytics_event_v2", {
      p_module_name: module_name,
      p_item_id: item_id,
      p_event_type: event_type,
      p_ip_address: ipAddress,
      p_user_agent: userAgent || null,
      p_device_type: deviceType,
      p_metadata: metadata,
      p_user_id: user_id || null // Pass user_id explicitly (as TEXT now)
    });

    if (error) {
      console.error("[Analytics] Tracking error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`[Analytics] Track result:`, data);

    // SYNC WITH MODULE-SPECIFIC COUNTERS
    // [FIX] Commented out because DB trigger handles this, preventing double counting
    /*
    // If this is a wallpaper event and was actually tracked (not duplicate), increment wallpaper counters
    if (module_name === 'wallpaper' && data.tracked) {
      // ... (rest of commented out code)
    }
    */

    // SYNC WITH BANNER COUNTERS
    // If this is a banner event and was actually tracked (not duplicate), increment banner counters
    if (module_name === 'banner' && data.tracked) {
      try {
        if (event_type === 'view') {
          await supabase.rpc('increment_banner_views', { banner_id: item_id });
          console.log(`[Analytics] ✅ Incremented banner view counter for ${item_id}`);
        } else if (event_type === 'click') {
          await supabase.rpc('increment_banner_clicks', { banner_id: item_id });
          console.log(`[Analytics] ✅ Incremented banner click counter for ${item_id}`);
        }
      } catch (counterError: any) {
        console.error(`[Analytics] ⚠️ Banner counter increment error (non-fatal):`, counterError);
        // Don't fail the request if counter increment fails
      }
    }

    // SYNC WITH SPARKLE COUNTERS
    // If this is a sparkle event and was actually tracked (not duplicate), increment sparkle counters
    if (module_name === 'sparkle' && data.tracked) {
      try {
        if (event_type === 'view') {
          await supabase.rpc('increment_sparkle_views', { sparkle_id: item_id });
          console.log(`[Analytics] ✅ Incremented sparkle view counter for ${item_id}`);
        } else if (event_type === 'like') {
          await supabase.rpc('increment_sparkle_likes', { sparkle_id: item_id });
          console.log(`[Analytics] ✅ Incremented sparkle like counter for ${item_id}`);
        } else if (event_type === 'share') {
          await supabase.rpc('increment_sparkle_shares', { sparkle_id: item_id });
          console.log(`[Analytics] ✅ Incremented sparkle share counter for ${item_id}`);
        } else if (event_type === 'read') {
          await supabase.rpc('increment_sparkle_reads', { sparkle_id: item_id });
          console.log(`[Analytics] ✅ Incremented sparkle read counter for ${item_id}`);
        } else if (event_type === 'download') {
          await supabase.rpc('increment_sparkle_downloads', { sparkle_id: item_id });
          console.log(`[Analytics] ✅ Incremented sparkle download counter for ${item_id}`);
        }
      } catch (counterError: any) {
        console.error(`[Analytics] ⚠️ Sparkle counter increment error (non-fatal):`, counterError);
        // Don't fail the request if counter increment fails
      }
    }

    // SYNC WITH MEDIA COUNTERS
    // [FIX] Commented out because DB trigger handles this
    /*
    // ...
    */

    return c.json({
      success: true,
      result: data,
      tracked: data.tracked,
      already_tracked: data.already_tracked,
      unique_count: data.unique_count,
    });
  } catch (error: any) {
    console.error("[Analytics] Track error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Track App Install Endpoint
 * ... (unchanged)
 */
// ... (skip trackInstall)

/**
 * Untrack Event Endpoint (for unlike/unfavorite)
 * POST /api/analytics/untrack
 * Body: { module_name, item_id, event_type, user_id? }
 */
export async function untrackEvent(c: Context) {
  try {
    const body = await c.req.json();
    const { module_name, item_id, event_type, user_id } = body;

    if (!module_name || !item_id || !event_type) {
      return c.json(
        {
          success: false,
          error: "Missing required fields: module_name, item_id, event_type"
        },
        400
      );
    }

    const supabase = supabaseClient();
    const ipAddress = getClientIP(c);

    console.log(`[Analytics] Untracking ${event_type} for ${module_name}:${item_id} from IP ${ipAddress}, User: ${user_id || 'anon'}`);

    // Call database function for untracking
    // Note: un-track RPC needs to be updated to accept user_id too if strict checking is needed
    // For now, passing it might be ignored if RPC not updated, but good to have for future
    const { data, error } = await supabase.rpc("untrack_analytics_event", {
      p_module_name: module_name,
      p_item_id: item_id,
      p_event_type: event_type,
      p_ip_address: ipAddress,
      // p_user_id: user_id || null // Uncomment when RPC is updated
    });


    if (error) {
      console.error("[Analytics] Untrack error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // SYNC WITH MODULE-SPECIFIC COUNTERS
    // [FIX] Commented out because DB trigger handles this
    /*
    // If this is a wallpaper event and was actually removed, decrement wallpaper counters
    if (module_name === 'wallpaper' && data.removed) {
      try {
        if (event_type === 'like') {
          await supabase.rpc('decrement_wallpaper_likes', { wallpaper_id: item_id });
          console.log(`[Analytics] ✅ Decremented wallpaper like counter for ${item_id}`);
        }
      } catch (counterError: any) {
        console.error(`[Analytics] ⚠️ Counter decrement error (non-fatal):`, counterError);
        // Don't fail the request if counter decrement fails
      }
    }

    // SYNC WITH MEDIA COUNTERS
    // Support 'media', 'song', 'video'
    if (['media', 'song', 'video'].includes(module_name) && data.removed) {
      try {
        if (event_type === 'like') {
          await supabase.rpc('decrement_media_likes', { p_media_id: item_id });
          console.log(`[Analytics] ✅ Decremented media like counter for ${item_id}`);
        }
      } catch (counterError: any) {
        console.error(`[Analytics] ⚠️ Media counter decrement error (non-fatal):`, counterError);
      }
    }
    */

    return c.json({
      success: true,
      result: data,
      removed: data.removed,
      unique_count: data.unique_count,
    });
  } catch (error: any) {
    console.error("[Analytics] Untrack error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Stats for Item
 * GET /api/analytics/stats/:module/:itemId
 */
export async function getItemStats(c: Context) {
  try {
    const module_name = c.req.param("module");
    const item_id = c.req.param("itemId");

    if (!module_name || !item_id) {
      return c.json(
        { success: false, error: "Missing module or itemId parameter" },
        400
      );
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase.rpc("get_analytics_stats", {
      p_module_name: module_name,
      p_item_id: item_id,
    });

    if (error) {
      console.error("[Analytics] Get stats error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      module: module_name,
      item_id: item_id,
      stats: data || {},
    });
  } catch (error: any) {
    console.error("[Analytics] Get stats error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Check if IP has tracked event
 * GET /api/analytics/check/:module/:itemId/:eventType
 */
export async function checkEventTracked(c: Context) {
  try {
    const module_name = c.req.param("module");
    const item_id = c.req.param("itemId");
    const event_type = c.req.param("eventType");

    if (!module_name || !item_id || !event_type) {
      return c.json(
        { success: false, error: "Missing required parameters" },
        400
      );
    }

    const supabase = supabaseClient();
    const ipAddress = getClientIP(c);

    const { data, error } = await supabase.rpc("check_analytics_tracked", {
      p_module_name: module_name,
      p_item_id: item_id,
      p_event_type: event_type,
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error("[Analytics] Check tracked error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      tracked: data || false,
    });
  } catch (error: any) {
    console.error("[Analytics] Check tracked error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

// ====================================================================
// ADMIN ANALYTICS ENDPOINTS
// ====================================================================

/**
 * Get Analytics Dashboard Overview
 * GET /api/analytics/admin/dashboard
 */
export async function getAnalyticsDashboard(c: Context) {
  try {
    const supabase = supabaseClient();

    const { data, error } = await supabase.rpc("get_analytics_dashboard");

    if (error) {
      console.error("[Analytics] Dashboard error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      dashboard: data || {},
    });
  } catch (error: any) {
    console.error("[Analytics] Dashboard error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Top Items by Event
 * GET /api/analytics/admin/top/:module/:eventType?limit=10
 */
export async function getTopItems(c: Context) {
  try {
    const module_name = c.req.param("module");
    const event_type = c.req.param("eventType");
    const limit = parseInt(c.req.query("limit") || "10");

    if (!module_name || !event_type) {
      return c.json(
        { success: false, error: "Missing module or eventType parameter" },
        400
      );
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase.rpc("get_top_items_by_event", {
      p_module_name: module_name,
      p_event_type: event_type,
      p_limit: limit,
    });

    if (error) {
      console.error("[Analytics] Top items error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      module: module_name,
      event_type: event_type,
      items: data || [],
    });
  } catch (error: any) {
    console.error("[Analytics] Top items error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Analytics Configuration
 * GET /api/analytics/admin/config
 */
export async function getAnalyticsConfig(c: Context) {
  try {
    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("analytics_config")
      .select("*")
      .order("module_name", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Analytics] Config error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Group by module
    const grouped = (data || []).reduce((acc: any, config: any) => {
      if (!acc[config.module_name]) {
        acc[config.module_name] = [];
      }
      acc[config.module_name].push(config);
      return acc;
    }, {});

    return c.json({
      success: true,
      config: grouped,
      all: data || [],
    });
  } catch (error: any) {
    console.error("[Analytics] Config error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Update Analytics Configuration
 * PUT /api/analytics/admin/config
 * Body: { module_name, event_type, updates: { is_enabled?, track_anonymous? } }
 */
export async function updateAnalyticsConfig(c: Context) {
  try {
    const body = await c.req.json();
    const { module_name, event_type, updates } = body;

    if (!module_name || !event_type || !updates) {
      return c.json(
        { success: false, error: "Missing required fields" },
        400
      );
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("analytics_config")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("module_name", module_name)
      .eq("event_type", event_type)
      .select()
      .single();

    if (error) {
      console.error("[Analytics] Config update error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`[Analytics] Config updated for ${module_name}:${event_type}`, updates);

    return c.json({
      success: true,
      config: data,
    });
  } catch (error: any) {
    console.error("[Analytics] Config update error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Add New Analytics Event Type
 * POST /api/analytics/admin/config
 * Body: { module_name, event_type, display_name, description?, icon?, sort_order? }
 */
export async function addAnalyticsConfig(c: Context) {
  try {
    const body = await c.req.json();
    const {
      module_name,
      event_type,
      display_name,
      description,
      icon,
      sort_order = 999
    } = body;

    if (!module_name || !event_type || !display_name) {
      return c.json(
        { success: false, error: "Missing required fields: module_name, event_type, display_name" },
        400
      );
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("analytics_config")
      .insert({
        module_name,
        event_type,
        display_name,
        description,
        icon,
        sort_order,
        is_enabled: true,
        track_anonymous: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[Analytics] Config add error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`[Analytics] New event type added: ${module_name}:${event_type}`);

    return c.json({
      success: true,
      config: data,
    });
  } catch (error: any) {
    console.error("[Analytics] Config add error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Reset Stats for Item
 * POST /api/analytics/admin/reset
 * Body: { module_name, item_id, event_type? }
 */
export async function resetStats(c: Context) {
  try {
    const body = await c.req.json();
    const { module_name, item_id, event_type = null } = body;

    if (!module_name || !item_id) {
      return c.json(
        { success: false, error: "Missing required fields: module_name, item_id" },
        400
      );
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase.rpc("reset_analytics_stats", {
      p_module_name: module_name,
      p_item_id: item_id,
      p_event_type: event_type,
    });

    if (error) {
      console.error("[Analytics] Reset stats error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`[Analytics] Stats reset for ${module_name}:${item_id}`, data);

    return c.json({
      success: true,
      result: data,
    });
  } catch (error: any) {
    console.error("[Analytics] Reset stats error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Detailed Analytics for Module
 * GET /api/analytics/admin/details/:module
 */
export async function getModuleAnalytics(c: Context) {
  try {
    const module_name = c.req.param("module");

    if (!module_name) {
      return c.json(
        { success: false, error: "Missing module parameter" },
        400
      );
    }

    const supabase = supabaseClient();

    // Get all events for this module
    const { data: events, error: eventsError } = await supabase
      .from("unified_analytics")
      .select("item_id, event_type, ip_address, created_at")
      .eq("module_name", module_name);

    if (eventsError) {
      console.error("[Analytics] Module analytics error:", eventsError);
      return c.json({ success: false, error: eventsError.message }, 500);
    }

    // Aggregate by item and event type
    const aggregated = (events || []).reduce((acc: any, event: any) => {
      const key = `${event.item_id}:${event.event_type}`;
      if (!acc[key]) {
        acc[key] = {
          item_id: event.item_id,
          event_type: event.event_type,
          unique_ips: new Set(),
          first_event: event.created_at,
          last_event: event.created_at,
        };
      }
      acc[key].unique_ips.add(event.ip_address);
      if (event.created_at < acc[key].first_event) {
        acc[key].first_event = event.created_at;
      }
      if (event.created_at > acc[key].last_event) {
        acc[key].last_event = event.created_at;
      }
      return acc;
    }, {});

    // Convert to array and format
    const results = Object.values(aggregated).map((item: any) => ({
      item_id: item.item_id,
      event_type: item.event_type,
      unique_count: item.unique_ips.size,
      first_event: item.first_event,
      last_event: item.last_event,
    }));

    return c.json({
      success: true,
      module: module_name,
      total_events: events?.length || 0,
      unique_items: new Set(events?.map((e: any) => e.item_id)).size,
      unique_ips: new Set(events?.map((e: any) => e.ip_address)).size,
      details: results,
    });
  } catch (error: any) {
    console.error("[Analytics] Module analytics error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Refresh Analytics Stats Cache
 * POST /api/analytics/admin/refresh
 */
export async function refreshAnalyticsCache(c: Context) {
  try {
    const supabase = supabaseClient();

    const { error } = await supabase.rpc("refresh_analytics_stats");

    if (error) {
      console.error("[Analytics] Refresh cache error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log("[Analytics] Materialized view refreshed successfully");

    return c.json({
      success: true,
      message: "Analytics cache refreshed",
    });
  } catch (error: any) {
    console.error("[Analytics] Refresh cache error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Update Heartbeat Endpoint
 * POST /api/analytics/heartbeat
 * Body: { device_id }
 */
export async function updateHeartbeat(c: Context) {
  try {
    const body = await c.req.json();
    const { device_id } = body;

    if (!device_id) {
      return c.json({ success: false, error: "Missing device_id" }, 400);
    }

    const supabase = supabaseClient();

    // Only update if device exists
    const { error } = await supabase
      .from("app_installs")
      .update({
        last_active_at: new Date().toISOString()
      })
      .eq("device_id", device_id);

    if (error) {
      console.warn(`[Analytics] Heartbeat failed for ${device_id}:`, error.message);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Analytics] Heartbeat error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Detailed Install Analytics
 * GET /api/analytics/admin/installs
 */
export async function getInstallAnalytics(c: Context) {
  try {
    const supabase = supabaseClient();
    const period = c.req.query("period") || 'day';
    const limit = parseInt(c.req.query("limit") || '30');

    // 1. Get time-series installs
    const { data: stats, error: statsError } = await supabase.rpc("get_install_stats_by_period", {
      p_period: period,
      p_limit: limit
    });

    if (statsError) throw statsError;

    // 2. Get platform breakdown
    const { data: platforms, error: platError } = await supabase
      .from("app_installs")
      .select("platform");

    if (platError) throw platError;

    const platformBreakdown = (platforms || []).reduce((acc: any, curr: any) => {
      acc[curr.platform] = (acc[curr.platform] || 0) + 1;
      return acc;
    }, {});

    // 3. Get total installs vs last month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const { count: thisMonthCount } = await supabase
      .from("app_installs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    const { count: lastMonthCount } = await supabase
      .from("app_installs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfLastMonth.toISOString())
      .lt("created_at", startOfMonth.toISOString());

    const { count: totalCount } = await supabase
      .from("app_installs")
      .select("*", { count: "exact", head: true });

    // 4. Get latest 10 installs for the table
    const { data: latestInstalls } = await supabase
      .from("app_installs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // 5. Get Retention/Churn Stats
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { count: activeCount } = await supabase
      .from("app_installs")
      .select("*", { count: "exact", head: true })
      .gte("last_active_at", sevenDaysAgo.toISOString());

    const { count: churnedCount } = await supabase
      .from("app_installs")
      .select("*", { count: "exact", head: true })
      .lt("last_active_at", thirtyDaysAgo.toISOString());

    // 6. Get Location Breakdown (Top 5 Countries)
    const { data: locationData } = await supabase
      .from("app_installs")
      .select("country_code, country")
      .not("country_code", "is", null);

    const locationDist = (locationData || []).reduce((acc: any, curr: any) => {
      const code = curr.country_code || 'UNK';
      // Use full name if available, else code
      const name = curr.country || code;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return c.json({
      success: true,
      timeSeries: stats || [],
      platformBreakdown,
      all: latestInstalls || [],
      retention: {
        active: activeCount || 0,
        churned: churnedCount || 0,
        total: totalCount || 0,
        // "Stale" is implied reminader
        stale: (totalCount || 0) - (activeCount || 0) - (churnedCount || 0)
      },
      locations: locationDist,
      kpis: {
        total: totalCount || 0,
        thisMonth: thisMonthCount || 0,
        lastMonth: lastMonthCount || 0,
        growth: lastMonthCount ? ((thisMonthCount! - lastMonthCount!) / lastMonthCount!) * 100 : 100
      }
    });
  } catch (error: any) {
    console.error("[Analytics] Get install analytics error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Detailed Media Analytics (Single Item)
 * GET /api/analytics/media/:id
 */
export async function getMediaAnalytics(c: Context) {
  try {
    const supabase = supabaseClient();
    const mediaId = c.req.param("id");
    const startDateStr = c.req.query("start_date");
    const endDateStr = c.req.query("end_date");

    if (!mediaId || mediaId === "undefined" || mediaId === "null") {
      return c.json({ error: "Invalid media ID" }, 400);
    }

    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log(`[Media Analytics] Fetching for ${mediaId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // 1. Get Media Details
    // Try wallpapers first
    let { data: media, error: mediaError } = await supabase
      .from("wallpapers")
      .select("id, title, created_at, view_count, download_count, like_count, share_count")
      .eq("id", mediaId)
      .maybeSingle();

    let contentType = "wallpaper";

    // If not found, try media table
    if (!media) {
      const { data: mediaItem, error: itemError } = await supabase
        .from("media")
        .select("*")
        .eq("id", mediaId)
        .maybeSingle();

      if (itemError && !itemError.message.includes("JSON")) {
        console.error("Error fetching media item:", itemError);
      }

      if (mediaItem) {
        media = mediaItem;
        contentType = "media";
      }
    }

    if (!media) {
      return c.json({ error: "Media not found" }, 404);
    }

    // 2. Get Events from Unified Analytics
    // We need to fetch events for this object_id
    const { data: events, error: eventsError } = await supabase
      .from("unified_analytics")
      .select("event_type, created_at")
      .eq("item_id", mediaId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (eventsError) {
      console.error("Error fetching analytics events:", eventsError);
      throw eventsError;
    }

    // 3. Process Data for Charts and Metrics
    const dailyStats: Record<string, any> = {};
    const dateRange = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateRange.push(new Date(d).toISOString().split('T')[0]);
    }

    // Initialize daily stats
    dateRange.forEach(date => {
      dailyStats[date] = {
        date,
        views: 0,
        plays: 0,
        downloads: 0,
        likes: 0,
        shares: 0,
        playlist_adds: 0,
        youtube_opens: 0
      };
    });

    // Time-based range stats (required by Dashboard)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let rangeViews = 0;
    let rangePlays = 0;
    let rangeDownloads = 0;
    let rangeLikes = 0;
    let rangeShares = 0;
    let rangePlaylistAdds = 0;
    let rangeYoutubeOpens = 0;

    let periodViewsToday = 0, periodViewsWeek = 0, periodViewsMonth = 0;
    let periodPlaysToday = 0, periodPlaysWeek = 0, periodPlaysMonth = 0;
    let periodDownloadsToday = 0, periodDownloadsWeek = 0, periodDownloadsMonth = 0;

    (events || []).forEach((event: any) => {
      const date = event.created_at.split('T')[0];
      const eventTime = new Date(event.created_at);
      const isToday = eventTime >= oneDayAgo;
      const isWeek = eventTime >= oneWeekAgo;
      const isMonth = eventTime >= oneMonthAgo;

      if (dailyStats[date]) {
        const type = event.event_type;
        if (type === 'view') {
          dailyStats[date].views++;
          rangeViews++;
          if (isToday) periodViewsToday++;
          if (isWeek) periodViewsWeek++;
          if (isMonth) periodViewsMonth++;
        } else if (type === 'play' || type === 'play_video_inline') {
          dailyStats[date].plays++;
          rangePlays++;
          if (isToday) periodPlaysToday++;
          if (isWeek) periodPlaysWeek++;
          if (isMonth) periodPlaysMonth++;
        } else if (type === 'download') {
          dailyStats[date].downloads++;
          rangeDownloads++;
          if (isToday) periodDownloadsToday++;
          if (isWeek) periodDownloadsWeek++;
          if (isMonth) periodDownloadsMonth++;
        } else if (type === 'like') {
          dailyStats[date].likes++;
          rangeLikes++;
        } else if (type === 'share') {
          dailyStats[date].shares++;
          rangeShares++;
        } else if (type === 'add_to_playlist') {
          dailyStats[date].playlist_adds++;
          rangePlaylistAdds++;
        } else if (type === 'open_in_youtube' || type === 'youtube_open') {
          dailyStats[date].youtube_opens++;
          rangeYoutubeOpens++;
        }
      }
    });

    const chartData = Object.values(dailyStats).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // If it's a media item, rename 'views' to 'plays' in the chart data for frontend compatibility
    if (contentType === 'media') {
      chartData.forEach((d: any) => {
        // Dashboard uses 'plays' key for both views/plays if it's media
        d.plays = d.plays || d.views;
      });
    }

    // 4. Calculate Peak Activity
    const hours: Record<number, number> = {};
    (events || []).forEach((event: any) => {
      const hour = new Date(event.created_at).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hours)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 12;

    // 5. Build Flattened Response (Dashboard Expects This)
    const responseData: any = {
      media_id: media.id,
      title: media.title,
      image_url: media.image_url || media.thumbnail_url || "",
      thumbnail_url: media.thumbnail_url || "",
      created_at: media.created_at,
      last_interaction: (events && events.length > 0) ? events[0].created_at : null,

      // All-time totals from DB records
      total_views: media.view_count || media.views || 0,
      total_plays: media.play_count || media.plays || 0,
      total_downloads: media.download_count || media.downloads || 0,
      total_likes: media.like_count || media.likes || 0,
      total_shares: media.share_count || media.shares || 0,
      total_add_to_playlist: media.add_to_playlist_count || 0,
      total_youtube_opens: media.youtube_open_count || 0,

      // Range-specific totals from aggregated events
      range_views: rangeViews,
      range_plays: rangePlays,
      range_downloads: rangeDownloads,
      range_likes: rangeLikes,
      range_shares: rangeShares,
      range_add_to_playlist: rangePlaylistAdds,
      range_youtube_opens: rangeYoutubeOpens,

      // Engagement rates
      completion_rate: 0, // Mock for now
      engagement_rate: (rangeViews > 0 || rangePlays > 0) ?
        (((rangeLikes + rangeShares) / (contentType === 'media' ? rangePlays : rangeViews)) * 100) : 0,

      // Monthly/Weekly/Daily trends
      plays_today: periodPlaysToday || periodViewsToday,
      plays_week: periodPlaysWeek || periodViewsWeek,
      plays_month: periodPlaysMonth || periodViewsMonth,
      downloads_today: periodDownloadsToday,
      downloads_week: periodDownloadsWeek,
      downloads_month: periodDownloadsMonth,

      // Date range info
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },

      // Chart data
      daily_stats: chartData,

      // Peak metrics
      peak_hours: Object.entries(hours).map(([h, c]) => ({ hour: parseInt(h), activity_count: c })),
      peak_activity: {
        hour: parseInt(peakHour.toString()),
        count: hours[parseInt(peakHour.toString())] || 0
      }
    };

    return c.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error("[Media Analytics] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

// ====================================================================
// ANALYTICS EVENT MANAGER ENDPOINTS
// ====================================================================

/**
 * Get Analytics Stats Overview
 * GET /api/admin/analytics/stats
 */
export async function getAnalyticsStats(c: Context) {
  try {
    const supabase = supabaseClient();

    // Get all events from unified_analytics
    const { data: allEvents, error: eventsError } = await supabase
      .from("unified_analytics")
      .select("module_name, event_type, created_at");

    if (eventsError) {
      console.error("[Event Manager] Stats error:", eventsError);
      return c.json({ success: false, error: eventsError.message }, 500);
    }

    const events = allEvents || [];
    const totalEvents = events.length;

    // Calculate module breakdown
    const moduleBreakdown: Record<string, number> = {};
    events.forEach((event: any) => {
      moduleBreakdown[event.module_name] = (moduleBreakdown[event.module_name] || 0) + 1;
    });

    // Calculate event type breakdown
    const eventTypeBreakdown: Record<string, number> = {};
    events.forEach((event: any) => {
      eventTypeBreakdown[event.event_type] = (eventTypeBreakdown[event.event_type] || 0) + 1;
    });

    // Count recent events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEventCount = events.filter(
      (event: any) => new Date(event.created_at) >= oneDayAgo
    ).length;

    return c.json({
      totalEvents,
      moduleBreakdown,
      eventTypeBreakdown,
      recentEventCount,
    });
  } catch (error: any) {
    console.error("[Event Manager] Stats error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Verify Event Exists (for diagnostics)
 * GET /api/admin/analytics/verify-event?module=...&itemId=...&eventType=...
 */
export async function verifyEvent(c: Context) {
  try {
    const module = c.req.query("module");
    const itemId = c.req.query("item_id");
    const eventType = c.req.query("event_type");

    if (!module || !itemId || !eventType) {
      return c.json(
        { success: false, error: "Missing required query parameters" },
        400
      );
    }

    const supabase = supabaseClient();

    const { data, error } = await supabase
      .from("analytics_tracking")
      .select("id, created_at")
      .eq("module_name", module)
      .eq("item_id", itemId)
      .eq("event_type", eventType)
      .limit(1);

    if (error) {
      console.error("[Event Manager] Verify event error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      exists: data && data.length > 0,
      event: data && data.length > 0 ? data[0] : null,
    });
  } catch (error: any) {
    console.error("[Event Manager] Verify event error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}

/**
 * Get Live Events Feed
 * GET /api/admin/analytics/live-events?module=...&limit=50
 */
export async function getLiveEvents(c: Context) {
  try {
    const module = c.req.query("module");
    const limit = parseInt(c.req.query("limit") || "50");

    const supabase = supabaseClient();

    let query = supabase
      .from("unified_analytics")
      .select("id, module_name, item_id, event_type, ip_address, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (module) {
      query = query.eq("module_name", module);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("[Event Manager] Live events error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      events: events || [],
      count: events?.length || 0,
    });
  } catch (error: any) {
    console.error("[Event Manager] Live events error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}
