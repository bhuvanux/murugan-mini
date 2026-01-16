// Unified Tracking System - Backend Handler
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'npm:@supabase/supabase-js';
// import * as kv from './kv_store.tsx';

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
    // Store event
    // await kv.set(getEventKey(module, eventId), eventData);
    console.log('[MOCK KV] Set event:', eventId);

    // Update daily counter
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = getDailyEventsKey(module, today);
    // const dailyData = await kv.get(dailyKey) || { date: today, count: 0, events: [] };
    const dailyData = { date: today, count: 0, events: [] }; // Mock

    dailyData.count = (dailyData.count || 0) + 1;
    dailyData.events = [...(dailyData.events || []), eventId].slice(-100);
    // await kv.set(dailyKey, dailyData);
    console.log('[MOCK KV] Set daily:', dailyKey);

    // Update module stats
    const statsKey = getModuleStatsKey(module);
    // const stats = await kv.get(statsKey) || { ... };
    const stats: any = {
      module,
      total_events: 0,
      today_events: 0,
      unique_users: new Set(),
      action_counts: {},
      last_event: null
    }; // Mock

    stats.total_events = (stats.total_events || 0) + 1;
    stats.last_event = timestamp;
    stats.action_counts = stats.action_counts || {};
    stats.action_counts[action] = (stats.action_counts[action] || 0) + 1;

    if (user_id) {
      const users = new Set(stats.unique_users || []);
      users.add(user_id);
      stats.unique_users = Array.from(users);
    }

    // await kv.set(statsKey, stats);
    console.log('[MOCK KV] Set stats:', statsKey);

    console.log(`[TRACKING] ${module}.${action} tracked:`, eventId);

    return c.json({ success: true, event_id: eventId, timestamp });
  } catch (error) {
    console.error('[TRACKING ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GET /stats/:module - Get stats for a specific module
tracking.get('/stats/:module', async (c) => {
  return c.json({ success: true, mock: "atomic", module: c.req.param('module') });
});

// GET /stats - Get stats for all modules
tracking.get('/stats', async (c) => {
  try {
    const modules = ['wallpaper', 'sparkle', 'song', 'banner', 'ask_gugan', 'auth', 'app'];
    const allStats = [];

    for (const module of modules) {
      /*
      const statsKey = getModuleStatsKey(module);
      const stats = await kv.get(statsKey);
      ...
      */

      // Mock Data Loop
      allStats.push({
        module,
        total_events: 5,
        today_events: 2,
        active_users: 1,
        top_actions: [{ action: 'view', count: 5 }],
        trend: 'up',
        trend_percentage: 20,
        status: 'active',
        last_event: new Date().toISOString()
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
    // const events = await kv.getByPrefix(prefix);
    const events: any[] = []; // Mock empty events

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
      // const dailyData = await kv.get(getDailyEventsKey(module, dateStr)) || { count: 0 };
      const dailyData = { count: Math.floor(Math.random() * 10) }; // Mock

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
    // await kv.del(getModuleStatsKey(module));

    // Delete events (last 30 days)
    for (let i = 0; i < 30; i++) {
      // const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      // await kv.del(getDailyEventsKey(module, date));
    }

    console.log(`[TRACKING] Reset module: ${module}`);
    return c.json({ success: true, module, message: 'Module stats reset' });
  } catch (error) {
    console.error('[RESET ERROR]', error);
    return c.json({ error: String(error) }, 500);
  }
});

export default tracking;
