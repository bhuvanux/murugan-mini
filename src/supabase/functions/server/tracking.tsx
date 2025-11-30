// Unified Tracking System - Backend Handler
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const tracking = new Hono();

tracking.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Helper: Generate event key
function getEventKey(module: string, eventId: string): string {
  return `tracking:event:${module}:${eventId}`;
}

// Helper: Get module stats key
function getModuleStatsKey(module: string): string {
  return `tracking:stats:${module}`;
}

// Helper: Get daily events key
function getDailyEventsKey(module: string, date: string): string {
  return `tracking:daily:${module}:${date}`;
}

// POST /track - Track a new event
tracking.post('/track', async (c) => {
  try {
    const event = await c.req.json();
    const { module, action, content_id, user_id, session_id, metadata } = event;

    if (!module || !action) {
      return c.json({ error: 'Module and action are required' }, 400);
    }

    // Create event
    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const eventData = {
      id: eventId,
      module,
      action,
      content_id: content_id || null,
      user_id: user_id || null,
      session_id: session_id || null,
      metadata: metadata || {},
      created_at: timestamp
    };

    // Store event
    await kv.set(getEventKey(module, eventId), eventData);

    // Update daily counter
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = getDailyEventsKey(module, today);
    const dailyData = await kv.get(dailyKey) || { date: today, count: 0, events: [] };
    dailyData.count = (dailyData.count || 0) + 1;
    dailyData.events = [...(dailyData.events || []), eventId].slice(-100); // Keep last 100 event IDs
    await kv.set(dailyKey, dailyData);

    // Update module stats
    const statsKey = getModuleStatsKey(module);
    const stats = await kv.get(statsKey) || {
      module,
      total_events: 0,
      today_events: 0,
      unique_users: new Set(),
      action_counts: {},
      last_event: null
    };

    stats.total_events = (stats.total_events || 0) + 1;
    stats.last_event = timestamp;
    stats.action_counts = stats.action_counts || {};
    stats.action_counts[action] = (stats.action_counts[action] || 0) + 1;
    
    if (user_id) {
      const users = new Set(stats.unique_users || []);
      users.add(user_id);
      stats.unique_users = Array.from(users);
    }

    await kv.set(statsKey, stats);

    console.log(`[TRACKING] ${module}.${action} tracked:`, eventId);

    return c.json({ success: true, event_id: eventId, timestamp });
  } catch (error) {
    console.error('[TRACKING ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GET /stats/:module - Get stats for a specific module
tracking.get('/stats/:module', async (c) => {
  try {
    const module = c.req.param('module');
    const statsKey = getModuleStatsKey(module);
    const stats = await kv.get(statsKey);

    if (!stats) {
      return c.json({
        module,
        total_events: 0,
        today_events: 0,
        active_users: 0,
        top_actions: [],
        trend: 'stable',
        trend_percentage: 0,
        status: 'inactive',
        last_event: null
      });
    }

    // Get today's count
    const today = new Date().toISOString().split('T')[0];
    const dailyData = await kv.get(getDailyEventsKey(module, today)) || { count: 0 };

    // Calculate trend (compare with yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayData = await kv.get(getDailyEventsKey(module, yesterday)) || { count: 0 };
    
    let trend = 'stable';
    let trend_percentage = 0;
    
    if (yesterdayData.count > 0) {
      const change = ((dailyData.count - yesterdayData.count) / yesterdayData.count) * 100;
      trend_percentage = Math.abs(Math.round(change));
      if (change > 5) trend = 'up';
      else if (change < -5) trend = 'down';
    } else if (dailyData.count > 0) {
      trend = 'up';
      trend_percentage = 100;
    }

    // Get top actions
    const actionCounts = stats.action_counts || {};
    const top_actions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Determine status
    const lastEventTime = stats.last_event ? new Date(stats.last_event).getTime() : 0;
    const now = Date.now();
    const hoursSinceLastEvent = (now - lastEventTime) / (1000 * 60 * 60);
    const status = hoursSinceLastEvent < 1 ? 'active' : hoursSinceLastEvent < 24 ? 'inactive' : 'error';

    return c.json({
      module,
      total_events: stats.total_events || 0,
      today_events: dailyData.count || 0,
      active_users: (stats.unique_users || []).length,
      top_actions,
      trend,
      trend_percentage,
      status,
      last_event: stats.last_event
    });
  } catch (error) {
    console.error('[STATS ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GET /stats - Get stats for all modules
tracking.get('/stats', async (c) => {
  try {
    const modules = ['wallpaper', 'sparkle', 'song', 'banner', 'ask_gugan', 'auth', 'app'];
    const allStats = [];

    for (const module of modules) {
      const statsKey = getModuleStatsKey(module);
      const stats = await kv.get(statsKey);

      if (!stats) {
        allStats.push({
          module,
          total_events: 0,
          today_events: 0,
          active_users: 0,
          top_actions: [],
          trend: 'stable',
          trend_percentage: 0,
          status: 'inactive',
          last_event: null
        });
        continue;
      }

      // Get today's count
      const today = new Date().toISOString().split('T')[0];
      const dailyData = await kv.get(getDailyEventsKey(module, today)) || { count: 0 };

      // Calculate trend
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const yesterdayData = await kv.get(getDailyEventsKey(module, yesterday)) || { count: 0 };
      
      let trend = 'stable';
      let trend_percentage = 0;
      
      if (yesterdayData.count > 0) {
        const change = ((dailyData.count - yesterdayData.count) / yesterdayData.count) * 100;
        trend_percentage = Math.abs(Math.round(change));
        if (change > 5) trend = 'up';
        else if (change < -5) trend = 'down';
      } else if (dailyData.count > 0) {
        trend = 'up';
        trend_percentage = 100;
      }

      // Get top actions
      const actionCounts = stats.action_counts || {};
      const top_actions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Determine status
      const lastEventTime = stats.last_event ? new Date(stats.last_event).getTime() : 0;
      const now = Date.now();
      const hoursSinceLastEvent = (now - lastEventTime) / (1000 * 60 * 60);
      const status = hoursSinceLastEvent < 1 ? 'active' : hoursSinceLastEvent < 24 ? 'inactive' : 'error';

      allStats.push({
        module,
        total_events: stats.total_events || 0,
        today_events: dailyData.count || 0,
        active_users: (stats.unique_users || []).length,
        top_actions,
        trend,
        trend_percentage,
        status,
        last_event: stats.last_event
      });
    }

    return c.json({ stats: allStats });
  } catch (error) {
    console.error('[ALL STATS ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GET /events/:module - Get recent events for a module
tracking.get('/events/:module', async (c) => {
  try {
    const module = c.req.param('module');
    const limit = parseInt(c.req.query('limit') || '50');

    // Get events from KV store
    const prefix = `tracking:event:${module}:`;
    const events = await kv.getByPrefix(prefix);

    // Sort by created_at descending and limit
    const sortedEvents = events
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return c.json({ events: sortedEvents, count: sortedEvents.length });
  } catch (error) {
    console.error('[EVENTS ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GET /calendar/:module - Get calendar data for a module
tracking.get('/calendar/:module', async (c) => {
  try {
    const module = c.req.param('module');
    const days = parseInt(c.req.query('days') || '30');

    const calendarData = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dailyData = await kv.get(getDailyEventsKey(module, dateStr)) || { count: 0 };

      calendarData.push({
        date: dateStr,
        count: dailyData.count || 0,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }

    return c.json({ calendar: calendarData.reverse() });
  } catch (error) {
    console.error('[CALENDAR ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

// DELETE /reset/:module - Reset module stats (for testing)
tracking.delete('/reset/:module', async (c) => {
  try {
    const module = c.req.param('module');
    
    // Delete module stats
    await kv.del(getModuleStatsKey(module));
    
    // Delete events (last 30 days)
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await kv.del(getDailyEventsKey(module, date));
    }

    console.log(`[TRACKING] Reset module: ${module}`);
    return c.json({ success: true, module, message: 'Module stats reset' });
  } catch (error) {
    console.error('[RESET ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

export default tracking;
