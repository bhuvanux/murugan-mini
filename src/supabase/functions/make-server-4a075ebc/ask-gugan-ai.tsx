import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ========================================
// FUNCTION DEFINITIONS FOR AI
// ========================================
const availableFunctions = [
  {
    name: "play_song",
    description: "Play a devotional Murugan song for the user. Use this when user asks to play music, listen to songs, hear mantras, or wants morning/evening prayers.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The song query or preference (e.g., 'Kanda Shasti Kavasam', 'morning prayer', 'evening song')"
        },
        mood: {
          type: "string",
          enum: ["morning", "evening", "devotional", "energetic", "peaceful"],
          description: "The mood or time preference"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "find_temple",
    description: "Find Murugan temples near the user's location or by name. Use when user asks about temples, pilgrimage, darshan timings, or temple directions.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "User's location or desired temple location (city, state, or 'near me')"
        },
        temple_name: {
          type: "string",
          description: "Specific temple name if user mentioned one (e.g., 'Palani', 'Thiruchendur')"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "get_panchang",
    description: "Get today's panchang (Hindu calendar) with auspicious times, nakshatra, tithi, and recommendations for vratham or worship. Use when user asks about today's date, auspicious times, good days for worship, or nakshatra.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)"
        },
        location: {
          type: "string",
          description: "User's location for accurate sunrise/sunset times"
        }
      }
    }
  },
  {
    name: "create_reminder",
    description: "Create a reminder for prayers, vratham, or temple visits. Use when user asks to remind them, set an alarm, or schedule something.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Reminder title (e.g., 'Morning Murugan Chant')"
        },
        description: {
          type: "string",
          description: "Reminder description with details"
        },
        remind_at: {
          type: "string",
          description: "ISO datetime string when to remind (e.g., '2025-11-28T06:30:00+05:30')"
        },
        repeat: {
          type: "string",
          enum: ["once", "daily", "weekly"],
          description: "Reminder frequency"
        }
      },
      required: ["title", "remind_at"]
    }
  },
  {
    name: "get_story",
    description: "Get a Murugan story, teaching, or scripture verse. Use when user asks about Murugan's stories, life, teachings, or wants to learn about him.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Story topic or theme (e.g., 'birth of Murugan', 'Vel weapon', 'victory over Surapadman')"
        },
        length: {
          type: "string",
          enum: ["short", "medium", "long"],
          description: "Preferred story length"
        }
      },
      required: ["topic"]
    }
  },
  {
    name: "create_plan",
    description: "Create a 30-day spiritual plan for vratham, prayers, or temple visits. Use when user wants to start a devotional practice, prepare for a festival, or commit to worship.",
    parameters: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "User's spiritual goal (e.g., 'Skanda Sashti preparation', 'daily Murugan worship')"
        },
        duration_days: {
          type: "number",
          description: "Plan duration in days (default: 30)"
        },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Difficulty level based on user's experience"
        }
      },
      required: ["goal"]
    }
  }
];

// ========================================
// OPENAI CHAT ENDPOINT
// ========================================
app.post("/openai", async (c) => {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ 
        error: 'OpenAI API key not configured. Please add your API key.',
        needsApiKey: true 
      }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await c.req.json();
    const { message, conversation_id, user_id, language = 'en' } = body;

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }

    console.log('[Ask Gugan - OpenAI] Processing message:', message);

    // Get conversation history
    const conversationHistory = conversation_id 
      ? await kv.get(`conversation:${conversation_id}`) || '[]'
      : '[]';
    
    const history = JSON.parse(conversationHistory);

    // Get user memories for context
    const memories = user_id 
      ? await kv.get(`memories:${user_id}`) || '[]'
      : '[]';
    
    const userMemories = JSON.parse(memories);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(language, userMemories);

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];

    // Call OpenAI with function calling
    // Using gpt-4o-mini (fast, affordable, function calling support)
    // Alternative: 'gpt-3.5-turbo' (more widely available) or 'gpt-4o' (most capable)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        functions: availableFunctions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Ask Gugan - OpenAI] API error:', errorData);
      return c.json({ 
        error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}` 
      }, response.status);
    }

    const data = await response.json();
    
    // Check for errors in the response
    if (data.error) {
      console.error('[Ask Gugan - OpenAI] Response contains error:', data.error);
      return c.json({ 
        error: `OpenAI error: ${data.error.message || 'Unknown error'}` 
      }, 500);
    }
    
    // Check if response has valid structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[Ask Gugan - OpenAI] Invalid response structure:', data);
      return c.json({ 
        error: 'Invalid response from OpenAI. Please try again.' 
      }, 500);
    }
    
    const assistantMessage = data.choices[0].message;

    console.log('[Ask Gugan - OpenAI] Assistant response:', assistantMessage);

    // Handle function calls
    let functionResult = null;
    if (assistantMessage.function_call) {
      const functionName = assistantMessage.function_call.name;
      const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
      
      console.log(`[Ask Gugan - OpenAI] Function called: ${functionName}`, functionArgs);
      
      functionResult = await executeFunction(functionName, functionArgs, user_id);
    }

    // Update conversation history
    const newConversationId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const updatedHistory = [
      ...history,
      { 
        role: "user", 
        content: message, 
        timestamp: new Date().toISOString(),
        user_id,
        conversation_id: newConversationId
      },
      { 
        role: "assistant", 
        content: assistantMessage.content || "", 
        function_call: assistantMessage.function_call || null,
        timestamp: new Date().toISOString(),
        user_id,
        conversation_id: newConversationId
      }
    ];

    await kv.set(`conversation:${newConversationId}`, JSON.stringify(updatedHistory));

    return c.json({
      success: true,
      conversation_id: newConversationId,
      message: assistantMessage.content || "",
      function_call: assistantMessage.function_call ? {
        name: assistantMessage.function_call.name,
        arguments: JSON.parse(assistantMessage.function_call.arguments),
        result: functionResult
      } : null,
      provider: 'openai'
    });

  } catch (error: any) {
    console.error('[Ask Gugan - OpenAI] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// GEMINI CHAT ENDPOINT
// ========================================
app.post("/gemini", async (c) => {
  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return c.json({ 
        error: 'Gemini API key not configured. Please add your API key.',
        needsApiKey: true 
      }, 500);
    }

    const body = await c.req.json();
    const { message, conversation_id, user_id, language = 'en', image_base64 } = body;

    if (!message && !image_base64) {
      return c.json({ error: 'message or image is required' }, 400);
    }

    console.log('[Ask Gugan - Gemini] Processing message:', message, image_base64 ? '(with image)' : '');

    // Get conversation history
    const conversationHistory = conversation_id 
      ? await kv.get(`conversation:${conversation_id}`) || '[]'
      : '[]';
    
    const history = JSON.parse(conversationHistory);

    // Get user memories for context
    const memories = user_id 
      ? await kv.get(`memories:${user_id}`) || '[]'
      : '[]';
    
    const userMemories = JSON.parse(memories);

    // Build system instruction
    const systemInstruction = buildSystemPrompt(language, userMemories);

    // Build Gemini-format conversation history
    // Add system instruction as first user message if history is empty
    const geminiHistory = history.map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));
    
    // Prepend system instruction as first message if no history
    if (geminiHistory.length === 0) {
      geminiHistory.unshift({
        role: 'user',
        parts: [{ text: systemInstruction }]
      });
      geminiHistory.push({
        role: 'model',
        parts: [{ text: 'வேல் முருகா! I am Ask Gugan, your devoted AI guide. How may I assist you on your spiritual journey with Lord Murugan today?' }]
      });
    }

    // Build function declarations for Gemini
    const tools = [{
      functionDeclarations: availableFunctions.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      }))
    }];

    // Call Gemini API - Using gemini-1.5-flash (stable, production-ready)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            ...geminiHistory,
            {
              role: 'user',
              parts: image_base64 
                ? [
                    { text: message || 'What is in this image?' },
                    {
                      inlineData: {
                        mimeType: 'image/jpeg',
                        data: image_base64
                      }
                    }
                  ]
                : [{ text: message }]
            }
          ],
          tools,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Ask Gugan - Gemini] API error:', errorData);
      return c.json({ 
        error: `Gemini API error: ${errorData.error?.message || 'Unknown error'}` 
      }, response.status);
    }

    const data = await response.json();
    
    // Check for errors in the response
    if (data.error) {
      console.error('[Ask Gugan - Gemini] Response contains error:', data.error);
      return c.json({ 
        error: `Gemini error: ${data.error.message || 'Unknown error'}` 
      }, 500);
    }
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('[Ask Gugan - Gemini] No candidates in response:', data);
      return c.json({ error: 'No response from Gemini. Please try again.' }, 500);
    }

    const candidate = data.candidates[0];
    const content = candidate.content;

    console.log('[Ask Gugan - Gemini] Assistant response:', content);

    // Extract text and function calls
    let assistantText = '';
    let functionCall = null;
    let functionResult = null;

    for (const part of content.parts) {
      if (part.text) {
        assistantText += part.text;
      }
      if (part.functionCall) {
        functionCall = part.functionCall;
        console.log(`[Ask Gugan - Gemini] Function called: ${functionCall.name}`, functionCall.args);
        functionResult = await executeFunction(functionCall.name, functionCall.args, user_id);
      }
    }

    // Update conversation history
    const newConversationId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const updatedHistory = [
      ...history,
      { 
        role: "user", 
        content: message, 
        timestamp: new Date().toISOString(),
        user_id,
        conversation_id: newConversationId
      },
      { 
        role: "assistant", 
        content: assistantText, 
        function_call: functionCall,
        timestamp: new Date().toISOString(),
        user_id,
        conversation_id: newConversationId
      }
    ];

    await kv.set(`conversation:${newConversationId}`, JSON.stringify(updatedHistory));

    return c.json({
      success: true,
      conversation_id: newConversationId,
      message: assistantText,
      function_call: functionCall ? {
        name: functionCall.name,
        arguments: functionCall.args,
        result: functionResult
      } : null,
      provider: 'gemini'
    });

  } catch (error: any) {
    console.error('[Ask Gugan - Gemini] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// VOICE TRANSCRIPTION ENDPOINT (Using Whisper)
// ========================================
app.post("/transcribe", async (c) => {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ 
        error: 'OpenAI API key required for transcription',
        needsApiKey: true 
      }, 500);
    }

    const formData = await c.req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return c.json({ error: 'audio file required' }, 400);
    }

    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', formData.get('language') || 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Transcribe] Whisper error:', errorData);
      return c.json({ error: errorData.error?.message || 'Transcription failed' }, response.status);
    }

    const data = await response.json();
    
    return c.json({
      success: true,
      transcript: data.text
    });

  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// GET CONVERSATION HISTORY
// ========================================
app.get("/conversation/:id", async (c) => {
  try {
    const conversationId = c.req.param('id');
    const conversationHistory = await kv.get(`conversation:${conversationId}`) || '[]';
    const history = JSON.parse(conversationHistory);

    return c.json({
      success: true,
      conversation_id: conversationId,
      messages: history
    });
  } catch (error: any) {
    console.error('[Get Conversation] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// DELETE CONVERSATION
// ========================================
app.delete("/conversation/:id", async (c) => {
  try {
    const conversationId = c.req.param('id');
    await kv.del(`conversation:${conversationId}`);

    return c.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error: any) {
    console.error('[Delete Conversation] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// LIST ALL USER CONVERSATIONS
// ========================================
app.get("/conversations/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Get all conversations from KV store with keys
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const { data: conversationData, error } = await supabaseClient
      .from('kv_store_4a075ebc')
      .select('key, value')
      .like('key', 'conversation:%');
    
    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }
    
    // Parse and filter conversations for this user
    const userConversations: any[] = [];
    
    for (const record of conversationData || []) {
      try {
        const messages = JSON.parse(record.value);
        
        // Check if this conversation belongs to the user
        const hasUserMessage = messages.some((msg: any) => 
          msg.user_id === userId || msg.userId === userId
        );
        
        if (hasUserMessage && messages.length > 0) {
          // Extract conversation ID from key (format: "conversation:conv_xxx")
          const conversationId = record.key.replace('conversation:', '');
          
          // Extract conversation metadata
          const lastMessage = messages[messages.length - 1];
          const firstUserMessage = messages.find((msg: any) => msg.role === 'user' || msg.sender === 'user');
          
          userConversations.push({
            id: conversationId,
            title: generateConversationTitle(firstUserMessage?.content || firstUserMessage?.text),
            lastMessage: lastMessage?.content || lastMessage?.text || '',
            timestamp: lastMessage?.timestamp || new Date().toISOString(),
            messageCount: messages.length,
            preview: (lastMessage?.content || lastMessage?.text || '').substring(0, 100)
          });
        }
      } catch (parseError) {
        console.error('[List Conversations] Error parsing conversation:', parseError);
        continue;
      }
    }
    
    // Sort by timestamp (most recent first)
    userConversations.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    console.log(`[List Conversations] ✅ Found ${userConversations.length} conversations for user ${userId}`);
    
    return c.json({
      success: true,
      conversations: userConversations,
      count: userConversations.length
    });
  } catch (error: any) {
    console.error('[List Conversations] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function generateConversationTitle(firstMessage: string): string {
  if (!firstMessage) return 'New Conversation';
  
  // Truncate to first meaningful phrase
  const truncated = firstMessage.substring(0, 50);
  
  // Try to find a good breaking point
  const sentences = truncated.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences[0]) {
    return sentences[0].trim();
  }
  
  // Fallback: just truncate at word boundary
  const words = truncated.split(' ');
  if (words.length > 6) {
    return words.slice(0, 6).join(' ') + '...';
  }
  
  return truncated + (firstMessage.length > 50 ? '...' : '');
}

function buildSystemPrompt(language: string, userMemories: any[]): string {
  const memoryContext = userMemories.length > 0
    ? `\n\nWhat you know about this devotee:\n${userMemories.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
    : '';

  const tamilPrompt = language === 'ta'
    ? '\n\nYou can respond in Tamil when appropriate. Use Tamil for mantras, temple names, and devotional terms.'
    : '';

  return `You are "Ask Gugan" (குகன் கேளு), an AI assistant devoted to Lord Murugan. You are wise, compassionate, and helpful.

Your purpose:
- Guide devotees in their spiritual journey with Lord Murugan
- Provide information about Murugan temples, timings, and festivals
- Play devotional songs and mantras
- Share teachings and stories from Murugan's life
- Help with panchang (Hindu calendar) and auspicious times
- Set reminders for prayers and vratham
- Create personalized devotional plans

Personality:
- Warm, respectful, and devotional in tone
- Use phrases like "Om Muruga 🙏", "Haro Hara", and blessing words
- Be concise but meaningful
- Show genuine care for the devotee's spiritual growth${tamilPrompt}${memoryContext}

When users ask about:
- Songs/Music → Use play_song function
- Temples/Darshan → Use find_temple function
- Auspicious times/Panchang → Use get_panchang function
- Reminders/Alarms → Use create_reminder function
- Stories/Teachings → Use get_story function
- Spiritual plans → Use create_plan function`;
}

async function executeFunction(functionName: string, args: any, userId?: string) {
  console.log(`[Execute Function] ${functionName}`, args);

  try {
    switch (functionName) {
      case 'play_song':
        return await executeFindSong(args);
      
      case 'find_temple':
        return await executeFindTemple(args);
      
      case 'get_panchang':
        return await executeGetPanchang(args);
      
      case 'create_reminder':
        return await executeCreateReminder(args, userId);
      
      case 'get_story':
        return await executeGetStory(args);
      
      case 'create_plan':
        return await executeCreatePlan(args, userId);
      
      default:
        return { error: `Unknown function: ${functionName}` };
    }
  } catch (error: any) {
    console.error(`[Execute Function] Error in ${functionName}:`, error);
    return { error: error.message };
  }
}

// Function implementations
async function executeFindSong(args: any) {
  console.log('[Find Song] Query:', args);

  // Build YouTube search query based on user request
  let searchQuery = 'Murugan devotional songs';
  
  if (args.mood) {
    const mood = args.mood.toLowerCase();
    if (mood.includes('morning')) {
      searchQuery = 'Murugan morning songs suprabhatham';
    } else if (mood.includes('evening')) {
      searchQuery = 'Murugan evening songs sandhya';
    } else if (mood.includes('night') || mood.includes('sleep')) {
      searchQuery = 'Murugan lullaby songs night';
    } else {
      searchQuery = `Murugan ${mood} songs`;
    }
  }
  
  if (args.query) {
    searchQuery = `Murugan ${args.query}`;
  }

  console.log(`[Find Song] Searching YouTube for: "${searchQuery}"`);

  try {
    // Search YouTube using YouTube Data API v3
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    
    if (!youtubeApiKey) {
      console.error('[Find Song] YouTube API key not configured');
      return {
        type: 'song_results',
        songs: [],
        count: 0,
        query: args.query,
        message: "YouTube API is not configured. Please add YOUTUBE_API_KEY to continue."
      };
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=3&key=${youtubeApiKey}`
    );

    if (!response.ok) {
      console.error('[Find Song] YouTube API error:', response.status, response.statusText);
      return {
        type: 'song_results',
        songs: [],
        count: 0,
        query: args.query,
        message: "Failed to search YouTube. Please try again later."
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        type: 'song_results',
        songs: [],
        count: 0,
        query: args.query,
        message: `I couldn't find any songs for "${searchQuery}". Try a different search!`
      };
    }

    const songs = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      embedUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      duration: null,
      tags: [args.mood || 'devotional'],
      youtubeId: item.id.videoId
    }));

    console.log(`[Find Song] Found ${songs.length} songs from YouTube`);

    return {
      type: 'song_results',
      songs,
      count: songs.length,
      query: args.query,
      mood: args.mood
    };
  } catch (error: any) {
    console.error('[Find Song] Error searching YouTube:', error);
    return {
      type: 'song_results',
      songs: [],
      count: 0,
      query: args.query,
      message: `Error searching for songs: ${error.message}`
    };
  }
}

// Helper function to extract YouTube ID
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

async function executeFindTemple(args: any) {
  // Mock temple data - in production, integrate with real temple database
  const temples = [
    {
      id: 'temple_palani',
      name: 'Arulmigu Dhandayuthapani Swamy Temple',
      location: 'Palani, Tamil Nadu',
      address: 'Palani Hill, Dindigul District, Tamil Nadu 624601',
      lat: 10.4468,
      lng: 77.5208,
      timings: {
        morning: '06:00 - 12:00',
        evening: '16:00 - 21:00',
        abhishekam: ['06:30', '18:00']
      },
      description: 'One of the six holy abodes (Arupadaiveedu) of Lord Murugan. Famous for Panchamirtham offering.',
      image: 'https://images.unsplash.com/photo-1697083542953-d37300dbcd07?w=800',
      bookingUrl: 'https://www.tnhrce.tn.gov.in/',
      phone: '+91-4545-241201'
    },
    {
      id: 'temple_thiruchendur',
      name: 'Arulmigu Subramaniya Swamy Temple',
      location: 'Thiruchendur, Tamil Nadu',
      address: 'Thiruchendur, Thoothukudi District, Tamil Nadu 628215',
      lat: 8.4914,
      lng: 78.1214,
      timings: {
        morning: '04:30 - 12:30',
        evening: '16:00 - 20:30',
        abhishekam: ['05:00', '18:30']
      },
      description: 'Second of the six holy abodes. Located on the seashore where Murugan vanquished Surapadman.',
      image: 'https://images.unsplash.com/photo-1747691363094-57243a964953?w=800',
      bookingUrl: 'https://www.tnhrce.tn.gov.in/',
      phone: '+91-4639-222229'
    },
    {
      id: 'temple_swamimalai',
      name: 'Arulmigu Swaminatha Swamy Temple',
      location: 'Swamimalai, Tamil Nadu',
      address: 'Swamimalai, Thanjavur District, Tamil Nadu 612302',
      lat: 10.9564,
      lng: 79.3552,
      timings: {
        morning: '06:00 - 12:30',
        evening: '16:00 - 20:30',
        abhishekam: ['06:30', '18:00']
      },
      description: 'Third of six abodes. Where Murugan explained the Pranava Mantra to Lord Shiva.',
      image: 'https://images.unsplash.com/photo-1650451484146-5d3a5654b7f2?w=800',
      bookingUrl: 'https://www.tnhrce.tn.gov.in/',
      phone: '+91-4374-271253'
    }
  ];

  // Simple location matching
  const location = args.location?.toLowerCase() || '';
  const templeName = args.temple_name?.toLowerCase() || '';

  const filtered = temples.filter(temple => 
    temple.location.toLowerCase().includes(location) ||
    temple.name.toLowerCase().includes(templeName) ||
    temple.location.toLowerCase().includes(templeName)
  );

  return {
    type: 'temple_results',
    temples: filtered.length > 0 ? filtered : temples.slice(0, 3),
    count: filtered.length > 0 ? filtered.length : 3,
    searchLocation: args.location
  };
}

async function executeGetPanchang(args: any) {
  const date = args.date || new Date().toISOString().split('T')[0];
  
  // Mock panchang data - in production, integrate with real panchang API
  const panchang = {
    date,
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
    tithi: 'Shukla Ekadashi',
    nakshatra: 'Rohini',
    yoga: 'Ayushman',
    karana: 'Bava',
    paksha: 'Shukla Paksha',
    sunrise: '06:15 AM',
    sunset: '05:45 PM',
    moonrise: '07:30 PM',
    moonset: '06:45 AM',
    auspiciousTimes: [
      { name: 'Brahma Muhurta', time: '04:45 - 05:30', description: 'Best for meditation and prayers' },
      { name: 'Abhijit Muhurta', time: '11:45 - 12:30', description: 'Auspicious for all activities' },
      { name: 'Vijaya Muhurta', time: '14:15 - 15:00', description: 'Victory time, good for new beginnings' }
    ],
    inauspiciousTimes: [
      { name: 'Rahu Kala', time: '15:00 - 16:30', description: 'Avoid important activities' }
    ],
    festivals: ['Ekadashi Vratham'],
    vrathamRecommendation: {
      recommended: true,
      type: 'Ekadashi Vratham',
      instructions: 'Fast from grains, worship Vishnu/Murugan, chant mantras',
      benefits: 'Spiritual purification, removes sins'
    },
    location: args.location || 'Chennai, Tamil Nadu'
  };

  return {
    type: 'panchang',
    data: panchang
  };
}

async function executeCreateReminder(args: any, userId?: string) {
  if (!userId) {
    return { 
      error: 'User must be logged in to create reminders',
      requiresAuth: true 
    };
  }

  const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const reminder = {
    id: reminderId,
    user_id: userId,
    title: args.title,
    description: args.description || '',
    remind_at: args.remind_at,
    repeat: args.repeat || 'once',
    channel: 'in-app', // Can be 'push', 'alarm', 'in-app'
    active: true,
    created_at: new Date().toISOString()
  };

  // Store in KV
  await kv.set(`reminder:${reminderId}`, reminder);
  
  // Add to user's reminders list
  const userRemindersKey = `user_reminders:${userId}`;
  const userReminders = await kv.get(userRemindersKey) || '[]';
  const remindersList = JSON.parse(userReminders);
  remindersList.push(reminderId);
  await kv.set(userRemindersKey, JSON.stringify(remindersList));

  return {
    type: 'reminder_created',
    reminder
  };
}

async function executeGetStory(args: any) {
  // Mock stories - in production, have a database of stories
  const stories = [
    {
      id: 'story_birth',
      title: 'The Birth of Murugan',
      topic: 'birth of murugan',
      content: `Lord Murugan was born from the third eye of Lord Shiva to defeat the demon Surapadman who was terrorizing the devas.

Six sparks emerged from Shiva's third eye and were nurtured by the six Krittika stars (Pleiades). These six babies merged into one divine child with six faces - Shanmukha.

Goddess Parvati embraced the child, and He became Murugan, the beautiful youth with twelve hands holding divine weapons including the sacred Vel (spear).

Moral: Even the greatest challenges can be overcome when divine purpose combines with righteous action.`,
      length: 'medium',
      tags: ['origin', 'mythology', 'shanmukha']
    },
    {
      id: 'story_vel',
      title: 'The Sacred Vel',
      topic: 'vel weapon',
      content: `The Vel (divine spear) represents wisdom and spiritual knowledge that destroys ignorance.

When Goddess Parvati gave the Vel to Murugan, she blessed it with the power to destroy all evil. The Vel has three edges representing:
1. Iccha Shakti (will power)
2. Kriya Shakti (action power)  
3. Jnana Shakti (knowledge power)

With this sacred weapon, Murugan vanquished Surapadman, teaching us that divine wisdom is the ultimate weapon against darkness.

Moral: Knowledge is the greatest weapon; wisdom destroys all obstacles.`,
      length: 'short',
      tags: ['vel', 'wisdom', 'teachings']
    }
  ];

  const topic = args.topic?.toLowerCase() || '';
  const filtered = stories.filter(story => 
    story.topic.includes(topic) || 
    story.title.toLowerCase().includes(topic) ||
    story.tags.some(tag => topic.includes(tag))
  );

  const story = filtered[0] || stories[0];

  return {
    type: 'story',
    story
  };
}

async function executeCreatePlan(args: any, userId?: string) {
  if (!userId) {
    return { 
      error: 'User must be logged in to create plans',
      requiresAuth: true 
    };
  }

  const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const durationDays = args.duration_days || 30;

  // Generate daily activities based on goal
  const dailyActivities = [];
  for (let day = 1; day <= durationDays; day++) {
    dailyActivities.push({
      day,
      title: `Day ${day}: ${getDayActivity(day, args.goal)}`,
      tasks: [
        { type: 'prayer', description: 'Morning Murugan prayer', time: '06:00' },
        { type: 'mantra', description: 'Chant Vel mantra 108 times', time: '07:00' },
        { type: 'reading', description: 'Read Murugan story/teaching', time: '20:00' }
      ],
      completed: false
    });
  }

  const plan = {
    id: planId,
    user_id: userId,
    goal: args.goal,
    duration_days: durationDays,
    difficulty: args.difficulty || 'beginner',
    start_date: new Date().toISOString().split('T')[0],
    structure: dailyActivities,
    progress: 0,
    created_at: new Date().toISOString()
  };

  // Store in KV
  await kv.set(`plan:${planId}`, plan);
  
  // Add to user's plans list
  const userPlansKey = `user_plans:${userId}`;
  const userPlans = await kv.get(userPlansKey) || '[]';
  const plansList = JSON.parse(userPlans);
  plansList.push(planId);
  await kv.set(userPlansKey, JSON.stringify(plansList));

  return {
    type: 'plan_created',
    plan: {
      id: planId,
      goal: args.goal,
      duration_days: durationDays,
      start_date: plan.start_date,
      total_tasks: dailyActivities.length * 3
    }
  };
}

function getDayActivity(day: number, goal: string): string {
  const activities = [
    'Morning devotion and prayers',
    'Study Murugan teachings',
    'Visit temple or home altar',
    'Practice meditation',
    'Chant Kanda Shasti Kavasam',
    'Perform abhishekam',
    'Read Skanda Purana',
    'Offer flowers and fruits',
    'Light lamp and incense',
    'Reflect and journal'
  ];
  
  return activities[day % activities.length];
}

export default app;
