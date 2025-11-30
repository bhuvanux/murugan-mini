# Spark News Feed Setup Guide

## Overview

The Spark tab displays Murugan-related news articles in a vertical, full-screen feed (similar to Instagram Reels or TikTok).

## Default Behavior (No Setup Required)

**The Spark feed works out of the box** with 8 curated articles about:
- Palani Temple festivals
- Thiruchendur Temple updates
- Thiruparankundram special poojas
- Six Abodes pilgrimage guides
- Skanda Sashti celebrations
- Thaipusam guides
- Lord Murugan devotional content (Tamil & English)

These articles are cached and served from the backend automatically.

## Optional: Real-Time News with NewsAPI

To get **real-time news articles** from NewsAPI.org, follow these steps:

### 1. Get a Free NewsAPI Key

1. Visit [https://newsapi.org](https://newsapi.org)
2. Click "Get API Key" (free tier: 100 requests/day)
3. Sign up and copy your API key

### 2. Add API Key to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click **"Add secret"**
4. Name: `NEWS_API_KEY`
5. Value: Paste your NewsAPI key
6. Click **"Save"**

### 3. Deploy the Server

The server will automatically use NewsAPI when the key is available:

```bash
# Deploy the edge function
supabase functions deploy make-server-4a075ebc
```

### 4. How It Works

With NewsAPI enabled, the server will:
- Search for keywords: "Murugan temple", "Palani", "Thiruchendur", "Skanda", "Tamil temple festival"
- Fetch latest articles from newsapi.org
- Cache results for 1 hour
- Extract relevant tags from article content
- Remove duplicates
- Return top 10 most relevant articles

If NewsAPI fails or the key is not set, it automatically falls back to the curated articles.

## Article Sources

### With NewsAPI (Real-time)
- News websites covering Indian temples
- Regional news in English
- International coverage of Hindu festivals
- Blog posts about Murugan temples

### Without NewsAPI (Curated)
- Palani Dhandayuthapani Swamy Temple updates
- Thiruchendur Murugan Temple news
- Thiruparankundram devotional services
- Arupadai Veedu pilgrimage guides
- Skanda Sashti festival coverage
- Tamil devotional content

## Cache Behavior

- Articles are cached for **1 hour**
- Cached articles are served instantly
- Fresh articles are fetched after cache expires
- Each user gets the same cached articles (improves performance)

## Future Enhancements

You can extend the Spark feed by:

1. **RSS Feeds**: Parse temple website RSS feeds
2. **YouTube Integration**: Fetch devotional videos using YouTube Data API
3. **Multiple Languages**: Support Tamil, Hindi, Telugu content
4. **Custom Curation**: Admin panel to approve/feature articles
5. **User Preferences**: Filter by temple, festival type, language

## Troubleshooting

### Articles not loading?
- Check browser console for errors
- Verify server is deployed: `supabase functions list`
- Test endpoint: `curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-4a075ebc/spark/articles`

### Want more articles?
- Add more search keywords in `/supabase/functions/server/index.tsx`
- Increase `pageSize` in NewsAPI calls
- Add more curated fallback articles

### Different languages?
- NewsAPI supports `language` parameter
- Add `language=ta` for Tamil (if available)
- Modify search queries to include Tamil keywords

## API Rate Limits

**NewsAPI Free Tier:**
- 100 requests per day
- Developer use only
- Articles from last 30 days

With caching (1 hour), you'll use:
- ~24 requests per day (hourly refresh)
- Well within free tier limits

**Paid NewsAPI ($449/month):**
- Unlimited requests
- Production use
- Full article content
- Historical data

## Support

For questions or issues with Spark:
1. Check the browser console for errors
2. Review `/supabase/functions/server/index.tsx` 
3. Test the endpoint directly
4. Ensure edge function is deployed

---

**Made with 🙏 for Lord Murugan devotees**
