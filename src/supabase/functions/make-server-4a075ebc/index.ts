import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import tracking from "./tracking.tsx";
import askGuganAI from "./ask-gugan-ai.tsx";
import askGuganMemories from "./ask-gugan-memories.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods (INCLUDING PATCH for publish/unpublish)
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// Mount tracking system
app.route('/make-server-4a075ebc/tracking', tracking);

// Mount Ask Gugan AI system
app.route('/make-server-4a075ebc/ask-gugan', askGuganAI);

// Mount Ask Gugan Memories system
app.route('/make-server-4a075ebc/memories', askGuganMemories);

// Import wallpaper folders and analytics handlers
import {
  getWallpaperFolders,
  createWallpaperFolder,
  updateWallpaperFolder,
  deleteWallpaperFolder,
  getWallpaperAnalytics,
  trackWallpaperEvent,
  getAggregateAnalytics,
  getBannerAnalytics,
  getSparkleAnalytics
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

// Import scheduled publisher (fixed import name)
import { publishScheduledContent } from "./scheduled-publisher.tsx";

// Health check endpoint
app.get("/make-server-4a075ebc/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

// Fetch Murugan-related news articles
// Optional: Set NEWS_API_KEY environment variable in Supabase for real-time news from NewsAPI.org
// Without the key, the endpoint will return curated fallback articles
app.get("/make-server-4a075ebc/spark/articles", async (c) => {
  try {
    // Try to fetch from cache first
    const cachedArticles = await kv.get('spark_articles');
    const cacheTimestamp = await kv.get('spark_articles_timestamp');

    // Cache for 1 hour
    const cacheExpiry = 60 * 60 * 1000;
    const now = Date.now();

    if (cachedArticles && cacheTimestamp && (now - parseInt(cacheTimestamp)) < cacheExpiry) {
      return c.json({ articles: JSON.parse(cachedArticles), cached: true });
    }

    // Fetch fresh articles from multiple sources
    const articles = await fetchMuruganArticles();

    // Cache the results
    await kv.set('spark_articles', JSON.stringify(articles));
    await kv.set('spark_articles_timestamp', now.toString());

    return c.json({ articles, cached: false });
  } catch (error: any) {
    console.error('Error fetching Spark articles:', error);
    return c.json({
      error: error.message,
      articles: getFallbackArticles()
    }, 500);
  }
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
          }
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
      type: item.media_type === 'youtube' ? 'youtube' :
        item.media_type === 'video' ? 'video' :
          item.media_type === 'audio' ? 'song' : 'photo',
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

// ========================================
// ADMIN API ROUTES - FULL CRUD
// ========================================

// BANNERS
app.post("/make-server-4a075ebc/api/upload/banner", api.uploadBanner);
app.get("/make-server-4a075ebc/api/banners", api.getBanners);
app.put("/make-server-4a075ebc/api/banners/:id", api.updateBanner);  // ✅ FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/banners/:id", api.updateBanner);
app.delete("/make-server-4a075ebc/api/banners/:id", api.deleteBanner);

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

// PHOTOS
app.post("/make-server-4a075ebc/api/upload/photo", api.uploadPhoto);
app.get("/make-server-4a075ebc/api/photos", api.getPhotos);
app.put("/make-server-4a075ebc/api/photos/:id", api.updatePhoto);  // ✅ FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/photos/:id", api.updatePhoto);
app.delete("/make-server-4a075ebc/api/photos/:id", api.deletePhoto);

// SPARKLE (News/Articles)
app.post("/make-server-4a075ebc/api/upload/sparkle", api.uploadSparkle);
app.get("/make-server-4a075ebc/api/sparkle", api.getSparkle);
app.put("/make-server-4a075ebc/api/sparkle/:id", api.updateSparkle);  // ✅ FIX: Added PUT route
app.patch("/make-server-4a075ebc/api/sparkle/:id", api.updateSparkle);
app.delete("/make-server-4a075ebc/api/sparkle/:id", api.deleteSparkle);

// CATEGORIES
app.get("/make-server-4a075ebc/api/categories", api.getCategories);

// SUPPORT MESSAGES
app.post("/make-server-4a075ebc/api/support/message", api.submitSupportMessage);

// ========================================
// UNIFIED ANALYTICS SYSTEM
// ========================================

// Public tracking endpoints (user panel)
app.post("/make-server-4a075ebc/api/analytics/track", analytics.trackEvent);
app.post("/make-server-4a075ebc/api/t/log", analytics.trackEvent); // Alias to avoid adblockers
app.post("/make-server-4a075ebc/api/analytics/untrack", analytics.untrackEvent);
app.post("/make-server-4a075ebc/api/analytics/track-install", analytics.trackInstall); // [NEW]
app.post("/make-server-4a075ebc/api/analytics/heartbeat", analytics.updateHeartbeat);
app.get("/make-server-4a075ebc/api/analytics/stats/:module/:itemId", analytics.getItemStats);
app.get("/make-server-4a075ebc/api/analytics/check/:module/:itemId/:eventType", analytics.checkEventTracked);

// Admin analytics endpoints
app.get("/make-server-4a075ebc/api/analytics/admin/dashboard", analytics.getAnalyticsDashboard);
app.get("/make-server-4a075ebc/api/analytics/admin/installs", analytics.getInstallAnalytics); // [NEW]
app.get("/make-server-4a075ebc/api/analytics/admin/top/:module/:eventType", analytics.getTopItems);
app.get("/make-server-4a075ebc/api/analytics/media-details/:id", analytics.getMediaAnalytics); // [NEW] Media Analytics (Renamed to avoid cache/conflict)
app.get("/make-server-4a075ebc/api/analytics/admin/config", analytics.getAnalyticsConfig);
app.put("/make-server-4a075ebc/api/analytics/admin/config", analytics.updateAnalyticsConfig);
app.post("/make-server-4a075ebc/api/analytics/admin/config", analytics.addAnalyticsConfig);
app.post("/make-server-4a075ebc/api/analytics/admin/reset", analytics.resetStats);
app.get("/make-server-4a075ebc/api/analytics/admin/details/:module", analytics.getModuleAnalytics);
app.post("/make-server-4a075ebc/api/analytics/admin/refresh", analytics.refreshAnalyticsCache);

// Event Manager endpoints
app.get("/make-server-4a075ebc/api/admin/analytics/stats", analytics.getAnalyticsStats);
app.get("/make-server-4a075ebc/api/admin/analytics/verify-event", analytics.verifyEvent);
app.get("/make-server-4a075ebc/api/admin/analytics/live-events", analytics.getLiveEvents);


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
app.get("/make-server-4a075ebc/api/analytics/sparkle/:id", getSparkleAnalytics);


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

Deno.serve(app.fetch);