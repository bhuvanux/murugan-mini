/**
 * ANALYTICS TESTING SUITE
 * Comprehensive test dashboard for unified analytics system
 * Tests all 12 critical analytics functions
 */

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle2, XCircle, Loader2, Play, Activity
} from 'lucide-react';
import { publicAnonKey } from '../../utils/supabase/info';
import { fetchAdminResponseWith404Fallback } from '../../utils/adminAPI';

interface TestResult {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  response?: any;
  duration?: number;
}

export default function AnalyticsTestSuite() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'System Status', description: 'Check if analytics system is installed', status: 'pending' },
    { name: 'Track View Event', description: 'Track a wallpaper view', status: 'pending' },
    { name: 'Track Like Event', description: 'Track a wallpaper like', status: 'pending' },
    { name: 'Check Tracked Status', description: 'Verify event was tracked', status: 'pending' },
    { name: 'Track Unlike Event', description: 'Remove the like tracking', status: 'pending' },
    { name: 'Track Share Event', description: 'Track a share action', status: 'pending' },
    { name: 'Track Download Event', description: 'Track a download action', status: 'pending' },
    { name: 'Track Video Play', description: 'Track video wallpaper play', status: 'pending' },
    { name: 'Track Watch Complete', description: 'Track video completion (80%)', status: 'pending' },
    { name: 'Get Item Stats', description: 'Fetch analytics stats for item', status: 'pending' },
    { name: 'Unique IP Enforcement', description: 'Test duplicate tracking prevention', status: 'pending' },
    { name: 'Like Toggle', description: 'Test like/unlike toggling', status: 'pending' },
    { name: 'Reset Stats', description: 'Test analytics reset function', status: 'pending' },
    { name: 'Launch QA (STEP 10)', description: 'Run bounded integrity checks (rollups, sessions, volume)', status: 'pending' },
    { name: 'Dashboard Data', description: 'Fetch admin dashboard overview', status: 'pending' },
  ]);

  const [running, setRunning] = useState(false);
  const [testItemId] = useState('00000000-0000-0000-0000-000000000001');

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  async function runAllTests() {
    setRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(t => ({ ...t, status: 'pending' as const, error: undefined, response: undefined })));

    const testFunctions = [
      testSystemStatus,
      testTrackView,
      testTrackLike,
      testCheckTracked,
      testUntrackLike,
      testTrackShare,
      testTrackDownload,
      testTrackVideoPlay,
      testTrackWatchComplete,
      testGetItemStats,
      testUniqueIPEnforcement,
      testLikeToggle,
      testResetStats,
      testLaunchQA,
      testDashboard,
    ];

    for (let i = 0; i < testFunctions.length; i++) {
      updateTest(i, { status: 'running' });
      const startTime = Date.now();
      
      try {
        const result = await testFunctions[i]();
        const duration = Date.now() - startTime;
        
        updateTest(i, {
          status: result.passed ? 'passed' : 'failed',
          error: result.error,
          response: result.response,
          duration
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        updateTest(i, {
          status: 'failed',
          error: error.message,
          duration
        });
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setRunning(false);
  }

  async function testSystemStatus() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/admin/status`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success || !data.status?.installed) {
        return { 
          passed: false, 
          error: 'Analytics system not installed', 
          response: data 
        };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testLaunchQA() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/admin/analytics/qa?window_days=7`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      if (!data?.success) {
        return { passed: false, error: data?.error || 'QA failed', response: data };
      }

      const summary = data?.summary || { pass: 0, warn: 0, fail: 0 };
      const warn = Number(summary.warn || 0);
      const fail = Number(summary.fail || 0);

      if (fail > 0 || warn > 0) {
        return {
          passed: false,
          error: `QA not clean (fail=${fail}, warn=${warn})`,
          response: data,
        };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testTrackView() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'view',
          metadata: { test: true }
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testTrackLike() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'like',
          metadata: { test: true }
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testCheckTracked() {
    try {
      const res = await fetchAdminResponseWith404Fallback(
        `/api/analytics/check/wallpaper/${testItemId}/like`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success || !data.tracked) {
        return { 
          passed: false, 
          error: 'Like was not tracked', 
          response: data 
        };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testUntrackLike() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/untrack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'like'
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testTrackShare() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'share',
          metadata: { platform: 'whatsapp', test: true }
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testTrackDownload() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'download',
          metadata: { test: true }
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testTrackVideoPlay() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'play',
          metadata: { video: true, test: true }
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testTrackWatchComplete() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'watch_complete',
          metadata: { completion_percent: 80, test: true }
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testGetItemStats() {
    try {
      const res = await fetchAdminResponseWith404Fallback(
        `/api/analytics/stats/wallpaper/${testItemId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success || !data.stats) {
        return { passed: false, error: 'No stats returned', response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testUniqueIPEnforcement() {
    try {
      // Track the same event twice
      const res1 = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'view',
          metadata: { test: 'duplicate' }
        })
      });

      const data1 = await res1.json();

      const res2 = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'view',
          metadata: { test: 'duplicate' }
        })
      });

      const data2 = await res2.json();

      // Second call should return already_tracked = true
      if (!data2.already_tracked) {
        return { 
          passed: false, 
          error: 'Duplicate was not prevented', 
          response: { first: data1, second: data2 } 
        };
      }

      return { passed: true, response: { first: data1, second: data2 } };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testLikeToggle() {
    try {
      // Like
      const res1 = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'like'
        })
      });

      const data1 = await res1.json();

      // Unlike
      const res2 = await fetchAdminResponseWith404Fallback(`/api/analytics/untrack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'like'
        })
      });

      const data2 = await res2.json();

      // Like again
      const res3 = await fetchAdminResponseWith404Fallback(`/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: 'like'
        })
      });

      const data3 = await res3.json();

      if (!data1.success || !data2.success || !data3.success) {
        return { 
          passed: false, 
          error: 'Toggle failed', 
          response: { like1: data1, unlike: data2, like2: data3 } 
        };
      }

      return { passed: true, response: { like1: data1, unlike: data2, like2: data3 } };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testResetStats() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/admin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          module_name: 'wallpaper',
          item_id: testItemId,
          event_type: null // Reset all events for this item
        })
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success) {
        return { passed: false, error: data.error, response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  async function testDashboard() {
    try {
      const res = await fetchAdminResponseWith404Fallback(`/api/analytics/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (!res.ok) {
        return { passed: false, error: `HTTP ${res.status}`, response: await res.text() };
      }

      const data = await res.json();
      
      if (!data.success || !data.dashboard) {
        return { passed: false, error: 'No dashboard data', response: data };
      }

      return { passed: true, response: data };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;
  const totalCount = tests.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Test Suite</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive testing for unified analytics system
          </p>
        </div>
        
        <Button onClick={runAllTests} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Results Summary */}
      {(passedCount > 0 || failedCount > 0) && (
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Test Results</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">{passedCount} Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">{failedCount} Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600">{totalCount} Total</span>
                </div>
              </div>
            </div>

            {passedCount === totalCount && (
              <Badge className="bg-green-600 text-white px-4 py-2">
                ✅ All Tests Passed!
              </Badge>
            )}

            {failedCount > 0 && (
              <Badge variant="destructive" className="px-4 py-2">
                ⚠️ {failedCount} Failed
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Test List */}
      <Card className="p-6">
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="p-4 rounded-lg border bg-white">
              <div className="flex items-center gap-4">
                {test.status === 'pending' && (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                {test.status === 'running' && (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                )}
                {test.status === 'passed' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {test.status === 'failed' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}

                <div className="flex-1">
                  <p className="font-medium">{test.name}</p>
                  <p className="text-sm text-gray-600">{test.description}</p>
                  
                  {test.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription className="text-xs">
                        Error: {test.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {test.response && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View response
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(test.response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                {test.duration && (
                  <Badge variant="outline" className="text-xs">
                    {test.duration}ms
                  </Badge>
                )}

                <Badge 
                  variant={
                    test.status === 'passed' ? 'default' : 
                    test.status === 'failed' ? 'destructive' : 
                    'secondary'
                  }
                  className="min-w-[80px] justify-center"
                >
                  {test.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}