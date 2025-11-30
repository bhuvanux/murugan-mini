# Murugan Wallpapers & Videos - MVP

A mobile-first web application for devotional wallpapers and videos dedicated to Lord Murugan. Built with React, Tailwind CSS, and Supabase.

---

## 🚨 IMPORTANT: First-Time Setup Required

**Before you can use the app**, you need to create database tables in Supabase.

### Quick Setup (2 minutes):

1. **The app will show a red warning** with setup instructions
2. **Click "🚀 Start Setup"** in the warning banner
3. **Follow the 3 simple steps** in the popup guide
4. **Reload the page** and you're done!

**OR** see **[SETUP_NOW.md](./SETUP_NOW.md)** for detailed instructions.

---

## Features

✨ **Core Features:**
- 📱 Phone OTP Authentication (passwordless login)
- 🖼️ Pinterest-style Masonry Feed with infinite scroll
- 🔍 Search by tags and titles
- ❤️ Save favorites (persists across sessions)
- 📥 Download images and videos to device
- 📤 Share to WhatsApp (with instructions for Status sharing)
- 🎥 Full-screen image viewer and video player
- 👤 User profile management
- 🔐 Secure with Row Level Security (RLS)

🛠️ **Admin Features:**
- Upload wallpapers and videos
- Add titles, descriptions, and tags
- Set downloadable permissions
- Auto-generate video thumbnails

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner

## Quick Start

### 1. Supabase Setup (Required)

Follow the instructions in `SUPABASE_SETUP.md` to:
- Create database tables (`media`, `user_favorites`)
- Set up Row Level Security policies
- Create the `increment_views` function
- **Note**: Storage buckets are optional for testing (sample data uses external URLs)

### 2. Login to the Application

**Testing with Email (Recommended for Quick Start):**
1. Click "Use Email Instead (Testing)"
2. Create a test account with any email and password
3. Sign in with those credentials

**Phone OTP (Production):**
- Requires SMS provider setup in Supabase
- See `SUPABASE_SETUP.md` for phone authentication configuration

### 3. Load Sample Data

**Easiest method** (10 devotional images with one click):
1. Login to the app
2. Go to Profile → Admin: Upload Media
3. Click the **"Load Sample Data"** button
4. Wait for the page to reload
5. Browse the sample wallpapers!

**Manual method** (see `SUPABASE_SETUP.md` for SQL commands)

### 4. Upload Your Own Content (Optional)

1. Go to Profile → Admin: Upload Media
2. Select image or video file
3. Fill in title, description, and tags
4. Upload!
   
**Note**: File uploads require storage buckets to be configured in Supabase.

## Project Structure

```
/
├── App.tsx                      # Main application component
├── components/
│   ├── AdminUpload.tsx         # Admin media upload interface
│   ├── MasonryFeed.tsx         # Pinterest-style media grid
│   ├── MediaCard.tsx           # Individual media card
│   ├── MediaDetail.tsx         # Full-screen media viewer
│   ├── PhoneLogin.tsx          # OTP authentication flow
│   ├── ProfileScreen.tsx       # User profile
│   ├── SavedScreen.tsx         # Saved favorites
│   └── SearchBar.tsx           # Search functionality
├── contexts/
│   └── AuthContext.tsx         # Authentication state management
├── utils/
│   └── supabase/
│       ├── client.tsx          # Supabase client configuration
│       └── info.tsx            # Auto-generated project info
├── supabase/functions/server/
│   └── index.tsx               # Server-side API endpoints
└── SUPABASE_SETUP.md           # Detailed setup instructions
```

## User Flow

### For Users:
1. **Login**: Enter phone number → Receive OTP → Verify OTP
2. **Browse**: Scroll through masonry feed of wallpapers and videos
3. **Search**: Use search bar to find specific content by tags/title
4. **View**: Tap media to see full-screen view
5. **Save**: Tap heart icon to add to favorites
6. **Download**: Download wallpapers/videos to device gallery
7. **Share**: Share via WhatsApp (including Status)
8. **Saved**: View all saved favorites in the Saved tab

### For Admins:
1. Go to Profile → Admin: Upload Media
2. Select file (image or video)
3. Add thumbnail (for videos)
4. Fill in metadata (title, description, tags)
5. Upload to make it available to all users

## API Endpoints

### Server Endpoints (Hono + Supabase Edge Functions)

- `POST /make-server-4a075ebc/admin/media` - Upload media metadata
- `POST /make-server-4a075ebc/admin/seed-sample-data` - Load 10 sample devotional images
- `POST /make-server-4a075ebc/media/:id/view` - Increment view count
- `GET /make-server-4a075ebc/health` - Health check

## Database Schema

### media table
- `id`: UUID (primary key)
- `type`: 'image' | 'video'
- `title`: string
- `description`: string (optional)
- `tags`: string[]
- `uploader`: string
- `created_at`: timestamp
- `storage_path`: string (public URL)
- `thumbnail_url`: string
- `duration_seconds`: number (for videos)
- `downloadable`: boolean
- `views`: number
- `likes`: number

### user_favorites table
- `user_id`: UUID (references auth.users)
- `media_id`: UUID (references media)
- `saved_at`: timestamp
- `downloaded`: boolean

## WhatsApp Integration

### Sharing to WhatsApp
The app uses the Web Share API and WhatsApp deep links for sharing:
- Tap "WhatsApp" button on any media
- Opens WhatsApp with media link pre-filled
- User can choose to share to chats or Status

**Note**: There is no public API to post directly to WhatsApp Status. Users must:
1. Tap the WhatsApp share button
2. Select "My Status" in the WhatsApp share sheet
3. The media will be shared to their Status

## Security Considerations

⚠️ **Important for Production:**

1. **Phone Authentication**: 
   - Configure proper SMS provider (Twilio, MessageBird)
   - Implement rate limiting
   - Add fraud detection

2. **Storage**:
   - Set file size limits (recommend 10MB for images, 50MB for videos)
   - Implement content moderation
   - Monitor storage usage

3. **Privacy**:
   - Update privacy policy link in ProfileScreen
   - Only store minimal user data (phone number, favorites)
   - Comply with data protection regulations

4. **Admin Access**:
   - Implement proper admin authentication
   - Add role-based access control
   - Audit all admin actions

## Mobile Optimization

This app is optimized for mobile devices:
- ✅ Touch-friendly UI with large tap targets
- ✅ Responsive masonry grid (2 columns on mobile)
- ✅ Swipe gestures for media viewing
- ✅ Optimized image loading with lazy loading
- ✅ Infinite scroll for performance
- ✅ Mobile-first navigation with bottom tab bar

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Safari (iOS)
- ✅ Firefox
- ⚠️ Requires JavaScript enabled
- ⚠️ Requires modern browser with ES6 support

## Future Enhancements

Potential features for Phase 2:
- [ ] Push notifications for new content
- [ ] Collections/playlists
- [ ] Comments and ratings
- [ ] Social sharing analytics
- [ ] Advanced search with filters
- [ ] Multi-language support (Tamil, English)
- [ ] Offline mode with service workers
- [ ] Progressive Web App (PWA) with install prompt
- [ ] Video quality selection
- [ ] Batch download

## Support & Contact

For issues, questions, or feature requests:
- 📧 Email: support@tamilkadavulmurugan.com
- 📱 Phone: [Your phone number]

## License

[Your license information]

## Acknowledgments

Made with devotion for Lord Murugan 🙏

---

**Version**: 1.0.0 (MVP)  
**Last Updated**: November 12, 2025
