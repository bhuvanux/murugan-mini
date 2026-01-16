/**
 * GA4 INTEGRATION TEST
 * Test if GA4 tracking is working alongside Supabase
 */

import { analyticsTracker, EventType } from './useAnalytics';
import { ModuleName } from './useAnalytics';

export const testGA4Integration = async () => {
  console.log('🔍 Testing GA4 Integration...');
  
  // Check if GA4 script loaded
  if (typeof window.gtag === 'undefined') {
    console.error('❌ GA4 not loaded. Check index.html script.');
    return { success: false, error: 'GA4 script not loaded' };
  }

  console.log('✅ GA4 script loaded successfully');

  try {
    // Test GA4 event tracking
    window.gtag('event', 'test_ga4_integration', {
      event_category: 'testing',
      event_label: 'hybrid_analytics_test',
      custom_parameters: {
        test_timestamp: new Date().toISOString(),
        integration_type: 'supabase_plus_ga4'
      },
      app_name: 'Tamil Kadavul Murugan',
      platform: 'Android'
    });

    // Test hybrid tracking (Supabase + GA4)
    const result = await analyticsTracker.track('wallpaper' as ModuleName, 'test-ga4-wallpaper', 'view' as EventType, {
      title: 'GA4 Integration Test Wallpaper',
      test_type: 'hybrid_tracking'
    });

    if (result.success) {
      console.log('✅ Hybrid tracking working (Supabase + GA4)');
    } else {
      console.error('❌ Supabase tracking failed:', result);
    }

    // Test different module types
    const testEvents = [
      { module: 'song' as ModuleName, event: 'play' as EventType, id: 'test-ga4-song' },
      { module: 'sparkle' as ModuleName, event: 'view' as EventType, id: 'test-ga4-sparkle' },
      { module: 'video' as ModuleName, event: 'watch_complete' as EventType, id: 'test-ga4-video' }
    ];

    for (const test of testEvents) {
      await analyticsTracker.track(test.module, test.id, test.event, {
        test_type: 'ga4_integration'
      });
    }

    console.log('📊 GA4 Integration Test Complete');
    console.log('📱 Check GA4 Realtime dashboard for events');
    console.log('🔥 Check Supabase Admin panel for events');

    return {
      success: true,
      message: 'GA4 integration test completed successfully',
      ga4_loaded: true,
      supabase_working: result.success
    };

  } catch (error: any) {
    console.error('❌ GA4 Integration test failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      ga4_loaded: typeof window.gtag !== 'undefined'
    };
  }
};

// Add to global scope for manual testing
if (typeof window !== 'undefined') {
  (window as any).testGA4Integration = testGA4Integration;
  console.log('🧪 GA4 Test function available: testGA4Integration()');
}
