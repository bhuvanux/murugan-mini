# 🚨 CORS 508 ERROR FIX

## ❌ CURRENT ERROR

```
Access to fetch at 'https://xgqtycssifmpfbxmqzri.supabase.co/functions/v1/make-server-4a075ebc/wallpapers/list'
from origin 'https://xhnywpuqnmqnxldmpez.figma.site' 
has been blocked by CORS policy

Status: 508 (Loop Detected / Resource Limit Exceeded)
```

---

## 🔍 ROOT CAUSES

### **1. Edge Function Not Deployed**
The Supabase Edge Function might not be deployed or is inactive.

### **2. Edge Function Timeout**
The function is hitting resource limits or taking too long to respond (cold start).

### **3. Database Table Missing**
The `wallpapers` table doesn't exist in the admin Supabase project.

---

## ✅ FIXES

### **FIX 1: Deploy the Edge Function**

**Step 1: Check if function is deployed**
1. Go to https://supabase.com/dashboard/project/xgqtycssifmpfbxmqzri
2. Navigate to **Edge Functions**
3. Look for `make-server-4a075ebc`
4. Check if it shows as **Active** or **Inactive**

**Step 2: Deploy/Redeploy the function**

If the function doesn't exist or is inactive:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref xgqtycssifmpfbxmqzri

# Deploy the Edge Function
supabase functions deploy make-server-4a075ebc --project-ref xgqtycssifmpfbxmqzri
```

---

### **FIX 2: Create Database Table**

The `wallpapers` table might not exist. Create it:

**Go to Supabase Dashboard → SQL Editor:**

```sql
-- Create wallpapers table
CREATE TABLE IF NOT EXISTS wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'photo', -- 'photo' or 'video'
  url TEXT NOT NULL,
  thumbnail TEXT,
  storage_path TEXT,
  tags TEXT[],
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  visibility TEXT DEFAULT 'public',
  publish_status TEXT DEFAULT 'draft',
  published_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallpapers_visibility ON wallpapers(visibility);
CREATE INDEX IF NOT EXISTS idx_wallpapers_publish_status ON wallpapers(publish_status);
CREATE INDEX IF NOT EXISTS idx_wallpapers_created_at ON wallpapers(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE wallpapers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read for published wallpapers"
  ON wallpapers
  FOR SELECT
  USING (visibility = 'public' AND publish_status = 'published');

-- Create policy to allow admin full access
CREATE POLICY "Allow admin full access"
  ON wallpapers
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

---

### **FIX 3: Update CORS Headers (Already Done)**

The backend already has correct CORS configuration:

```typescript
app.use(
  "/*",
  cors({
    origin: "*",  // ✅ Allows all origins
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
```

---

### **FIX 4: Change Backend Endpoint to POST**

The current endpoint is GET, but the frontend might be sending POST. Let's make the backend accept both:

<function_calls>
<invoke name="fast_apply_tool">
<parameter name="path">/supabase/functions/server/index.tsx