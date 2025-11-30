# Deployment Checklist - Murugan Wallpapers & Videos

Use this checklist to ensure your app is properly configured before going live.

## ✅ Pre-Deployment Checklist

### 1. Supabase Database Setup
- [ ] Created `media` table with all columns
- [ ] Created `user_favorites` table
- [ ] Created `increment_views()` function
- [ ] Enabled Row Level Security on both tables
- [ ] Created all RLS policies (public read, user favorites)
- [ ] Created indexes for performance
- [ ] Tested sample data loading

### 2. Authentication Configuration
- [ ] **For Testing**: Email provider is enabled
- [ ] **For Production**: Phone provider configured with SMS service
- [ ] Rate limiting enabled (to prevent abuse)
- [ ] Test OTP feature configured (for development)
- [ ] Sign-up and sign-in tested successfully

### 3. Storage Setup (Optional for Production)
- [ ] Created `media-images` bucket (public)
- [ ] Created `media-videos` bucket (public)
- [ ] Set up storage policies for public read access
- [ ] Set up storage policies for authenticated uploads
- [ ] Configured file size limits (recommended: 10MB images, 50MB videos)
- [ ] Tested file upload through admin panel

### 4. API & Server
- [ ] Server endpoints are accessible
- [ ] Health check endpoint responding (`/health`)
- [ ] Admin media upload endpoint working
- [ ] Seed sample data endpoint tested
- [ ] View increment endpoint working
- [ ] CORS configured correctly
- [ ] Error logging enabled

### 5. Frontend Testing
- [ ] Login with email works
- [ ] Login with phone OTP works (if enabled)
- [ ] Home feed displays media correctly
- [ ] Search functionality works
- [ ] Infinite scroll loads more items
- [ ] Full-screen media view works
- [ ] Video playback works (if applicable)
- [ ] Download functionality works
- [ ] WhatsApp share works
- [ ] Favorites can be added/removed
- [ ] Saved screen shows favorites
- [ ] Profile screen displays user info
- [ ] Sign out works correctly
- [ ] Admin upload panel accessible
- [ ] Sample data loads successfully

### 6. Mobile Responsiveness
- [ ] Tested on iPhone (Safari)
- [ ] Tested on Android (Chrome)
- [ ] Bottom navigation works on mobile
- [ ] Images load properly on slow connections
- [ ] Touch gestures work (tap, swipe)
- [ ] Full-screen mode works on mobile
- [ ] Share sheet opens on mobile

### 7. Performance
- [ ] Images load with lazy loading
- [ ] Infinite scroll performs well
- [ ] No memory leaks in long sessions
- [ ] Database queries are optimized
- [ ] Storage bandwidth is acceptable

### 8. Security Review
- [ ] RLS policies prevent unauthorized access
- [ ] Service role key not exposed to frontend
- [ ] Admin panel has proper authentication
- [ ] File upload size limits enforced
- [ ] Rate limiting configured
- [ ] HTTPS enabled (automatic with Supabase)
- [ ] Content validation on uploads

### 9. Content & Legal
- [ ] Privacy policy updated and linked
- [ ] Terms of service added (if applicable)
- [ ] Support email configured
- [ ] Image attribution included (see Attributions.md)
- [ ] Copyright notices added
- [ ] Data retention policy defined

### 10. Production Configuration
- [ ] Updated support email in ProfileScreen
- [ ] Removed test/debug logging
- [ ] Analytics configured (if desired)
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Backup strategy defined
- [ ] Monitoring alerts configured

---

## 🚀 Deployment Steps

### 1. Finalize Supabase Configuration
```bash
# Run in Supabase SQL Editor
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check all policies
SELECT * FROM pg_policies;
```

### 2. Load Initial Content
- Load sample data OR
- Upload your own devotional content
- Verify at least 10-20 items for good UX

### 3. Test End-to-End User Flow
1. Sign up new account
2. Browse home feed
3. Search for content
4. View full-screen
5. Download image
6. Share to WhatsApp
7. Save to favorites
8. View saved items
9. Sign out
10. Sign back in

### 4. Performance Testing
- Test with 100+ media items
- Test on slow 3G connection
- Test infinite scroll with many items
- Monitor Supabase dashboard for query performance

### 5. Final Checks
- [ ] All environment variables set correctly
- [ ] CORS configured for production domain
- [ ] No console errors in production build
- [ ] 404 pages handled gracefully
- [ ] Loading states show properly
- [ ] Error messages are user-friendly

---

## 📊 Post-Deployment Monitoring

### Week 1
- [ ] Monitor user sign-ups
- [ ] Check error logs daily
- [ ] Monitor storage usage
- [ ] Track database performance
- [ ] Verify SMS costs (if using phone auth)

### Week 2-4
- [ ] Analyze user engagement
- [ ] Review most popular content
- [ ] Check download/share metrics
- [ ] Monitor bandwidth usage
- [ ] Collect user feedback

### Ongoing
- [ ] Weekly database backups
- [ ] Monthly content updates
- [ ] Security updates
- [ ] User support responses
- [ ] Feature requests tracking

---

## 🆘 Common Issues & Solutions

### Issue: Users can't sign up
**Solution**: Check if Email provider is enabled in Supabase Auth settings

### Issue: No media showing
**Solution**: 
1. Verify database tables exist
2. Check RLS policies allow public read
3. Load sample data through admin panel

### Issue: Downloads not working
**Solution**: Check browser permissions for file downloads and storage access

### Issue: WhatsApp share not opening
**Solution**: This is normal on desktop - it copies link instead. On mobile it should open WhatsApp.

### Issue: Images loading slowly
**Solution**: 
1. Compress images before upload
2. Use thumbnail URLs for grid view
3. Enable CDN on Supabase storage

### Issue: High storage costs
**Solution**:
1. Implement file size limits
2. Compress images/videos before upload
3. Use external CDN for large files
4. Clean up unused files regularly

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Project Support**: support@tamilkadavulmurugan.com

---

## 🎉 Ready to Launch?

Once all checkboxes are complete:

1. ✅ Do a final test of all features
2. ✅ Make a backup of your Supabase database
3. ✅ Monitor logs closely for first 24 hours
4. ✅ Have rollback plan ready
5. ✅ Celebrate! 🎊

**Made with devotion for Lord Murugan** 🙏

---

**Last Updated**: November 12, 2025  
**Version**: 1.0.0
