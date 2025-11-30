import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const memories = new Hono();

// ========================================
// GET USER MEMORIES
// ========================================

memories.get('/', async (c) => {
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

    // Get all memories for user
    const memoryKeys = await kv.getByPrefix(`memory:${user.id}:`);
    
    const userMemories = memoryKeys.map((m: any) => ({
      id: m.key.split(':')[2],
      ...m.value
    }));

    // Sort by created_at descending
    userMemories.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({
      success: true,
      memories: userMemories,
      count: userMemories.length
    });

  } catch (error: any) {
    console.error('[Memories] Get error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// CREATE MEMORY
// ========================================

memories.post('/', async (c) => {
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
    const { 
      category, 
      key, 
      value, 
      description, 
      visibility = 'private' 
    } = body;

    if (!category || !key || !value) {
      return c.json({ error: 'category, key, and value are required' }, 400);
    }

    const memoryId = crypto.randomUUID();
    const memory = {
      id: memoryId,
      user_id: user.id,
      category,
      key,
      value,
      description,
      visibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`memory:${user.id}:${memoryId}`, memory);

    // Also create a category index
    await kv.set(`memory_index:${user.id}:${category}:${key}`, memoryId);

    return c.json({
      success: true,
      memory
    });

  } catch (error: any) {
    console.error('[Memories] Create error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// UPDATE MEMORY
// ========================================

memories.put('/:id', async (c) => {
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

    const memoryId = c.req.param('id');
    const existing = await kv.get(`memory:${user.id}:${memoryId}`);

    if (!existing) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    const body = await c.req.json();
    const updated = {
      ...existing,
      ...body,
      id: memoryId,
      user_id: user.id,
      updated_at: new Date().toISOString()
    };

    await kv.set(`memory:${user.id}:${memoryId}`, updated);

    return c.json({
      success: true,
      memory: updated
    });

  } catch (error: any) {
    console.error('[Memories] Update error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// DELETE MEMORY
// ========================================

memories.delete('/:id', async (c) => {
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

    const memoryId = c.req.param('id');
    const existing = await kv.get(`memory:${user.id}:${memoryId}`);

    if (!existing) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    await kv.del(`memory:${user.id}:${memoryId}`);

    // Also delete from category index
    if (existing.category && existing.key) {
      await kv.del(`memory_index:${user.id}:${existing.category}:${existing.key}`);
    }

    return c.json({
      success: true,
      message: 'Memory deleted'
    });

  } catch (error: any) {
    console.error('[Memories] Delete error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// GET MEMORY BY CATEGORY AND KEY
// ========================================

memories.get('/lookup/:category/:key', async (c) => {
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

    const category = c.req.param('category');
    const key = c.req.param('key');

    const memoryId = await kv.get(`memory_index:${user.id}:${category}:${key}`);

    if (!memoryId) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    const memory = await kv.get(`memory:${user.id}:${memoryId}`);

    return c.json({
      success: true,
      memory
    });

  } catch (error: any) {
    console.error('[Memories] Lookup error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default memories;
