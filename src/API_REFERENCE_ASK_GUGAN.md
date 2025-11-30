# Ask Gugan API Reference 📡

## Base URL
```
https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc
```

## Authentication
All requests require:
```
Authorization: Bearer ${publicAnonKey}
```

---

## 1. Chat Endpoints

### 1.1 OpenAI Chat
**POST** `/ask-gugan/openai`

Send a message to OpenAI GPT-4 with function calling support.

**Request Body:**
```json
{
  "message": "Play morning devotional songs",
  "conversation_id": "conv_123" // optional, for conversation history
  "user_id": "user_456", // optional, for user context
  "language": "en" // "en" or "ta"
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "conv_1234567890_abc",
  "message": "🙏 Here are some beautiful morning devotional songs!",
  "function_call": {
    "name": "play_song",
    "arguments": {
      "query": "morning devotional songs",
      "mood": "morning"
    },
    "result": {
      "type": "song_results",
      "songs": [...],
      "count": 3,
      "query": "morning devotional songs"
    }
  },
  "provider": "openai"
}
```

---

### 1.2 Gemini Chat
**POST** `/ask-gugan/gemini`

Send a message to Google Gemini with function calling support.

**Request Body:** Same as OpenAI
**Response:** Same format as OpenAI, with `provider: "gemini"`

---

### 1.3 Voice Transcription
**POST** `/ask-gugan/transcribe`

Transcribe audio using OpenAI Whisper.

**Request Body:** `multipart/form-data`
```
audio: <audio file>
language: "en" // optional
```

**Response:**
```json
{
  "success": true,
  "transcript": "Play Kanda Shasti Kavasam"
}
```

---

### 1.4 Get Conversation
**GET** `/ask-gugan/conversation/:id`

Get conversation history by ID.

**Response:**
```json
{
  "success": true,
  "conversation_id": "conv_123",
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2025-11-28T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "வணக்கம்! 🙏",
      "timestamp": "2025-11-28T10:00:02Z"
    }
  ]
}
```

---

### 1.5 Delete Conversation
**DELETE** `/ask-gugan/conversation/:id`

Delete a conversation.

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

---

## 2. Memory Endpoints

### 2.1 Get User Memories
**GET** `/memories/:userId`

Get all memories for a user.

**Response:**
```json
{
  "success": true,
  "memories": [
    {
      "id": "mem_123",
      "user_id": "user_456",
      "key": "favorite_temple",
      "value": "Palani",
      "category": "preferences",
      "visibility": "private",
      "created_at": "2025-11-28T10:00:00Z",
      "updated_at": "2025-11-28T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 2.2 Create Memory
**POST** `/memories/:userId`

Create a new memory.

**Request Body:**
```json
{
  "key": "birthday",
  "value": "1990-01-15",
  "category": "personal", // "personal", "preferences", "devotional", "general"
  "visibility": "private" // "private" or "public"
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "mem_789",
    "user_id": "user_456",
    "key": "birthday",
    "value": "1990-01-15",
    "category": "personal",
    "visibility": "private",
    "created_at": "2025-11-28T10:00:00Z",
    "updated_at": "2025-11-28T10:00:00Z"
  }
}
```

---

### 2.3 Update Memory
**PUT** `/memories/:userId/:memoryId`

Update an existing memory.

**Request Body:** (partial updates allowed)
```json
{
  "value": "1990-02-20",
  "visibility": "public"
}
```

**Response:**
```json
{
  "success": true,
  "memory": { /* updated memory object */ }
}
```

---

### 2.4 Delete Memory
**DELETE** `/memories/:userId/:memoryId`

Delete a memory.

**Response:**
```json
{
  "success": true,
  "message": "Memory deleted"
}
```

---

### 2.5 Auto-Learn from Conversation
**POST** `/memories/:userId/auto-learn`

Automatically extract and save learnings from conversation.

**Request Body:**
```json
{
  "conversation_id": "conv_123",
  "message": "User's message",
  "extract": {
    "key": "favorite_temple",
    "value": "Palani",
    "category": "preferences"
  }
}
```

**Response:**
```json
{
  "success": true,
  "action": "created", // or "updated"
  "memory": { /* memory object */ }
}
```

---

### 2.6 Get User Stats
**GET** `/memories/:userId/stats`

Get statistics about user's data.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_conversations": 5,
    "total_memories": 3,
    "total_reminders": 2,
    "total_plans": 1,
    "memory_categories": {
      "preferences": 2,
      "personal": 1
    },
    "last_conversation": "2025-11-28T10:00:00Z"
  }
}
```

---

## 3. Function Call Results

### 3.1 Song Results
```json
{
  "type": "song_results",
  "songs": [
    {
      "id": "song_001",
      "title": "Kanda Shasti Kavasam",
      "description": "Powerful protection prayer",
      "embedUrl": "https://youtube.com/watch?v=...",
      "thumbnail": "https://...",
      "duration": 210,
      "tags": ["kavasam", "devotional", "morning"]
    }
  ],
  "count": 3,
  "query": "morning songs"
}
```

---

### 3.2 Temple Results
```json
{
  "type": "temple_results",
  "temples": [
    {
      "id": "temple_palani",
      "name": "Arulmigu Dhandayuthapani Swamy Temple",
      "location": "Palani, Tamil Nadu",
      "address": "Palani Hill, Dindigul District, TN 624601",
      "lat": 10.4468,
      "lng": 77.5208,
      "timings": {
        "morning": "06:00 - 12:00",
        "evening": "16:00 - 21:00",
        "abhishekam": ["06:30", "18:00"]
      },
      "description": "One of the six holy abodes...",
      "image": "https://...",
      "bookingUrl": "https://...",
      "phone": "+91-4545-241201"
    }
  ],
  "count": 3,
  "searchLocation": "Tamil Nadu"
}
```

---

### 3.3 Panchang
```json
{
  "type": "panchang",
  "data": {
    "date": "2025-11-28",
    "day": "Friday",
    "tithi": "Shukla Ekadashi",
    "nakshatra": "Rohini",
    "yoga": "Ayushman",
    "karana": "Bava",
    "paksha": "Shukla Paksha",
    "sunrise": "06:15 AM",
    "sunset": "05:45 PM",
    "moonrise": "07:30 PM",
    "moonset": "06:45 AM",
    "auspiciousTimes": [
      {
        "name": "Brahma Muhurta",
        "time": "04:45 - 05:30",
        "description": "Best for meditation and prayers"
      }
    ],
    "inauspiciousTimes": [
      {
        "name": "Rahu Kala",
        "time": "15:00 - 16:30",
        "description": "Avoid important activities"
      }
    ],
    "festivals": ["Ekadashi Vratham"],
    "vrathamRecommendation": {
      "recommended": true,
      "type": "Ekadashi Vratham",
      "instructions": "Fast from grains, worship Vishnu/Murugan...",
      "benefits": "Spiritual purification, removes sins"
    },
    "location": "Chennai, Tamil Nadu"
  }
}
```

---

### 3.4 Reminder Created
```json
{
  "type": "reminder_created",
  "reminder": {
    "id": "reminder_123",
    "user_id": "user_456",
    "title": "Morning Murugan Chant",
    "description": "Chant Kanda Shasti",
    "remind_at": "2025-11-29T06:30:00+05:30",
    "repeat": "daily", // "once", "daily", "weekly"
    "channel": "in-app", // "push", "alarm", "in-app"
    "active": true,
    "created_at": "2025-11-28T10:00:00Z"
  }
}
```

---

### 3.5 Story
```json
{
  "type": "story",
  "story": {
    "id": "story_birth",
    "title": "The Birth of Murugan",
    "topic": "birth of murugan",
    "content": "Lord Murugan was born from the third eye...",
    "length": "medium", // "short", "medium", "long"
    "tags": ["origin", "mythology", "shanmukha"]
  }
}
```

---

### 3.6 Plan Created
```json
{
  "type": "plan_created",
  "plan": {
    "id": "plan_123",
    "goal": "Skanda Sashti preparation",
    "duration_days": 30,
    "start_date": "2025-11-28",
    "total_tasks": 90
  }
}
```

---

## 4. Available Functions

### 4.1 play_song
**Description:** Play a devotional Murugan song

**Parameters:**
- `query` (required): Song query or preference
- `mood` (optional): "morning", "evening", "devotional", "energetic", "peaceful"

---

### 4.2 find_temple
**Description:** Find Murugan temples

**Parameters:**
- `location` (required): User's location or city
- `temple_name` (optional): Specific temple name

---

### 4.3 get_panchang
**Description:** Get Hindu calendar info

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD (default: today)
- `location` (optional): User's location

---

### 4.4 create_reminder
**Description:** Create prayer reminder

**Parameters:**
- `title` (required): Reminder title
- `description` (optional): Details
- `remind_at` (required): ISO datetime
- `repeat` (optional): "once", "daily", "weekly"

---

### 4.5 get_story
**Description:** Get Murugan story/teaching

**Parameters:**
- `topic` (required): Story topic
- `length` (optional): "short", "medium", "long"

---

### 4.6 create_plan
**Description:** Create devotional plan

**Parameters:**
- `goal` (required): Spiritual goal
- `duration_days` (optional): Number of days (default: 30)
- `difficulty` (optional): "beginner", "intermediate", "advanced"

---

## 5. Error Responses

### 5.1 API Key Missing
```json
{
  "error": "OpenAI API key not configured",
  "needsApiKey": true
}
```

### 5.2 Invalid Request
```json
{
  "error": "message is required"
}
```

### 5.3 AI API Error
```json
{
  "error": "OpenAI API error: Rate limit exceeded"
}
```

### 5.4 Not Found
```json
{
  "error": "Memory not found"
}
```

---

## 6. Rate Limits

- OpenAI: Depends on your API key tier
- Gemini: 60 requests/minute (free tier)
- Internal: No rate limiting currently implemented

---

## 7. Example Curl Commands

### Chat with OpenAI:
```bash
curl -X POST \
  https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/ask-gugan/openai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${publicAnonKey}" \
  -d '{
    "message": "Tell me about Palani temple",
    "user_id": "user_123",
    "language": "en"
  }'
```

### Create Memory:
```bash
curl -X POST \
  https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/memories/user_123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${publicAnonKey}" \
  -d '{
    "key": "favorite_temple",
    "value": "Palani",
    "category": "preferences"
  }'
```

### Get Conversation:
```bash
curl -X GET \
  https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/ask-gugan/conversation/conv_123 \
  -H "Authorization: Bearer ${publicAnonKey}"
```

---

## 🙏 Om Muruga!
