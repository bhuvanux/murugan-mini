import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ========================================
// GET USER MEMORIES
// ========================================
app.get("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    const memoriesData = await kv.get(`memories:${userId}`) || '[]';
    const memories = JSON.parse(memoriesData);

    return c.json({
      success: true,
      memories,
      count: memories.length
    });
  } catch (error: any) {
    console.error('[Get Memories] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// CREATE MEMORY
// ========================================
app.post("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { key, value, category, visibility = 'private' } = body;

    if (!key || !value) {
      return c.json({ error: 'key and value are required' }, 400);
    }

    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const memory = {
      id: memoryId,
      user_id: userId,
      key,
      value,
      category: category || 'general', // e.g., 'personal', 'preferences', 'devotional', 'general'
      visibility, // 'private' or 'public'
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Get existing memories
    const memoriesData = await kv.get(`memories:${userId}`) || '[]';
    const memories = JSON.parse(memoriesData);

    // Add new memory
    memories.push(memory);

    // Save back to KV
    await kv.set(`memories:${userId}`, JSON.stringify(memories));

    console.log(`[Create Memory] ✅ Created memory for user ${userId}:`, memory);

    return c.json({
      success: true,
      memory
    });
  } catch (error: any) {
    console.error('[Create Memory] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// UPDATE MEMORY
// ========================================
app.put("/:userId/:memoryId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const memoryId = c.req.param('memoryId');
    const body = await c.req.json();

    // Get existing memories
    const memoriesData = await kv.get(`memories:${userId}`) || '[]';
    const memories = JSON.parse(memoriesData);

    // Find and update memory
    const memoryIndex = memories.findIndex((m: any) => m.id === memoryId);
    
    if (memoryIndex === -1) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    memories[memoryIndex] = {
      ...memories[memoryIndex],
      ...body,
      updated_at: new Date().toISOString()
    };

    // Save back to KV
    await kv.set(`memories:${userId}`, JSON.stringify(memories));

    console.log(`[Update Memory] ✅ Updated memory ${memoryId} for user ${userId}`);

    return c.json({
      success: true,
      memory: memories[memoryIndex]
    });
  } catch (error: any) {
    console.error('[Update Memory] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// DELETE MEMORY
// ========================================
app.delete("/:userId/:memoryId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const memoryId = c.req.param('memoryId');

    // Get existing memories
    const memoriesData = await kv.get(`memories:${userId}`) || '[]';
    const memories = JSON.parse(memoriesData);

    // Filter out the memory to delete
    const updatedMemories = memories.filter((m: any) => m.id !== memoryId);

    if (memories.length === updatedMemories.length) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    // Save back to KV
    await kv.set(`memories:${userId}`, JSON.stringify(updatedMemories));

    console.log(`[Delete Memory] ✅ Deleted memory ${memoryId} for user ${userId}`);

    return c.json({
      success: true,
      message: 'Memory deleted'
    });
  } catch (error: any) {
    console.error('[Delete Memory] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// AUTO-LEARN FROM CONVERSATION
// This analyzes conversation and extracts memorable facts
// ========================================
app.post("/:userId/auto-learn", async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { conversation_id, message, extract } = body;

    if (!extract) {
      return c.json({ 
        success: true,
        message: 'No learnings to extract' 
      });
    }

    // Extract is an object like: { key: "favorite_temple", value: "Palani", category: "preferences" }
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const memory = {
      id: memoryId,
      user_id: userId,
      key: extract.key,
      value: extract.value,
      category: extract.category || 'auto-learned',
      visibility: 'private',
      source: 'conversation',
      conversation_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Get existing memories
    const memoriesData = await kv.get(`memories:${userId}`) || '[]';
    const memories = JSON.parse(memoriesData);

    // Check if similar memory already exists
    const existingMemory = memories.find((m: any) => m.key === extract.key);
    
    if (existingMemory) {
      // Update existing memory instead of creating duplicate
      const updatedMemories = memories.map((m: any) => 
        m.key === extract.key 
          ? { ...m, value: extract.value, updated_at: new Date().toISOString() }
          : m
      );
      await kv.set(`memories:${userId}`, JSON.stringify(updatedMemories));
      
      return c.json({
        success: true,
        action: 'updated',
        memory: updatedMemories.find((m: any) => m.key === extract.key)
      });
    }

    // Add new memory
    memories.push(memory);
    await kv.set(`memories:${userId}`, JSON.stringify(memories));

    console.log(`[Auto-Learn] ✅ Learned new fact for user ${userId}:`, memory);

    return c.json({
      success: true,
      action: 'created',
      memory
    });
  } catch (error: any) {
    console.error('[Auto-Learn] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// GET CONVERSATION STATS
// ========================================
app.get("/:userId/stats", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Get all user conversations
    const allConversations = await kv.getByPrefix(`conversation:`);
    const userConversations = allConversations.filter((conv: any) => {
      try {
        const messages = JSON.parse(conv);
        return messages.some((msg: any) => msg.user_id === userId);
      } catch {
        return false;
      }
    });

    // Get user memories
    const memoriesData = await kv.get(`memories:${userId}`) || '[]';
    const memories = JSON.parse(memoriesData);

    // Get user reminders
    const remindersData = await kv.get(`user_reminders:${userId}`) || '[]';
    const remindersList = JSON.parse(remindersData);

    // Get user plans
    const plansData = await kv.get(`user_plans:${userId}`) || '[]';
    const plansList = JSON.parse(plansData);

    const stats = {
      total_conversations: userConversations.length,
      total_memories: memories.length,
      total_reminders: remindersList.length,
      total_plans: plansList.length,
      memory_categories: getMemoryCategories(memories),
      last_conversation: userConversations.length > 0 
        ? getLastConversationDate(userConversations)
        : null
    };

    return c.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('[Get Stats] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Helper functions
function getMemoryCategories(memories: any[]) {
  const categories: any = {};
  memories.forEach(memory => {
    const cat = memory.category || 'general';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  return categories;
}

function getLastConversationDate(conversations: any[]) {
  try {
    const allMessages = conversations.flatMap(conv => {
      try {
        return JSON.parse(conv);
      } catch {
        return [];
      }
    });
    
    const timestamps = allMessages
      .filter((msg: any) => msg.timestamp)
      .map((msg: any) => new Date(msg.timestamp).getTime());
    
    if (timestamps.length === 0) return null;
    
    const latest = Math.max(...timestamps);
    return new Date(latest).toISOString();
  } catch {
    return null;
  }
}

export default app;
