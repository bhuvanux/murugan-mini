/**
 * RUN GA4 TEST NOW
 * Execute this to test your hybrid analytics integration
 */

import { testGA4Integration } from './test-ga4-integration';

// Auto-run test when imported
console.log('🚀 Starting GA4 Integration Test...');
testGA4Integration().then(result => {
  if (result.success) {
    console.log('🎉 SUCCESS! GA4 integration is working!');
    console.log('📱 Check your GA4 dashboard in 2-3 minutes');
    console.log('🔥 You should see events appearing in Realtime report');
  } else {
    console.error('❌ FAILED! GA4 integration has issues:');
    console.error('Error:', result.error);
    console.log('🔧 Check:');
    console.log('1. GA4 script loaded in index.html');
    console.log('2. Internet connection working');
    console.log('3. Ad blockers disabled');
    console.log('4. Correct GA4 Measurement ID');
  }
});

// Also make it globally available
if (typeof window !== 'undefined') {
  (window as any).runGA4Test = testGA4Integration;
  console.log('🧪 Test function available: runGA4Test()');
}
