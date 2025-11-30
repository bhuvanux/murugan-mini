import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const aiAgent = new Hono();

// ========================================
// AVAILABLE FUNCTIONS FOR AI AGENT
// ========================================

interface FunctionCall {
  name: string;
  arguments: any;
}

interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  function_call?: FunctionCall;
}

// Define available functions that AI can call
const AVAILABLE_FUNCTIONS = [
  {
    name: "play_song",
    description: "Play a devotional song or mantra. Search for songs by name, artist, or category (morning songs, evening songs, Kanda Shasti Kavasam, etc.)",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Song name, artist, or category to search for"
        },
        autoplay: {
          type: "boolean",
          description: "Whether to autoplay the song immediately",
          default: true
        }
      },
      required: ["query"]
    }
  },
  {
    name: "find_temple",
    description: "Find Murugan temples by name, location, or nearby. Returns temple details with timings, booking info, and directions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Temple name or location (e.g., 'Palani', 'nearby temples', 'Thiruchendur')"
        },
        latitude: {
          type: "number",
          description: "User's current latitude for nearby search"
        },
        longitude: {
          type: "number",
          description: "User's current longitude for nearby search"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_panchang",
    description: "Get today's or specific date's panchang (auspicious times, nakshatra, tithi, yoga, karana). Helps determine good times for worship, vratham, or temple visits.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. If not provided, returns today's panchang."
        },
        timezone: {
          type: "string",
          description: "Timezone (e.g., 'Asia/Kolkata')",
          default: "Asia/Kolkata"
        }
      }
    }
  },
  {
    name: "create_reminder",
    description: "Create a reminder for worship, vratham, temple visit, or devotional activity",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Reminder title (e.g., 'Morning Muruga Chant')"
        },
        description: {
          type: "string",
          description: "Detailed description of the reminder"
        },
        remind_at: {
          type: "string",
          description: "ISO datetime string when to remind (e.g., '2025-12-01T06:30:00+05:30')"
        },
        channel: {
          type: "string",
          enum: ["push", "in-app"],
          description: "How to deliver the reminder",
          default: "push"
        }
      },
      required: ["title", "remind_at"]
    }
  },
  {
    name: "get_story",
    description: "Get Murugan stories, teachings, or mythology. Search by topic or get random story.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Story topic or keyword (e.g., 'birth of Murugan', 'Vel significance', 'Surapadman')"
        }
      }
    }
  },
  {
    name: "get_vratham_guide",
    description: "Get information about vrathams (fasting), their significance, rules, and benefits",
    parameters: {
      type: "object",
      properties: {
        vratham_type: {
          type: "string",
          description: "Type of vratham (e.g., 'Tuesday vratham', 'Skanda Sashti', 'full moon vratham')"
        }
      }
    }
  },
  {
    name: "create_30day_plan",
    description: "Create a 30-day spiritual plan for devotion, meditation, or vratham",
    parameters: {
      type: "object",
      properties: {
        plan_type: {
          type: "string",
          description: "Type of plan (e.g., 'morning devotion', 'Skanda Sashti preparation', 'meditation')"
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format"
        }
      },
      required: ["plan_type"]
    }
  }
];

// ========================================
// OPENAI INTEGRATION
// ========================================

async function callOpenAI(messages: AgentMessage[], userId: string | null) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.');
  }

  const systemPrompt = `You are "Ask Gugan" (அஸ்க் குகன்), a helpful and devotional AI assistant in the Murugan Wallpapers & Videos app.

Your purpose:
- Help devotees connect with Lord Murugan through songs, temple information, panchang, reminders, stories, and spiritual guidance
- Speak in a warm, respectful, devotional tone
- Support both English and Tamil (use Tamil when appropriate)
- Provide accurate information about temples, timings, festivals, and rituals
- Help users plan their spiritual journey

Guidelines:
- When users ask for songs, use play_song function
- When users ask about temples, use find_temple function
- When users ask about auspicious times or today's panchang, use get_panchang function
- When users want to set reminders for prayers/vratham, use create_reminder function
- When users ask about Murugan stories or teachings, use get_story function
- When users ask about vratham/fasting, use get_vratham_guide function
- For spiritual planning, use create_30day_plan function

Always be respectful, knowledgeable, and helpful. End responses with "Vel Vel Muruga! 🔱" when appropriate.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      functions: AVAILABLE_FUNCTIONS,
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI] API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[OpenAI] Response:', JSON.stringify(data, null, 2));
  
  return data;
}

// ========================================
// GEMINI INTEGRATION
// ========================================

async function callGemini(messages: AgentMessage[], userId: string | null) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to environment variables.');
  }

  const systemPrompt = `You are "Ask Gugan" (அஸ்க் குகன்), a helpful and devotional AI assistant in the Murugan Wallpapers & Videos app.

Your purpose:
- Help devotees connect with Lord Murugan through songs, temple information, panchang, reminders, stories, and spiritual guidance
- Speak in a warm, respectful, devotional tone
- Support both English and Tamil (use Tamil when appropriate)
- Provide accurate information about temples, timings, festivals, and rituals
- Help users plan their spiritual journey

Available functions:
- play_song: Play devotional songs or mantras
- find_temple: Find Murugan temples by name or location
- get_panchang: Get today's auspicious times and nakshatra
- create_reminder: Set reminders for prayers or vratham
- get_story: Get Murugan stories and teachings
- get_vratham_guide: Get vratham information and rules
- create_30day_plan: Create spiritual plans

Always be respectful, knowledgeable, and helpful. End responses with "Vel Vel Muruga! 🔱" when appropriate.`;

  // Convert messages to Gemini format
  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add system prompt as first user message
  geminiMessages.unshift({
    role: 'user',
    parts: [{ text: systemPrompt }]
  });
  geminiMessages.splice(1, 0, {
    role: 'model',
    parts: [{ text: 'I understand. I am Ask Gugan, ready to help devotees with Murugan worship, temples, songs, and spiritual guidance. Vel Vel Muruga! 🔱' }]
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini] API error:', errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Gemini] Response:', JSON.stringify(data, null, 2));

  // Parse Gemini response to extract function calls
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Simple function call detection for Gemini
  let functionCall = null;
  const functionMatches = responseText.match(/\[FUNCTION:(.*?)\](.*?)\[\/FUNCTION\]/s);
  
  if (functionMatches) {
    try {
      functionCall = {
        name: functionMatches[1].trim(),
        arguments: JSON.parse(functionMatches[2].trim())
      };
    } catch (e) {
      console.error('[Gemini] Function parse error:', e);
    }
  }

  return {
    choices: [{
      message: {
        role: 'assistant',
        content: responseText.replace(/\[FUNCTION:.*?\].*?\[\/FUNCTION\]/gs, '').trim(),
        function_call: functionCall
      },
      finish_reason: data.candidates?.[0]?.finishReason || 'stop'
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

// ========================================
// FUNCTION HANDLERS
// ========================================

async function executeFunctionCall(functionCall: FunctionCall, supabase: any) {
  const { name, arguments: args } = functionCall;
  
  console.log(`[Function Call] Executing: ${name}`, args);

  switch (name) {
    case 'play_song':
      return await handlePlaySong(args, supabase);
    
    case 'find_temple':
      return await handleFindTemple(args, supabase);
    
    case 'get_panchang':
      return await handleGetPanchang(args);
    
    case 'create_reminder':
      return await handleCreateReminder(args);
    
    case 'get_story':
      return await handleGetStory(args);
    
    case 'get_vratham_guide':
      return await handleGetVrathamGuide(args);
    
    case 'create_30day_plan':
      return await handleCreate30DayPlan(args);
    
    default:
      return {
        success: false,
        error: `Unknown function: ${name}`
      };
  }
}

// Song search handler
async function handlePlaySong(args: any, supabase: any) {
  const { query, autoplay = true } = args;
  
  console.log('[Play Song] Searching for:', query);
  
  // Search in media table for songs
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('visibility', 'public')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .limit(5);
  
  if (error) {
    console.error('[Play Song] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
  
  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'No songs found matching your query'
    };
  }
  
  // Return first match as primary song + others as suggestions
  const projectUrl = Deno.env.get('SUPABASE_URL');
  const songs = data.map((song: any) => ({
    id: song.id,
    title: song.title,
    description: song.description,
    artist: song.metadata?.artist || 'Unknown',
    duration: song.duration || 0,
    thumbnail: song.thumb_path ? `${projectUrl}/storage/v1/object/public/public-media/${song.thumb_path}` : null,
    url: song.media_type === 'youtube' ? song.host_url : `${projectUrl}/storage/v1/object/public/public-media/${song.web_path}`,
    type: song.media_type,
    tags: song.tags || []
  }));
  
  return {
    success: true,
    type: 'song',
    autoplay,
    song: songs[0],
    suggestions: songs.slice(1)
  };
}

// Temple search handler
async function handleFindTemple(args: any, supabase: any) {
  const { query, latitude, longitude } = args;
  
  console.log('[Find Temple] Searching for:', query);
  
  // Mock temple data (in production, this would query a temples table)
  const temples = [
    {
      id: 'temp-palani',
      name: 'Palani Dhandayuthapani Swamy Temple',
      address: 'Palani, Dindigul District, Tamil Nadu 624601',
      description: 'One of the six abodes of Lord Murugan, famous for the idol made of Navapashanam',
      lat: 10.4468,
      lng: 77.5208,
      times: {
        abhishekam: ['06:30', '18:00'],
        darshan: '06:00-21:00',
        pooja: ['06:30', '10:00', '16:00', '19:00']
      },
      images: [
        'https://images.unsplash.com/photo-1697083542953-d37300dbcd07?w=800',
        'https://images.unsplash.com/photo-1747691363094-57243a964953?w=800'
      ],
      booking_url: 'https://templebooking.example/palani',
      contact: '+91-4545-242345',
      facilities: ['Parking', 'Prasadam', 'Accommodation', 'Online Booking']
    },
    {
      id: 'temp-thiruchendur',
      name: 'Thiruchendur Murugan Temple',
      address: 'Thiruchendur, Thoothukudi District, Tamil Nadu 628215',
      description: 'Second abode of Murugan, located on the seashore where Lord defeated Surapadman',
      lat: 8.4969,
      lng: 78.1201,
      times: {
        abhishekam: ['05:30', '17:30'],
        darshan: '05:00-21:00',
        pooja: ['05:30', '09:00', '12:00', '18:00']
      },
      images: [
        'https://images.unsplash.com/photo-1650451484146-5d3a5654b7f2?w=800'
      ],
      booking_url: 'https://templebooking.example/thiruchendur',
      contact: '+91-4639-222345',
      facilities: ['Beach Access', 'Parking', 'Prasadam', 'Accommodation']
    },
    {
      id: 'temp-swamimalai',
      name: 'Swamimalai Murugan Temple',
      address: 'Swamimalai, Kumbakonam Taluk, Tamil Nadu 612302',
      description: 'Third abode where young Murugan explained the meaning of Om to Lord Shiva',
      lat: 10.9506,
      lng: 79.3581,
      times: {
        abhishekam: ['06:00', '18:00'],
        darshan: '06:00-20:30',
        pooja: ['06:00', '09:00', '12:00', '18:00']
      },
      images: [
        'https://images.unsplash.com/photo-1759591588930-04c66f3fd8b6?w=800'
      ],
      booking_url: 'https://templebooking.example/swamimalai',
      contact: '+91-435-2464567',
      facilities: ['Parking', 'Prasadam', 'Holy Steps']
    }
  ];
  
  // Simple search by name
  const results = temples.filter(temple => 
    temple.name.toLowerCase().includes(query.toLowerCase()) ||
    temple.address.toLowerCase().includes(query.toLowerCase()) ||
    query.toLowerCase().includes('nearby') ||
    query.toLowerCase().includes('arupadai')
  );
  
  if (results.length === 0) {
    return {
      success: false,
      error: 'No temples found matching your query'
    };
  }
  
  return {
    success: true,
    type: 'temple',
    temples: results
  };
}

// Panchang handler
async function handleGetPanchang(args: any) {
  const { date, timezone = 'Asia/Kolkata' } = args;
  const targetDate = date ? new Date(date) : new Date();
  
  // Mock panchang data (in production, integrate with real panchang API)
  const panchang = {
    date: targetDate.toISOString().split('T')[0],
    day: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
    tithi: 'Shukla Saptami',
    nakshatra: 'Pushya',
    yoga: 'Siddha',
    karana: 'Bava',
    sunrise: '06:15 AM',
    sunset: '06:30 PM',
    moonrise: '12:45 PM',
    moonset: '11:30 PM',
    auspicious_times: [
      { name: 'Brahma Muhurta', time: '04:30 AM - 05:45 AM', significance: 'Best for meditation and spiritual practices' },
      { name: 'Abhijit Muhurta', time: '11:45 AM - 12:30 PM', significance: 'Auspicious for all activities' },
      { name: 'Vijaya Muhurta', time: '02:15 PM - 03:00 PM', significance: 'Good for new beginnings' }
    ],
    inauspicious_times: [
      { name: 'Rahu Kaal', time: '03:00 PM - 04:30 PM' }
    ],
    festivals: [],
    vratham_recommended: targetDate.getDay() === 2, // Tuesday
    special_notes: targetDate.getDay() === 2 ? 'Tuesday is especially auspicious for Lord Murugan worship' : null
  };
  
  return {
    success: true,
    type: 'panchang',
    panchang
  };
}

// Reminder handler
async function handleCreateReminder(args: any) {
  const { title, description, remind_at, channel = 'push' } = args;
  
  // Store reminder in KV
  const reminderId = crypto.randomUUID();
  const reminder = {
    id: reminderId,
    title,
    description,
    remind_at,
    channel,
    created_at: new Date().toISOString(),
    status: 'active'
  };
  
  await kv.set(`reminder:${reminderId}`, reminder);
  
  return {
    success: true,
    type: 'reminder',
    reminder
  };
}

// Story handler
async function handleGetStory(args: any) {
  const { query } = args;
  
  // Mock stories (in production, query from stories table)
  const stories = [
    {
      id: 'story-1',
      title: 'Birth of Lord Murugan',
      category: 'Origins',
      content: 'Lord Murugan was born from the six sparks of fire from the third eye of Lord Shiva. These sparks were nurtured in the Saravana pond by the six Krittika stars, and thus he came to be known as Kartikeya and Saravanan.',
      moral: 'Divine purpose manifests in divine ways',
      tags: ['birth', 'origin', 'shiva']
    },
    {
      id: 'story-2',
      title: 'The Meaning of Om',
      category: 'Teachings',
      content: 'Young Murugan once asked Lord Shiva to explain the meaning of Pranava (Om). When Shiva refused until Murugan sat as his student, Murugan whispered the meaning in his father\'s ear. Impressed by his son\'s wisdom, Shiva proclaimed him as "Swaminatha" - the teacher of teachers.',
      moral: 'True knowledge comes from within, and the teacher-student relationship is sacred',
      tags: ['om', 'wisdom', 'swamimalai']
    },
    {
      id: 'story-3',
      title: 'The Vel - Divine Spear',
      category: 'Symbols',
      content: 'Mother Parvati gave Murugan the sacred Vel (spear) to defeat the demon Surapadman. The Vel represents divine knowledge that destroys ignorance. It has the power to pierce through any obstacle, just as wisdom cuts through illusion.',
      moral: 'Knowledge is the ultimate weapon against evil',
      tags: ['vel', 'weapon', 'symbol']
    }
  ];
  
  // Simple search
  const results = query 
    ? stories.filter(story => 
        story.title.toLowerCase().includes(query.toLowerCase()) ||
        story.content.toLowerCase().includes(query.toLowerCase()) ||
        story.tags.some(tag => tag.includes(query.toLowerCase()))
      )
    : [stories[Math.floor(Math.random() * stories.length)]];
  
  if (results.length === 0) {
    return {
      success: false,
      error: 'No stories found matching your query'
    };
  }
  
  return {
    success: true,
    type: 'story',
    stories: results
  };
}

// Vratham guide handler
async function handleGetVrathamGuide(args: any) {
  const { vratham_type } = args;
  
  const vrathams: any = {
    'tuesday': {
      name: 'Tuesday Vratham',
      deity: 'Lord Murugan',
      significance: 'Tuesday is the day of Lord Murugan. Observing vratham on this day brings courage, removes obstacles, and fulfills wishes.',
      rules: [
        'Wake up before sunrise and take bath',
        'Wear red or yellow clothes',
        'Visit Murugan temple if possible',
        'Chant Kanda Shasti Kavasam or Murugan mantras',
        'Offer fruits, especially bananas',
        'Fast during the day (or eat only once)',
        'Break fast after evening pooja'
      ],
      benefits: [
        'Removes obstacles in life',
        'Brings victory over enemies',
        'Grants courage and confidence',
        'Blesses with children',
        'Improves career and business'
      ],
      duration: 'Observe for 21 or 48 consecutive Tuesdays for maximum benefit'
    },
    'skanda sashti': {
      name: 'Skanda Sashti Vratham',
      deity: 'Lord Murugan',
      significance: 'Six-day festival celebrating Murugan\'s victory over demon Surapadman. Most important vratham for Murugan devotees.',
      rules: [
        'Observe for six consecutive days',
        'Wake up at Brahma Muhurta (4:30-5:45 AM)',
        'Take bath and wear clean clothes',
        'Chant Kanda Shasti Kavasam daily',
        'Visit temple daily if possible',
        'Maintain celibacy during vratham',
        'Eat simple sattvic food (or fast)',
        'Avoid onion, garlic, and non-veg'
      ],
      benefits: [
        'Complete removal of karmic obstacles',
        'Protection from enemies and evil forces',
        'Spiritual elevation',
        'Fulfillment of desires',
        'Family prosperity'
      ],
      duration: '6 days, usually in October/November (Aippasi month)'
    }
  };
  
  const vrathamKey = vratham_type?.toLowerCase() || 'tuesday';
  const vratham = vrathams[vrathamKey] || vrathams['tuesday'];
  
  return {
    success: true,
    type: 'vratham_guide',
    vratham
  };
}

// 30-day plan handler
async function handleCreate30DayPlan(args: any) {
  const { plan_type, start_date } = args;
  
  const planId = crypto.randomUUID();
  const startDate = start_date ? new Date(start_date) : new Date();
  
  // Generate 30-day plan structure
  const days = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    days.push({
      day: i + 1,
      date: date.toISOString().split('T')[0],
      activities: [
        {
          time: '06:00 AM',
          activity: 'Morning prayers and Kanda Shasti Kavasam',
          duration: '15 mins',
          completed: false
        },
        {
          time: '12:00 PM',
          activity: 'Midday meditation on Vel mantra',
          duration: '10 mins',
          completed: false
        },
        {
          time: '07:00 PM',
          activity: 'Evening lamp lighting and aarti',
          duration: '10 mins',
          completed: false
        }
      ],
      notes: i === 0 ? 'Begin with dedication and devotion. Vel Vel Muruga!' : null
    });
  }
  
  const plan = {
    id: planId,
    type: plan_type,
    title: `30-Day ${plan_type} Plan`,
    start_date: startDate.toISOString().split('T')[0],
    end_date: days[29].date,
    days,
    progress: 0,
    created_at: new Date().toISOString()
  };
  
  // Store plan in KV
  await kv.set(`plan:${planId}`, plan);
  
  return {
    success: true,
    type: '30day_plan',
    plan
  };
}

// ========================================
// CHAT ENDPOINT
// ========================================

aiAgent.post('/chat', async (c) => {
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
    const { message, conversation_id, provider = 'openai', history = [] } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    console.log(`[AI Agent] Processing message with ${provider}:`, message);

    // Build conversation history
    const messages: AgentMessage[] = [
      ...history,
      { role: 'user', content: message }
    ];

    // Call appropriate AI provider
    let aiResponse;
    if (provider === 'gemini') {
      aiResponse = await callGemini(messages, userId);
    } else {
      aiResponse = await callOpenAI(messages, userId);
    }

    const assistantMessage = aiResponse.choices[0].message;
    const functionCall = assistantMessage.function_call;

    let functionResult = null;
    
    // Execute function call if present
    if (functionCall) {
      console.log('[AI Agent] Executing function call:', functionCall.name);
      functionResult = await executeFunctionCall(functionCall, supabase);
    }

    // Store conversation in KV
    const convId = conversation_id || crypto.randomUUID();
    const conversation = await kv.get(`conversation:${convId}`) || {
      id: convId,
      user_id: userId,
      messages: [],
      created_at: new Date().toISOString()
    };

    conversation.messages.push(
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { 
        role: 'assistant', 
        content: assistantMessage.content,
        function_call: functionCall,
        function_result: functionResult,
        timestamp: new Date().toISOString()
      }
    );
    conversation.updated_at = new Date().toISOString();

    await kv.set(`conversation:${convId}`, conversation);

    return c.json({
      success: true,
      conversation_id: convId,
      message: assistantMessage.content,
      function_call: functionCall,
      function_result: functionResult,
      provider
    });

  } catch (error: any) {
    console.error('[AI Agent] Error:', error);
    return c.json({ 
      success: false,
      error: error.message || 'Internal server error'
    }, 500);
  }
});

// ========================================
// GET CONVERSATION HISTORY
// ========================================

aiAgent.get('/conversation/:id', async (c) => {
  try {
    const conversationId = c.req.param('id');
    const conversation = await kv.get(`conversation:${conversationId}`);

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({
      success: true,
      conversation
    });
  } catch (error: any) {
    console.error('[AI Agent] Get conversation error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// DELETE CONVERSATION
// ========================================

aiAgent.delete('/conversation/:id', async (c) => {
  try {
    const conversationId = c.req.param('id');
    await kv.del(`conversation:${conversationId}`);

    return c.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error: any) {
    console.error('[AI Agent] Delete conversation error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default aiAgent;
