# 🕉️ Murugan Wallpapers & Videos

**A beautiful devotional app for Lord Murugan with wallpapers, music, and news**

---

## ✨ Features

### 🎬 Complete Authentication Flow
- **Splash Screen** with Lord Murugan logo and Tamil text
- **Login Screen** with phone/email authentication
- **Session Management** - Stay logged in across visits

### 📱 Main App Features
- **Photos Tab** - Masonry grid of devotional wallpapers
- **Songs Tab** - Audio/video player with playlists
- **Spark Tab** - News feed (Reels-style vertical scrolling)
- **Profile Tab** - User settings and saved content

### 🎯 User Features
- ❤️ Save favorites
- 📥 Download wallpapers
- 🎵 Create playlists
- 🔍 Search by tags/title
- 📊 Analytics tracking

---

## 🚀 Quick Start (30 Seconds!)

### Step 1: Create Test User

Go to https://supabase.com/dashboard
1. Authentication → Users → "Add user"
2. Email: `test@murugan.com`
3. Password: `test1234`
4. ✅ Check "Auto Confirm User"
5. Click "Create user"

### Step 2: Test the App

1. Open your app
2. Watch splash screen (2.5s)
3. Click "Use Email Instead (Testing)"
4. Login with test@murugan.com / test1234
5. 🎉 You're in!

**See `/START_APP_NOW.md` for detailed instructions**

---

## 📚 Documentation

### 🎯 Quick Guides
- **[START_APP_NOW.md](START_APP_NOW.md)** - ⚡ Start testing immediately
- **[AUTHENTICATION_COMPLETE.md](AUTHENTICATION_COMPLETE.md)** - 🔐 Auth system overview
- **[AUTH_SETUP.md](AUTH_SETUP.md)** - 📱 Detailed setup guide

### 📖 Complete Documentation
- **[FINAL_DEPLOYMENT_GUIDE.md](FINAL_DEPLOYMENT_GUIDE.md)** - Full deployment
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Features list
- **[API_ENDPOINTS.md](API_ENDPOINTS.md)** - API reference
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design

---

## 🎨 Design

Based on Figma designs with:
- Tamil fonts (TAU-Ezhil, TAU-Neythal, TAU-Paalai)
- Devotional green theme (#0d5e38, #084c28)
- Circular Murugan logo
- Beautiful animations
- Mobile-first responsive layout

---

## 🛠️ Tech Stack

- **Frontend**: React + Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **API**: Edge Functions (Hono)
- **Search**: PostgreSQL Full-Text Search
- **Analytics**: Event tracking
- **Images**: Sharp (optimization)

---

## 📊 Database Schema

8 tables with full RLS:
- `profiles` - User profiles
- `media` - Wallpapers, audio, videos
- `sparks` - News articles
- `user_favorites` - Saved items
- `playlists` - User playlists
- `playlist_items` - Songs in playlists
- `analytics_events` - Event tracking
- `media_reports` - Content moderation

---

## 🔐 Authentication

### Supported Methods:
- ✅ Email/Password (working now)
- 📱 Phone/SMS (needs provider setup)
- 🔜 Social login (Google, Facebook)

### Security Features:
- ✅ Bcrypt password hashing
- ✅ Row-Level Security (RLS)
- ✅ Session management
- ✅ Email confirmation (optional)
- ✅ Rate limiting

---

## 🎯 Current Status

### ✅ Fully Implemented:
- Splash screen
- Login/signup flow
- All 4 main tabs
- Wallpaper browsing
- Music player with 3-dot menus
- News feed (Spark)
- User profiles
- Favorites system
- Download functionality
- Search
- Analytics tracking

### 🔧 Ready to Enable:
- Phone authentication (needs SMS)
- Email confirmation
- Social login
- Push notifications

---

## 📱 User Journey

```
┌─────────────────┐
│ SPLASH SCREEN   │ ← Beautiful Lord Murugan logo
│                 │   Tamil text animation
└────────┬────────┘
         │ 2.5 seconds
         v
┌─────────────────┐
│ LOGIN SCREEN    │ ← Phone or Email auth
│                 │   Privacy policy
└────────┬────────┘
         │ Sign in
         v
┌─────────────────┐
│ MAIN APP        │ ← 4 tabs, full features
│ Photos Songs    │   User-specific data
│ Spark  Profile  │   Analytics tracking
└─────────────────┘
```

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Supabase CLI

### Installation
```bash
# Clone repository
git clone <your-repo>

# Install dependencies
npm install

# Set up environment variables
# See /utils/supabase/info.tsx

# Run locally
npm run dev
```

### Database Setup
```bash
# Run migration
# In Supabase SQL Editor, paste:
/supabase/migrations/001_initial_schema.sql
```

---

## 📦 Deployment

### Quick Deploy
1. Deploy Edge Functions
   ```bash
   supabase functions deploy make-server-4a075ebc
   ```

2. Create storage bucket
   - Dashboard → Storage → Create `public-media`

3. Upload sample media
   ```bash
   cd scripts
   npm install
   node upload_media.js
   ```

4. Create test user (see Quick Start above)

5. Test app!

**See `/FINAL_DEPLOYMENT_GUIDE.md` for complete guide**

---

## 🎨 Customization

### Change Splash Duration
```typescript
// In /components/SplashScreen.tsx
setTimeout(() => onComplete(), 2500); // Change to 3000
```

### Update Logo
```typescript
// Use your own image
src="https://your-logo.png"
```

### Modify Colors
```css
bg-[#084c28]  /* Your brand color */
```

---

## 🐛 Troubleshooting

### Can't login?
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'test@murugan.com';
```

### Missing profile?
```sql
INSERT INTO public.profiles (id, display_name)
SELECT id, 'Test User' FROM auth.users 
WHERE email = 'test@murugan.com';
```

### More help?
- Check `/AUTH_SETUP.md` for detailed troubleshooting
- Review browser console (F12)
- Check Supabase logs

---

## 📈 Analytics

Track user behavior:
- App opens
- Logins
- Media views
- Downloads
- Searches
- Likes/favorites
- Spark article views

View in SQL Editor:
```sql
SELECT event_type, COUNT(*) 
FROM analytics_events 
GROUP BY event_type;
```

---

## 🎯 Roadmap

### Phase 1 (Complete ✅)
- [x] Splash screen
- [x] Authentication
- [x] Main app features
- [x] Database schema
- [x] API endpoints

### Phase 2 (Optional)
- [ ] SMS authentication
- [ ] Email confirmation
- [ ] Social login
- [ ] Push notifications
- [ ] Admin dashboard

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] WhatsApp sharing
- [ ] Offline mode
- [ ] Advanced search (Meilisearch)

---

## 📄 License

MIT License - Use freely for your devotional app

---

## 🙏 Credits

- **Design**: Figma import with Tamil fonts
- **Backend**: Supabase
- **Frontend**: React + Tailwind CSS
- **Images**: Unsplash (placeholder)
- **Icons**: Lucide React

---

## 📞 Support

- **Quick Start**: `/START_APP_NOW.md`
- **Auth Guide**: `/AUTH_SETUP.md`
- **Full Docs**: `/FINAL_DEPLOYMENT_GUIDE.md`
- **API Docs**: `/API_ENDPOINTS.md`

---

**Vel Vel Muruga! 🕉️🙏**

**Your devotional app is ready for users!**

---

## 🎉 Next Steps

1. ✅ Create test user (30 seconds)
2. ✅ Test authentication flow
3. ✅ Browse all features
4. 📱 Set up SMS (optional)
5. 🚀 Deploy to production

**Start now: See `/START_APP_NOW.md`**
