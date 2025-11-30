/**
 * BANNER INTEGRATION EXAMPLES
 * Copy and paste these examples into your module files
 */

import React from "react";
import { ModuleBannerCarousel } from "./components/ModuleBannerCarousel";

// ============================================================
// EXAMPLE 1: HOME DASHBOARD with Hero Banner
// ============================================================

export function HomeScreenExample() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner Carousel */}
      <ModuleBannerCarousel 
        bannerType="home"
        onBannerClick={(bannerId) => {
          console.log("Banner clicked:", bannerId);
          // Optional: Navigate to specific page or show modal
        }}
      />

      {/* Rest of home content */}
      <div className="px-4 py-6">
        <h1>Welcome to Murugan App</h1>
        {/* Other home content */}
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 2: WALLPAPER MODULE with Banner
// ============================================================

export function WallpaperScreenExample() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0d5e38] text-white p-4">
        <h1 className="text-xl font-bold">Wallpapers</h1>
      </div>

      {/* Wallpaper Banners */}
      <div className="px-4 pt-4">
        <ModuleBannerCarousel bannerType="wallpaper" />
      </div>

      {/* Wallpaper Grid */}
      <div className="px-4">
        {/* Wallpaper cards here */}
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 3: PHOTOS MODULE with Banner
// ============================================================

export function PhotosScreenExample() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header with Search */}
      <div className="bg-gradient-to-r from-[#0d5e38] to-[#0a4a2b] p-4">
        <h1 className="text-white text-xl font-bold mb-2">Photos</h1>
        <input
          type="search"
          placeholder="Search photos..."
          className="w-full px-4 py-2 rounded-lg"
        />
      </div>

      {/* Photos Banners */}
      <div className="px-4 pt-4">
        <ModuleBannerCarousel bannerType="photos" />
      </div>

      {/* Masonry Photo Grid */}
      <div className="px-4 py-4">
        {/* Photo masonry grid here */}
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 4: MEDIA (SONGS) MODULE with Banner
// ============================================================

export function MediaScreenExample() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="p-4">
        <h1 className="text-2xl font-bold">Devotional Media</h1>
        <p className="text-gray-400">Songs, Videos & More</p>
      </div>

      {/* Media Banners */}
      <div className="px-4">
        <ModuleBannerCarousel 
          bannerType="media"
          onBannerClick={(bannerId) => {
            // Handle banner click - maybe play featured song?
            console.log("Play featured content from banner:", bannerId);
          }}
        />
      </div>

      {/* Media Tabs */}
      <div className="px-4 py-4">
        {/* Songs, Videos, YouTube tabs */}
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 5: SPARKLE (NEWS) MODULE with Banner
// ============================================================

export function SparkleScreenExample() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
        <h1 className="text-2xl font-bold">Sparkle News</h1>
        <p className="text-sm">Latest Temple Updates & Articles</p>
      </div>

      {/* Sparkle Banners - Featured Stories */}
      <div className="px-4 pt-4">
        <ModuleBannerCarousel bannerType="sparkle" />
      </div>

      {/* News Feed */}
      <div className="px-4 py-4">
        {/* Article cards here */}
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 6: ADVANCED - Conditional Banner Display
// ============================================================

export function ConditionalBannerExample() {
  const [showBanners, setShowBanners] = React.useState(true);

  return (
    <div className="min-h-screen">
      <button onClick={() => setShowBanners(!showBanners)}>
        {showBanners ? "Hide" : "Show"} Banners
      </button>

      {showBanners && (
        <ModuleBannerCarousel bannerType="home" />
      )}

      {/* Rest of content */}
    </div>
  );
}

// ============================================================
// EXAMPLE 7: Multiple Banner Types on Same Page
// ============================================================

export function MultipleBannersExample() {
  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <ModuleBannerCarousel bannerType="home" />

      {/* Wallpaper Section */}
      <section className="py-8 px-4">
        <h2 className="text-xl font-bold mb-4">Latest Wallpapers</h2>
        <ModuleBannerCarousel bannerType="wallpaper" />
        {/* Wallpaper grid */}
      </section>

      {/* Photos Section */}
      <section className="py-8 px-4 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Featured Photos</h2>
        <ModuleBannerCarousel bannerType="photos" />
        {/* Photo grid */}
      </section>
    </div>
  );
}

// ============================================================
// EXAMPLE 8: With Custom Styling
// ============================================================

export function CustomStyledBannerExample() {
  return (
    <div className="min-h-screen">
      {/* Container with custom styling */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="my-8">
          <ModuleBannerCarousel bannerType="home" />
        </div>
      </div>

      {/* Full-width banner */}
      <div className="w-full">
        <ModuleBannerCarousel bannerType="wallpaper" />
      </div>

      {/* Constrained width banner */}
      <div className="max-w-4xl mx-auto px-4 my-8">
        <ModuleBannerCarousel bannerType="photos" />
      </div>
    </div>
  );
}

// ============================================================
// EXAMPLE 9: Integration with Existing Screens
// ============================================================

// Find your existing screen component and add the banner at the top:

/*
// BEFORE:
export function WallpaperScreen() {
  return (
    <div>
      <SearchBar />
      <WallpaperGrid />
    </div>
  );
}

// AFTER:
import { ModuleBannerCarousel } from "./components/ModuleBannerCarousel";

export function WallpaperScreen() {
  return (
    <div>
      <ModuleBannerCarousel bannerType="wallpaper" />
      <SearchBar />
      <WallpaperGrid />
    </div>
  );
}
*/

// ============================================================
// EXAMPLE 10: Testing Banner API Directly
// ============================================================

export function BannerTestingExample() {
  const [banners, setBanners] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const testFetchBanners = async () => {
    setLoading(true);
    try {
      const { fetchModuleBanners } = await import("./utils/bannerAPI");
      const data = await fetchModuleBanners("wallpaper");
      setBanners(data);
      console.log("Fetched banners:", data);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const testTrackView = async (bannerId: string) => {
    try {
      const { trackBannerView } = await import("./utils/bannerAPI");
      await trackBannerView(bannerId);
      console.log("Tracked view for banner:", bannerId);
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const testTrackClick = async (bannerId: string) => {
    try {
      const { trackBannerClick } = await import("./utils/bannerAPI");
      await trackBannerClick(bannerId);
      console.log("Tracked click for banner:", bannerId);
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Banner API Testing</h2>
      
      <button 
        onClick={testFetchBanners}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test Fetch Banners
      </button>

      {loading && <p>Loading...</p>}

      <div className="space-y-2">
        {banners.map((banner: any) => (
          <div key={banner.id} className="border p-4 rounded">
            <h3 className="font-bold">{banner.title}</h3>
            <p className="text-sm text-gray-600">Views: {banner.view_count}</p>
            <p className="text-sm text-gray-600">Clicks: {banner.click_count}</p>
            <div className="mt-2 space-x-2">
              <button
                onClick={() => testTrackView(banner.id)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm"
              >
                Track View
              </button>
              <button
                onClick={() => testTrackClick(banner.id)}
                className="bg-orange-500 text-white px-3 py-1 rounded text-sm"
              >
                Track Click
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// USAGE NOTES:
// ============================================================

/*

1. IMPORT THE COMPONENT:
   import { ModuleBannerCarousel } from "./components/ModuleBannerCarousel";

2. ADD TO YOUR SCREEN:
   <ModuleBannerCarousel bannerType="wallpaper" />

3. BANNER TYPES:
   - "wallpaper" - For Wallpaper module
   - "photos"    - For Photos module
   - "media"     - For Media/Songs module
   - "sparkle"   - For Sparkle/News module
   - "home"      - For Home dashboard

4. OPTIONAL CLICK HANDLER:
   <ModuleBannerCarousel 
     bannerType="home"
     onBannerClick={(id) => console.log("Banner clicked:", id)}
   />

5. STYLING:
   - Component is responsive by default
   - Takes full width of parent container
   - Has built-in margins and padding
   - You can wrap it in a div for custom layout

6. CACHING:
   - Banners are cached for 24 hours
   - Cache is stored in localStorage
   - To clear cache: localStorage.clear()
   - Or use: invalidateBannerCache("wallpaper")

7. TESTING:
   - Upload banner in Admin Panel
   - Set banner_type to match your module
   - Set publish_status to "published"
   - Set visibility to "public"
   - Refresh your app to see banner

8. TROUBLESHOOTING:
   - Check browser console for errors
   - Verify banner exists in database
   - Check network tab for API calls
   - Clear localStorage cache
   - Verify banner_type matches

*/
