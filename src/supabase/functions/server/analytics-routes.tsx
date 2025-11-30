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
 * Body: { module_name, item_id, event_type, metadata? }
 */
export async function trackEvent(c: Context) {
  try {
    const body = await c.req.json();
    const { module_name, item_id, event_type, metadata = {} } = body;

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

    console.log(`[Analytics] Tracking ${event_type} for ${module_name}:${item_id} from IP ${ipAddress}`);

    // Call database function for tracking
    const { data, error } = await supabase.rpc("track_analytics_event", {
      p_module_name: module_name,
      p_item_id: item_id,
      p_event_type: event_type,
      p_ip_address: ipAddress,
      p_user_agent: userAgent || null,
      p_device_type: deviceType,
      p_metadata: metadata,
    });

    if (error) {
      console.error("[Analytics] Tracking error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`[Analytics] Track result:`, data);

    // SYNC WITH MODULE-SPECIFIC COUNTERS
    // If this is a wallpaper event and was actually tracked (not duplicate), increment wallpaper counters
    if (module_name === 'wallpaper' && data.tracked) {
      try {
        if (event_type === 'view') {
          await supabase.rpc('increment_wallpaper_views', { wallpaper_id: item_id });
          console.log(`[Analytics] ✅ Incremented wallpaper view counter for ${item_id}`);
        } else if (event_type === 'like') {
          await supabase.rpc('increment_wallpaper_likes', { wallpaper_id: item_id });
          console.log(`[Analytics] ✅ Incremented wallpaper like counter for ${item_id}`);
        } else if (event_type === 'download') {
          await supabase.rpc('increment_wallpaper_downloads', { wallpaper_id: item_id });
          console.log(`[Analytics] ✅ Incremented wallpaper download counter for ${item_id}`);
        } else if (event_type === 'share') {
          await supabase.rpc('increment_wallpaper_shares', { wallpaper_id: item_id });
          console.log(`[Analytics] ✅ Incremented wallpaper share counter for ${item_id}`);
        }
      } catch (counterError: any) {
        console.error(`[Analytics] ⚠️ Counter increment error (non-fatal):`, counterError);
        // Don't fail the request if counter increment fails
      }
    }

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
 * Untrack Event Endpoint (for unlike/unfavorite)
 * POST /api/analytics/untrack
 * Body: { module_name, item_id, event_type }
 */
export async function untrackEvent(c: Context) {
  try {
    const body = await c.req.json();
    const { module_name, item_id, event_type } = body;

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

    console.log(`[Analytics] Untracking ${event_type} for ${module_name}:${item_id} from IP ${ipAddress}`);

    // Call database function for untracking
    const { data, error } = await supabase.rpc("untrack_analytics_event", {
      p_module_name: module_name,
      p_item_id: item_id,
      p_event_type: event_type,
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error("[Analytics] Untrack error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // SYNC WITH MODULE-SPECIFIC COUNTERS
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
      .from("analytics_tracking")
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
