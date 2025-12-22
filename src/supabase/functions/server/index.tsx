import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import tracking from "./tracking.tsx";
import calendar from "./calendar-routes.tsx";

const app = new Hono();

async function requireAdmin(c: any) {
  try {
    if (c.req.method === "OPTIONS") {
      return { ok: false, response: c.text("", 204) };
    }

    const token = c.req.header("x-user-token") || c.req.header("X-User-Token") || "";
    if (!token) {
      return { ok: false, response: c.json({ success: false, error: "Unauthorized" }, 401) };
    }

    const allowRaw = (Deno.env.get("ADMIN_EMAILS") || "").trim();
    const allow = allowRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allow.length === 0) {
      return { ok: false, response: c.json({ success: false, error: "Admin not configured" }, 401) };
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user?.email) {
      return { ok: false, response: c.json({ success: false, error: "Unauthorized" }, 401) };
    }

    const email = String(data.user.email).toLowerCase();
    if (!allow.includes(email)) {
      return { ok: false, response: c.json({ success: false, error: "Forbidden" }, 403) };
    }

    return { ok: true, user: data.user };
  } catch {
    return { ok: false, response: c.json({ success: false, error: "Unauthorized" }, 401) };
  }
}

async function adminSeedDashboardFeatures(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const defaults = [
      {
        title: "விசேஷ\nநாட்கள்",
        subtitle: null,
        icon: "diwali",
        bg_color: "#DCEBFF",
        text_color: "#264E86",
        route: "murugan-festivals",
        order_index: 0,
        visible: true,
        analytics_key: "murugan-festivals",
      },
      {
        title: "விரத\nநாட்கள்",
        subtitle: null,
        icon: "pray",
        bg_color: "#E9E6F9",
        text_color: "#4332A5",
        route: "viratha-days",
        order_index: 1,
        visible: true,
        analytics_key: "viratha-days",
      },
      {
        title: "முருகன்\nகாலண்டர்",
        subtitle: null,
        icon: "murugan-calendar",
        bg_color: "#FFF0F5",
        text_color: "#8B0000",
        route: "murugan-calendar",
        order_index: 2,
        visible: true,
        analytics_key: "murugan-calendar",
      },
      {
        title: "புகழ்பெற்ற\nகோவில்கள்",
        subtitle: null,
        icon: "popular-temples",
        bg_color: "#E0F5E8",
        text_color: "#006644",
        route: "popular-temples",
        order_index: 3,
        visible: true,
        analytics_key: "popular-temples",
      },
      {
        title: "சுபமுகூர்த்த\nநாட்கள்",
        subtitle: null,
        icon: "rings",
        bg_color: "#F1FED5",
        text_color: "#8C6239",
        route: "muhurtham-days",
        order_index: 4,
        visible: true,
        analytics_key: "muhurtham-days",
      },
      {
        title: "கந்த சஷ்டி\nகவசம் பாடல்",
        subtitle: null,
        icon: "kandha-sasti-kavasam",
        bg_color: "#F9EAE6",
        text_color: "#CA3910",
        route: "kandha-sasti-kavasam",
        order_index: 5,
        visible: true,
        analytics_key: "kandha-sasti-kavasam",
      },
      {
        title: "முருகன்\nவரலாறு",
        subtitle: null,
        icon: "murugan-varalaru",
        bg_color: "#FFF3E0",
        text_color: "#8C6239",
        route: "murugan-varalaru",
        order_index: 6,
        visible: true,
        analytics_key: "murugan-varalaru",
      },
      {
        title: "விடுமுறை\nநாட்கள்",
        subtitle: null,
        icon: "holidays-2026",
        bg_color: "#D5FFD9",
        text_color: "#1CA028",
        route: "holidays-2026",
        order_index: 7,
        visible: true,
        analytics_key: "holidays-2026",
      },
    ];

    const keys = defaults.map((d) => d.analytics_key);
    const existingRes = await supabase
      .from("dashboard_features")
      .select("id,analytics_key,deleted_at")
      .in("analytics_key", keys);

    if (existingRes.error) {
      return c.json({ success: false, error: existingRes.error.message }, 500);
    }

    const existingRows = (existingRes.data || []) as any[];
    const existingByKey = new Map<string, any>();
    for (const r of existingRows) {
      if (r?.analytics_key) existingByKey.set(String(r.analytics_key), r);
    }

    const toInsert = defaults.filter((d) => !existingByKey.has(d.analytics_key));
    const toRestore = defaults
      .map((d) => {
        const r = existingByKey.get(d.analytics_key);
        if (!r?.id || !r.deleted_at) return null;
        return { id: r.id, order_index: d.order_index };
      })
      .filter(Boolean) as Array<{ id: string; order_index: number }>;

    let inserted = 0;
    let restored = 0;

    if (toInsert.length > 0) {
      const ins = await supabase.from("dashboard_features").insert(toInsert, { returning: "minimal" });
      if (ins.error) {
        return c.json({ success: false, error: ins.error.message }, 500);
      }
      inserted = toInsert.length;
    }

    if (toRestore.length > 0) {
      const updates = toRestore.map((x) =>
        supabase
          .from("dashboard_features")
          .update({ deleted_at: null, visible: true, order_index: x.order_index })
          .eq("id", x.id),
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) {
        return c.json({ success: false, error: firstError.message }, 500);
      }
      restored = toRestore.length;
    }

    return c.json({ success: true, inserted, restored, total: defaults.length });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods (INCLUDING PATCH for publish/unpublish)
app.use(
  "/*",
  cors({
    origin: (origin) => origin || "*",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "apikey",
      "X-User-Token",
      "X-Client-Info",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: false,
  }),
);

// Global OPTIONS handler for CORS preflight
app.options("/*", (c) => c.text("", 204));

app.use("/make-server-4a075ebc/admin/*", async (c, next) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  return next();
});

app.post("/make-server-4a075ebc/api/analytics/generate-insights", generateAnalyticsInsights);
app.post("/api/analytics/generate-insights", generateAnalyticsInsights);
app.post("/analytics/generate-insights", generateAnalyticsInsights);

app.get("/make-server-4a075ebc/api/admin/analytics/insights", listAnalyticsInsights);
app.get("/api/admin/analytics/insights", listAnalyticsInsights);

app.get("/make-server-4a075ebc/api/admin/analytics/insights/top", getTopAnalyticsInsight);
app.get("/api/admin/analytics/insights/top", getTopAnalyticsInsight);

app.post("/make-server-4a075ebc/api/admin/analytics/insights/:id/acknowledge", acknowledgeAnalyticsInsight);
app.post("/api/admin/analytics/insights/:id/acknowledge", acknowledgeAnalyticsInsight);

app.post("/make-server-4a075ebc/api/admin/analytics/insights/:id/hide-feature", applyInsightHideFeature);
app.post("/api/admin/analytics/insights/:id/hide-feature", applyInsightHideFeature);

app.post("/make-server-4a075ebc/api/admin/analytics/insights/:id/reorder-feature", applyInsightReorderFeature);
app.post("/api/admin/analytics/insights/:id/reorder-feature", applyInsightReorderFeature);

app.post("/make-server-4a075ebc/api/admin/analytics/insights/:id/create-experiment", applyInsightCreateExperiment);
app.post("/api/admin/analytics/insights/:id/create-experiment", applyInsightCreateExperiment);

app.use("/make-server-4a075ebc/api/admin/*", async (c, next) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  return next();
});

// Non-prefixed admin routes (some clients call /api/* directly)
app.use("/admin/*", async (c, next) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  return next();
});

app.use("/api/admin/*", async (c, next) => {
  const guard = await requireAdmin(c);
  if (!guard.ok) return guard.response;
  return next();
});

app.get("/make-server-4a075ebc/api/admin/analytics/qa", runAnalyticsQA);
app.get("/api/admin/analytics/qa", runAnalyticsQA);

// Mount tracking system
app.route('/make-server-4a075ebc/tracking', tracking);

// Mount Murugan Calendar system
app.route('/make-server-4a075ebc/calendar', calendar);

// Import wallpaper folders and analytics handlers
import {
  getWallpaperFolders,
  createWallpaperFolder,
  updateWallpaperFolder,
  deleteWallpaperFolder,
  getWallpaperAnalytics,
  trackWallpaperEvent,
  getAggregateAnalytics,
  getBannerAnalytics
} from "./wallpaper-folders-analytics.tsx";

// Import banner, media, sparkle folder handlers
import {
  getBannerFolders,
  createBannerFolder,
  updateBannerFolder,
  deleteBannerFolder,
  getMediaFolders,
  createMediaFolder,
  updateMediaFolder,
  deleteMediaFolder,
  getSparkleFolders,
  createSparkleFolder,
  updateSparkleFolder,
  deleteSparkleFolder,
} from "./folder-routes.tsx";

import { getSparkleAnalytics } from "./sparkle-analytics.tsx";
import { ingestSparkle, publishSparkle } from "./spark-automation.tsx";

// Import scheduled publisher (fixed import name)
import { publishScheduledContent } from "./scheduled-publisher.tsx";

// Health check endpoint
app.get("/make-server-4a075ebc/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

// Helper function to fetch Murugan-related articles
async function fetchMuruganArticles() {
  const articles: any[] = [];

  // Source 1: NewsAPI (if API key is available)
  const newsApiKey = Deno.env.get('NEWS_API_KEY');
  if (newsApiKey) {
    try {
      const queries = ['Murugan temple', 'Palani temple', 'Thiruchendur temple', 'Skanda', 'Tamil temple festival'];

      for (const query of queries) {
        const response = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5`,
          {
            headers: {
              'Authorization': `Bearer ${newsApiKey}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.articles && data.articles.length > 0) {
            articles.push(...data.articles.slice(0, 3).map((article: any) => ({
              id: `news_${article.url}`,
              title: article.title,
              snippet: article.description || article.content?.substring(0, 200) || '',
              content: article.content || article.description || '',
              source: article.source.name,
              publishedAt: article.publishedAt,
              url: article.url,
              image: article.urlToImage || 'https://images.unsplash.com/photo-1697083542953-d37300dbcd07?w=1080',
              tags: extractTags(article.title + ' ' + (article.description || '')),
            })));
          }
        }
      }
    } catch (error) {
      console.error('NewsAPI fetch error:', error);
    }
  }

  // Source 2: RSS Feeds from temple websites (simplified mock for now)
  // In production, you'd parse actual RSS feeds

  // If no articles found, return curated fallback
  if (articles.length === 0) {
    return getFallbackArticles();
  }

  // Remove duplicates based on title similarity
  const uniqueArticles = articles.filter((article, index, self) =>
    index === self.findIndex((a) => a.title === article.title)
  );

  // Shuffle and return top 10
  return uniqueArticles.sort(() => Math.random() - 0.5).slice(0, 10);
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const keywords = ['murugan', 'temple', 'festival', 'palani', 'thiruchendur', 'skanda', 'devotion', 'tamil', 'hindu', 'worship'];

  const lowerText = text.toLowerCase();
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return tags.slice(0, 3);
}

function getFallbackArticles() {
  return [
    {
      id: 'fallback1',
      title: 'Palani Murugan Temple Festival Celebrates Skanda Sashti',
      snippet: 'The famous Palani Dhandayuthapani Swamy Temple celebrated Skanda Sashti with grand processions and special poojas. Thousands of devotees participated in the six-day festival.',
      content: 'The Palani temple, one of the six abodes of Lord Murugan, witnessed massive crowds during the Skanda Sashti celebrations. Special abhishekams and alankarams were performed.',
      source: 'Temple Times',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      url: 'https://www.palani.org',
      image: 'https://images.unsplash.com/photo-1697083542953-d37300dbcd07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['palani', 'festival', 'skanda-sashti'],
    },
    {
      id: 'fallback2',
      title: 'Thiruchendur Temple Announces New Darshan Timings',
      snippet: 'The Thiruchendur Murugan Temple management has announced revised darshan timings for devotees. Special arrangements have been made for elderly and differently-abled visitors.',
      content: 'To better serve devotees, the temple administration has optimized darshan timings and introduced online booking for special poojas.',
      source: 'Hindu Today',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      url: 'https://www.thiruchendur.org',
      image: 'https://images.unsplash.com/photo-1747691363094-57243a964953?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['thiruchendur', 'temple', 'announcement'],
    },
    {
      id: 'fallback3',
      title: 'திருப்பரங்குன்றம்: புதிய அபிஷேக சேவை',
      snippet: 'மதுரை திருப்பரங்குன்றம் ஆலயத்தில் சிறப்பு அபிஷேக சேவை தொடங்கப்பட்டுள்ளது. பக்தர்கள் முன்பதிவு செய்து கொள்ளலாம்.',
      content: 'திருப்பரங்குன்றம் முருகன் கோவிலில் புதிய சிறப்பு சேவைகள் அறிவிக்கப்பட்டுள்ளன. இது பக்தர்களுக்கு மிகவும் பயனுள்ளதாக இர்க்கும்.',
      source: 'தமிழ் செய்திகள்',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      url: 'https://www.tamilnews.com',
      image: 'https://images.unsplash.com/photo-1759591588930-04c66f3fd8b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['thiruparankundram', 'pooja', 'service'],
    },
    {
      id: 'fallback4',
      title: 'Arupadai Veedu: Complete Pilgrimage Guide for Devotees',
      snippet: 'A comprehensive guide to visiting all six sacred abodes of Lord Murugan across Tamil Nadu. Learn about the significance, best times to visit, and travel tips.',
      content: 'The six abodes - Palani, Thiruchendur, Swamimalai, Thirupparamkunram, Pazhamudircholai, and Thiruthani - each have unique significance in Murugan worship.',
      source: 'Pilgrimage Weekly',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      url: 'https://www.pilgrimageguide.com',
      image: 'https://images.unsplash.com/photo-1650451484146-5d3a5654b7f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['arupadaiveedu', 'pilgrimage', 'guide'],
    },
    {
      id: 'fallback5',
      title: 'சுவாமி மலை: கந்த சஷ்டி விழா கோலாகலம்',
      snippet: 'சுவாமி மலையில் கந்த சஷ்டி விழா கோலாகலமாக தொடங்கியது. ஆறு நாட்கள் சிறப்பு வழிபாடுகள் நடைபெறும்.',
      content: 'சுவாமி மலை முருகன் கோவிலில் கந்த சஷ்டி விழா சிறப்பாக கொண்டாடப்படுகிறது. பக்தர்கள் திரளாக கலந்து கொண்டனர்.',
      source: 'Tamil Devotion',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
      url: 'https://www.swamimalai.org',
      image: 'https://images.unsplash.com/photo-1697083542953-d37300dbcd07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['swamimalai', 'skanda-sashti', 'festival'],
    },
    {
      id: 'fallback6',
      title: 'Lord Murugan: The God of War and Wisdom',
      snippet: 'Explore the divine qualities of Lord Murugan, the Tamil god who represents both martial valor and spiritual wisdom. Learn about his sacred vel and peacock vahana.',
      content: 'Lord Murugan, also known as Kartikeya and Skanda, is revered as the god of war and wisdom. His six faces represent his omniscience.',
      source: 'Hindu Heritage',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      url: 'https://www.hinduheritage.com',
      image: 'https://images.unsplash.com/photo-1747691363094-57243a964953?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['murugan', 'devotion', 'wisdom'],
    },
    {
      id: 'fallback7',
      title: 'Pazhamudircholai Temple Renovation Complete',
      snippet: 'The ancient Pazhamudircholai Murugan temple near Madurai has completed major renovation works. The temple now features enhanced facilities for devotees.',
      content: 'After months of careful restoration work, the Pazhamudircholai temple has reopened with improved infrastructure while maintaining its traditional architecture.',
      source: 'Temple Updates',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(),
      url: 'https://www.pazhamudircholai.org',
      image: 'https://images.unsplash.com/photo-1650451484146-5d3a5654b7f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['pazhamudircholai', 'renovation', 'temple'],
    },
    {
      id: 'fallback8',
      title: 'Thaipusam Celebrations: A Guide for First-Time Devotees',
      snippet: 'Everything you need to know about participating in Thaipusam, the grand festival dedicated to Lord Murugan. Learn about kavadi, preparation, and significance.',
      content: 'Thaipusam is celebrated with great fervor by Tamil devotees worldwide. The festival involves carrying kavadi as a form of devotion and penance.',
      source: 'Festival Guide',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
      url: 'https://www.festivalguide.com',
      image: 'https://images.unsplash.com/photo-1759591588930-04c66f3fd8b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      tags: ['thaipusam', 'festival', 'kavadi'],
    },
  ];
}

// ========================================
// SEARCH ENDPOINT
// ========================================
app.get("/make-server-4a075ebc/search", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const q = c.req.query('q') || '';
    const tags = c.req.query('tags') ? c.req.query('tags')!.split(',') : null;
    const kind = c.req.query('kind') || null;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { data, error } = await supabase.rpc('search_media', {
      search_query: q,
      search_tags: tags,
      search_kind: kind,
      limit_count: limit,
      offset_count: offset
    });

    if (error) {
      console.error('Search error:', error);
      return c.json({ error: error.message }, 500);
    }

    // Build full URLs for media
    const projectUrl = Deno.env.get('SUPABASE_URL');
    const results = data.map((row: any) => ({
      ...row,
      url: row.web_path ? `${projectUrl}/storage/v1/object/public/public-media/${row.web_path}` : null,
      thumb: row.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${row.thumb_path}` : null,
      original: row.storage_path ? `${projectUrl}/storage/v1/object/public/public-media/${row.storage_path}` : null,
    }));

    return c.json({ results, count: results.length });
  } catch (error: any) {
    console.error('Search endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Phase 2: aggregate page stats into analytics_page_stats
app.post("/make-server-4a075ebc/api/admin/analytics/page-stats/aggregate", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await c.req.json().catch(() => ({}));
    const from = body?.from as string | undefined;
    const to = body?.to as string | undefined;

    let query = supabase
      .from("analytics_events")
      .select("event_name,route,page,created_at,metadata")
      .in("event_name", ["page_enter", "time_spent", "scroll_100"])
      .order("created_at", { ascending: true })
      .limit(20000);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);

    const agg: Record<string, { page: string; date: string; views: number; timeSum: number; timeCount: number; scroll100: number }> = {};

    for (const row of (data || []) as any[]) {
      const dt = new Date(row.created_at);
      const date = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
      const page = row.page || row.route || "unknown";
      const key = `${page}::${date}`;
      if (!agg[key]) agg[key] = { page, date, views: 0, timeSum: 0, timeCount: 0, scroll100: 0 };

      if (row.event_name === "page_enter") {
        agg[key].views += 1;
      } else if (row.event_name === "scroll_100") {
        agg[key].scroll100 += 1;
      } else if (row.event_name === "time_spent") {
        const seconds = Number(row?.metadata?.seconds ?? row?.metadata?.duration_seconds ?? 0);
        if (Number.isFinite(seconds) && seconds > 0) {
          agg[key].timeSum += seconds;
          agg[key].timeCount += 1;
        }
      }
    }

    const upserts = Object.values(agg).map((r) => ({
      page: r.page,
      date: r.date,
      views: r.views,
      avg_time_seconds: r.timeCount > 0 ? Math.round(r.timeSum / r.timeCount) : 0,
      scroll_100_percent: r.scroll100,
    }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("analytics_page_stats")
        .upsert(upserts, { onConflict: "page,date" });
      if (upsertError) return c.json({ success: false, error: upsertError.message }, 500);
    }

    return c.json({ success: true, upserted: upserts.length });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// LIST MEDIA (PUBLIC ACCESS - NO AUTH REQUIRED)
// ========================================
app.get("/make-server-4a075ebc/media/list", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get query parameters
    const search = c.req.query('search') || '';
    const visibility = c.req.query('visibility') || 'public';
    const excludeYoutube = c.req.query('excludeYoutube') === 'true';
    const type = c.req.query('type') || null;
    const category = c.req.query('category') || null;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('[Media List] Query params:', { search, visibility, excludeYoutube, type, category, page, limit });

    // Build query
    let query = supabase
      .from('media')
      .select('*', { count: 'exact' })
      .eq('visibility', visibility);

    // Filter by type if specified
    if (type) {
      query = query.eq('media_type', type);
    }

    // Exclude YouTube if requested
    if (excludeYoutube) {
      query = query.neq('media_type', 'youtube');
    }

    // Search by title or description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by category (for YouTube)
    if (category) {
      query = query.contains('tags', [category]);
    }

    // Order and paginate
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Media List] Database error:', error);
      return c.json({
        error: error.message,
        success: false
      }, 500);
    }

    console.log(`[Media List] Found ${data?.length || 0} items (total: ${count})`);

    // Build full URLs for media
    const projectUrl = Deno.env.get('SUPABASE_URL');
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      type: item.media_type === 'youtube' ? 'youtube' : item.media_type === 'video' ? 'video' : 'photo',
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      category: item.metadata?.category || 'uncategorized',
      uploadedBy: item.metadata?.uploaded_by || 'admin',
      uploadedAt: item.created_at,
      // URLs for images/videos
      url: item.media_type === 'youtube'
        ? item.host_url
        : (item.web_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.web_path}` : item.storage_path),
      storagePath: item.storage_path,
      thumbnail: item.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.thumb_path}` : null,
      thumbnailUrl: item.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.thumb_path}` : null,
      // YouTube specific
      embedUrl: item.host_url,
      // Media properties
      duration: item.duration,
      downloadable: item.allow_download !== false,
      isPremium: false,
      // Stats
      stats: {
        views: item.views || 0,
        likes: item.likes || 0,
        downloads: item.downloads || 0,
        shares: item.shares || 0,
      },
      views: item.views || 0,
      likes: item.likes || 0,
      downloads: item.downloads || 0,
      shares: item.shares || 0,
    }));

    return c.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error: any) {
    console.error('[Media List] Endpoint error:', error);
    return c.json({
      error: error.message,
      success: false
    }, 500);
  }
});

// ========================================
// GET MEDIA BY ID
// ========================================
app.get("/make-server-4a075ebc/media/:id", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');

    // Try wallpapers table first (most common for user panel)
    let { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .eq('id', id)
      .eq('visibility', 'public')
      .maybeSingle(); // ← Changed from .single() to handle 0 rows

    let contentType = 'wallpaper';

    // If not in wallpapers, try media table
    if (!data) {
      const mediaResult = await supabase
        .from('media')
        .select('*')
        .eq('id', id)
        .eq('visibility', 'public')
        .maybeSingle();

      data = mediaResult.data;
      error = mediaResult.error;
      contentType = 'media';
    }

    // If not in media, try photos table
    if (!data) {
      const photoResult = await supabase
        .from('photos')
        .select('*')
        .eq('id', id)
        .eq('visibility', 'public')
        .maybeSingle();

      data = photoResult.data;
      error = photoResult.error;
      contentType = 'photo';
    }

    if (error) {
      console.error('Get media error:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      console.warn(`[Get Media] No content found with ID: ${id}`);
      return c.json({ error: 'Content not found' }, 404);
    }

    const projectUrl = Deno.env.get('SUPABASE_URL');
    const media = {
      ...data,
      contentType, // Add content type for tracking
      url: data.web_path ? `${projectUrl}/storage/v1/object/public/public-media/${data.web_path}` : null,
      thumb: data.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${data.thumb_path}` : null,
      original: data.storage_path ? `${projectUrl}/storage/v1/object/public/public-media/${data.storage_path}` : null,
    };

    return c.json({ media });
  } catch (error: any) {
    console.error('Get media endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// ANALYTICS ENDPOINT (Legacy - redirects to tracking system)
// ========================================
app.post("/make-server-4a075ebc/analytics", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = null;

    // Get user from token if provided
    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    const body = await c.req.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return c.json({ error: 'events array required' }, 400);
    }

    // Convert events to tracking format and store in KV
    let successCount = 0;

    for (const event of events) {
      try {
        const eventId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        // Determine module from object_type or event_type
        let module = 'app';
        if (event.object_type === 'wallpaper' || event.object_type === 'photo') {
          module = 'wallpaper';
        } else if (event.object_type === 'media' || event.object_type === 'song') {
          module = 'song';
        } else if (event.object_type === 'spark' || event.object_type === 'article') {
          module = 'sparkle';
        }

        // Store event in KV
        const eventData = {
          id: eventId,
          module,
          action: event.event_type || 'unknown',
          content_id: event.object_id || null,
          user_id: userId || event.user_id || null,
          session_id: event.session_id || null,
          metadata: {
            ...event.properties,
            device_type: event.device_type,
            user_agent: c.req.header('user-agent'),
            ip_address: c.req.header('cf-connecting-ip')
          },
          created_at: timestamp
        };

        await kv.set(`tracking:event:${module}:${eventId}`, eventData);

        // Update module stats
        const statsKey = `tracking:stats:${module}`;
        const stats = await kv.get(statsKey) || {
          module,
          total_events: 0,
          action_counts: {},
          unique_users: []
        };

        stats.total_events = (stats.total_events || 0) + 1;
        stats.last_event = timestamp;
        stats.action_counts = stats.action_counts || {};
        stats.action_counts[eventData.action] = (stats.action_counts[eventData.action] || 0) + 1;

        if (userId) {
          const users = new Set(stats.unique_users || []);
          users.add(userId);
          stats.unique_users = Array.from(users);
        }

        await kv.set(statsKey, stats);
        successCount++;
      } catch (eventError) {
        console.error('[Analytics] Event processing error:', eventError);
      }
    }

    console.log(`[Analytics] Processed ${successCount} of ${events.length} events`);

    return c.json({ success: true, count: successCount });
  } catch (error: any) {
    console.error('Analytics endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// SET PROFILE BACKGROUND
// ========================================
app.post("/make-server-4a075ebc/profile/bg", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { media_id, url } = body;

    if (!media_id && !url) {
      return c.json({ error: 'media_id or url required' }, 400);
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        profile_bg_media_id: media_id || null,
        profile_bg_url: url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return c.json({ error: error.message }, 500);
    }

    // Log analytics
    await supabase.from('analytics_events').insert({
      event_type: 'profile_bg_set',
      user_id: user.id,
      object_type: 'media',
      object_id: media_id,
      properties: { url }
    });

    return c.json({ success: true, profile: data });
  } catch (error: any) {
    console.error('Profile bg endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// GET SPARKS/NEWS
// ========================================
app.get("/make-server-4a075ebc/sparks", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const q = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = supabase
      .from('sparks')
      .select('*')
      .order('published_at', { ascending: false });

    if (q) {
      query = query.textSearch('document', q);
    }

    const { data, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Sparks error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ sparks: data, count: data.length });
  } catch (error: any) {
    console.error('Sparks endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// GET SPARKLE LIST (User Panel Format)
// ========================================
app.get("/make-server-4a075ebc/sparkle/list", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const type = c.req.query('type') || null;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('[Sparkle List] Query params:', { type, page, limit });

    // Query the sparks table
    let query = supabase
      .from('sparks')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public')
      .order('published_at', { ascending: false });

    // Filter by type if specified
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Sparkle List] Database error:', error);
      return c.json({
        error: error.message,
        success: false
      }, 500);
    }

    console.log(`[Sparkle List] Found ${data?.length || 0} items (total: ${count})`);

    // Transform data to user panel format
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      type: item.type || 'article',
      title: item.title,
      snippet: item.short_description || item.description || '',
      content: item.full_article || item.short_description || '',
      source: item.source || 'Murugan Wallpapers',
      publishedAt: item.published_at || item.created_at,
      url: item.external_link || '#',
      image: item.cover_image || item.image_url || '',
      tags: item.tags || [],
    }));

    return c.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error: any) {
    console.error('[Sparkle List] Endpoint error:', error);
    return c.json({
      error: error.message,
      success: false
    }, 500);
  }
});

// ========================================
// INCREMENT MEDIA STATS (Smart Detection for Wallpapers/Media/Photos)
// ========================================
app.post("/make-server-4a075ebc/media/:id/view", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');

    // Try to determine content type from database
    // Check wallpapers first (most common for user panel)
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      const { error } = await supabase.rpc('increment_wallpaper_views', { wallpaper_id: id });
      if (error) {
        console.error('[View] Wallpaper increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[View] ✅ Incremented wallpaper view: ${id}`);
      return c.json({ success: true, contentType: 'wallpaper' });
    }

    // Check media table
    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (media) {
      const { error } = await supabase.rpc('increment_media_views', { media_id: id });
      if (error) {
        console.error('[View] Media increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[View] ✅ Incremented media view: ${id}`);
      return c.json({ success: true, contentType: 'media' });
    }

    // Check photos table
    const { data: photo } = await supabase
      .from('photos')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (photo) {
      const { error } = await supabase.rpc('increment_photo_views', { photo_id: id });
      if (error) {
        console.error('[View] Photo increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[View] ✅ Incremented photo view: ${id}`);
      return c.json({ success: true, contentType: 'photo' });
    }

    console.warn(`[View] ⚠️ Content not found in any table: ${id}`);
    return c.json({ error: 'Content not found' }, 404);
  } catch (error: any) {
    console.error('[View] ❌ Endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-4a075ebc/media/:id/like", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');

    // Get user_id from request body or generate anonymous ID
    const body = await c.req.json().catch(() => ({}));
    const user_id = body.user_id || `anon_${c.req.header('x-forwarded-for') || 'unknown'}`;

    // Check wallpapers first
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      // Use new atomic toggle function
      const { data, error } = await supabase.rpc('wallpaper_like_toggle', {
        p_wallpaper_id: id,
        p_user_id: user_id
      });

      if (error) {
        console.error('[Like] Wallpaper toggle error:', error);

        // Check if it's a "function not found" error
        if (error.message?.includes('could not find') || error.message?.includes('does not exist')) {
          return c.json({
            error: 'Database migration required. Please run the SQL migration in Supabase SQL Editor. See /MIGRATION_LIKE_SYSTEM.sql',
            details: error.message,
            migrationRequired: true
          }, 500);
        }

        return c.json({ error: error.message }, 500);
      }

      console.log(`[Like] ✅ Wallpaper toggle result:`, data);
      return c.json({
        success: true,
        contentType: 'wallpaper',
        result: data
      });
    }

    // Check media table
    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (media) {
      const { error } = await supabase.rpc('increment_media_likes', { media_id: id });
      if (error) {
        console.error('[Like] Media increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Like] ✅ Incremented media like: ${id}`);
      return c.json({ success: true, contentType: 'media' });
    }

    // Check photos table
    const { data: photo } = await supabase
      .from('photos')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (photo) {
      const { error } = await supabase.rpc('increment_photo_likes', { photo_id: id });
      if (error) {
        console.error('[Like] Photo increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Like] ✅ Incremented photo like: ${id}`);
      return c.json({ success: true, contentType: 'photo' });
    }

    console.warn(`[Like] ⚠️ Content not found in any table: ${id}`);
    return c.json({ error: 'Content not found' }, 404);
  } catch (error: any) {
    console.error('[Like] ❌ Endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Unlike endpoint (removes user record but does NOT decrement counter)
app.post("/make-server-4a075ebc/media/:id/unlike", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');

    // Get user_id from request body or generate anonymous ID
    const body = await c.req.json().catch(() => ({}));
    const user_id = body.user_id || `anon_${c.req.header('x-forwarded-for') || 'unknown'}`;

    // Check wallpapers first
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      // Use new per-user unlike function (does NOT decrement counter)
      const { data, error } = await supabase.rpc('unlike_wallpaper', {
        p_wallpaper_id: id,
        p_user_id: user_id
      });

      if (error) {
        console.error('[Unlike] Wallpaper unlike error:', error);
        return c.json({ error: error.message }, 500);
      }

      console.log(`[Unlike] ✅ Wallpaper unlike result:`, data);
      return c.json({
        success: true,
        contentType: 'wallpaper',
        ...data
      });
    }

    // Check media table
    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (media) {
      const { error } = await supabase.rpc('decrement_media_likes', { media_id: id });
      if (error) {
        console.error('[Unlike] Media decrement error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Unlike] ✅ Decremented media like: ${id}`);
      return c.json({ success: true, contentType: 'media' });
    }

    // Check photos table
    const { data: photo } = await supabase
      .from('photos')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (photo) {
      const { error } = await supabase.rpc('decrement_photo_likes', { photo_id: id });
      if (error) {
        console.error('[Unlike] Photo decrement error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Unlike] ✅ Decremented photo like: ${id}`);
      return c.json({ success: true, contentType: 'photo' });
    }

    console.warn(`[Unlike] ⚠️ Content not found in any table: ${id}`);
    return c.json({ error: 'Content not found' }, 404);
  } catch (error: any) {
    console.error('[Unlike] ❌ Endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Check if user has liked a wallpaper
app.get("/make-server-4a075ebc/media/:id/check-like", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');
    const user_id = c.req.query('user_id') || `anon_${c.req.header('x-forwarded-for') || 'unknown'}`;

    // Check wallpapers first
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      const { data, error } = await supabase.rpc('check_wallpaper_like', {
        p_wallpaper_id: id,
        p_user_id: user_id
      });

      if (error) {
        console.error('[Check Like] Error:', error);
        return c.json({ liked: false }, 200);
      }

      return c.json({ liked: data || false });
    }

    // For other tables, return false (not implemented yet)
    return c.json({ liked: false });
  } catch (error: any) {
    console.error('[Check Like] Error:', error);
    return c.json({ liked: false }, 200);
  }
});

app.post("/make-server-4a075ebc/media/:id/download", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');

    // Check wallpapers first
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('storage_path, web_path, allow_download')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      const { error } = await supabase.rpc('increment_wallpaper_downloads', { wallpaper_id: id });
      if (error) {
        console.error('[Download] Wallpaper increment error:', error);
        return c.json({ error: error.message }, 500);
      }

      if (wallpaper.allow_download === false) {
        return c.json({ error: 'Download not allowed' }, 403);
      }

      const projectUrl = Deno.env.get('SUPABASE_URL');
      const storagePath = wallpaper.web_path || wallpaper.storage_path;
      const downloadUrl = storagePath ? `${projectUrl}/storage/v1/object/public/public-media/${storagePath}` : null;

      console.log(`[Download] ✅ Incremented wallpaper download: ${id}`);
      return c.json({ success: true, download_url: downloadUrl, contentType: 'wallpaper' });
    }

    // Check media table
    const { data: media } = await supabase
      .from('media')
      .select('storage_path, web_path, allow_download')
      .eq('id', id)
      .maybeSingle();

    if (media) {
      const { error } = await supabase.rpc('increment_media_downloads', { media_id: id });
      if (error) {
        console.error('[Download] Media increment error:', error);
        return c.json({ error: error.message }, 500);
      }

      if (media.allow_download === false) {
        return c.json({ error: 'Download not allowed' }, 403);
      }

      const projectUrl = Deno.env.get('SUPABASE_URL');
      const storagePath = media.web_path || media.storage_path;
      const downloadUrl = storagePath ? `${projectUrl}/storage/v1/object/public/public-media/${storagePath}` : null;

      console.log(`[Download] ✅ Incremented media download: ${id}`);
      return c.json({ success: true, download_url: downloadUrl, contentType: 'media' });
    }

    // Check photos table
    const { data: photo } = await supabase
      .from('photos')
      .select('storage_path, web_path, allow_download')
      .eq('id', id)
      .maybeSingle();

    if (photo) {
      const { error } = await supabase.rpc('increment_photo_downloads', { photo_id: id });
      if (error) {
        console.error('[Download] Photo increment error:', error);
        return c.json({ error: error.message }, 500);
      }

      if (photo.allow_download === false) {
        return c.json({ error: 'Download not allowed' }, 403);
      }

      const projectUrl = Deno.env.get('SUPABASE_URL');
      const storagePath = photo.web_path || photo.storage_path;
      const downloadUrl = storagePath ? `${projectUrl}/storage/v1/object/public/public-media/${storagePath}` : null;

      console.log(`[Download] ✅ Incremented photo download: ${id}`);
      return c.json({ success: true, download_url: downloadUrl, contentType: 'photo' });
    }

    console.warn(`[Download] ⚠️ Content not found in any table: ${id}`);
    return c.json({ error: 'Content not found' }, 404);
  } catch (error: any) {
    console.error('[Download] ❌ Endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-4a075ebc/media/:id/share", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');

    // Check wallpapers first
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      const { error } = await supabase.rpc('increment_wallpaper_shares', { wallpaper_id: id });
      if (error) {
        console.error('[Share] Wallpaper increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Share] ✅ Incremented wallpaper share: ${id}`);
      return c.json({ success: true, contentType: 'wallpaper' });
    }

    // Check media table
    const { data: media } = await supabase
      .from('media')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (media) {
      const { error } = await supabase.rpc('increment_media_shares', { media_id: id });
      if (error) {
        console.error('[Share] Media increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Share] ✅ Incremented media share: ${id}`);
      return c.json({ success: true, contentType: 'media' });
    }

    // Check photos table
    const { data: photo } = await supabase
      .from('photos')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (photo) {
      const { error } = await supabase.rpc('increment_photo_shares', { photo_id: id });
      if (error) {
        console.error('[Share] Photo increment error:', error);
        return c.json({ error: error.message }, 500);
      }
      console.log(`[Share] ✅ Incremented photo share: ${id}`);
      return c.json({ success: true, contentType: 'photo' });
    }

    console.warn(`[Share] ⚠️ Content not found in any table: ${id}`);
    return c.json({ error: 'Content not found' }, 404);
  } catch (error: any) {
    console.error('[Share] ❌ Endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Check if user has liked a wallpaper
app.get("/make-server-4a075ebc/media/:id/check-like", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const id = c.req.param('id');
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ error: 'user_id required' }, 400);
    }

    // Check wallpapers table
    const { data: wallpaper } = await supabase
      .from('wallpapers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (wallpaper) {
      const { data, error } = await supabase.rpc('check_wallpaper_like', {
        p_wallpaper_id: id,
        p_user_id: user_id
      });

      if (error) {
        console.error('[Check Like] Error:', error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ success: true, liked: data });
    }

    // For media and photos, return false (no per-user tracking yet)
    return c.json({ success: true, liked: false });

  } catch (error: any) {
    console.error('[Check Like] ❌ Endpoint error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// ADMIN ENDPOINTS
// ========================================
app.post("/make-server-4a075ebc/admin/media", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await c.req.json();
    const { title, description, tags, kind, storage_path, thumbnail_url, duration, downloadable, uploader } = body;

    if (!title || !kind || !uploader) {
      return c.json({ error: "Missing required fields (title, kind, uploader)" }, 400);
    }

    const { data, error } = await supabase
      .from('media')
      .insert({
        kind,
        title,
        description: description || `${title} - Lord Murugan devotional content`,
        storage_path: storage_path || null,
        web_path: storage_path || null,
        thumb_path: thumbnail_url || storage_path || null,
        host_url: kind === 'youtube' ? storage_path : null,
        duration: duration || null,
        tags: tags || ['murugan'],
        allow_download: downloadable !== false,
        visibility: 'public',
        creator: null, // Admin uploads don't have a creator
        metadata: { uploaded_by: 'admin', source: uploader }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating media:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Admin media upload error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Seed sample data
app.post("/make-server-4a075ebc/admin/seed-sample-data", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const sampleMedia = [
      {
        title: "Lord Murugan Divine Blessing",
        description: "Sacred image of Lord Murugan in all his divine glory",
        tags: ["murugan", "deity", "blessing", "devotional"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1590659948963-caafdecdfe64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMHRlbXBsZSUyMGRlaXR5fGVufDF8fHx8MTc2MjkyNTA2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1590659948963-caafdecdfe64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMHRlbXBsZSUyMGRlaXR5fGVufDF8fHx8MTc2MjkyNTA2N3ww&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Sacred Temple Deity",
        description: "Beautiful temple deity adorned with flowers and decorations",
        tags: ["temple", "god", "worship", "sacred"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1665726557546-fb69f91b7afe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB0ZW1wbGUlMjBnb2R8ZW58MXx8fHwxNzYyOTQyOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1665726557546-fb69f91b7afe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB0ZW1wbGUlMjBnb2R8ZW58MXx8fHwxNzYyOTQyOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Divine Murugan Statue",
        description: "Stunning devotional statue in traditional style",
        tags: ["murugan", "statue", "devotion", "art"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1734546862658-c17f666b36b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMGRldm90aW9uYWwlMjBzdGF0dWV8ZW58MXx8fHwxNzYyOTQyOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1734546862658-c17f666b36b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMGRldm90aW9uYWwlMjBzdGF0dWV8ZW58MXx8fHwxNzYyOTQyOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Peacock - Vehicle of Lord Murugan",
        description: "The divine peacock, sacred vahana of Lord Murugan",
        tags: ["peacock", "murugan", "vahana", "sacred"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1562116290-cf310c050cf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZW1wbGUlMjBwZWFjb2NrJTIwaW5kaWF8ZW58MXx8fHwxNzYyOTQyOTYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1562116290-cf310c050cf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZW1wbGUlMjBwZWFjb2NrJTIwaW5kaWF8ZW58MXx8fHwxNzYyOTQyOTYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Temple Ritual Ceremony",
        description: "Sacred spiritual rituals and offerings",
        tags: ["ritual", "ceremony", "prayer", "devotion"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1548686969-a4f5e3f1ccbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBzcGlyaXR1YWwlMjByaXR1YWx8ZW58MXx8fHwxNzYyOTQyOTYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1548686969-a4f5e3f1ccbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBzcGlyaXR1YWwlMjByaXR1YWx8ZW58MXx8fHwxNzYyOTQyOTYyfDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Sacred Temple Architecture",
        description: "Magnificent Hindu temple architecture and gopuram",
        tags: ["temple", "architecture", "gopuram", "sacred"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1695692928769-7b4eec3803fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMHRlbXBsZSUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NjI5MzUyOTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1695692928769-7b4eec3803fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMHRlbXBsZSUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NjI5MzUyOTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Divine Temple Art",
        description: "Traditional temple art and sculptures",
        tags: ["art", "temple", "sculpture", "heritage"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1665726557546-fb69f91b7afe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB0ZW1wbGUlMjBhcnR8ZW58MXx8fHwxNzYyOTQyOTYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1665726557546-fb69f91b7afe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB0ZW1wbGUlMjBhcnR8ZW58MXx8fHwxNzYyOTQyOTYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Festival Celebration",
        description: "Vibrant devotional festival celebrations",
        tags: ["festival", "celebration", "devotion", "joy"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1697083540073-ad9f17124178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMGZlc3RpdmFsJTIwZGV2b3Rpb258ZW58MXx8fHwxNzYyOTQyOTYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1697083540073-ad9f17124178?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMGZlc3RpdmFsJTIwZGV2b3Rpb258ZW58MXx8fHwxNzYyOTQyOTYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Sacred Flower Offerings",
        description: "Beautiful flower offerings at the temple",
        tags: ["flowers", "offerings", "pooja", "worship"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1743307237210-aba18ed486bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZW1wbGUlMjBvZmZlcmluZ3MlMjBmbG93ZXJzfGVufDF8fHx8MTc2Mjk0Mjk2M3ww&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1743307237210-aba18ed486bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZW1wbGUlMjBvZmZlcmluZ3MlMjBmbG93ZXJzfGVufDF8fHx8MTc2Mjk0Mjk2M3ww&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        title: "Prayer and Meditation",
        description: "Peaceful moments of spiritual prayer and meditation",
        tags: ["prayer", "meditation", "spiritual", "peace"],
        type: "image",
        storage_path: "https://images.unsplash.com/photo-1674589701643-f1b8868b3b6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBzcGlyaXR1YWwlMjBwcmF5ZXJ8ZW58MXx8fHwxNzYyOTQyOTY0fDA&ixlib=rb-4.1.0&q=80&w=1080",
        thumbnail_url: "https://images.unsplash.com/photo-1674589701643-f1b8868b3b6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBzcGlyaXR1YWwlMjBwcmF5ZXJ8ZW58MXx8fHwxNzYyOTQyOTY0fDA&ixlib=rb-4.1.0&q=80&w=1080",
      },
    ];

    // Insert all sample media
    const mediaRecords = sampleMedia.map((media) => ({
      ...media,
      downloadable: true,
      uploader: 'admin',
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 500),
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { data, error } = await supabase
      .from('media')
      .insert(mediaRecords)
      .select();

    if (error) {
      console.error('Error seeding data:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      message: `Successfully seeded ${data.length} sample media items`,
      data
    });
  } catch (error: any) {
    console.error('Seed data error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// SYNC ENDPOINTS - Admin to User Panel
// ========================================
import * as sync from "./sync.tsx";
import * as storage from "./storage-init.tsx";
import * as api from "./api-routes.tsx";
import * as lyricsAudio from "./lyrics-audio.tsx";
import * as analytics from "./analytics-routes.tsx";
import * as analyticsInit from "./analytics-init.tsx";
import * as dbInit from "./db-init.tsx";

// Initialize storage buckets on startup
storage.initializeStorageBuckets().catch(console.error);
sync.initializeStorage().catch(console.error);

// ========================================
// DATABASE STATUS & INITIALIZATION
// ========================================

app.get("/make-server-4a075ebc/admin/db-status", async (c) => {
  try {
    const status = await dbInit.getDatabaseStatus();
    return c.json({ success: true, status });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-4a075ebc/admin/db-init", async (c) => {
  try {
    const result = await dbInit.initializeDatabase();
    return c.json(result);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// 🔍 DIAGNOSTIC ROUTES
// ========================================
import { runDatabaseDiagnostics, testBannerUpload } from "./diagnostics.tsx";

app.get("/make-server-4a075ebc/diagnostics/database", runDatabaseDiagnostics);
app.get("/make-server-4a075ebc/diagnostics/test-banner", testBannerUpload);
// ADMIN API ROUTES - FULL CRUD
// ========================================

  // BANNERS
  app.post("/make-server-4a075ebc/api/upload/banner", api.uploadBanner);
  app.get("/make-server-4a075ebc/api/banners", api.getBanners);
  app.put("/make-server-4a075ebc/api/banners/:id", api.updateBanner);  // ✅ FIX: Added PUT route
  app.patch("/make-server-4a075ebc/api/banners/:id", api.updateBanner);
  app.delete("/make-server-4a075ebc/api/banners/:id", api.deleteBanner);

  // POPUP BANNERS
  app.post("/make-server-4a075ebc/api/upload/popup-banner", api.uploadPopupBanner);
  app.get("/make-server-4a075ebc/api/popup-banners", api.getPopupBanners);
  app.put("/make-server-4a075ebc/api/popup-banners/:id", api.updatePopupBanner);
  app.patch("/make-server-4a075ebc/api/popup-banners/:id", api.updatePopupBanner);
  app.delete("/make-server-4a075ebc/api/popup-banners/:id", api.deletePopupBanner);
  app.post("/make-server-4a075ebc/api/popup-banners/:id/push", api.pushPopupBanner);
  app.post("/make-server-4a075ebc/api/popup-banners/:id/image", api.replacePopupBannerImage);
  // Public (app) - active popup banner
  app.get("/make-server-4a075ebc/api/popup-banners/active", api.getActivePopupBanner);

  // Alias routes for the new push endpoint
  app.post("/api/popup-banners/:id/push", api.pushPopupBanner);

  // DASHBOARD ICONS (Admin)
  app.post("/make-server-4a075ebc/api/upload/dashboard-icon", api.uploadDashboardIcon);
  app.get("/make-server-4a075ebc/api/dashboard-icons", api.listDashboardIcons);

// QUOTES / WISHES
app.post("/make-server-4a075ebc/api/upload/quote", api.uploadQuote);
app.get("/make-server-4a075ebc/api/quotes", api.getQuotes);
app.get("/make-server-4a075ebc/api/quotes/today", api.getTodayQuote);
app.put("/make-server-4a075ebc/api/quotes/:id", api.updateQuote);
app.patch("/make-server-4a075ebc/api/quotes/:id", api.updateQuote);
app.delete("/make-server-4a075ebc/api/quotes/:id", api.deleteQuote);

// Alias routes (no /make-server-4a075ebc prefix) for compatibility
app.post("/api/upload/quote", api.uploadQuote);
app.get("/api/quotes", api.getQuotes);
app.get("/api/quotes/today", api.getTodayQuote);
app.put("/api/quotes/:id", api.updateQuote);
app.patch("/api/quotes/:id", api.updateQuote);
app.delete("/api/quotes/:id", api.deleteQuote);

// TEMPLES
app.get("/make-server-4a075ebc/api/temples", api.getTemples);
app.post("/make-server-4a075ebc/api/temples", api.createTemple);
app.put("/make-server-4a075ebc/api/temples/:id", api.updateTemple);
app.patch("/make-server-4a075ebc/api/temples/:id", api.updateTemple);
app.delete("/make-server-4a075ebc/api/temples/:id", api.deleteTemple);
app.post("/make-server-4a075ebc/api/temples/bulk", api.bulkUpsertTemples);

// Banner tracking endpoints
app.post("/make-server-4a075ebc/banners/:id/view", async (c) => {
  try {
    const bannerId = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.rpc("increment_counter", {
      table_name: "banners",
      record_id: bannerId,
      counter_name: "view_count",
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Banner] View tracking error:", error);
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-4a075ebc/banners/:id/click", async (c) => {
  try {
    const bannerId = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.rpc("increment_counter", {
      table_name: "banners",
      record_id: bannerId,
      counter_name: "click_count",
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error("[Banner] Click tracking error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// WALLPAPERS
app.post("/make-server-4a075ebc/api/upload/wallpaper", api.uploadWallpaper);
app.get("/make-server-4a075ebc/api/wallpapers", api.getWallpapers);
app.put("/make-server-4a075ebc/api/wallpapers/:id", api.updateWallpaper);  // ✅ FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/wallpapers/:id", api.updateWallpaper);
app.delete("/make-server-4a075ebc/api/wallpapers/:id", api.deleteWallpaper);

// MEDIA (Audio, Video, YouTube)
app.post("/make-server-4a075ebc/api/youtube/fetch", api.fetchYouTubeMetadata);
app.post("/make-server-4a075ebc/api/upload/media", api.uploadMedia);
app.get("/make-server-4a075ebc/api/media", api.getMedia);
app.put("/make-server-4a075ebc/api/media/:id", api.updateMedia);  // ✅ FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/media/:id", api.updateMedia);
app.delete("/make-server-4a075ebc/api/media/:id", api.deleteMedia);

// SYNCED LYRICS AUDIO
app.post("/make-server-4a075ebc/api/audio/upload", lyricsAudio.uploadAudio);
app.post("/make-server-4a075ebc/api/audio/import", lyricsAudio.importAudioFromUrl);
app.get("/make-server-4a075ebc/api/audio/:id", lyricsAudio.getAudio);
app.get("/make-server-4a075ebc/api/audio/:id/status", lyricsAudio.getAudioStatus);
app.get("/make-server-4a075ebc/api/audio/:id/lyrics", lyricsAudio.getLyrics);
app.post("/make-server-4a075ebc/api/audio/:id/lyrics/ingest", lyricsAudio.ingestLyricsFromText);
app.put("/make-server-4a075ebc/api/audio/:id/lyrics", lyricsAudio.saveLyricsBlocks);
app.post("/make-server-4a075ebc/api/audio/:id/process", lyricsAudio.processAudio);

// PHOTOS
app.post("/make-server-4a075ebc/api/upload/photo", api.uploadPhoto);
app.get("/make-server-4a075ebc/api/photos", api.getPhotos);
app.put("/make-server-4a075ebc/api/photos/:id", api.updatePhoto);  // ✅ FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/photos/:id", api.updatePhoto);
app.delete("/make-server-4a075ebc/api/photos/:id", api.deletePhoto);

// SPARKLE (News/Articles)
app.post("/make-server-4a075ebc/api/upload/sparkle", api.uploadSparkle);
app.get("/make-server-4a075ebc/api/sparkle", api.getSparkle);
app.get("/make-server-4a075ebc/api/sparkles", api.getSparkle); // Support plural
app.put("/make-server-4a075ebc/api/sparkle/:id", api.updateSparkle);  // FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/sparkle/:id", api.updateSparkle);
app.delete("/make-server-4a075ebc/api/sparkle/:id", api.deleteSparkle);

// CATEGORIES
app.get("/make-server-4a075ebc/api/categories", api.getCategories);
app.get("/make-server-4a075ebc/api/storage/stats", api.getStorageStats);

// ========================================
// DASHBOARD FEATURES (Dynamic User Dashboard)
// ========================================

function hashToPercent(input: string) {
  // Deterministic small hash -> [0,99]
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return Math.abs(h) % 100;
}

function normalizeOverrides(config: any): any[] {
  if (!config || typeof config !== "object") return [];
  const overrides = (config as any).overrides;
  if (Array.isArray(overrides)) return overrides;
  if ((config as any).feature_key || (config as any).analytics_key || (config as any).route) return [config];
  return [];
}

function pickVariantKey(variants: any[], pct: number): string {
  const ordered = [...variants].sort((a, b) => String(a.variant_key).localeCompare(String(b.variant_key)));
  let acc = 0;
  for (const v of ordered) {
    acc += Math.max(0, Math.min(100, Number(v.traffic_percent || 0)));
    if (pct < acc) return String(v.variant_key);
  }
  return String((ordered[0] && ordered[0].variant_key) || "A");
}

async function listDashboardFeatures(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const bucket =
      (c.req.header("x-experiment-bucket") || c.req.header("X-Experiment-Bucket") || "").trim() ||
      (c.req.query ? (c.req.query("experiment_bucket") || "").trim() : "");

    const { data, error } = await supabase
      .from("dashboard_features")
      .select(
        "id,title,subtitle,icon,bg_color,text_color,route,order_index,visible,analytics_key,created_at,updated_at",
      )
      .eq("visible", true)
      .is("deleted_at", null)
      .order("order_index", { ascending: true });

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    const baseRows = (data || []) as any[];
    if (!bucket) {
      return c.json({ success: true, data: baseRows });
    }

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayIso = todayUtc.toISOString().slice(0, 10);

    const { data: experiments } = await supabase
      .from("experiments")
      .select("id,start_date,end_date,status")
      .eq("status", "running")
      .limit(50);

    const running = (experiments || []).filter((e: any) => {
      if (!e?.id) return false;
      const startOk = !e.start_date || String(e.start_date) <= todayIso;
      const endOk = !e.end_date || String(e.end_date) >= todayIso;
      return startOk && endOk;
    });

    let rows = baseRows.map((r) => ({ ...r }));
    const byAnalyticsKey = new Map<string, any>();
    const byRoute = new Map<string, any>();
    for (const r of rows) {
      if (r?.analytics_key) byAnalyticsKey.set(String(r.analytics_key), r);
      if (r?.route) byRoute.set(String(r.route), r);
    }

    for (const exp of running) {
      const expId = String(exp.id);

      const { data: variants } = await supabase
        .from("experiment_variants")
        .select("variant_key,config,traffic_percent")
        .eq("experiment_id", expId)
        .limit(20);
      if (!variants || variants.length === 0) continue;

      const { data: assignment } = await supabase
        .from("experiment_assignments")
        .select("variant_key")
        .eq("experiment_id", expId)
        .eq("user_bucket", bucket)
        .maybeSingle();

      let variantKey = assignment?.variant_key ? String(assignment.variant_key) : "";
      if (!variantKey) {
        const pct = hashToPercent(`${bucket}:${expId}`);
        variantKey = pickVariantKey(variants as any[], pct);
        await supabase
          .from("experiment_assignments")
          .upsert(
            { experiment_id: expId, user_bucket: bucket, variant_key: variantKey },
            { onConflict: "experiment_id,user_bucket" },
          );
      }

      const chosen = (variants as any[]).find((v) => String(v.variant_key) === variantKey) || (variants as any[])[0];
      const overrides = normalizeOverrides(chosen?.config);
      for (const o of overrides) {
        const k = (o?.feature_key || o?.analytics_key || "").toString();
        const route = (o?.route || "").toString();
        const target = (k && byAnalyticsKey.get(k)) || (route && byRoute.get(route)) || null;
        if (!target) continue;

        if (o.title != null) target.title = String(o.title);
        if (o.subtitle !== undefined) target.subtitle = o.subtitle;
        if (o.icon != null) target.icon = String(o.icon);
        if (o.bg_color != null) target.bg_color = String(o.bg_color);
        if (o.text_color != null) target.text_color = String(o.text_color);
        if (o.visible != null) target.visible = !!o.visible;

        target.experiment_id = expId;
        target.variant = String(variantKey);
      }
    }

    // Safety: don't allow experiments to hide everything.
    const hasAnyVisible = rows.some((r) => r && r.visible !== false);
    if (!hasAnyVisible) {
      rows = baseRows;
    }

    rows = rows.filter((r) => r && r.visible !== false);
    rows.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    return c.json({ success: true, data: rows });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

// Public: User App must call this
app.get("/make-server-4a075ebc/api/dashboard/features", listDashboardFeatures);
// Alias route (no prefix) for compatibility
app.get("/api/dashboard/features", listDashboardFeatures);
// STEP 5 canonical alias
app.get("/dashboard/features", listDashboardFeatures);
app.get("/make-server-4a075ebc/dashboard/features", listDashboardFeatures);

// ========================================
// ADMIN: Dashboard Feature Manager
// ========================================

async function adminListDashboardFeatures(c: any) {
  try {
    const includeDeleted = c.req.query("includeDeleted") === "true";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("dashboard_features")
      .select(
        "id,title,subtitle,icon,bg_color,text_color,route,order_index,visible,analytics_key,deleted_at,created_at,updated_at",
      )
      .order("order_index", { ascending: true });

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayStartIso = dayStart.toISOString();

    const { data: clicksRows, error: clicksError } = await supabase
      .from("analytics_events")
      .select("feature_key")
      .eq("event_name", "feature_card_click")
      .gte("created_at", dayStartIso);

    const clicksByFeatureKey: Record<string, number> = {};
    if (!clicksError && Array.isArray(clicksRows)) {
      for (const row of clicksRows as any[]) {
        const k = row?.feature_key;
        if (!k) continue;
        clicksByFeatureKey[k] = (clicksByFeatureKey[k] || 0) + 1;
      }
    }

    const enriched = (data || []).map((f: any) => ({
      ...f,
      today_clicks: clicksByFeatureKey[f.analytics_key] || 0,
    }));

    return c.json({ success: true, data: enriched });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function adminCreateDashboardFeature(c: any) {
  try {
    const body = await c.req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insertData = {
      title: body.title,
      subtitle: body.subtitle ?? null,
      icon: body.icon,
      bg_color: body.bg_color,
      text_color: body.text_color,
      route: body.route,
      order_index: typeof body.order_index === "number" ? body.order_index : 0,
      visible: body.visible !== undefined ? !!body.visible : true,
      analytics_key: body.analytics_key,
    };

    const { data, error } = await supabase
      .from("dashboard_features")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function adminReorderDashboardFeatures(c: any) {
  try {
    const body = await c.req.json();
    const orderedIds = (body?.ordered_ids || []) as string[];

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return c.json({ success: false, error: "ordered_ids array required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const updates = orderedIds.map((id, idx) =>
      supabase.from("dashboard_features").update({ order_index: idx }).eq("id", id),
    );

    const results = await Promise.all(updates);
    const firstError = results.find((r: any) => r?.error)?.error;
    if (firstError) {
      return c.json({ success: false, error: firstError.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function adminUpdateDashboardFeature(c: any) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const { analytics_key, id: _id, created_at, updated_at, deleted_at, ...safeBody } = body || {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("dashboard_features")
      .update(safeBody)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function adminSoftDeleteDashboardFeature(c: any) {
  try {
    const id = c.req.param("id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("dashboard_features")
      .update({ deleted_at: new Date().toISOString(), visible: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function adminRestoreDashboardFeature(c: any) {
  try {
    const id = c.req.param("id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("dashboard_features")
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.get("/make-server-4a075ebc/api/admin/dashboard/features", adminListDashboardFeatures);
app.get("/api/admin/dashboard/features", adminListDashboardFeatures);

app.post("/make-server-4a075ebc/api/admin/dashboard/features", adminCreateDashboardFeature);
app.post("/api/admin/dashboard/features", adminCreateDashboardFeature);

app.put("/make-server-4a075ebc/api/admin/dashboard/features/reorder", adminReorderDashboardFeatures);
app.put("/api/admin/dashboard/features/reorder", adminReorderDashboardFeatures);

app.put("/make-server-4a075ebc/api/admin/dashboard/features/:id", adminUpdateDashboardFeature);
app.put("/api/admin/dashboard/features/:id", adminUpdateDashboardFeature);

app.post("/make-server-4a075ebc/api/admin/dashboard/features/:id/delete", adminSoftDeleteDashboardFeature);
app.post("/api/admin/dashboard/features/:id/delete", adminSoftDeleteDashboardFeature);

app.post("/make-server-4a075ebc/api/admin/dashboard/features/:id/restore", adminRestoreDashboardFeature);
app.post("/api/admin/dashboard/features/:id/restore", adminRestoreDashboardFeature);

app.post("/make-server-4a075ebc/api/admin/dashboard/features/seed", adminSeedDashboardFeatures);
app.post("/api/admin/dashboard/features/seed", adminSeedDashboardFeatures);

// ========================================
// UNIVERSAL ANALYTICS (Mixpanel-style events)
// ========================================

function sanitizeAnalyticsMetadata(input: any) {
  const allow = new Set([
    "feature_key",
    "button_name",
    "page_name",
    "card_position",
    "source",
    "seconds",
    "duration_seconds",
    "idle_seconds",
    "from",
    "to",
    "timestamp",
    "app_version",
    "user_agent",
    "platform",
    "total_duration_seconds",
    "idle_duration_seconds",
    "active_duration_seconds",
    "experiment_id",
    "variant",
    "route",
    "page",
  ]);

  const out: Record<string, any> = {};
  const obj = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  for (const [k, v] of Object.entries(obj)) {
    if (!allow.has(k)) continue;
    if (v == null) continue;
    if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      if (v.length > 200) continue;
      out[k] = v;
      continue;
    }
  }
  return out;
}

async function ingestAnalyticsEvents(c: any) {
  // Fail-silent: always return 200
  try {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ success: true, ingested: 0 });
    }

    if (body?.consent?.analytics === false) {
      return c.json({ success: true, ingested: 0 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const session = body.session || null;
    const rawEvents = Array.isArray(body.events)
      ? body.events
      : body.event
        ? [body.event]
        : [];

    const events = rawEvents
      .filter((e: any) => e && (e.event_name || e.event_type))
      .slice(0, 50)
      .map((e: any) => ({
        event_name: e.event_name ?? null,
        feature_key: e.feature_key ?? null,
        page: e.page ?? null,
        route: e.route ?? null,
        user_id: e.user_id ?? null,
        session_id: e.session_id ?? null,
        metadata: sanitizeAnalyticsMetadata(e.metadata ?? {}),

        // Legacy compatibility
        event_type: e.event_type ?? null,
        object_type: e.object_type ?? null,
        object_id: e.object_id ?? null,
        properties: e.properties ?? null,
      }));

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return (await Promise.race([
        p,
        new Promise<T>((_resolve, reject) => {
          setTimeout(() => reject(new Error("timeout")), ms);
        }),
      ])) as T;
    };

    if (session?.id) {
      try {
        await withTimeout(
          supabase.from("analytics_sessions").upsert(
            {
              id: session.id,
              user_id: session.user_id ?? null,
              device: session.device ?? null,
              platform: session.platform ?? null,
              app_version: session.app_version ?? null,
              started_at: session.started_at ?? new Date().toISOString(),
              ended_at: session.ended_at ?? null,
              total_duration_seconds: session.total_duration_seconds ?? 0,
              idle_duration_seconds: session.idle_duration_seconds ?? 0,
              active_duration_seconds: session.active_duration_seconds ?? 0,
            },
            { onConflict: "id", returning: "minimal" },
          ),
          950,
        );
      } catch (e: any) {
        try {
          await supabase.from("analytics_system_logs").insert(
            { type: "ingest_session_error", message: String(e?.message || e) },
            { returning: "minimal" },
          );
        } catch {
          // ignore
        }
      }
    }

    if (events.length > 0) {
      try {
        await withTimeout(
          supabase.from("analytics_events").insert(events, { returning: "minimal" }),
          950,
        );
      } catch (e: any) {
        try {
          await supabase.from("analytics_system_logs").insert(
            { type: "ingest_event_error", message: String(e?.message || e) },
            { returning: "minimal" },
          );
        } catch {
          // ignore
        }
      }
    }

    return c.json({ success: true, ingested: events.length });
  } catch (_error: any) {
    return c.json({ success: true, ingested: 0 });
  }
}

app.post("/make-server-4a075ebc/api/analytics/event", ingestAnalyticsEvents);
app.post("/make-server-4a075ebc/api/analytics/events", ingestAnalyticsEvents);
app.post("/make-server-4a075ebc/api/analytics/collect", ingestAnalyticsEvents);
app.post("/api/analytics/event", ingestAnalyticsEvents);
app.post("/api/analytics/events", ingestAnalyticsEvents);
app.post("/api/analytics/collect", ingestAnalyticsEvents);
app.post("/analytics/collect", ingestAnalyticsEvents);

async function deleteUserAnalyticsData(c: any) {
  try {
    const body = await c.req.json().catch(() => null);
    const userId = body?.user_id || body?.userId;
    if (!userId) return c.json({ success: false, error: "Missing user_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const evRes = await supabase.from("analytics_events").delete().eq("user_id", userId);
    if (evRes.error) return c.json({ success: false, error: evRes.error.message }, 500);

    const sessRes = await supabase.from("analytics_sessions").delete().eq("user_id", userId);
    if (sessRes.error) return c.json({ success: false, error: sessRes.error.message }, 500);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.post("/make-server-4a075ebc/api/admin/analytics/delete-user-data", deleteUserAnalyticsData);
app.post("/api/admin/analytics/delete-user-data", deleteUserAnalyticsData);

async function purgeOldAnalytics(c: any) {
  try {
    const cronSecret = Deno.env.get("ANALYTICS_CRON_SECRET") || null;
    if (cronSecret) {
      const provided = c.req.header("x-analytics-cron-secret") || c.req.header("x-cron-secret") || "";
      if (provided !== cronSecret) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
      }
    }

    const body = await c.req.json().catch(() => ({}));
    const retentionDays = Math.min(Math.max(parseInt(String(body?.retention_days ?? "90"), 10) || 90, 7), 365);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const res = await supabase.rpc("purge_old_analytics", { retention_days: retentionDays });
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);

    return c.json({ success: true, retention_days: retentionDays });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.post("/make-server-4a075ebc/api/analytics/purge", purgeOldAnalytics);
app.post("/api/analytics/purge", purgeOldAnalytics);

// Session finalization endpoint (STEP 5)
// Fail-silent: should never block user UX.
async function finalizeAnalyticsSession(c: any) {
  try {
    const body = await c.req.json().catch(() => null);
    const sessionId = body?.session_id || body?.id;
    if (!sessionId) {
      return c.json({ success: true });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("analytics_sessions")
      .upsert(
        {
          id: sessionId,
          ended_at: body?.ended_at ?? new Date().toISOString(),
          total_duration_seconds: body?.total ?? body?.total_duration_seconds ?? 0,
          idle_duration_seconds: body?.idle ?? body?.idle_duration_seconds ?? 0,
          active_duration_seconds: body?.active ?? body?.active_duration_seconds ?? 0,
        },
        { onConflict: "id" },
      );

    return c.json({ success: true });
  } catch (_error: any) {
    return c.json({ success: true });
  }
}

app.post("/make-server-4a075ebc/api/analytics/session-end", finalizeAnalyticsSession);
app.post("/api/analytics/session-end", finalizeAnalyticsSession);
app.post("/analytics/session-end", finalizeAnalyticsSession);

function utcDateStringFromIso(iso: string) {
  const dt = new Date(iso);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function resolveAggregateWindow(params: { from?: string; to?: string; mode?: string }) {
  const now = new Date();
  const mode = (params.mode || "hourly").toLowerCase();
  const to = params.to ? new Date(params.to) : now;
  const from = params.from
    ? new Date(params.from)
    : mode === "daily"
      ? new Date(to.getTime() - 24 * 60 * 60 * 1000)
      : new Date(to.getTime() - 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString(), mode };
}

function truncateUtcToHour(iso: string) {
  const dt = new Date(iso);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), dt.getUTCHours(), 0, 0, 0)).toISOString();
}

function truncateUtcToDay(iso: string) {
  const dt = new Date(iso);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function utcDayRangeForIsoDay(dayIso: string) {
  const start = new Date(`${dayIso}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

async function runDailyRollups(c: any) {
  try {
    const cronSecret = Deno.env.get("ANALYTICS_CRON_SECRET") || null;
    if (cronSecret) {
      const provided = c.req.header("x-analytics-cron-secret") || c.req.header("x-cron-secret") || "";
      if (provided !== cronSecret) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
      }
    }

    const body = await c.req.json().catch(() => ({}));
    const queryDay = c.req.query ? c.req.query("day") : null;
    const queryFrom = c.req.query ? c.req.query("from") : null;
    const queryTo = c.req.query ? c.req.query("to") : null;

    // Default: roll up yesterday (UTC)
    const now = new Date();
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const defaultDay = yesterday.toISOString().slice(0, 10);

    const day = (body?.day as string | undefined) ?? (queryDay || defaultDay);
    const range = queryFrom && queryTo
      ? { from: queryFrom, to: queryTo }
      : body?.from && body?.to
        ? { from: body.from as string, to: body.to as string }
        : utcDayRangeForIsoDay(day);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // DB-side rollups (cheap + indexed)
    const featureRes = await supabase.rpc("rollup_daily_feature_stats", { from_ts: range.from, to_ts: range.to });
    if (featureRes.error) return c.json({ success: false, error: featureRes.error.message }, 500);

    const sessionRes = await supabase.rpc("rollup_daily_session_stats", { from_ts: range.from, to_ts: range.to });
    if (sessionRes.error) return c.json({ success: false, error: sessionRes.error.message }, 500);

    const pageRes = await supabase.rpc("rollup_daily_page_stats", { from_ts: range.from, to_ts: range.to });
    if (pageRes.error) return c.json({ success: false, error: pageRes.error.message }, 500);

    return c.json({ success: true, window: range });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function runFeatureHourlyAggregate(c: any) {
  try {
    const cronSecret = Deno.env.get("ANALYTICS_CRON_SECRET") || null;
    if (cronSecret) {
      const provided = c.req.header("x-analytics-cron-secret") || c.req.header("x-cron-secret") || "";
      if (provided !== cronSecret) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
      }
    }

    const body = await c.req.json().catch(() => ({}));
    const queryFrom = c.req.query ? c.req.query("from") : null;
    const queryTo = c.req.query ? c.req.query("to") : null;

    const nowIso = new Date().toISOString();
    const to = (body?.to as string | undefined) ?? (queryTo || nowIso);
    const from = (body?.from as string | undefined) ?? (queryFrom || new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const bucketHour = truncateUtcToHour(to);
    const bucketDate = bucketHour.slice(0, 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_name,feature_key,created_at")
      .in("event_name", ["feature_card_impression", "feature_card_click"])
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(50000);
    if (error) return c.json({ success: false, error: error.message }, 500);

    const map: Record<string, { impressions: number; clicks: number }> = {};
    for (const row of (data || []) as any[]) {
      const k = row?.feature_key;
      if (!k) continue;
      if (!map[k]) map[k] = { impressions: 0, clicks: 0 };
      if (row.event_name === "feature_card_impression") map[k].impressions += 1;
      if (row.event_name === "feature_card_click") {
        map[k].clicks += 1;
      }
    }

    const upserts = Object.keys(map).map((feature_key) => ({
      feature_key,
      hour: bucketHour,
      impressions: map[feature_key].impressions,
      clicks: map[feature_key].clicks,
    }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("analytics_feature_stats_hourly")
        .upsert(upserts, { onConflict: "feature_key,hour" });
      if (upsertError) return c.json({ success: false, error: upsertError.message }, 500);
    }

    return c.json({ success: true, bucket: { from, to, hour: bucketHour }, upserted: upserts.length });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function runAnalyticsAggregateInternal(c: any, modeOverride?: string) {
  try {
    const cronSecret = Deno.env.get("ANALYTICS_CRON_SECRET") || null;
    if (cronSecret) {
      const provided = c.req.header("x-analytics-cron-secret") || c.req.header("x-cron-secret") || "";
      if (provided !== cronSecret) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
      }
    }

    const body = await c.req.json().catch(() => ({}));
    const queryMode = c.req.query ? c.req.query("mode") : null;
    const queryFrom = c.req.query ? c.req.query("from") : null;
    const queryTo = c.req.query ? c.req.query("to") : null;

    const { from, to, mode } = resolveAggregateWindow({
      from: (body?.from as string | undefined) ?? (queryFrom || undefined),
      to: (body?.to as string | undefined) ?? (queryTo || undefined),
      mode: modeOverride ?? (body?.mode as string | undefined) ?? (queryMode || undefined),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ----------------------------------------
    // 1) PAGE STATS
    // ----------------------------------------
    let pageQuery = supabase
      .from("analytics_events")
      .select("event_name,route,page,created_at,metadata")
      .in("event_name", ["page_enter", "time_spent", "scroll_100"]) 
      .order("created_at", { ascending: true })
      .limit(50000);
    pageQuery = pageQuery.gte("created_at", from).lte("created_at", to);
    const { data: pageEvents, error: pageErr } = await pageQuery;
    if (pageErr) return c.json({ success: false, error: pageErr.message }, 500);

    const pageAgg: Record<
      string,
      { page: string; date: string; views: number; timeSum: number; timeCount: number; scroll100: number }
    > = {};

    for (const row of (pageEvents || []) as any[]) {
      const date = utcDateStringFromIso(row.created_at);
      const page = row.page || row.route || "unknown";
      const key = `${page}::${date}`;
      if (!pageAgg[key]) pageAgg[key] = { page, date, views: 0, timeSum: 0, timeCount: 0, scroll100: 0 };
      if (row.event_name === "page_enter") {
        pageAgg[key].views += 1;
      } else if (row.event_name === "scroll_100") {
        pageAgg[key].scroll100 += 1;
      } else if (row.event_name === "time_spent") {
        const seconds = Number(row?.metadata?.seconds ?? row?.metadata?.duration_seconds ?? 0);
        if (Number.isFinite(seconds) && seconds > 0) {
          pageAgg[key].timeSum += seconds;
          pageAgg[key].timeCount += 1;
        }
      }
    }

    const pageUpserts = Object.values(pageAgg).map((r) => ({
      page: r.page,
      date: r.date,
      views: r.views,
      avg_time_seconds: r.timeCount > 0 ? Math.round(r.timeSum / r.timeCount) : 0,
      scroll_100_percent: r.scroll100,
    }));

    if (pageUpserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("analytics_page_stats")
        .upsert(pageUpserts, { onConflict: "page,date" });
      if (upsertError) return c.json({ success: false, error: upsertError.message }, 500);
    }

    // ----------------------------------------
    // 2) FEATURE STATS
    // ----------------------------------------
    const featuresRes = await supabase
      .from("dashboard_features")
      .select("analytics_key,route")
      .is("deleted_at", null)
      .limit(500);
    const routeToFeatureKey: Record<string, string> = {};
    for (const f of (featuresRes.data || []) as any[]) {
      if (f?.route && f?.analytics_key) routeToFeatureKey[f.route] = f.analytics_key;
    }

    let featureQuery = supabase
      .from("analytics_events")
      .select("event_name,feature_key,route,created_at,metadata")
      .in("event_name", ["feature_card_impression", "feature_card_click", "time_spent"]) 
      .order("created_at", { ascending: true })
      .limit(50000);
    featureQuery = featureQuery.gte("created_at", from).lte("created_at", to);
    const { data: featureEvents, error: featureErr } = await featureQuery;
    if (featureErr) return c.json({ success: false, error: featureErr.message }, 500);

    const featureAgg: Record<
      string,
      {
        feature_key: string;
        date: string;
        impressions: number;
        clicks: number;
        timeSum: number;
        timeN: number;
        lastClickedAt: string | null;
      }
    > = {};

    for (const row of (featureEvents || []) as any[]) {
      const date = utcDateStringFromIso(row.created_at);
      const mappedKey = row.feature_key || (row.route ? routeToFeatureKey[row.route] : null) || null;
      if (!mappedKey) continue;

      const key = `${mappedKey}::${date}`;
      if (!featureAgg[key]) {
        featureAgg[key] = {
          feature_key: mappedKey,
          date,
          impressions: 0,
          clicks: 0,
          timeSum: 0,
          timeN: 0,
          lastClickedAt: null,
        };
      }

      if (row.event_name === "feature_card_impression") {
        featureAgg[key].impressions += 1;
      } else if (row.event_name === "feature_card_click") {
        featureAgg[key].clicks += 1;
        if (!featureAgg[key].lastClickedAt || row.created_at > featureAgg[key].lastClickedAt) {
          featureAgg[key].lastClickedAt = row.created_at;
        }
      } else if (row.event_name === "time_spent") {
        // time_spent is keyed by route; we mapped route -> feature_key above.
        const seconds = Number(row?.metadata?.seconds ?? row?.metadata?.duration_seconds ?? 0);
        if (Number.isFinite(seconds) && seconds > 0) {
          featureAgg[key].timeSum += seconds;
          featureAgg[key].timeN += 1;
        }
      }
    }

    const featureUpserts = Object.values(featureAgg).map((r) => ({
      feature_key: r.feature_key,
      date: r.date,
      impressions: r.impressions,
      clicks: r.clicks,
      avg_time_seconds: r.timeN > 0 ? Math.round(r.timeSum / r.timeN) : 0,
      last_clicked_at: r.lastClickedAt,
    }));

    if (featureUpserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("analytics_feature_stats")
        .upsert(featureUpserts, { onConflict: "feature_key,date" });
      if (upsertError) return c.json({ success: false, error: upsertError.message }, 500);
    }

    // ----------------------------------------
    // 3) SESSION STATS
    // ----------------------------------------
    let sessionQuery = supabase
      .from("analytics_sessions")
      .select("user_id,total_duration_seconds,active_duration_seconds,idle_duration_seconds,started_at")
      .order("started_at", { ascending: true })
      .limit(20000);
    sessionQuery = sessionQuery.gte("started_at", from).lte("started_at", to);
    const { data: sessions, error: sessionErr } = await sessionQuery;
    if (sessionErr) return c.json({ success: false, error: sessionErr.message }, 500);

    const sessionAgg: Record<
      string,
      {
        date: string;
        sessions: number;
        users: Set<string>;
        sumTotal: number;
        sumActive: number;
        sumIdle: number;
      }
    > = {};

    for (const s of (sessions || []) as any[]) {
      if (!s?.started_at) continue;
      const date = utcDateStringFromIso(s.started_at);
      if (!sessionAgg[date]) {
        sessionAgg[date] = {
          date,
          sessions: 0,
          users: new Set<string>(),
          sumTotal: 0,
          sumActive: 0,
          sumIdle: 0,
        };
      }

      sessionAgg[date].sessions += 1;
      if (s.user_id) sessionAgg[date].users.add(String(s.user_id));
      sessionAgg[date].sumTotal += Number(s.total_duration_seconds || 0);
      sessionAgg[date].sumActive += Number(s.active_duration_seconds || 0);
      sessionAgg[date].sumIdle += Number(s.idle_duration_seconds || 0);
    }

    const sessionUpserts = Object.values(sessionAgg).map((r) => ({
      date: r.date,
      sessions: r.sessions,
      unique_users: r.users.size,
      avg_total_duration_seconds: r.sessions > 0 ? Math.round(r.sumTotal / r.sessions) : 0,
      avg_active_duration_seconds: r.sessions > 0 ? Math.round(r.sumActive / r.sessions) : 0,
      avg_idle_duration_seconds: r.sessions > 0 ? Math.round(r.sumIdle / r.sessions) : 0,
    }));

    if (sessionUpserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("analytics_session_stats")
        .upsert(sessionUpserts, { onConflict: "date" });
      if (upsertError) return c.json({ success: false, error: upsertError.message }, 500);
    }

    return c.json({
      success: true,
      window: { from, to, mode },
      upserted: {
        analytics_page_stats: pageUpserts.length,
        analytics_feature_stats: featureUpserts.length,
        analytics_session_stats: sessionUpserts.length,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function runAnalyticsAggregate(c: any) {
  return runAnalyticsAggregateInternal(c);
}

app.post("/make-server-4a075ebc/api/analytics/aggregate", runAnalyticsAggregate);
app.post("/api/analytics/aggregate", runAnalyticsAggregate);
app.post("/analytics/aggregate", runAnalyticsAggregate);

// STEP 5 explicit hourly/daily endpoints
app.post("/make-server-4a075ebc/api/analytics/aggregate-hourly", runFeatureHourlyAggregate);
app.post("/api/analytics/aggregate-hourly", runFeatureHourlyAggregate);
app.post("/analytics/aggregate-hourly", runFeatureHourlyAggregate);

app.post("/make-server-4a075ebc/api/analytics/aggregate-daily", runDailyRollups);
app.post("/api/analytics/aggregate-daily", runDailyRollups);
app.post("/analytics/aggregate-daily", runDailyRollups);

app.get("/make-server-4a075ebc/api/admin/analytics/events", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const eventName = c.req.query("event_name");
    const featureKey = c.req.query("feature_key");
    const page = c.req.query("page");
    const route = c.req.query("route");
    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));
    const before = c.req.query("before");
    const limit = Math.min(parseInt(c.req.query("limit") || "100", 10) || 100, 100);

    let query = supabase
      .from("analytics_events")
      .select("id,event_name,feature_key,page,route,user_id,session_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventName) query = query.eq("event_name", eventName);
    if (featureKey) query = query.eq("feature_key", featureKey);
    if (page) query = query.eq("page", page);
    if (route) query = query.eq("route", route);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (before) query = query.lt("created_at", before);

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ... (rest of the code remains the same)
function clampIsoRange(from?: string | null, to?: string | null) {
  const MAX_RANGE_DAYS = 90;
  const end = to ? new Date(to) : new Date();
  const safeEnd = Number.isFinite(end.getTime()) ? end : new Date();
  const startRaw = from ? new Date(from) : new Date(safeEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const safeStart = Number.isFinite(startRaw.getTime()) ? startRaw : new Date(safeEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const maxStart = new Date(safeEnd.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
  const start = safeStart < maxStart ? maxStart : safeStart;
  return { from: start.toISOString(), to: safeEnd.toISOString() };
}

type InsightSeverity = "low" | "medium" | "high";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function severityWeight(s: string) {
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

async function shouldInsertInsight(params: {
  supabase: any;
  insight_type: string;
  related_feature_key?: string | null;
  related_page?: string | null;
  cooldown_days: number;
}) {
  const { supabase, insight_type, related_feature_key, related_page, cooldown_days } = params;
  let q = supabase
    .from("analytics_insights")
    .select("id,acknowledged,created_at")
    .eq("insight_type", insight_type)
    .order("created_at", { ascending: false })
    .limit(1);

  if (related_feature_key == null) q = q.is("related_feature_key", null);
  else q = q.eq("related_feature_key", related_feature_key);

  if (related_page == null) q = q.is("related_page", null);
  else q = q.eq("related_page", related_page);

  const res = await q;
  if (res.error) return true;
  const row = (res.data || [])[0] as any;
  if (!row) return true;

  if (row.acknowledged === false) return false;

  const createdAt = new Date(String(row.created_at || ""));
  if (!Number.isFinite(createdAt.getTime())) return true;
  const cutoff = Date.now() - cooldown_days * 24 * 60 * 60 * 1000;
  if (createdAt.getTime() > cutoff) return false;
  return true;
}

async function insertInsight(params: {
  supabase: any;
  insight_type: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  recommendation: string;
  related_feature_key?: string | null;
  related_page?: string | null;
  metric_snapshot: any;
}) {
  const {
    supabase,
    insight_type,
    severity,
    title,
    description,
    recommendation,
    related_feature_key,
    related_page,
    metric_snapshot,
  } = params;

  const res = await supabase.from("analytics_insights").insert(
    {
      insight_type,
      severity,
      title,
      description,
      recommendation,
      related_feature_key: related_feature_key ?? null,
      related_page: related_page ?? null,
      metric_snapshot: metric_snapshot ?? {},
      acknowledged: false,
    },
    { returning: "minimal" } as any,
  );
  return res;
}

function getCronSecretOk(c: any) {
  const expected = Deno.env.get("INSIGHTS_CRON_SECRET") || "";
  if (!expected) return false;
  const got = String(c.req.header("x-insights-token") || "");
  return got && got === expected;
}

async function generateAnalyticsInsights(c: any) {
  try {
    const cronOk = getCronSecretOk(c);
    if (!cronOk) {
      const guard = await requireAdmin(c);
      if (!guard.ok) return guard.response;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const toDay = isoDay(now);
    const from7 = isoDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const from14 = isoDay(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
    const from21 = isoDay(new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000));

    const featuresRes = await supabase
      .from("dashboard_features")
      .select("id,title,route,order_index,visible,analytics_key,deleted_at")
      .is("deleted_at", null)
      .limit(500);
    const features = (featuresRes.data || []) as any[];
    const featureTitleByKey: Record<string, string> = {};
    const featureIdByKey: Record<string, string> = {};
    for (const f of features) {
      if (f?.analytics_key) {
        featureTitleByKey[String(f.analytics_key)] = String(f.title || f.analytics_key);
        featureIdByKey[String(f.analytics_key)] = String(f.id);
      }
    }

    const sessionAvgRes = await supabase
      .from("analytics_session_stats")
      .select("date,sessions,avg_active_duration_seconds")
      .gte("date", from7)
      .lte("date", toDay)
      .limit(200);
    const sessionRows = (sessionAvgRes.data || []) as any[];
    const appSessions = sessionRows.reduce((sum, r) => sum + (r?.sessions || 0), 0);
    const appAvgActiveSeconds = appSessions > 0
      ? sessionRows.reduce((sum, r) => sum + (r?.avg_active_duration_seconds || 0) * (r?.sessions || 0), 0) / appSessions
      : 0;

    const stats14Res = await supabase
      .from("analytics_feature_stats")
      .select("feature_key,date,impressions,clicks,avg_time_seconds")
      .gte("date", from14)
      .lte("date", toDay)
      .limit(20000);
    const stats14 = (stats14Res.data || []) as any[];

    const featureAgg: Record<string, any> = {};
    const featurePrevAgg: Record<string, any> = {};
    for (const r of stats14) {
      const k = String(r?.feature_key || "unknown");
      const date = String(r?.date || "");
      const isLast7 = date >= from7;
      const target = isLast7 ? featureAgg : featurePrevAgg;
      if (!target[k]) target[k] = { impressions: 0, clicks: 0, time_sum: 0, time_n: 0 };
      target[k].impressions += r?.impressions || 0;
      target[k].clicks += r?.clicks || 0;
      if (typeof r?.avg_time_seconds === "number" && r.avg_time_seconds > 0) {
        target[k].time_sum += r.avg_time_seconds;
        target[k].time_n += 1;
      }
    }

    // INSIGHT 1 — UNDERPERFORMING FEATURE
    for (const k of Object.keys(featureAgg)) {
      const a = featureAgg[k];
      const impressions = a?.impressions || 0;
      const clicks = a?.clicks || 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      if (!(impressions >= 500 && ctr < 0.01)) continue;

      const ok = await shouldInsertInsight({
        supabase,
        insight_type: "UNDERPERFORMING_FEATURE",
        related_feature_key: k,
        related_page: null,
        cooldown_days: 7,
      });
      if (!ok) continue;

      const title = "இந்த அம்சம் கவனிக்கப்படவில்லை";
      const fTitle = (featureTitleByKey[k] || k).replace(/\n/g, " ").trim();
      const description = `“‘${fTitle}’ அதிகமாக காட்டப்படுகிறது, ஆனால் பயனர்கள் கிளிக் செய்யவில்லை.”`;
      const recommendation = "Move card higher OR Change title/icon OR Hide feature temporarily";

      await insertInsight({
        supabase,
        insight_type: "UNDERPERFORMING_FEATURE",
        severity: "medium",
        title,
        description,
        recommendation,
        related_feature_key: k,
        related_page: null,
        metric_snapshot: {
          window_days: 7,
          impressions,
          clicks,
          ctr,
          thresholds: { impressions_gte: 500, ctr_lt: 0.01 },
        },
      });
    }

    // INSIGHT 2 — HIGH ENGAGEMENT FEATURE
    for (const k of Object.keys(featureAgg)) {
      const a = featureAgg[k];
      const impressions = a?.impressions || 0;
      const clicks = a?.clicks || 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const avgTime = a?.time_n > 0 ? a.time_sum / a.time_n : 0;
      if (!(ctr > 0.15 && avgTime > appAvgActiveSeconds)) continue;

      const ok = await shouldInsertInsight({
        supabase,
        insight_type: "HIGH_ENGAGEMENT_FEATURE",
        related_feature_key: k,
        related_page: null,
        cooldown_days: 7,
      });
      if (!ok) continue;

      const title = "இந்த அம்சம் பயனர்களை ஈர்க்கிறது";
      const recommendation = "Keep this feature above the fold\nConsider related features";

      await insertInsight({
        supabase,
        insight_type: "HIGH_ENGAGEMENT_FEATURE",
        severity: "low",
        title,
        description: "High CTR and above-average engagement time.",
        recommendation,
        related_feature_key: k,
        related_page: null,
        metric_snapshot: {
          window_days: 7,
          impressions,
          clicks,
          ctr,
          avg_time_seconds: avgTime,
          app_avg_active_time_seconds: appAvgActiveSeconds,
          thresholds: { ctr_gt: 0.15, avg_time_gt_app_avg: true },
        },
      });
    }

    // INSIGHT 4 — UNUSED FEATURE
    for (const k of Object.keys(featureAgg)) {
      const all14 = (featureAgg[k]?.impressions || 0) + (featurePrevAgg[k]?.impressions || 0);
      const clicks14 = (featureAgg[k]?.clicks || 0) + (featurePrevAgg[k]?.clicks || 0);
      if (!(all14 > 0 && clicks14 === 0)) continue;

      const ok = await shouldInsertInsight({
        supabase,
        insight_type: "UNUSED_FEATURE",
        related_feature_key: k,
        related_page: null,
        cooldown_days: 14,
      });
      if (!ok) continue;

      const title = "இந்த அம்சம் பயன்படுத்தப்படவில்லை";
      const recommendation = "Hide feature\nOr test new placement";

      await insertInsight({
        supabase,
        insight_type: "UNUSED_FEATURE",
        severity: "medium",
        title,
        description: "Impressions exist but clicks remain zero in the last 14 days.",
        recommendation,
        related_feature_key: k,
        related_page: null,
        metric_snapshot: {
          window_days: 14,
          impressions: all14,
          clicks: clicks14,
          thresholds: { impressions_gt: 0, clicks_eq: 0 },
        },
      });
    }

    // INSIGHT 6 — SUDDEN SPIKE / DROP (total events)
    const sess21Res = await supabase
      .from("analytics_session_stats")
      .select("date,total_events")
      .gte("date", from21)
      .lte("date", toDay)
      .limit(500);
    const sess21 = (sess21Res.data || []) as any[];
    const last7Events = sess21
      .filter((r) => String(r?.date || "") >= from7)
      .reduce((sum, r) => sum + (r?.total_events || 0), 0);
    const prev7Events = sess21
      .filter((r) => String(r?.date || "") < from7 && String(r?.date || "") >= from14)
      .reduce((sum, r) => sum + (r?.total_events || 0), 0);
    if (prev7Events > 0) {
      const ratio = last7Events / prev7Events;
      if (ratio >= 1.5 || ratio <= 0.5) {
        const ok = await shouldInsertInsight({
          supabase,
          insight_type: "SUDDEN_SPIKE_DROP",
          related_feature_key: null,
          related_page: null,
          cooldown_days: 7,
        });
        if (ok) {
          const title = "பயன்பாட்டில் திடீர் மாற்றம்";
          const recommendation = "Check recent changes\nVerify data accuracy";
          await insertInsight({
            supabase,
            insight_type: "SUDDEN_SPIKE_DROP",
            severity: "high",
            title,
            description: "Usage changed significantly compared to the previous week.",
            recommendation,
            related_feature_key: null,
            related_page: null,
            metric_snapshot: {
              window_days: 7,
              last_7_total_events: last7Events,
              prev_7_total_events: prev7Events,
              ratio,
              change_percent: (ratio - 1) * 100,
              thresholds: { ratio_gte: 1.5, ratio_lte: 0.5 },
            },
          });
        }
      }
    }

    // INSIGHT 3 — DROPOFF PAGE
    const pageStatsRes = await supabase
      .from("analytics_page_stats")
      .select("page,date,views,scroll_50_sessions")
      .gte("date", from7)
      .lte("date", toDay)
      .limit(20000);
    const pageStats = (pageStatsRes.data || []) as any[];
    const pageAgg: Record<string, { views: number; scroll50: number }> = {};
    for (const r of pageStats) {
      const p = String(r?.page || "unknown");
      if (!pageAgg[p]) pageAgg[p] = { views: 0, scroll50: 0 };
      pageAgg[p].views += r?.views || 0;
      pageAgg[p].scroll50 += r?.scroll_50_sessions || 0;
    }
    const topPages = Object.keys(pageAgg)
      .map((p) => ({ page: p, views: pageAgg[p].views, scroll50: pageAgg[p].scroll50 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    for (const p of topPages) {
      if (p.views < 200) continue;
      const ratio = p.views > 0 ? p.scroll50 / p.views : 0;
      if (!(ratio < 0.3)) continue;

      const ok = await shouldInsertInsight({
        supabase,
        insight_type: "DROPOFF_PAGE",
        related_feature_key: null,
        related_page: p.page,
        cooldown_days: 7,
      });
      if (!ok) continue;

      const rawScrollRes = await supabase
        .from("analytics_events")
        .select("id", { count: "estimated", head: true })
        .eq("event_name", "scroll_50")
        .or(`page.eq.${p.page},route.eq.${p.page}`)
        .gte("created_at", `${from7}T00:00:00.000Z`)
        .lte("created_at", `${toDay}T23:59:59.999Z`);

      const title = "இந்த பக்கம் பயனர்களை இழக்கிறது";
      const recommendation = "Reduce content length\nImprove first screen clarity";

      await insertInsight({
        supabase,
        insight_type: "DROPOFF_PAGE",
        severity: "high",
        title,
        description: "High page entry volume but low mid-scroll engagement.",
        recommendation,
        related_feature_key: null,
        related_page: p.page,
        metric_snapshot: {
          window_days: 7,
          page: p.page,
          views: p.views,
          scroll_50_sessions: p.scroll50,
          scroll_50_ratio: ratio,
          raw_scroll_50_estimated: rawScrollRes.count || null,
          thresholds: { views_gte: 200, scroll_50_ratio_lt: 0.3 },
        },
      });
    }

    // INSIGHT 5 — EXPERIMENT WINNER
    const expRes = await supabase
      .from("experiments")
      .select("id,name,status,start_date,end_date,created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50);
    for (const exp of (expRes.data || []) as any[]) {
      const expId = exp?.id;
      if (!expId) continue;

      const startDate = exp?.start_date ? new Date(`${exp.start_date}T00:00:00.000Z`) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const endDate = exp?.end_date ? new Date(`${exp.end_date}T23:59:59.999Z`) : new Date();
      const fromTs = startDate.toISOString();
      const toTs = endDate.toISOString();

      const ctrRes = await supabase.rpc("analytics_experiment_variant_ctr", {
        p_experiment_id: expId,
        p_from_ts: fromTs,
        p_to_ts: toTs,
      });
      if (ctrRes.error) continue;
      const rows = (ctrRes.data || []) as any[];
      const aRow = rows.find((r) => String(r?.variant_key || "").toUpperCase() === "A");
      const bRow = rows.find((r) => String(r?.variant_key || "").toUpperCase() === "B");
      if (!aRow || !bRow) continue;
      const ctrA = Number(aRow.ctr || 0);
      const ctrB = Number(bRow.ctr || 0);
      if (!(ctrB > ctrA * 1.1)) continue;

      const ok = await shouldInsertInsight({
        supabase,
        insight_type: "EXPERIMENT_WINNER",
        related_feature_key: null,
        related_page: null,
        cooldown_days: 30,
      });
      if (!ok) continue;

      const title = "புதிய வடிவமைப்பு சிறப்பாக செயல்படுகிறது";
      const recommendation = "Apply Variant B permanently\nEnd experiment";

      await insertInsight({
        supabase,
        insight_type: "EXPERIMENT_WINNER",
        severity: "low",
        title,
        description: "Experiment completed and Variant B outperformed Variant A by at least 10% CTR.",
        recommendation,
        related_feature_key: null,
        related_page: null,
        metric_snapshot: {
          experiment_id: expId,
          experiment_name: exp?.name || null,
          window: { from: fromTs, to: toTs },
          variant_a: aRow,
          variant_b: bRow,
          thresholds: { b_ctr_gt_a_ctr_by: 0.1 },
        },
      });
    }

    // INSIGHT 7 — SEASONAL OPPORTUNITY
    const today = new Date(`${toDay}T00:00:00.000Z`);
    const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const calRes = await supabase
      .from("calendar_days")
      .select("id,gregorian_date")
      .gte("gregorian_date", isoDay(today))
      .lte("gregorian_date", isoDay(in7))
      .limit(30);
    const days = (calRes.data || []) as any[];
    const dayIds = days.map((d) => d.id).filter(Boolean);
    const seasonSignals: any[] = [];

    if (dayIds.length > 0) {
      const panRes = await supabase
        .from("panchang_computed")
        .select("calendar_day_id,is_sashti,is_skanda_sashti")
        .in("calendar_day_id", dayIds)
        .limit(50);
      for (const r of (panRes.data || []) as any[]) {
        if (r?.is_sashti) seasonSignals.push({ type: "sashti", day_id: r.calendar_day_id });
        if (r?.is_skanda_sashti) seasonSignals.push({ type: "skanda_sashti", day_id: r.calendar_day_id });
      }

      const cdeRes = await supabase
        .from("calendar_day_events")
        .select("calendar_day_id,murugan_event_id")
        .in("calendar_day_id", dayIds)
        .limit(200);
      const eventIds = Array.from(new Set(((cdeRes.data || []) as any[]).map((r) => r?.murugan_event_id).filter(Boolean)));
      if (eventIds.length > 0) {
        const evRes = await supabase
          .from("murugan_events")
          .select("id,name")
          .in("id", eventIds)
          .limit(200);
        for (const e of (evRes.data || []) as any[]) {
          const name = String(e?.name || "");
          if (/karthigai/i.test(name)) seasonSignals.push({ type: "karthigai", name });
          if (/thaipusam/i.test(name)) seasonSignals.push({ type: "thaipusam", name });
        }
      }
    }

    if (seasonSignals.length > 0) {
      for (const k of Object.keys(featureAgg)) {
        const kLower = k.toLowerCase();
        const isMuruganRelated = kLower.includes("murugan") || kLower.includes("sashti") || kLower.includes("viratha") || kLower.includes("kandha");
        if (!isMuruganRelated) continue;

        const last7Clicks = featureAgg[k]?.clicks || 0;
        const prev7Clicks = featurePrevAgg[k]?.clicks || 0;
        if (prev7Clicks <= 0) continue;
        const ratio = last7Clicks / prev7Clicks;
        if (!(ratio >= 1.5)) continue;

        const ok = await shouldInsertInsight({
          supabase,
          insight_type: "SEASONAL_OPPORTUNITY",
          related_feature_key: k,
          related_page: null,
          cooldown_days: 7,
        });
        if (!ok) continue;

        const title = "இது சரியான நேரம்";
        const recommendation = "Highlight Murugan-related features\nReorder dashboard temporarily";
        await insertInsight({
          supabase,
          insight_type: "SEASONAL_OPPORTUNITY",
          severity: "medium",
          title,
          description: "A seasonal calendar window is active and related feature usage is spiking.",
          recommendation,
          related_feature_key: k,
          related_page: null,
          metric_snapshot: {
            window_days: 7,
            feature_key: k,
            last_7_clicks: last7Clicks,
            prev_7_clicks: prev7Clicks,
            ratio,
            season_signals: seasonSignals.slice(0, 10),
            thresholds: { spike_ratio_gte: 1.5 },
          },
        });
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function listAnalyticsInsights(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const acknowledged = c.req.query("acknowledged");
    const limit = Math.min(parseInt(String(c.req.query("limit") || "50"), 10) || 50, 200);

    let q = supabase
      .from("analytics_insights")
      .select("id,insight_type,severity,title,description,recommendation,related_feature_key,related_page,metric_snapshot,created_at,acknowledged")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (acknowledged === "true") q = q.eq("acknowledged", true);
    if (acknowledged === "false") q = q.eq("acknowledged", false);

    const res = await q;
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);
    return c.json({ success: true, data: res.data || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function getTopAnalyticsInsight(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const res = await supabase
      .from("analytics_insights")
      .select("id,insight_type,severity,title,description,recommendation,related_feature_key,related_page,metric_snapshot,created_at,acknowledged")
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);

    const rows = (res.data || []) as any[];
    const top = rows
      .sort((a, b) => {
        const sw = severityWeight(String(b?.severity || "")) - severityWeight(String(a?.severity || ""));
        if (sw !== 0) return sw;
        return String(b?.created_at || "").localeCompare(String(a?.created_at || ""));
      })[0] || null;

    return c.json({ success: true, data: top });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function acknowledgeAnalyticsInsight(c: any) {
  try {
    const id = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const res = await supabase.from("analytics_insights").update({ acknowledged: true }).eq("id", id).select("id").maybeSingle();
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function applyInsightHideFeature(c: any) {
  try {
    const id = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insightRes = await supabase
      .from("analytics_insights")
      .select("id,related_feature_key")
      .eq("id", id)
      .maybeSingle();
    if (insightRes.error) return c.json({ success: false, error: insightRes.error.message }, 500);
    const k = insightRes.data?.related_feature_key;
    if (!k) return c.json({ success: false, error: "No related_feature_key" }, 400);

    const upd = await supabase
      .from("dashboard_features")
      .update({ visible: false })
      .eq("analytics_key", k)
      .select("id")
      .maybeSingle();
    if (upd.error) return c.json({ success: false, error: upd.error.message }, 500);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function applyInsightReorderFeature(c: any) {
  try {
    const id = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insightRes = await supabase
      .from("analytics_insights")
      .select("id,related_feature_key")
      .eq("id", id)
      .maybeSingle();
    if (insightRes.error) return c.json({ success: false, error: insightRes.error.message }, 500);
    const k = insightRes.data?.related_feature_key;
    if (!k) return c.json({ success: false, error: "No related_feature_key" }, 400);

    const listRes = await supabase
      .from("dashboard_features")
      .select("id,analytics_key,order_index")
      .is("deleted_at", null)
      .order("order_index", { ascending: true })
      .limit(500);
    if (listRes.error) return c.json({ success: false, error: listRes.error.message }, 500);

    const rows = (listRes.data || []) as any[];
    const idx = rows.findIndex((r) => String(r?.analytics_key) === String(k));
    if (idx < 0) return c.json({ success: false, error: "Feature not found" }, 404);

    const [moved] = rows.splice(idx, 1);
    rows.unshift(moved);

    const updates = rows.map((r, i) => supabase.from("dashboard_features").update({ order_index: i }).eq("id", r.id));
    const results = await Promise.all(updates);
    const firstError = results.find((r: any) => r?.error)?.error;
    if (firstError) return c.json({ success: false, error: firstError.message }, 500);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function applyInsightCreateExperiment(c: any) {
  try {
    const id = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insightRes = await supabase
      .from("analytics_insights")
      .select("id,title,related_feature_key,related_page")
      .eq("id", id)
      .maybeSingle();
    if (insightRes.error) return c.json({ success: false, error: insightRes.error.message }, 500);
    if (!insightRes.data) return c.json({ success: false, error: "Not found" }, 404);

    const suffix = insightRes.data.related_feature_key || insightRes.data.related_page || "";
    const name = suffix ? `${String(insightRes.data.title)} — ${String(suffix)}` : String(insightRes.data.title);

    const exp = await supabase
      .from("experiments")
      .insert({ name, description: null, status: "draft", start_date: null, end_date: null })
      .select("id,name,status,created_at")
      .single();
    if (exp.error) return c.json({ success: false, error: exp.error.message }, 500);

    await supabase
      .from("experiment_variants")
      .upsert(
        [
          { experiment_id: exp.data.id, variant_key: "A", traffic_percent: 50, config: {} },
          { experiment_id: exp.data.id, variant_key: "B", traffic_percent: 50, config: {} },
        ],
        { onConflict: "experiment_id,variant_key" },
      );

    return c.json({ success: true, data: exp.data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function runAnalyticsQA(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const maxWindowDays = 14;
    const windowDays = Math.min(
      Math.max(parseInt(String(c.req.query("window_days") || "7"), 10) || 7, 1),
      maxWindowDays,
    );
    const fromTs = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    type QaStatus = "pass" | "fail" | "warn";
    const checks: Array<{ id: string; title: string; status: QaStatus; details?: any }> = [];
    const add = (id: string, title: string, status: QaStatus, details?: any) => {
      checks.push({ id, title, status, details });
    };

    const tablesToCheck = [
      { name: "analytics_events", pk: "id" },
      { name: "analytics_sessions", pk: "id" },
      { name: "analytics_feature_stats", pk: "id" },
      { name: "analytics_page_stats", pk: "id" },
      { name: "analytics_session_stats", pk: "id" },
    ];

    const tableChecks = await Promise.all(
      tablesToCheck.map(async (t) => {
        const res = await supabase.from(t.name).select(t.pk).limit(1);
        return { name: t.name, ok: !res.error, error: res.error?.message || null };
      }),
    );
    const missing = tableChecks.filter((t) => !t.ok);
    if (missing.length > 0) {
      add("tables_exist", "Required analytics tables exist", "fail", { missing });
    } else {
      add("tables_exist", "Required analytics tables exist", "pass");
    }

    const [lastFeature, lastPage, lastSession] = await Promise.all([
      supabase.from("analytics_feature_stats").select("date").order("date", { ascending: false }).limit(1),
      supabase.from("analytics_page_stats").select("date").order("date", { ascending: false }).limit(1),
      supabase.from("analytics_session_stats").select("date").order("date", { ascending: false }).limit(1),
    ]);

    const getDate = (res: any) => {
      const d = (res?.data || [])[0]?.date;
      return typeof d === "string" ? d : null;
    };
    const freshness = {
      analytics_feature_stats: getDate(lastFeature),
      analytics_page_stats: getDate(lastPage),
      analytics_session_stats: getDate(lastSession),
    };
    const todayIso = now.toISOString().slice(0, 10);
    const isFreshEnough = (d: string | null) => {
      if (!d) return false;
      const dt = new Date(`${d}T00:00:00.000Z`);
      const ageDays = Math.floor((new Date(`${todayIso}T00:00:00.000Z`).getTime() - dt.getTime()) / (24 * 60 * 60 * 1000));
      return ageDays <= 2;
    };

    const freshOk = isFreshEnough(freshness.analytics_feature_stats) &&
      isFreshEnough(freshness.analytics_page_stats) &&
      isFreshEnough(freshness.analytics_session_stats);
    add(
      "rollup_freshness",
      "Rollups are populated recently (<= 48h)",
      freshOk ? "pass" : "warn",
      { today: todayIso, freshness },
    );

    const nullSessionRes = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .is("session_id", null);
    const nullSessionCount = nullSessionRes.count || 0;
    add(
      "null_session_ids",
      "No events with null session_id",
      nullSessionCount === 0 ? "pass" : "fail",
      { count: nullSessionCount },
    );

    const recentEventsRes = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromTs);
    const recentEvents = recentEventsRes.count || 0;
    add(
      "recent_event_volume",
      `Recent events exist in last ${windowDays} days`,
      recentEvents > 0 ? "pass" : "warn",
      { window_days: windowDays, count: recentEvents },
    );

    const latestSessionRes = await supabase
      .from("analytics_sessions")
      .select("id,started_at")
      .order("started_at", { ascending: false })
      .limit(1);
    const latestSession = (latestSessionRes.data || [])[0] as any;
    if (!latestSession?.id) {
      add("sample_session_integrity", "Sample session timeline integrity", "warn", { reason: "No sessions" });
    } else {
      const timelineRes = await supabase
        .from("analytics_events")
        .select("created_at,session_id,event_name")
        .eq("session_id", latestSession.id)
        .order("created_at", { ascending: true })
        .limit(100);
      const rows = (timelineRes.data || []) as any[];
      let nonDecreasing = true;
      let lastTs = "";
      for (const r of rows) {
        const ts = String(r?.created_at || "");
        if (lastTs && ts && ts < lastTs) {
          nonDecreasing = false;
          break;
        }
        lastTs = ts;
      }
      const sameSession = rows.every((r) => String(r?.session_id || "") === String(latestSession.id));
      const ok = rows.length === 0 ? false : nonDecreasing && sameSession;
      add(
        "sample_session_integrity",
        "Sample session timeline integrity",
        ok ? "pass" : "warn",
        {
          session_id: latestSession.id,
          started_at: latestSession.started_at,
          events_checked: rows.length,
          non_decreasing: nonDecreasing,
          same_session_id: sameSession,
        },
      );
    }

    const summary = {
      pass: checks.filter((c2) => c2.status === "pass").length,
      warn: checks.filter((c2) => c2.status === "warn").length,
      fail: checks.filter((c2) => c2.status === "fail").length,
    };

    return c.json({ success: true, generated_at: new Date().toISOString(), summary, checks });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.get("/make-server-4a075ebc/api/admin/analytics/overview", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));
    const toDate = new Date(to);
    const fromDate = new Date(from);
    const fromDay = fromDate.toISOString().slice(0, 10);
    const toDay = toDate.toISOString().slice(0, 10);

    const dayStart = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));
    const dayStartIso = dayStart.toISOString().slice(0, 10);
    const last7Start = new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const last30Start = new Date(dayStart.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [sessionStatsRange, sessionStatsToday, sessionStats7d, sessionStats30d] = await Promise.all([
      supabase.from("analytics_session_stats").select("date,sessions,avg_active_duration_seconds,total_events").gte("date", fromDay).lte("date", toDay).limit(200),
      supabase.from("analytics_session_stats").select("date,sessions").eq("date", dayStartIso).limit(1),
      supabase.from("analytics_session_stats").select("date,sessions").gte("date", last7Start).lte("date", dayStartIso).limit(200),
      supabase.from("analytics_session_stats").select("date,sessions").gte("date", last30Start).lte("date", dayStartIso).limit(200),
    ]);

    const sessionStatsRows = (sessionStatsRange.data || []) as any[];

    let totalEvents = sessionStatsRows.reduce((sum, r) => sum + (r?.total_events || 0), 0);
    let sessionsWeighted = sessionStatsRows.reduce((sum, r) => sum + (r?.sessions || 0), 0);
    let avgActiveSeconds = sessionsWeighted > 0
      ? Math.round(
          sessionStatsRows.reduce((sum, r) => sum + (r?.avg_active_duration_seconds || 0) * (r?.sessions || 0), 0) / sessionsWeighted,
        )
      : 0;

    let sessionsToday = ((sessionStatsToday.data || [])[0]?.sessions || 0) as number;
    let sessions7d = ((sessionStats7d.data || []) as any[]).reduce((sum, r) => sum + (r?.sessions || 0), 0);
    let sessions30d = ((sessionStats30d.data || []) as any[]).reduce((sum, r) => sum + (r?.sessions || 0), 0);

    const needsSessionFallback = sessionStatsRows.length === 0 && sessionsToday === 0 && sessions7d === 0 && sessions30d === 0;

    if (needsSessionFallback) {
      const [sessionsRangeRes, sessionsTodayRes, sessions7dRes, sessions30dRes, eventsCountRes] = await Promise.all([
        supabase
          .from("analytics_sessions")
          .select("id,started_at,active_duration_seconds")
          .gte("started_at", from)
          .lte("started_at", to)
          .limit(10000),
        supabase
          .from("analytics_sessions")
          .select("id")
          .gte("started_at", `${dayStartIso}T00:00:00.000Z`)
          .lte("started_at", `${dayStartIso}T23:59:59.999Z`)
          .limit(10000),
        supabase
          .from("analytics_sessions")
          .select("id")
          .gte("started_at", `${last7Start}T00:00:00.000Z`)
          .lte("started_at", `${dayStartIso}T23:59:59.999Z`)
          .limit(10000),
        supabase
          .from("analytics_sessions")
          .select("id")
          .gte("started_at", `${last30Start}T00:00:00.000Z`)
          .lte("started_at", `${dayStartIso}T23:59:59.999Z`)
          .limit(10000),
        supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .gte("created_at", from)
          .lte("created_at", to),
      ]);

      const sessionsRange = (sessionsRangeRes.data || []) as any[];
      const sessionCount = sessionsRange.length;
      const activeSum = sessionsRange.reduce((sum, s) => sum + Number(s?.active_duration_seconds || 0), 0);

      sessionsToday = ((sessionsTodayRes.data || []) as any[]).length;
      sessions7d = ((sessions7dRes.data || []) as any[]).length;
      sessions30d = ((sessions30dRes.data || []) as any[]).length;
      avgActiveSeconds = sessionCount > 0 ? Math.round(activeSum / sessionCount) : 0;
      totalEvents = Number((eventsCountRes as any)?.count || 0);
    }

    const featuresRes = await supabase
      .from("dashboard_features")
      .select("title,analytics_key")
      .is("deleted_at", null)
      .limit(200);
    const featureNameByKey: Record<string, string> = {};
    for (const f of (featuresRes.data || []) as any[]) {
      if (f?.analytics_key) featureNameByKey[f.analytics_key] = f.title;
    }

    const featureStatsRange = await supabase
      .from("analytics_feature_stats")
      .select("feature_key,date,impressions,clicks,avg_time_seconds,last_clicked_at")
      .gte("date", fromDay)
      .lte("date", toDay)
      .limit(10000);

    const clickMap: Record<string, number> = {};
    const featureRows = (featureStatsRange.data || []) as any[];
    for (const r of featureRows) {
      const k = r?.feature_key || "unknown";
      clickMap[k] = (clickMap[k] || 0) + (r?.clicks || 0);
    }

    const needsFeatureFallback = featureRows.length === 0;
    if (needsFeatureFallback) {
      const rawClicks = await supabase
        .from("analytics_events")
        .select("feature_key")
        .eq("event_name", "feature_card_click")
        .gte("created_at", from)
        .lte("created_at", to)
        .limit(10000);

      for (const r of (rawClicks.data || []) as any[]) {
        const k = r?.feature_key || "unknown";
        clickMap[k] = (clickMap[k] || 0) + 1;
      }
    }

    const mostUsedFeatureKey = Object.keys(clickMap).sort((a, b) => (clickMap[b] || 0) - (clickMap[a] || 0))[0] || null;
    const mostUsedFeatureName = mostUsedFeatureKey ? featureNameByKey[mostUsedFeatureKey] || mostUsedFeatureKey : null;

    const topFrom = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const topStatsRes = await supabase
      .from("analytics_feature_stats")
      .select("feature_key,date,impressions,clicks,avg_time_seconds")
      .gte("date", topFrom)
      .lte("date", toDay)
      .limit(10000);

    const agg: Record<string, { feature_key: string; feature_name: string; impressions: number; clicks: number; time_sum: number; time_n: number }> = {};

    if (((topStatsRes.data || []) as any[]).length > 0) {
      for (const row of (topStatsRes.data || []) as any[]) {
        const k = row?.feature_key || "unknown";
        if (!agg[k]) {
          agg[k] = {
            feature_key: k,
            feature_name: featureNameByKey[k] || k,
            impressions: 0,
            clicks: 0,
            time_sum: 0,
            time_n: 0,
          };
        }
        agg[k].impressions += row?.impressions || 0;
        agg[k].clicks += row?.clicks || 0;
        if (typeof row?.avg_time_seconds === "number" && row?.avg_time_seconds > 0) {
          agg[k].time_sum += row.avg_time_seconds;
          agg[k].time_n += 1;
        }
      }
    } else {
      const raw7dFromIso = `${topFrom}T00:00:00.000Z`;
      const raw7dToIso = `${toDay}T23:59:59.999Z`;
      const rawRes = await supabase
        .from("analytics_events")
        .select("feature_key,event_name")
        .in("event_name", ["feature_card_impression", "feature_card_click"])
        .gte("created_at", raw7dFromIso)
        .lte("created_at", raw7dToIso)
        .limit(10000);

      for (const row of (rawRes.data || []) as any[]) {
        const k = row?.feature_key || "unknown";
        if (!agg[k]) {
          agg[k] = {
            feature_key: k,
            feature_name: featureNameByKey[k] || k,
            impressions: 0,
            clicks: 0,
            time_sum: 0,
            time_n: 0,
          };
        }
        if (row?.event_name === "feature_card_impression") agg[k].impressions += 1;
        if (row?.event_name === "feature_card_click") agg[k].clicks += 1;
      }
    }

    const topFeatures = Object.values(agg)
      .map((r) => ({
        feature_key: r.feature_key,
        feature_name: r.feature_name,
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
        avg_time_spent_seconds: r.time_n > 0 ? r.time_sum / r.time_n : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);

    return c.json({
      success: true,
      data: {
        summary: {
          sessions_today: sessionsToday || 0,
          sessions_7d: sessions7d || 0,
          sessions_30d: sessions30d || 0,
          total_events: totalEvents || 0,
          avg_active_time_seconds: avgActiveSeconds,
          most_used_feature_key: mostUsedFeatureKey,
          most_used_feature_name: mostUsedFeatureName,
        },
        top_features_last_7_days: topFeatures,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/features", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));

    const fromDay = new Date(from).toISOString().slice(0, 10);
    const toDay = new Date(to).toISOString().slice(0, 10);

    const featuresRes = await supabase
      .from("dashboard_features")
      .select("title,visible,route,analytics_key")
      .is("deleted_at", null)
      .order("order_index", { ascending: true })
      .limit(200);
    const features = (featuresRes.data || []) as any[];

    const statsRes = await supabase
      .from("analytics_feature_stats")
      .select("feature_key,date,impressions,clicks,avg_time_seconds,last_clicked_at")
      .gte("date", fromDay)
      .lte("date", toDay)
      .limit(10000);

    const metrics: Record<string, any> = {};
    for (const f of features) {
      const k = f.analytics_key;
      if (!k) continue;
      metrics[k] = {
        feature_key: k,
        feature_name: f.title,
        visible: !!f.visible,
        route: f.route,
        impressions: 0,
        clicks: 0,
        last_clicked: null as string | null,
        time_sum: 0,
        time_n: 0,
      };
    }

    for (const row of (statsRes.data || []) as any[]) {
      const k = row?.feature_key;
      if (!k || !metrics[k]) continue;
      metrics[k].impressions += row?.impressions || 0;
      metrics[k].clicks += row?.clicks || 0;
      const ts = row?.last_clicked_at;
      if (!metrics[k].last_clicked || (ts && ts > metrics[k].last_clicked)) metrics[k].last_clicked = ts;
      if (typeof row?.avg_time_seconds === "number" && row?.avg_time_seconds > 0) {
        metrics[k].time_sum += row.avg_time_seconds;
        metrics[k].time_n += 1;
      }
    }

    const data = Object.values(metrics).map((r: any) => ({
      feature_key: r.feature_key,
      feature_name: r.feature_name,
      visible: r.visible,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
      avg_time_seconds: r.time_n > 0 ? r.time_sum / r.time_n : 0,
      last_clicked: r.last_clicked,
    }));

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/features/:featureKey", async (c) => {
  try {
    const featureKey = c.req.param("featureKey");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));

    const fromDay = new Date(from).toISOString().slice(0, 10);
    const toDay = new Date(to).toISOString().slice(0, 10);

    const featureRes = await supabase
      .from("dashboard_features")
      .select("title,route,analytics_key")
      .eq("analytics_key", featureKey)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const feature = featureRes.data as any;
    const featureRoute = feature?.route || null;
    const featureName = feature?.title || featureKey;

    const [dailyStatsRes, hourlyStatsRes, featureEventsRes, routeEventsRes] = await Promise.all([
      supabase
        .from("analytics_feature_stats")
        .select("date,impressions,clicks,avg_time_seconds,last_clicked_at")
        .eq("feature_key", featureKey)
        .gte("date", fromDay)
        .lte("date", toDay)
        .limit(400),
      supabase
        .from("analytics_feature_stats_hourly")
        .select("hour,impressions,clicks")
        .eq("feature_key", featureKey)
        .gte("hour", from)
        .lte("hour", to)
        .order("hour", { ascending: true })
        .limit(500),
      supabase
        .from("analytics_events")
        .select("event_name,feature_key,route,page,session_id,metadata,created_at")
        .eq("feature_key", featureKey)
        .in("event_name", ["feature_card_impression", "feature_card_click"])
        .gte("created_at", from)
        .lte("created_at", to)
        .limit(5000),
      featureRoute
        ? supabase
            .from("analytics_events")
            .select("event_name,route,page,session_id,metadata,created_at")
            .eq("route", featureRoute)
            .in("event_name", ["page_enter", "scroll_50", "page_exit", "time_spent"])
            .gte("created_at", from)
            .lte("created_at", to)
            .limit(5000)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const impressionsSessions = new Set<string>();
    const clicksSessions = new Set<string>();
    const pageEnterSessions = new Set<string>();
    const scroll50Sessions = new Set<string>();
    const pageExitSessions = new Set<string>();

    const sourceCounts: Record<string, number> = {};
    const routeCounts: Record<string, number> = {};
    const pageCounts: Record<string, number> = {};
    let timeSum = 0;
    let timeN = 0;

    for (const row of (featureEventsRes.data || []) as any[]) {
      const sid = row?.session_id;

      if (row.event_name === "feature_card_impression" && sid) {
        impressionsSessions.add(String(sid));
      }

      if (row.event_name === "feature_card_click" && sid) {
        clicksSessions.add(String(sid));

        const src = row?.metadata?.source || "dashboard";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;

        const r = row?.route || "unknown";
        routeCounts[r] = (routeCounts[r] || 0) + 1;

        const p = row?.page || "unknown";
        pageCounts[p] = (pageCounts[p] || 0) + 1;
      }
    }

    for (const row of (routeEventsRes.data || []) as any[]) {
      const sid = row?.session_id;

      if (row.event_name === "page_enter" && sid) {
        pageEnterSessions.add(String(sid));
      }
      if (row.event_name === "scroll_50" && sid) {
        scroll50Sessions.add(String(sid));
      }
      if (row.event_name === "page_exit" && sid) {
        pageExitSessions.add(String(sid));
      }

      if (row.event_name === "time_spent") {
        const seconds = Number(row?.metadata?.seconds || 0);
        if (Number.isFinite(seconds) && seconds > 0) {
          timeSum += seconds;
          timeN += 1;
        }
      }
    }

    const views = impressionsSessions.size;
    const clicks = clicksSessions.size;
    const ctr = views > 0 ? clicks / views : 0;
    const avgTime = timeN > 0 ? timeSum / timeN : 0;

    const dailyRows = (dailyStatsRes.data || []) as any[];
    const hourlyRows = (hourlyStatsRes.data || []) as any[];

    const totalImpressions = dailyRows.reduce((sum, r) => sum + (r?.impressions || 0), 0);
    const totalClicks = dailyRows.reduce((sum, r) => sum + (r?.clicks || 0), 0);
    const ctrDaily = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    const avgTimeRows = dailyRows.filter((r) => typeof r?.avg_time_seconds === "number" && r.avg_time_seconds > 0);
    const avgTimeFromRollup = avgTimeRows.length > 0
      ? avgTimeRows.reduce((sum, r) => sum + r.avg_time_seconds, 0) / avgTimeRows.length
      : 0;

    const lastActiveDate = dailyRows
      .filter((r) => (r?.impressions || 0) > 0 || (r?.clicks || 0) > 0)
      .map((r) => String(r?.date || ""))
      .sort()
      .slice(-1)[0] || null;

    const lastClickedAt = dailyRows
      .map((r) => (r?.last_clicked_at ? String(r.last_clicked_at) : ""))
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null;

    const sourcesTotal = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
    const sources = Object.keys(sourceCounts)
      .map((k) => ({
        source: k,
        count: sourceCounts[k],
        pct: sourcesTotal > 0 ? sourceCounts[k] / sourcesTotal : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const routesTotal = Object.values(routeCounts).reduce((a, b) => a + b, 0);
    const routes = Object.keys(routeCounts)
      .map((k) => ({
        route: k,
        count: routeCounts[k],
        pct: routesTotal > 0 ? routeCounts[k] / routesTotal : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const pagesTotal = Object.values(pageCounts).reduce((a, b) => a + b, 0);
    const pages = Object.keys(pageCounts)
      .map((k) => ({
        page: k,
        count: pageCounts[k],
        pct: pagesTotal > 0 ? pageCounts[k] / pagesTotal : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const funnel = [
      { step: "feature_card_impression", users: impressionsSessions.size },
      { step: "feature_card_click", users: clicksSessions.size },
      { step: "page_enter", users: pageEnterSessions.size },
      { step: "scroll_50", users: scroll50Sessions.size },
      { step: "page_exit", users: pageExitSessions.size },
    ].map((row, idx, arr) => {
      const prev = idx === 0 ? row.users : arr[idx - 1].users;
      const drop = prev > 0 ? 1 - row.users / prev : 0;
      return { ...row, drop_off_pct: drop };
    });

    return c.json({
      success: true,
      data: {
        feature_key: featureKey,
        feature_name: featureName,
        summary: {
          total_views: views,
          total_clicks: clicks,
          ctr,
          avg_active_time_seconds: avgTime,
        },
        overview: {
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          ctr: ctrDaily,
          avg_time_spent_seconds: avgTimeFromRollup > 0 ? avgTimeFromRollup : avgTime,
          last_active_date: lastActiveDate,
          last_clicked_at: lastClickedAt,
          hourly: hourlyRows.map((r) => ({
            hour: r?.hour,
            impressions: r?.impressions || 0,
            clicks: r?.clicks || 0,
          })),
        },
        entry_sources: sources,
        entry_routes: routes,
        entry_pages: pages,
        funnel,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/pages", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));

    const fromDay = new Date(from).toISOString().slice(0, 10);
    const toDay = new Date(to).toISOString().slice(0, 10);

    const statsRes = await supabase
      .from("analytics_page_stats")
      .select("page,date,views,avg_time_seconds,scroll_100_percent,scroll_25_sessions")
      .gte("date", fromDay)
      .lte("date", toDay)
      .limit(10000);

    const map: Record<string, { page_name: string; views: number; time_sum: number; time_n: number; scroll100_sum: number; scroll25_sum: number }> = {};
    for (const row of (statsRes.data || []) as any[]) {
      const p = row?.page || "unknown";
      if (!map[p]) {
        map[p] = { page_name: p, views: 0, time_sum: 0, time_n: 0, scroll100_sum: 0, scroll25_sum: 0 };
      }
      map[p].views += row?.views || 0;
      if (typeof row?.avg_time_seconds === "number") {
        map[p].time_sum += row.avg_time_seconds;
        map[p].time_n += 1;
      }
      map[p].scroll100_sum += row?.scroll_100_percent || 0;
      map[p].scroll25_sum += row?.scroll_25_sessions || 0;
    }

    const data = Object.values(map)
      .map((r) => {
        const avgTime = r.time_n > 0 ? r.time_sum / r.time_n : 0;
        const scroll100Pct = r.views > 0 ? r.scroll100_sum / r.views : 0;
        const bouncePct = r.views > 0 ? 1 - r.scroll25_sum / r.views : 0;
        return {
          page_name: r.page_name,
          views: r.views,
          avg_time_seconds: avgTime,
          scroll_100_pct: scroll100Pct,
          bounce_pct: bouncePct,
        };
      })
      .sort((a, b) => b.views - a.views);

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/pages/:route", async (c) => {
  try {
    const route = decodeURIComponent(c.req.param("route"));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));

    const fromDay = new Date(from).toISOString().slice(0, 10);
    const toDay = new Date(to).toISOString().slice(0, 10);

    const statsRes = await supabase
      .from("analytics_page_stats")
      .select("page,date,views,avg_time_seconds,scroll_100_percent,scroll_25_sessions,scroll_50_sessions,scroll_75_sessions,button_clicks,anchor_clicks,calendar_date_selects")
      .eq("page", route)
      .gte("date", fromDay)
      .lte("date", toDay)
      .limit(200);

    const rows = (statsRes.data || []) as any[];
    const views = rows.reduce((sum, r) => sum + (r?.views || 0), 0);
    const avgTime = rows.length > 0 ? rows.reduce((sum, r) => sum + (r?.avg_time_seconds || 0), 0) / rows.length : 0;
    const scroll25 = rows.reduce((sum, r) => sum + (r?.scroll_25_sessions || 0), 0);
    const scroll50 = rows.reduce((sum, r) => sum + (r?.scroll_50_sessions || 0), 0);
    const scroll75 = rows.reduce((sum, r) => sum + (r?.scroll_75_sessions || 0), 0);
    const scroll100 = rows.reduce((sum, r) => sum + (r?.scroll_100_percent || 0), 0);

    const scroll100Pct = views > 0 ? scroll100 / views : 0;
    const bouncePct = views > 0 ? 1 - scroll25 / views : 0;

    const scrollBreakdown = [
      { percent: 25, users: scroll25 },
      { percent: 50, users: scroll50 },
      { percent: 75, users: scroll75 },
      { percent: 100, users: scroll100 },
    ];

    const topInteractions = [
      { event_name: "button_click", count: rows.reduce((sum, r) => sum + (r?.button_clicks || 0), 0) },
      { event_name: "anchor_click", count: rows.reduce((sum, r) => sum + (r?.anchor_clicks || 0), 0) },
      { event_name: "calendar_date_select", count: rows.reduce((sum, r) => sum + (r?.calendar_date_selects || 0), 0) },
    ]
      .filter((r) => (r.count || 0) > 0)
      .sort((a, b) => b.count - a.count);

    return c.json({
      success: true,
      data: {
        page_name: route,
        summary: {
          views,
          avg_time_seconds: avgTime,
          scroll_100_pct: scroll100Pct,
          bounce_pct: bouncePct,
        },
        scroll_breakdown: scrollBreakdown,
        top_interactions: topInteractions,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/content/calendar-usage", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));
    const fromDay = new Date(from).toISOString().slice(0, 10);
    const toDay = new Date(to).toISOString().slice(0, 10);

    const page = String(c.req.query("page") || "murugan-calendar");

    const res = await supabase
      .from("analytics_page_stats")
      .select("date,views,calendar_date_selects")
      .eq("page", page)
      .gte("date", fromDay)
      .lte("date", toDay)
      .order("date", { ascending: true })
      .limit(400);

    if (res.error) return c.json({ success: false, error: res.error.message }, 500);

    const rows = (res.data || []) as any[];
    const total_selects = rows.reduce((sum, r) => sum + (r?.calendar_date_selects || 0), 0);
    const total_views = rows.reduce((sum, r) => sum + (r?.views || 0), 0);

    return c.json({
      success: true,
      data: {
        page,
        from: fromDay,
        to: toDay,
        totals: {
          calendar_date_selects: total_selects,
          views: total_views,
        },
        daily: rows.map((r) => ({
          date: r?.date,
          views: r?.views || 0,
          calendar_date_selects: r?.calendar_date_selects || 0,
        })),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/sessions", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));
    const limit = Math.min(parseInt(c.req.query("limit") || "100", 10) || 100, 100);

    let query = supabase
      .from("analytics_sessions")
      .select("id,user_id,device,total_duration_seconds,active_duration_seconds,idle_duration_seconds,started_at,ended_at")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (from) query = query.gte("started_at", from);
    if (to) query = query.lte("started_at", to);

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);

    const sessions = (data || []) as any[];
    const sessionIds = sessions.map((s) => s.id).filter(Boolean);

    const pagesMap: Record<string, Set<string>> = {};
    if (sessionIds.length > 0) {
      const evRes = await supabase
        .from("analytics_events")
        .select("session_id,route")
        .in("session_id", sessionIds)
        .eq("event_name", "page_enter")
        .limit(5000);
      for (const row of (evRes.data || []) as any[]) {
        const sid = row?.session_id;
        const r = row?.route;
        if (!sid || !r) continue;
        if (!pagesMap[sid]) pagesMap[sid] = new Set<string>();
        pagesMap[sid].add(r);
      }
    }

    const out = sessions.map((s) => ({
      ...s,
      pages_visited: pagesMap[s.id] ? pagesMap[s.id].size : 0,
    }));

    return c.json({ success: true, data: out });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/sessions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const sessionRes = await supabase
      .from("analytics_sessions")
      .select("id,user_id,device,total_duration_seconds,active_duration_seconds,idle_duration_seconds,started_at,ended_at")
      .eq("id", id)
      .maybeSingle();
    if (sessionRes.error) return c.json({ success: false, error: sessionRes.error.message }, 500);

    const eventsRes = await supabase
      .from("analytics_events")
      .select("id,event_name,feature_key,page,route,metadata,created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (eventsRes.error) return c.json({ success: false, error: eventsRes.error.message }, 500);

    const pages = new Set<string>();
    let exitReason: string | null = null;
    const events = (eventsRes.data || []) as any[];
    for (const e of events) {
      if (e?.event_name === "page_enter" && e?.route) pages.add(e.route);
    }
    const last = events.length > 0 ? events[events.length - 1] : null;
    if (last?.event_name === "app_close") exitReason = "app_close";
    else if (last?.event_name === "app_background") exitReason = "app_background";
    else if (last?.event_name === "session_end") exitReason = "session_end";
    else exitReason = last?.event_name || null;

    return c.json({
      success: true,
      data: {
        session: sessionRes.data,
        timeline: events,
        pages_visited: Array.from(pages),
        exit_reason: exitReason,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/feature-stats", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const from = c.req.query("from");
    const to = c.req.query("to");

    let query = supabase
      .from("analytics_events")
      .select("event_name,feature_key,created_at")
      .in("event_name", ["feature_card_impression", "feature_card_click"])
      .order("created_at", { ascending: false })
      .limit(5000);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);

    const map: Record<string, { feature_key: string; impressions: number; clicks: number }> = {};
    for (const row of (data || []) as any[]) {
      const k = row?.feature_key || "unknown";
      if (!map[k]) map[k] = { feature_key: k, impressions: 0, clicks: 0 };
      if (row.event_name === "feature_card_impression") map[k].impressions += 1;
      if (row.event_name === "feature_card_click") map[k].clicks += 1;
    }

    const result = Object.values(map)
      .map((r) => ({
        ...r,
        ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/admin/analytics/route-stats", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const from = c.req.query("from");
    const to = c.req.query("to");

    let query = supabase
      .from("analytics_events")
      .select("event_name,route,created_at")
      .in("event_name", ["page_enter", "page_exit", "dashboard_view"])
      .order("created_at", { ascending: false })
      .limit(5000);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);

    const map: Record<string, { route: string; enters: number; exits: number; dashboard_views: number }> = {};
    for (const row of (data || []) as any[]) {
      const k = row?.route || "unknown";
      if (!map[k]) map[k] = { route: k, enters: 0, exits: 0, dashboard_views: 0 };
      if (row.event_name === "page_enter") map[k].enters += 1;
      if (row.event_name === "page_exit") map[k].exits += 1;
      if (row.event_name === "dashboard_view") map[k].dashboard_views += 1;
    }

    const result = Object.values(map).sort((a, b) => b.enters - a.enters);
    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// ADMIN: Experiments (A/B Testing)
// ========================================

function normalizeExperimentStatus(input: any) {
  const v = String(input || "").toLowerCase();
  if (["draft", "running", "paused", "completed"].includes(v)) return v;
  return "draft";
}

async function listAdminExperiments(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: experiments, error } = await supabase
      .from("experiments")
      .select("id,name,description,status,start_date,end_date,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return c.json({ success: false, error: error.message }, 500);

    const ids = (experiments || []).map((e: any) => e.id).filter(Boolean);
    let variants: any[] = [];
    if (ids.length > 0) {
      const res = await supabase
        .from("experiment_variants")
        .select("id,experiment_id,variant_key,traffic_percent,config,created_at")
        .in("experiment_id", ids)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!res.error) variants = (res.data || []) as any[];
    }

    const variantsByExperiment: Record<string, any[]> = {};
    for (const v of variants) {
      const k = String(v.experiment_id);
      if (!variantsByExperiment[k]) variantsByExperiment[k] = [];
      variantsByExperiment[k].push(v);
    }

    const out = (experiments || []).map((e: any) => ({
      ...e,
      variants: variantsByExperiment[String(e.id)] || [],
    }));

    return c.json({ success: true, data: out });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function getAdminExperimentDetail(c: any) {
  try {
    const id = c.req.param("id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expRes = await supabase
      .from("experiments")
      .select("id,name,description,status,start_date,end_date,created_at")
      .eq("id", id)
      .maybeSingle();
    if (expRes.error) return c.json({ success: false, error: expRes.error.message }, 500);
    if (!expRes.data) return c.json({ success: false, error: "Not found" }, 404);

    const varRes = await supabase
      .from("experiment_variants")
      .select("id,experiment_id,variant_key,traffic_percent,config,created_at")
      .eq("experiment_id", id)
      .order("created_at", { ascending: true })
      .limit(50);
    if (varRes.error) return c.json({ success: false, error: varRes.error.message }, 500);

    return c.json({ success: true, data: { ...expRes.data, variants: varRes.data || [] } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function createAdminExperiment(c: any) {
  try {
    const body = await c.req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    if (!name) return c.json({ success: false, error: "Missing name" }, 400);

    const status = normalizeExperimentStatus(body?.status);
    const start_date = body?.start_date || null;
    const end_date = body?.end_date || null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("experiments")
      .insert({
        name,
        description: body?.description ?? null,
        status,
        start_date,
        end_date,
      })
      .select("id,name,description,status,start_date,end_date,created_at")
      .single();

    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function updateAdminExperiment(c: any) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);

    const patch: any = {};
    if (body?.name != null) patch.name = String(body.name).trim();
    if (body?.description !== undefined) patch.description = body.description;
    if (body?.status != null) patch.status = normalizeExperimentStatus(body.status);
    if (body?.start_date !== undefined) patch.start_date = body.start_date;
    if (body?.end_date !== undefined) patch.end_date = body.end_date;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("experiments")
      .update(patch)
      .eq("id", id)
      .select("id,name,description,status,start_date,end_date,created_at")
      .single();

    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function upsertAdminExperimentVariants(c: any) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const variants = Array.isArray(body?.variants) ? body.variants : [];
    if (variants.length === 0) return c.json({ success: false, error: "Missing variants" }, 400);

    const cleaned = variants
      .map((v: any) => ({
        experiment_id: id,
        variant_key: String(v?.variant_key || "").trim(),
        traffic_percent: Math.max(0, Math.min(100, parseInt(String(v?.traffic_percent ?? "0"), 10) || 0)),
        config: v?.config && typeof v.config === "object" ? v.config : {},
      }))
      .filter((v: any) => v.variant_key);

    if (cleaned.length === 0) return c.json({ success: false, error: "Invalid variants" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const res = await supabase
      .from("experiment_variants")
      .upsert(cleaned, { onConflict: "experiment_id,variant_key" })
      .select("id,experiment_id,variant_key,traffic_percent,config,created_at");
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);

    return c.json({ success: true, data: res.data || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.get("/make-server-4a075ebc/api/admin/experiments", listAdminExperiments);
app.get("/api/admin/experiments", listAdminExperiments);

app.get("/make-server-4a075ebc/api/admin/experiments/:id", getAdminExperimentDetail);
app.get("/api/admin/experiments/:id", getAdminExperimentDetail);

app.post("/make-server-4a075ebc/api/admin/experiments", createAdminExperiment);
app.post("/api/admin/experiments", createAdminExperiment);

app.put("/make-server-4a075ebc/api/admin/experiments/:id", updateAdminExperiment);
app.put("/api/admin/experiments/:id", updateAdminExperiment);

app.put("/make-server-4a075ebc/api/admin/experiments/:id/variants", upsertAdminExperimentVariants);
app.put("/api/admin/experiments/:id/variants", upsertAdminExperimentVariants);

type DgControlScope = "global" | "media" | "network" | "ux" | "ai";

function normalizeDgScope(v: any): DgControlScope {
  const s = String(v || "").toLowerCase();
  if (s === "global" || s === "media" || s === "network" || s === "ux" || s === "ai") return s;
  return "global";
}

function safeStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string" && v) return [v];
  return [];
}

function matchesRuleContext(match: any, ctx: { app_version?: string; feature_key?: string; network_state?: string }) {
  if (!match || typeof match !== "object") return true;

  const appVersions = safeStringArray((match as any).app_version);
  if (appVersions.length > 0) {
    if (!ctx.app_version) return false;
    if (!appVersions.includes(ctx.app_version)) return false;
  }

  const featureKeys = safeStringArray((match as any).feature_key);
  if (featureKeys.length > 0) {
    if (!ctx.feature_key) return false;
    if (!featureKeys.includes(ctx.feature_key)) return false;
  }

  const networkStates = safeStringArray((match as any).network_state);
  if (networkStates.length > 0) {
    if (!ctx.network_state) return false;
    if (!networkStates.includes(ctx.network_state)) return false;
  }

  return true;
}

function normalizeImageQuality(v: any): "auto" | "low" | "medium" | "high" {
  const s = String(v || "").toLowerCase();
  if (s === "low" || s === "medium" || s === "high") return s;
  return "auto";
}

function coerceBool(v: any): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return undefined;
}

function coerceInt(v: any): number | undefined {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function defaultControlSnapshot(ctx: any) {
  return {
    version: 1,
    context: {
      app_version: ctx?.app_version || null,
      feature_key: ctx?.feature_key || null,
      network_state: ctx?.network_state || null,
    },
    global: {
      safe_mode: false,
    },
    media: {
      force_image_quality: "auto" as const,
      disable_video_autoplay: false,
      disable_video: false,
      disable_preloading: false,
      max_concurrent_media_loads: null as number | null,
    },
    network: {
      disable_retries: false,
      retry_count: null as number | null,
      timeout_ms: null as number | null,
    },
    ux: {
      skeleton_only: false,
      reduce_animations: false,
      ux_watchdog_threshold_ms: null as number | null,
    },
    ai: {
      disable_ai: false,
    },
    applied: [] as any[],
    compiled_at: new Date().toISOString(),
    ttl_seconds: 45,
  };
}

function applyRuleToSnapshot(snap: any, rule: any) {
  const scope: DgControlScope = normalizeDgScope(rule?.scope);
  const action = rule?.action && typeof rule.action === "object" ? rule.action : {};

  if (scope === "global") {
    const sm = coerceBool((action as any).safe_mode);
    if (typeof sm === "boolean") snap.global.safe_mode = sm;
  }

  if (scope === "media") {
    if ((action as any).force_image_quality != null) {
      snap.media.force_image_quality = normalizeImageQuality((action as any).force_image_quality);
    }
    const dva = coerceBool((action as any).disable_video_autoplay);
    if (typeof dva === "boolean") snap.media.disable_video_autoplay = dva;
    const dv = coerceBool((action as any).disable_video);
    if (typeof dv === "boolean") snap.media.disable_video = dv;
    const dp = coerceBool((action as any).disable_preloading);
    if (typeof dp === "boolean") snap.media.disable_preloading = dp;
    const mcl = coerceInt((action as any).max_concurrent_media_loads);
    if (typeof mcl === "number" && mcl > 0) snap.media.max_concurrent_media_loads = Math.min(50, mcl);
  }

  if (scope === "network") {
    const dr = coerceBool((action as any).disable_retries);
    if (typeof dr === "boolean") snap.network.disable_retries = dr;
    const rc = coerceInt((action as any).retry_count);
    if (typeof rc === "number" && rc >= 0) snap.network.retry_count = Math.min(10, rc);
    const tm = coerceInt((action as any).timeout_ms);
    if (typeof tm === "number" && tm > 0) snap.network.timeout_ms = Math.min(120000, tm);
  }

  if (scope === "ux") {
    const sk = coerceBool((action as any).skeleton_only);
    if (typeof sk === "boolean") snap.ux.skeleton_only = sk;
    const ra = coerceBool((action as any).reduce_animations);
    if (typeof ra === "boolean") snap.ux.reduce_animations = ra;
    const wt = coerceInt((action as any).ux_watchdog_threshold_ms);
    if (typeof wt === "number" && wt > 0) snap.ux.ux_watchdog_threshold_ms = Math.min(120000, wt);
  }

  if (scope === "ai") {
    const da = coerceBool((action as any).disable_ai);
    if (typeof da === "boolean") snap.ai.disable_ai = da;
  }
}

function applySafeModeOverrides(snap: any) {
  if (!snap?.global?.safe_mode) return;
  snap.ai.disable_ai = true;
  snap.media.disable_video_autoplay = true;
  snap.media.disable_preloading = true;
  snap.network.disable_retries = true;
}

async function getDgControlSnapshot(c: any) {
  try {
    const app_version = String(c.req.query("app_version") || "").trim() || undefined;
    const feature_key = String(c.req.query("feature_key") || "").trim() || undefined;
    const network_state = String(c.req.query("network_state") || "").trim() || undefined;
    const ctx = { app_version, feature_key, network_state };

    const cacheKey = `dg_control_snapshot:v1:${app_version || "_"}:${feature_key || "_"}:${network_state || "_"}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cacheRes = await supabase
      .from("kv_store_4a075ebc")
      .select("value")
      .eq("key", cacheKey)
      .maybeSingle();
    if (!cacheRes.error && cacheRes.data?.value && typeof cacheRes.data.value === "object") {
      const v = cacheRes.data.value as any;
      const exp = v?.cache_expires_at ? new Date(String(v.cache_expires_at)) : null;
      if (exp && Number.isFinite(exp.getTime()) && exp.getTime() > Date.now()) {
        return c.json({ success: true, data: v.data });
      }
    }

    const safeModeRes = await supabase
      .from("dg_admin_rules")
      .select("id,rule_key,scope,enabled,priority,match,action,updated_at")
      .eq("enabled", true)
      .eq("scope", "global")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(50);

    const snap = defaultControlSnapshot(ctx);
    const safeModeRules = (safeModeRes.data || []) as any[];
    const safeModeApplied: any[] = [];
    for (const r of safeModeRules) {
      if (!matchesRuleContext(r?.match, ctx)) continue;
      applyRuleToSnapshot(snap, r);
      safeModeApplied.push({ id: r.id, rule_key: r.rule_key || null, scope: r.scope, priority: r.priority, match: r.match || null });
      if (snap.global.safe_mode) break;
    }

    if (!snap.global.safe_mode) {
      const rulesRes = await supabase
        .from("dg_admin_rules")
        .select("id,rule_key,scope,enabled,priority,match,action,updated_at")
        .eq("enabled", true)
        .order("priority", { ascending: true })
        .order("updated_at", { ascending: true })
        .limit(500);
      if (rulesRes.error) return c.json({ success: false, error: rulesRes.error.message }, 500);

      for (const r of (rulesRes.data || []) as any[]) {
        if (!matchesRuleContext(r?.match, ctx)) continue;
        applyRuleToSnapshot(snap, r);
        snap.applied.push({ id: r.id, rule_key: r.rule_key || null, scope: r.scope, priority: r.priority, match: r.match || null });
      }
    }

    for (const r of safeModeApplied) {
      snap.applied.unshift(r);
    }

    applySafeModeOverrides(snap);

    const ttlSeconds = 45;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    snap.ttl_seconds = ttlSeconds;

    await supabase
      .from("kv_store_4a075ebc")
      .upsert({
        key: cacheKey,
        value: {
          cache_expires_at: expiresAt,
          data: snap,
        },
      });

    return c.json({ success: true, data: snap });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function listDgAdminRules(c: any) {
  try {
    const scope = c.req.query("scope");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = supabase
      .from("dg_admin_rules")
      .select("id,rule_key,scope,enabled,priority,match,action,created_at,updated_at,created_by,updated_by")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(500);
    if (scope) q = q.eq("scope", String(scope));

    const res = await q;
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);
    return c.json({ success: true, data: res.data || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function upsertDgAdminRule(c: any) {
  try {
    const guard = await requireAdmin(c);
    if (!guard.ok) return guard.response;
    const actorEmail = String((guard as any)?.user?.email || "").toLowerCase() || null;

    const body = await c.req.json().catch(() => null);
    const rule_key = body?.rule_key != null ? String(body.rule_key).trim() : null;
    const scope: DgControlScope = normalizeDgScope(body?.scope);
    const enabled = typeof body?.enabled === "boolean" ? body.enabled : true;
    const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0;
    const match = body?.match && typeof body.match === "object" ? body.match : null;
    const action = body?.action && typeof body.action === "object" ? body.action : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let before: any = null;
    if (rule_key) {
      const b = await supabase
        .from("dg_admin_rules")
        .select("id,rule_key,scope,enabled,priority,match,action,created_at,updated_at,created_by,updated_by")
        .eq("rule_key", rule_key)
        .maybeSingle();
      if (!b.error && b.data) before = b.data;
    }

    const upsertRes = await supabase
      .from("dg_admin_rules")
      .upsert(
        {
          rule_key,
          scope,
          enabled,
          priority,
          match,
          action,
          created_by: before?.created_by ?? actorEmail,
          updated_by: actorEmail,
        },
        rule_key ? { onConflict: "rule_key" } : undefined,
      )
      .select("id,rule_key,scope,enabled,priority,match,action,created_at,updated_at,created_by,updated_by")
      .single();

    if (upsertRes.error) return c.json({ success: false, error: upsertRes.error.message }, 500);

    const after = upsertRes.data;
    await supabase
      .from("dg_admin_rule_audit")
      .insert(
        {
          rule_id: after?.id,
          actor_email: actorEmail,
          action: before ? "update" : "create",
          before,
          after,
        },
        { returning: "minimal" } as any,
      );

    await supabase
      .from("kv_store_4a075ebc")
      .delete()
      .like("key", "dg_control_snapshot:%");

    return c.json({ success: true, data: after });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function listDgAdminRuleAudit(c: any) {
  try {
    const ruleId = c.req.query("rule_id");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = supabase
      .from("dg_admin_rule_audit")
      .select("id,rule_id,actor_email,action,before,after,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (ruleId) q = q.eq("rule_id", String(ruleId));
    const res = await q;
    if (res.error) return c.json({ success: false, error: res.error.message }, 500);
    return c.json({ success: true, data: res.data || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.get("/make-server-4a075ebc/api/divine-guard/control-snapshot", getDgControlSnapshot);
app.get("/api/divine-guard/control-snapshot", getDgControlSnapshot);

app.get("/make-server-4a075ebc/api/admin/divine-guard/rules", listDgAdminRules);
app.get("/api/admin/divine-guard/rules", listDgAdminRules);

app.post("/make-server-4a075ebc/api/admin/divine-guard/rules/upsert", upsertDgAdminRule);
app.post("/api/admin/divine-guard/rules/upsert", upsertDgAdminRule);

app.get("/make-server-4a075ebc/api/admin/divine-guard/rules/audit", listDgAdminRuleAudit);
app.get("/api/admin/divine-guard/rules/audit", listDgAdminRuleAudit);

// ========================================
// DIVINE GUARD: MEDIA DASHBOARD (Read-only)
// ========================================

const DG_MEDIA_CODES = [
  "DG-MEDIA-0001", // image loaded
  "DG-MEDIA-0002", // image downscaled
  "DG-MEDIA-0003", // image failed
  "DG-MEDIA-0004", // video buffering
  "DG-MEDIA-0005", // video released
];

function safeNumber(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function dayKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "unknown";
  }
}

async function listDgReleaseVersions(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Preferred source: dg_release_versions
    const relRes = await supabase
      .from("dg_release_versions")
      .select("app_version")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!relRes.error && Array.isArray(relRes.data) && relRes.data.length > 0) {
      const vs = Array.from(new Set(relRes.data.map((r: any) => String(r?.app_version || "").trim()).filter(Boolean)));
      return c.json({ success: true, data: { app_versions: vs } });
    }

    // Fallback: distinct app_version from dg_events
    const evRes = await supabase
      .from("dg_events")
      .select("app_version")
      .in("event_code", DG_MEDIA_CODES)
      .limit(5000);
    if (evRes.error) return c.json({ success: false, error: evRes.error.message }, 500);
    const vs = Array.from(new Set((evRes.data || []).map((r: any) => String(r?.app_version || "").trim()).filter(Boolean)));
    return c.json({ success: true, data: { app_versions: vs } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

function applyDgMediaFilters(query: any, params: any) {
  // Time range
  const { from, to } = clampIsoRange(params?.from, params?.to);
  query = query.gte("created_at", from).lte("created_at", to);

  // DG-MEDIA only
  query = query.in("event_code", DG_MEDIA_CODES);

  // Optional filters (prefer server-side)
  const appVersion = params?.app_version ? String(params.app_version) : "";
  if (appVersion) {
    query = query.eq("app_version", appVersion);
  }

  const screen = params?.screen ? String(params.screen) : "";
  if (screen) {
    query = query.contains("payload", { screen });
  }

  const featureKey = params?.feature_key ? String(params.feature_key) : "";
  if (featureKey) {
    query = query.contains("payload", { feature_key: featureKey });
  }

  const networkState = params?.network_state ? String(params.network_state) : "";
  if (networkState) {
    query = query.contains("payload", { network_state: networkState });
  }

  return { query, from, to };
}

async function getDgMediaOverview(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("dg_events")
      .select("event_code,created_at,payload,app_version")
      .order("created_at", { ascending: true })
      .limit(5000);

    const filtered = applyDgMediaFilters(query, c.req.query());
    query = filtered.query;
    const { from, to } = filtered;

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);

    const rows = (data || []) as any[];
    const dims = {
      app_versions: new Set<string>(),
      screens: new Set<string>(),
      feature_keys: new Set<string>(),
      network_states: new Set<string>(),
    };

    let imgLoadCount = 0;
    let imgLoadSum = 0;
    let imgLoadN = 0;
    let downscales = 0;
    let imgFails = 0;
    let videoBuffering = 0;
    let videoReleases = 0;

    const byDayLoad: Record<string, { sum: number; n: number }> = {};
    const byDayLoadsCount: Record<string, number> = {};
    const byDayDownscales: Record<string, number> = {};
    const byDayBuffer: Record<string, number> = {};

    for (const r of rows) {
      const code = r?.event_code;
      const createdAt = String(r?.created_at || "");
      const payload = r?.payload && typeof r.payload === "object" ? r.payload : {};

      const v = String(r?.app_version || "").trim();
      if (v) dims.app_versions.add(v);
      if (payload?.screen) dims.screens.add(String(payload.screen));
      if (payload?.feature_key) dims.feature_keys.add(String(payload.feature_key));
      if (payload?.network_state) dims.network_states.add(String(payload.network_state));

      const d = dayKey(createdAt);

      if (code === "DG-MEDIA-0001") {
        imgLoadCount += 1;
        const ms = safeNumber(payload?.duration_ms);
        if (ms != null) {
          imgLoadSum += ms;
          imgLoadN += 1;
          if (!byDayLoad[d]) byDayLoad[d] = { sum: 0, n: 0 };
          byDayLoad[d].sum += ms;
          byDayLoad[d].n += 1;
        }
        byDayLoadsCount[d] = (byDayLoadsCount[d] || 0) + 1;
      } else if (code === "DG-MEDIA-0002") {
        downscales += 1;
        byDayDownscales[d] = (byDayDownscales[d] || 0) + 1;
      } else if (code === "DG-MEDIA-0003") {
        imgFails += 1;
      } else if (code === "DG-MEDIA-0004") {
        videoBuffering += 1;
        byDayBuffer[d] = (byDayBuffer[d] || 0) + 1;
      } else if (code === "DG-MEDIA-0005") {
        videoReleases += 1;
      }
    }

    const avgImageLoad = imgLoadN > 0 ? imgLoadSum / imgLoadN : null;
    const downscalePct = imgLoadCount > 0 ? downscales / imgLoadCount : null;
    const failureRate = imgLoadCount > 0 ? imgFails / imgLoadCount : null;

    const days = Array.from(
      new Set([
        ...Object.keys(byDayLoadsCount),
        ...Object.keys(byDayDownscales),
        ...Object.keys(byDayBuffer),
        ...Object.keys(byDayLoad),
      ]),
    ).sort();

    const imageLoadTrend = days.map((d) => {
      const agg = byDayLoad[d];
      return { date: d, value: agg && agg.n > 0 ? agg.sum / agg.n : null };
    });

    const downscaleTrend = days.map((d) => {
      const loads = byDayLoadsCount[d] || 0;
      const ds = byDayDownscales[d] || 0;
      return { date: d, value: loads > 0 ? ds / loads : null };
    });

    const bufferingTrend = days.map((d) => ({ date: d, value: byDayBuffer[d] || 0 }));

    return c.json({
      success: true,
      data: {
        kpis: {
          avg_image_load_ms: avgImageLoad,
          image_load_count: imgLoadCount,
          image_downscale_pct: downscalePct,
          image_failure_rate: failureRate,
          video_buffering_count: videoBuffering,
          video_buffering_rate: null,
          video_release_count: videoReleases,
        },
        trends: {
          image_load_time_ms: imageLoadTrend,
          downscale_pct: downscaleTrend,
          video_buffering_count: bufferingTrend,
        },
        dimensions: {
          app_versions: Array.from(dims.app_versions).sort(),
          screens: Array.from(dims.screens).sort(),
          feature_keys: Array.from(dims.feature_keys).sort(),
          network_states: Array.from(dims.network_states).sort(),
        },
        range: { from, to },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

async function getDgMediaAssets(c: any) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const limit = Math.min(parseInt(String(c.req.query("limit") || "50"), 10) || 50, 200);

    let query = supabase
      .from("dg_events")
      .select("event_code,created_at,payload,app_version")
      .order("created_at", { ascending: false })
      .limit(5000);

    const filtered = applyDgMediaFilters(query, c.req.query());
    query = filtered.query;

    const { data, error } = await query;
    if (error) return c.json({ success: false, error: error.message }, 500);

    const rows = (data || []) as any[];

    const dims = {
      app_versions: new Set<string>(),
      screens: new Set<string>(),
      feature_keys: new Set<string>(),
      network_states: new Set<string>(),
    };

    const map: Record<
      string,
      {
        asset_key: string;
        asset_id: string | null;
        asset_url: string | null;
        load_sum: number;
        load_n: number;
        image_loads: number;
        downscales: number;
        failures: number;
        bufferings: number;
        releases: number;
        screens: Set<string>;
        feature_keys: Set<string>;
      }
    > = {};

    for (const r of rows) {
      const code = r?.event_code;
      const payload = r?.payload && typeof r.payload === "object" ? r.payload : {};

      const v = String(r?.app_version || "").trim();
      if (v) dims.app_versions.add(v);
      if (payload?.screen) dims.screens.add(String(payload.screen));
      if (payload?.feature_key) dims.feature_keys.add(String(payload.feature_key));
      if (payload?.network_state) dims.network_states.add(String(payload.network_state));

      const assetId = payload?.asset_id ? String(payload.asset_id) : null;
      const assetUrl = payload?.asset_url ? String(payload.asset_url) : null;
      const key = assetId || assetUrl || "unknown";

      if (!map[key]) {
        map[key] = {
          asset_key: key,
          asset_id: assetId,
          asset_url: assetUrl,
          load_sum: 0,
          load_n: 0,
          image_loads: 0,
          downscales: 0,
          failures: 0,
          bufferings: 0,
          releases: 0,
          screens: new Set<string>(),
          feature_keys: new Set<string>(),
        };
      }

      const agg = map[key];

      if (payload?.screen) agg.screens.add(String(payload.screen));
      if (payload?.feature_key) agg.feature_keys.add(String(payload.feature_key));

      if (code === "DG-MEDIA-0001") {
        agg.image_loads += 1;
        const ms = safeNumber(payload?.duration_ms);
        if (ms != null) {
          agg.load_sum += ms;
          agg.load_n += 1;
        }
      } else if (code === "DG-MEDIA-0002") {
        agg.downscales += 1;
      } else if (code === "DG-MEDIA-0003") {
        agg.failures += 1;
      } else if (code === "DG-MEDIA-0004") {
        agg.bufferings += 1;
      } else if (code === "DG-MEDIA-0005") {
        agg.releases += 1;
      }
    }

    const out = Object.values(map)
      .map((r) => ({
        asset_key: r.asset_key,
        asset_id: r.asset_id,
        asset_url: r.asset_url,
        avg_load_ms: r.load_n > 0 ? r.load_sum / r.load_n : null,
        image_loads: r.image_loads,
        downscales: r.downscales,
        failures: r.failures,
        bufferings: r.bufferings,
        releases: r.releases,
        screens: Array.from(r.screens).sort(),
        feature_keys: Array.from(r.feature_keys).sort(),
      }))
      .sort((a, b) => {
        const at = (a.avg_load_ms || 0) * a.image_loads;
        const bt = (b.avg_load_ms || 0) * b.image_loads;
        return bt - at;
      })
      .slice(0, limit);

    return c.json({
      success: true,
      data: {
        rows: out,
        dimensions: {
          app_versions: Array.from(dims.app_versions).sort(),
          screens: Array.from(dims.screens).sort(),
          feature_keys: Array.from(dims.feature_keys).sort(),
          network_states: Array.from(dims.network_states).sort(),
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

function computeKpisFromRows(rows: any[]) {
  let imgLoads = 0;
  let imgSum = 0;
  let imgN = 0;
  let downscales = 0;
  let fails = 0;
  let buffering = 0;
  let releases = 0;

  for (const r of rows) {
    const code = r?.event_code;
    const payload = r?.payload && typeof r.payload === "object" ? r.payload : {};

    if (code === "DG-MEDIA-0001") {
      imgLoads += 1;
      const ms = safeNumber(payload?.duration_ms);
      if (ms != null) {
        imgSum += ms;
        imgN += 1;
      }
    } else if (code === "DG-MEDIA-0002") {
      downscales += 1;
    } else if (code === "DG-MEDIA-0003") {
      fails += 1;
    } else if (code === "DG-MEDIA-0004") {
      buffering += 1;
    } else if (code === "DG-MEDIA-0005") {
      releases += 1;
    }
  }

  return {
    avg_image_load_ms: imgN > 0 ? imgSum / imgN : null,
    image_downscale_pct: imgLoads > 0 ? downscales / imgLoads : null,
    image_failure_rate: imgLoads > 0 ? fails / imgLoads : null,
    video_buffering_count: buffering,
    video_release_count: releases,
  };
}

async function getDgMediaCompare(c: any) {
  try {
    const versionA = String(c.req.query("version_a") || "").trim();
    const versionB = String(c.req.query("version_b") || "").trim();
    if (!versionA || !versionB) {
      return c.json({ success: false, error: "Missing version_a or version_b" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { from, to } = clampIsoRange(c.req.query("from"), c.req.query("to"));

    const base = supabase
      .from("dg_events")
      .select("event_code,created_at,payload,app_version")
      .in("event_code", DG_MEDIA_CODES)
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(5000);

    const [aRes, bRes] = await Promise.all([
      base.eq("app_version", versionA),
      base.eq("app_version", versionB),
    ]);

    if (aRes.error) return c.json({ success: false, error: aRes.error.message }, 500);
    if (bRes.error) return c.json({ success: false, error: bRes.error.message }, 500);

    const metricsA = computeKpisFromRows((aRes.data || []) as any[]);
    const metricsB = computeKpisFromRows((bRes.data || []) as any[]);

    const deltaPct = (a: number | null, b: number | null): number | null => {
      if (a == null || b == null || a === 0) return null;
      return (b - a) / a;
    };

    return c.json({
      success: true,
      data: {
        version_a: versionA,
        version_b: versionB,
        metrics_a: metricsA,
        metrics_b: metricsB,
        delta: {
          avg_image_load_ms_pct: deltaPct(metricsA.avg_image_load_ms, metricsB.avg_image_load_ms),
          image_downscale_pct_pct: deltaPct(metricsA.image_downscale_pct, metricsB.image_downscale_pct),
          image_failure_rate_pct: deltaPct(metricsA.image_failure_rate, metricsB.image_failure_rate),
          video_buffering_count_pct: deltaPct(metricsA.video_buffering_count, metricsB.video_buffering_count),
        },
        range: { from, to },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
}

app.get("/make-server-4a075ebc/api/admin/divine-guard/release-versions", listDgReleaseVersions);
app.get("/api/admin/divine-guard/release-versions", listDgReleaseVersions);

app.get("/make-server-4a075ebc/api/admin/divine-guard/media/overview", getDgMediaOverview);
app.get("/api/admin/divine-guard/media/overview", getDgMediaOverview);

app.get("/make-server-4a075ebc/api/admin/divine-guard/media/assets", getDgMediaAssets);
app.get("/api/admin/divine-guard/media/assets", getDgMediaAssets);

app.get("/make-server-4a075ebc/api/admin/divine-guard/media/compare", getDgMediaCompare);
app.get("/api/admin/divine-guard/media/compare", getDgMediaCompare);

// ========================================
// UNIFIED ANALYTICS SYSTEM
// ========================================

// Public tracking endpoints (user panel)
app.post("/make-server-4a075ebc/api/analytics/track", analytics.trackEvent);
app.post("/make-server-4a075ebc/api/analytics/untrack", analytics.untrackEvent);
app.get("/make-server-4a075ebc/api/analytics/stats/:module/:itemId", analytics.getItemStats);
app.get("/make-server-4a075ebc/api/analytics/check/:module/:itemId/:eventType", analytics.checkEventTracked);
app.get("/make-server-4a075ebc/api/analytics/sparkle/:id", getSparkleAnalytics); // New Sparkle Analytics Route

// Spark Automation & Ingestion
app.post("/make-server-4a075ebc/api/spark/ingest", ingestSparkle);
app.post("/make-server-4a075ebc/api/spark/publish", publishSparkle);

// Admin analytics endpoints
app.get("/make-server-4a075ebc/api/analytics/admin/dashboard", analytics.getAnalyticsDashboard);
app.get("/make-server-4a075ebc/api/analytics/admin/top/:module/:eventType", analytics.getTopItems);
app.get("/make-server-4a075ebc/api/analytics/admin/trend/:module/:eventType", analytics.getTrendByEvent);
app.get("/make-server-4a075ebc/api/analytics/admin/active-users", analytics.getActiveUsersStats);
app.get("/make-server-4a075ebc/api/analytics/admin/config", analytics.getAnalyticsConfig);
app.put("/make-server-4a075ebc/api/analytics/admin/config", analytics.updateAnalyticsConfig);
app.post("/make-server-4a075ebc/api/analytics/admin/config", analytics.addAnalyticsConfig);
app.post("/make-server-4a075ebc/api/analytics/admin/reset", analytics.resetStats);
app.get("/make-server-4a075ebc/api/analytics/admin/details/:module", analytics.getModuleAnalytics);
app.post("/make-server-4a075ebc/api/analytics/admin/refresh", analytics.refreshAnalyticsCache);

// Analytics initialization endpoints
app.post("/make-server-4a075ebc/api/analytics/admin/initialize", async (c) => {
  try {
    const result = await analyticsInit.initializeAnalyticsSystem();
    return c.json(result);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/analytics/admin/status", async (c) => {
  try {
    const status = await analyticsInit.checkAnalyticsStatus();
    return c.json({ success: true, status });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-4a075ebc/api/analytics/admin/install-guide", (c) => {
  const guide = analyticsInit.getInstallationGuide();
  return c.json({ success: true, guide });
});

// ========================================
// LEGACY SYNC ENDPOINTS (Keep for backward compatibility)
// ========================================

// User-facing content endpoints
app.get("/make-server-4a075ebc/user/banners", (c) => sync.fetchUserContent(c, "banners"));
app.get("/make-server-4a075ebc/user/wallpapers", (c) => sync.fetchUserContent(c, "wallpapers"));
app.get("/make-server-4a075ebc/user/media", (c) => sync.fetchUserContent(c, "media"));
app.get("/make-server-4a075ebc/user/photos", (c) => sync.fetchUserContent(c, "photos"));
app.get("/make-server-4a075ebc/user/sparkles", (c) => sync.fetchUserContent(c, "sparkles"));

// Admin content management
app.post("/make-server-4a075ebc/admin/upload", sync.uploadImage);
app.post("/make-server-4a075ebc/admin/sync", sync.syncContent);

app.post("/make-server-4a075ebc/admin/banners", (c) => sync.saveAdminContent(c, "banner"));
app.get("/make-server-4a075ebc/admin/banners", (c) => sync.getAdminContent(c, "banner"));
app.delete("/make-server-4a075ebc/admin/banners/:id", (c) => sync.deleteContent(c, "banner", c.req.param("id")));

app.post("/make-server-4a075ebc/admin/wallpapers", (c) => sync.saveAdminContent(c, "wallpaper"));
app.get("/make-server-4a075ebc/admin/wallpapers", (c) => sync.getAdminContent(c, "wallpaper"));
app.delete("/make-server-4a075ebc/admin/wallpapers/:id", (c) => sync.deleteContent(c, "wallpaper", c.req.param("id")));

app.post("/make-server-4a075ebc/admin/photos", (c) => sync.saveAdminContent(c, "photo"));
app.get("/make-server-4a075ebc/admin/photos", (c) => sync.getAdminContent(c, "photo"));
app.delete("/make-server-4a075ebc/admin/photos/:id", (c) => sync.deleteContent(c, "photo", c.req.param("id")));

app.post("/make-server-4a075ebc/admin/sparkles", (c) => sync.saveAdminContent(c, "sparkle"));
app.get("/make-server-4a075ebc/admin/sparkles", (c) => sync.getAdminContent(c, "sparkle"));
app.delete("/make-server-4a075ebc/admin/sparkles/:id", (c) => sync.deleteContent(c, "sparkle", c.req.param("id")));

// USER-FACING BANNER LIST ENDPOINT
app.get("/make-server-4a075ebc/banners/list", async (c) => {
  try {
    console.log("[User Banners] Fetching ALL published banners for wallpaper module...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SIMPLIFIED: Ignore banner_type completely - fetch ALL published banners
    console.log("[User Banners] Fetching all banners (banner_type filter removed)");

    const { data: banners, error } = await supabase
      .from("banners")
      .select(`
        id,
        title,
        description,
        image_url,
        thumbnail_url,
        small_url,
        medium_url,
        large_url,
        original_url,
        banner_type,
        order_index,
        view_count,
        click_count
      `)
      .eq("publish_status", "published")
      .eq("visibility", "public")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("[User Banners] Database error:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform banners to include 'type' field (aliased from banner_type)
    const transformedBanners = (banners || []).map(banner => ({
      ...banner,
      type: "wallpaper", // Force all banners to be treated as wallpaper type
    }));

    console.log(`[User Banners] Found ${transformedBanners.length} published banners (all types combined)`);
    if (transformedBanners.length > 0) {
      console.log(`[User Banners] Sample banner:`, transformedBanners[0]);
    }

    return c.json({ success: true, banners: transformedBanners });
  } catch (error: any) {
    console.error("[User Banners] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// USER-FACING WALLPAPER LIST ENDPOINT (SEPARATE FROM BANNERS)
// MANDATORY: POST only with CORS headers
const wallpapersListHandler = async (c: Context) => {
  try {
    // Handle OPTIONS preflight request
    if (c.req.method === "OPTIONS") {
      return new Response("OK", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    console.log("[User Wallpapers] POST request - Fetching published wallpapers...");

    // Add timeout protection
    const startTime = Date.now();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[User Wallpapers] Supabase client created in ${Date.now() - startTime}ms`);

    // MANDATORY: Always read from POST body
    let page = 1;
    let limit = 20;
    let search: string | undefined;

    try {
      const body = await c.req.json();
      page = body.page || 1;
      limit = body.limit || 20;
      search = body.search;
      console.log(`[User Wallpapers] Body params: page=${page}, limit=${limit}, search=${search || 'none'}`);
    } catch (e) {
      console.warn("[User Wallpapers] Failed to parse JSON body, using defaults");
    }

    const offset = (page - 1) * limit;

    // 🔥 CRITICAL FIX: Simplified query without filters to test if filters are causing timeout
    console.log("[User Wallpapers] Building query...");

    let query = supabase
      .from("wallpapers")
      .select("*", { count: "exact" })
      // ✅ FILTERS RESTORED: Now that we set visibility on insert, this will work
      .eq("publish_status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    console.log(`[User Wallpapers] Executing query... (${Date.now() - startTime}ms elapsed)`);

    const { data: wallpapers, error, count } = await query;

    console.log(`[User Wallpapers] Query completed in ${Date.now() - startTime}ms`);

    if (error) {
      console.error("[User Wallpapers] Database error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // ✅ NO APPLICATION LAYER FILTER NEEDED - DB query handles this correctly now
    console.log(`[User Wallpapers] Found ${wallpapers?.length || 0} published wallpapers`);

    console.log(`[User Wallpapers] Page ${page}, total ${count} (query time: ${Date.now() - startTime}ms)`);
    console.log("[EdgeFunction] CORS OK");

    if (wallpapers.length > 0) {
      console.log("[User Wallpapers] Sample wallpaper:", wallpapers[0]);
    }

    const result = {
      success: true,
      data: wallpapers,
      pagination: {
        page,
        limit,
        total: wallpapers.length,
        hasMore: offset + wallpapers.length < count
      }
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  } catch (error: any) {
    console.error("[User Wallpapers] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
};

// MANDATORY: Only POST method (no GET)
app.post("/make-server-4a075ebc/wallpapers/list", wallpapersListHandler);
app.options("/make-server-4a075ebc/wallpapers/list", wallpapersListHandler);

// ========================================
// USER PROFILE ENDPOINTS
// ========================================

// Get user statistics (likes, downloads, views)
app.get("/make-server-4a075ebc/user/stats", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = null;

    // Get user from token if provided
    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    if (!userId) {
      // Return default stats for non-authenticated users
      return c.json({
        success: true,
        stats: {
          totalLikes: 0,
          totalDownloads: 0,
          totalViews: 0
        }
      });
    }

    // Get user events from KV tracking system
    let totalLikes = 0;
    let totalDownloads = 0;
    let totalViews = 0;

    try {
      // Check wallpaper events
      const wallpaperEvents = await kv.getByPrefix('tracking:event:wallpaper:');
      const userWallpaperEvents = wallpaperEvents.filter((e: any) => e.user_id === userId);

      totalLikes += userWallpaperEvents.filter((e: any) => e.action === 'like').length;
      totalDownloads += userWallpaperEvents.filter((e: any) => e.action === 'download').length;
      totalViews += userWallpaperEvents.filter((e: any) => e.action === 'view').length;

      // Check song events
      const songEvents = await kv.getByPrefix('tracking:event:song:');
      const userSongEvents = songEvents.filter((e: any) => e.user_id === userId);

      totalLikes += userSongEvents.filter((e: any) => e.action === 'like').length;
      totalDownloads += userSongEvents.filter((e: any) => e.action === 'download').length;
      totalViews += userSongEvents.filter((e: any) => e.action === 'view').length;
    } catch (kvError) {
      console.error('[User Stats] KV query error:', kvError);
    }

    const stats = {
      totalLikes,
      totalDownloads,
      totalViews
    };

    console.log(`[User Stats] User ${userId} - Likes: ${stats.totalLikes}, Downloads: ${stats.totalDownloads}, Views: ${stats.totalViews}`);

    return c.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('[User Stats] Endpoint error:', error);
    return c.json({
      success: false,
      error: error.message,
      stats: {
        totalLikes: 0,
        totalDownloads: 0,
        totalViews: 0
      }
    }, 500);
  }
});

// Get user's liked photos
app.get("/make-server-4a075ebc/user/liked-photos", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = null;

    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    if (!userId) {
      return c.json({ success: true, data: [] });
    }

    // Get liked photos from KV tracking system
    const photoIds: string[] = [];

    try {
      const wallpaperEvents = await kv.getByPrefix('tracking:event:wallpaper:');
      const userLikeEvents = wallpaperEvents.filter((e: any) =>
        e.user_id === userId && e.action === 'like' && e.content_id
      );

      photoIds.push(...userLikeEvents.map((e: any) => e.content_id));
    } catch (kvError) {
      console.error('[Liked Photos] KV query error:', kvError);
    }

    if (photoIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    // Remove duplicates
    const uniquePhotoIds = [...new Set(photoIds)];

    // Fetch actual wallpaper/photo data
    const { data: wallpapers } = await supabase
      .from('wallpapers')
      .select('*')
      .in('id', uniquePhotoIds)
      .eq('visibility', 'public');

    const projectUrl = Deno.env.get('SUPABASE_URL');
    const transformedData = (wallpapers || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      url: item.web_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.web_path}` : null,
      thumbnail: item.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.thumb_path}` : null,
      tags: item.tags || [],
      likes: item.likes || 0,
      downloads: item.downloads || 0
    }));

    console.log(`[Liked Photos] Found ${transformedData.length} liked photos for user ${userId}`);

    return c.json({
      success: true,
      data: transformedData
    });
  } catch (error: any) {
    console.error('[Liked Photos] Endpoint error:', error);
    return c.json({ success: false, error: error.message, data: [] }, 500);
  }
});

// Get user's liked songs
app.get("/make-server-4a075ebc/user/liked-songs", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = null;

    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    if (!userId) {
      return c.json({ success: true, data: [] });
    }

    // Get liked songs from KV tracking system
    const songIds: string[] = [];

    try {
      const songEvents = await kv.getByPrefix('tracking:event:song:');
      const userLikeEvents = songEvents.filter((e: any) =>
        e.user_id === userId && e.action === 'like' && e.content_id
      );

      songIds.push(...userLikeEvents.map((e: any) => e.content_id));
    } catch (kvError) {
      console.error('[Liked Songs] KV query error:', kvError);
    }

    if (songIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    // Remove duplicates
    const uniqueSongIds = [...new Set(songIds)];

    // Fetch actual media/song data
    const { data: media } = await supabase
      .from('media')
      .select('*')
      .in('id', uniqueSongIds)
      .eq('visibility', 'public');

    const projectUrl = Deno.env.get('SUPABASE_URL');
    const transformedData = (media || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.media_type,
      url: item.host_url || (item.web_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.web_path}` : null),
      thumbnail: item.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${item.thumb_path}` : null,
      duration: item.duration,
      tags: item.tags || [],
      likes: item.likes || 0,
      downloads: item.downloads || 0
    }));

    console.log(`[Liked Songs] Found ${transformedData.length} liked songs for user ${userId}`);

    return c.json({
      success: true,
      data: transformedData
    });
  } catch (error: any) {
    console.error('[Liked Songs] Endpoint error:', error);
    return c.json({ success: false, error: error.message, data: [] }, 500);
  }
});

// Get user notifications
app.get("/make-server-4a075ebc/user/notifications", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    let userId = null;

    if (accessToken && accessToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    // Return sample notifications for now
    const notifications = [
      {
        id: '1',
        type: 'new_content',
        title: 'New Murugan Wallpapers Added',
        message: '10 new divine wallpapers have been added to the gallery',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: false,
        icon: '🖼️'
      },
      {
        id: '2',
        type: 'new_songs',
        title: 'New Devotional Songs Available',
        message: 'Experience the latest devotional music for Lord Murugan',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: false,
        icon: '🎵'
      },
      {
        id: '3',
        type: 'update',
        title: 'App Update Available',
        message: 'Version 0.0.2 is now available with new features',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        read: true,
        icon: '✨'
      }
    ];

    console.log(`[Notifications] Returned ${notifications.length} notifications`);

    return c.json({
      success: true,
      data: notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (error: any) {
    console.error('[Notifications] Endpoint error:', error);
    return c.json({ success: false, error: error.message, data: [] }, 500);
  }
});

// ========================================
// WALLPAPER FOLDERS MANAGEMENT
// ========================================
app.get("/make-server-4a075ebc/api/wallpaper-folders", getWallpaperFolders);
app.post("/make-server-4a075ebc/api/wallpaper-folders", createWallpaperFolder);
app.put("/make-server-4a075ebc/api/wallpaper-folders/:id", updateWallpaperFolder);
app.delete("/make-server-4a075ebc/api/wallpaper-folders/:id", deleteWallpaperFolder);

// ========================================
// WALLPAPER ANALYTICS
// ========================================
app.get("/make-server-4a075ebc/api/wallpapers/:id/analytics", getWallpaperAnalytics);
app.post("/make-server-4a075ebc/api/wallpapers/:id/track", trackWallpaperEvent);
app.get("/make-server-4a075ebc/api/analytics/aggregate", getAggregateAnalytics);

// ========================================
// BANNER ANALYTICS
// ========================================
app.get("/make-server-4a075ebc/api/analytics/banner/:id", getBannerAnalytics);

// ========================================
// BANNER FOLDERS MANAGEMENT
// ========================================
app.get("/make-server-4a075ebc/api/banner-folders", getBannerFolders);
app.post("/make-server-4a075ebc/api/banner-folders", createBannerFolder);
app.put("/make-server-4a075ebc/api/banner-folders/:id", updateBannerFolder);
app.delete("/make-server-4a075ebc/api/banner-folders/:id", deleteBannerFolder);

// ========================================
// MEDIA FOLDERS MANAGEMENT
// ========================================
app.get("/make-server-4a075ebc/api/media-folders", getMediaFolders);
app.post("/make-server-4a075ebc/api/media-folders", createMediaFolder);
app.put("/make-server-4a075ebc/api/media-folders/:id", updateMediaFolder);
app.delete("/make-server-4a075ebc/api/media-folders/:id", deleteMediaFolder);

// ========================================
// SPARKLE FOLDERS MANAGEMENT
// ========================================
app.get("/make-server-4a075ebc/api/sparkle-folders", getSparkleFolders);
app.post("/make-server-4a075ebc/api/sparkle-folders", createSparkleFolder);
app.put("/make-server-4a075ebc/api/sparkle-folders/:id", updateSparkleFolder);
app.delete("/make-server-4a075ebc/api/sparkle-folders/:id", deleteSparkleFolder);

// ========================================
// SCHEDULED PUBLISHER
// ========================================
app.post("/make-server-4a075ebc/api/publish-scheduled", publishScheduledContent);

const ROUTE_PREFIX = "/make-server-4a075ebc";
const FUNCTION_NAME = "make-server-4a075ebc";
const FUNCTION_INVOKE_PREFIX = `/functions/v1/${FUNCTION_NAME}`;

// Supabase Edge Functions are invoked at:
//   /functions/v1/<function-name>/<path>
// Depending on runtime/hosting, the path visible here may be either:
//   - /<path>
//   - /functions/v1/<function-name>/<path>
// Our routes are registered with an explicit `ROUTE_PREFIX`, so normalize here.
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const originalPathname = url.pathname;

  let pathname = url.pathname;

  // If the function receives the full invoke path, strip it.
  // Example:
  //   /functions/v1/make-server-4a075ebc/api/temples  ->  /api/temples
  if (pathname.startsWith(FUNCTION_INVOKE_PREFIX)) {
    pathname = pathname.slice(FUNCTION_INVOKE_PREFIX.length) || "/";
  }

  const method = String(req.method || "GET").toUpperCase();
  const bodyBytes = method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const normalizeLeadingSlash = (p: string) => (p.startsWith("/") ? p : `/${p}`);
  const withPrefix = (p: string) =>
    p.startsWith(ROUTE_PREFIX)
      ? p
      : `${ROUTE_PREFIX}${p.startsWith("/") ? "" : "/"}${p}`;
  const withoutPrefix = (p: string) => {
    if (!p.startsWith(ROUTE_PREFIX)) return p;
    const next = p.slice(ROUTE_PREFIX.length);
    return next === "" ? "/" : normalizeLeadingSlash(next);
  };

  const candidatesRaw = [
    normalizeLeadingSlash(pathname),
    withPrefix(normalizeLeadingSlash(pathname)),
    withoutPrefix(normalizeLeadingSlash(pathname)),
    normalizeLeadingSlash(originalPathname),
    withPrefix(normalizeLeadingSlash(originalPathname)),
    withoutPrefix(normalizeLeadingSlash(originalPathname)),
  ];

  const candidates: string[] = [];
  for (const p of candidatesRaw) {
    if (!candidates.includes(p)) candidates.push(p);
  }

  const baseInit: RequestInit = {
    method: req.method,
    headers: req.headers,
    redirect: req.redirect,
  };

  for (const p of candidates) {
    const u = new URL(url.toString());
    u.pathname = p;
    const init: RequestInit = {
      ...baseInit,
      body: bodyBytes ? bodyBytes.slice(0) : undefined,
    };
    const res = await app.fetch(new Request(u.toString(), init));
    if (res.status !== 404) return res;
  }

  return app.fetch(req);
});