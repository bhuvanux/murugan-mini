/**
 * GA4 DEBUGGING TOOL
 * Help identify why GA4 events aren't appearing
 */

export const debugGA4 = () => {
  console.log('🔍 GA4 Debugging Tool');
  
  // Check 1: GA4 script loaded
  console.log('1. GA4 Script Status:', typeof window.gtag !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
  
  // Check 2: GA4 config
  console.log('2. GA4 Config Check:');
  if (typeof window.gtag !== 'undefined') {
    // Send a test event immediately
    window.gtag('event', 'debug_ga4_connection', {
      event_category: 'debugging',
      event_label: 'connection_test',
      custom_parameters: {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      },
      app_name: 'Tamil Kadavul Murugan',
      platform: 'Android'
    });
    console.log('✅ Debug event sent to GA4');
  } else {
    console.log('❌ Cannot send event - GA4 not loaded');
  }
  
  // Check 3: Measurement ID
  console.log('3. Current URL:', window.location.href);
  console.log('4. Expected Measurement ID: G-YZ1K6J9JH');
  
  // Check 4: Page info
  console.log('5. Page loaded:', performance.now());
  
  console.log('🔍 Debugging complete. Check GA4 Realtime in 2-3 minutes.');
};

// Make it globally available
if (typeof window !== 'undefined') {
  (window as any).debugGA4 = debugGA4;
  console.log('🔍 Debug tool available: debugGA4()');
}
