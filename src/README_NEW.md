# 🙏 Murugan Wallpapers & Videos - Production Architecture

> **A complete Supabase-powered devotional media platform with advanced search, analytics, and scalable architecture.**

---

## 🎉 What's New - Version 2.0

### ✨ Complete Backend Overhaul
- ✅ **Professional Database Schema** - 8 tables with RLS, full-text search, analytics
- ✅ **RESTful API** - 13 endpoints for all operations
- ✅ **Smart Storage** - 3-tier image optimization (original, web, thumbnail)
- ✅ **Bulk Upload System** - Automated script with image processing
- ✅ **Real-time Analytics** - Track views, downloads, searches, user behavior
- ✅ **Favorites & Playlists** - User content management
- ✅ **News Integration** - Spark feed with NewsAPI support
- ✅ **Content Moderation** - Report system for community safety

---

## 🚀 Quick Start (5 Minutes)

### 1. Database Setup
```sql
-- Copy contents of: supabase/migrations/001_initial_schema.sql
-- Paste in Supabase Dashboard → SQL Editor → Run
```

### 2. Storage Setup
```bash
# Supabase Dashboard → Storage → New Bucket
# Name: public-media
# Public: ✅ ON
```

### 3. Deploy API
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy make-server-4a075ebc
```

### 4. Add Content
```bash
# Option A: Quick test with sample data
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/admin/seed-sample-data

# Option B: Upload your own images
cd scripts
npm install
npm run upload
```

### 5. Launch App
```bash
# App is already configured!
# Just open and start using
```

---

## 📁 Project Structure

```
murugan-wallpapers/
├── 📱 App.tsx                          # Main application
├── 🎨 components/                      # UI components
│   ├── MasonryFeed.tsx                 # Pinterest-style grid
│   ├── SongsScreen.tsx                 # Music & videos
│   ├── SparkScreen.tsx                 # News feed
│   └── ProfileScreen.tsx               # User profile
├── 🗄️ supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql      # Complete database schema
│   └── functions/server/
│       └── index.tsx                   # API server (13 endpoints)
├── 📤 scripts/
│   ├── upload_media.js                 # Bulk upload script
│   └── package.json                    # Dependencies
├── 📚 Documentation/
│   ├── ARCHITECTURE.md                 # System architecture
│   ├── SETUP_COMPLETE.md               # Step-by-step setup
│   ├── DEPLOY.md                       # Deployment guide
│   └── scripts/README.md               # Upload guide
└── 🖼️ assets-to-upload/                # Place your images here
```

---

## 🏗️ Architecture Overview

### Client → API → Database → Storage

```
┌─────────────────────────────────────────┐
│         React Web App (Client)          │
│  Photos | Songs | Spark | Profile       │
└────────────────┬────────────────────────┘
                 │ REST API
                 ↓
┌─────────────────────────────────────────┐
│      Supabase Edge Functions (API)      │
│  Search | Favorites | Analytics | News  │
└────────────┬──────────────┬─────────────┘
             │              │
    ┌────────┴────────┐    ┌┴──────────────┐
    │   Postgres DB   │    │  Storage CDN  │
    │  8 tables       │    │  3 versions   │
    │  Full-text      │    │  per image    │
    │  search + RLS   │    │               │
    └─────────────────┘    └───────────────┘
```

---

## 📊 Database Schema

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **profiles** | User profiles | Profile background wallpaper |
| **media** | All content | Full-text search, tags, stats |
| **user_favorites** | Saved items | User-media relationships |
| **playlists** | Custom collections | Public/private playlists |
| **playlist_items** | Playlist content | Ordered media lists |
| **sparks** | News articles | Murugan-related news feed |
| **analytics_events** | Usage tracking | Views, downloads, searches |
| **media_reports** | Moderation | Community reports |

### Media Types

- 🖼️ **image** - Wallpapers, photos, artwork
- 🎵 **audio** - Devotional songs, chants, mantras
- 📺 **youtube** - Video embeds (no storage)
- 📰 **article** - News and blog posts

---

## 🔌 API Endpoints

Base: `https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc`

### Media
- `GET /media/search` - Search with filters
- `GET /media/:id` - Get single item
- `POST /media/:id/view` - Track view
- `POST /media/:id/download` - Track download

### Favorites
- `GET /favorites` - User's saved items
- `POST /favorites` - Add to favorites
- `DELETE /favorites/:id` - Remove

### Analytics
- `POST /analytics` - Log events (batch)

### Spark News
- `GET /spark/articles` - Get news feed

### Profile
- `GET /profile` - User profile
- `POST /profile/background` - Set wallpaper

### Admin
- `POST /admin/seed-sample-data` - Test data

---

## 📤 Media Upload System

### Automated Bulk Upload

```bash
cd scripts
npm install
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_KEY=your-service-role-key
npm run upload
```

### What It Does

1. **Scans directory** for images
2. **Extracts metadata** from filenames
3. **Generates 3 sizes:**
   - Original (full resolution)
   - Web (1280px, optimized)
   - Thumbnail (640px, fast loading)
4. **Uploads to storage** with organized paths
5. **Creates database entry** with search indexing

### Filename Format

```
<slug>__<title>__<tag1>,<tag2>,<tag3>.<ext>

Examples:
palani-temple__Palani Murugan Temple__temple,murugan,palani.jpg
vel-weapon__Sacred Vel Divine Weapon__vel,weapon,divine,murugan.jpg
```

---

## 🔍 Search Features

### Full-Text Search
- Searches titles, descriptions, and tags
- Supports Tamil and English
- Typo-tolerant (via PostgreSQL websearch)

### Filters
- **By kind:** image, audio, youtube
- **By tags:** murugan, temple, devotional, etc.
- **Combined:** `?q=palani&kind=image&tags=temple`

### Future: Meilisearch
- Instant search as you type
- Advanced typo tolerance
- Faceted filters
- Geo-search for temples

---

## 📊 Analytics & Tracking

### Events Tracked

| Event | Description | Use Case |
|-------|-------------|----------|
| `media_view` | User viewed content | Popular content |
| `media_download` | Downloaded wallpaper | Engagement metric |
| `media_like` | Added to favorites | User preferences |
| `search_query` | Search performed | SEO insights |
| `spark_view` | Read news article | Content interest |
| `profile_bg_set` | Set profile wallpaper | Personalization |
| `app_open` | App launched | DAU tracking |

### Query Analytics

```sql
-- Most popular media
SELECT title, views, downloads, likes 
FROM media 
ORDER BY views DESC 
LIMIT 10;

-- Daily active users
SELECT DATE(created_at), COUNT(DISTINCT user_id) 
FROM analytics_events 
GROUP BY DATE(created_at);

-- Top searches
SELECT properties->>'query', COUNT(*) 
FROM analytics_events 
WHERE event_type = 'search_query' 
GROUP BY properties->>'query' 
ORDER BY COUNT(*) DESC;
```

---

## 🔐 Security Features

### Row Level Security (RLS)
- ✅ All tables protected
- ✅ Users can only modify their own data
- ✅ Public content readable by everyone
- ✅ Private playlists enforced

### Authentication
- Email/password via Supabase Auth
- JWT tokens for API access
- Session management
- Password reset flow

### Content Moderation
- User reporting system
- Admin review workflow
- Automated filters (future)

---

## 🎨 UI Features

### Photos Tab
- Pinterest-style masonry grid
- Infinite scroll
- Full-screen viewer
- Download & share
- Add to favorites

### Songs Tab
- YouTube embeds
- Audio player
- Playlists
- 3-dot menu with options
- Beautiful mini player

### Spark Tab
- Vertical news feed (TikTok-style)
- Full-screen articles
- Like, share, read full
- Auto-refresh (1 hour cache)

### Profile Tab
- User stats
- Liked photos
- Custom profile wallpaper
- Account settings
- Notifications

---

## 📈 Scaling & Performance

### Current Architecture
Good for **10,000 - 100,000 users**:
- ✅ Supabase Postgres (millions of rows)
- ✅ Storage CDN (global delivery)
- ✅ Edge Functions (auto-scaling)
- ✅ Automatic backups

### Future Optimizations (100k+ users)
- 🔄 Meilisearch for instant search
- 🔄 Redis for caching hot data
- 🔄 Read replicas for analytics
- 🔄 Image CDN (Cloudflare/Cloudinary)
- 🔄 BigQuery for data warehouse

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **ARCHITECTURE.md** | Complete system design |
| **SETUP_COMPLETE.md** | Step-by-step setup |
| **DEPLOY.md** | Production deployment |
| **scripts/README.md** | Upload guide |
| **SPARK_NEWS_SETUP.md** | NewsAPI configuration |

---

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Lucide Icons** - Icon system
- **Motion (Framer)** - Animations

### Backend
- **Supabase Postgres** - Database
- **Supabase Storage** - File storage
- **Edge Functions (Deno)** - API server
- **Hono** - Lightweight web framework

### Tools
- **Sharp** - Image processing
- **Fast-glob** - File scanning
- **NewsAPI** - News aggregation (optional)

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Tables don't exist | Run migration SQL |
| Images 404 | Create public-media bucket |
| Search returns nothing | Upload or seed data |
| Auth errors | Check RLS policies |
| Function timeout | Check logs, increase timeout |

### Get Help
1. Check documentation in `/docs/`
2. Review Supabase logs
3. Test API endpoints directly
4. Verify environment variables

---

## 🎯 Roadmap

### Phase 1: Foundation (✅ Complete)
- [x] Database schema with RLS
- [x] API endpoints
- [x] Storage system
- [x] Upload scripts
- [x] Basic analytics

### Phase 2: Enhancement (In Progress)
- [ ] Meilisearch integration
- [ ] Advanced analytics dashboard
- [ ] User-generated content
- [ ] Social features (comments, ratings)
- [ ] Mobile app (React Native/Expo)

### Phase 3: Scale (Future)
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Push notifications
- [ ] AI-powered recommendations
- [ ] Monetization features

---

## 👥 Contributing

This is a devotional project for Lord Murugan devotees worldwide. Contributions welcome!

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Content Guidelines
- ✅ High-quality images (1920x1080+)
- ✅ Authentic devotional content
- ✅ Proper attribution
- ✅ Respectful and appropriate
- ❌ No copyrighted material without permission

---

## 📜 License

This project is open source and available for devotional use.

---

## 🙏 Credits

**Developed with devotion to Lord Murugan**

Special thanks to:
- Supabase team for amazing infrastructure
- Tamil devotional community
- Contributors and testers

---

## 📞 Support

- 📧 Email: support@muruganwallpapers.com
- 🌐 Website: https://muruganwallpapers.com
- 💬 Discord: [Join community]
- 🐦 Twitter: @MuruganApp

---

## 🔗 Quick Links

- **🚀 Setup Guide:** [SETUP_COMPLETE.md](./SETUP_COMPLETE.md)
- **📖 Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **🎯 Deploy:** [DEPLOY.md](./DEPLOY.md)
- **📤 Upload:** [scripts/README.md](./scripts/README.md)

---

**வேல் முருகனுக்கு அரோகரா! 🙏**

**Vel Muruganukku Arogara!**

*May Lord Murugan's vel (spear) bless this project and all devotees!*
