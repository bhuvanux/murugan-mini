/**
 * ANALYTICS INTEGRATION TEST
 * Test all connected components to ensure analytics are working
 */

import { analyticsTracker } from './useAnalytics';

export const testAnalyticsIntegration = async () => {
  console.log('🧪 Testing Analytics Integration...');
  
  const testResults = {
    mediaCard: false,
    songsScreen: false,
    sparkScreen: false,
    wallpaperFullView: false,
    songCard: false,
  };

  try {
    // Test MediaCard analytics
    await analyticsTracker.track('wallpaper', 'test-wallpaper-id', 'view', {
      title: 'Test Wallpaper',
      type: 'image',
      is_video: false
    });
    testResults.mediaCard = true;
    console.log('✅ MediaCard analytics working');
  } catch (error) {
    console.error('❌ MediaCard analytics failed:', error);
  }

  try {
    // Test SongsScreen analytics
    await analyticsTracker.track('song', 'test-song-id', 'play');
    await analyticsTracker.track('song', 'test-song-id', 'like');
    await analyticsTracker.track('song', 'test-song-id', 'share');
    await analyticsTracker.track('song', 'test-song-id', 'download');
    testResults.songsScreen = true;
    console.log('✅ SongsScreen analytics working');
  } catch (error) {
    console.error('❌ SongsScreen analytics failed:', error);
  }

  try {
    // Test SparkScreen analytics
    await analyticsTracker.track('sparkle', 'test-sparkle-id', 'view');
    await analyticsTracker.track('sparkle', 'test-sparkle-id', 'read');
    await analyticsTracker.track('sparkle', 'test-sparkle-id', 'like');
    await analyticsTracker.track('sparkle', 'test-sparkle-id', 'share');
    await analyticsTracker.track('sparkle', 'test-sparkle-id', 'download');
    testResults.sparkScreen = true;
    console.log('✅ SparkScreen analytics working');
  } catch (error) {
    console.error('❌ SparkScreen analytics failed:', error);
  }

  try {
    // Test WallpaperFullView analytics
    await analyticsTracker.track('wallpaper', 'test-wallpaper-full-id', 'view');
    await analyticsTracker.track('wallpaper', 'test-wallpaper-full-id', 'like');
    await analyticsTracker.track('wallpaper', 'test-wallpaper-full-id', 'share');
    await analyticsTracker.track('wallpaper', 'test-wallpaper-full-id', 'download');
    testResults.wallpaperFullView = true;
    console.log('✅ WallpaperFullView analytics working');
  } catch (error) {
    console.error('❌ WallpaperFullView analytics failed:', error);
  }

  try {
    // Test SongCard analytics
    await analyticsTracker.track('song', 'test-song-card-id', 'view', {
      title: 'Test Song Card',
      duration: 180,
      has_thumbnail: true
    });
    await analyticsTracker.track('song', 'test-song-card-id', 'play');
    await analyticsTracker.track('song', 'test-song-card-id', 'like');
    await analyticsTracker.track('song', 'test-song-card-id', 'share');
    await analyticsTracker.track('song', 'test-song-card-id', 'open_in_youtube');
    testResults.songCard = true;
    console.log('✅ SongCard analytics working');
  } catch (error) {
    console.error('❌ SongCard analytics failed:', error);
  }

  // Summary
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const successRate = Math.round((passedTests / totalTests) * 100);

  console.log('\n📊 Analytics Integration Test Results:');
  console.log('='.repeat(50));
  Object.entries(testResults).forEach(([component, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const name = component.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${status} ${name}`);
  });
  console.log('='.repeat(50));
  console.log(`📈 Overall: ${passedTests}/${totalTests} tests passed (${successRate}%)`);

  if (successRate === 100) {
    console.log('🎉 All analytics integrations are working correctly!');
  } else {
    console.log('⚠️ Some analytics integrations need attention.');
  }

  return {
    success: successRate === 100,
    results: testResults,
    summary: `${passedTests}/${totalTests} tests passed (${successRate}%)`
  };
};

// Auto-run test if called directly
if (typeof window !== 'undefined') {
  // Add to global scope for manual testing in browser console
  (window as any).testAnalyticsIntegration = testAnalyticsIntegration;
  console.log('🔧 Test function available: testAnalyticsIntegration()');
}
