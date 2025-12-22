import { useState } from 'react';
import { Activity, CheckCircle, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { MuruganLoader } from './MuruganLoader';

/**
 * SIMPLE HEALTH CHECK
 * Tests basic connectivity to backend edge function
 */
export function SimpleHealthCheck() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testHealth = async () => {
    setTesting(true);
    setResult(null);

    // Test 1: Simple health check (no database query)
    const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/health`;
    
    console.log('🏥 Testing health endpoint:', healthUrl);
    
    try {
      const healthStartTime = Date.now();
      
      // Health endpoint may not require auth, but include it for consistency
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`, // ✅ Use correct anon key
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      const healthResponseTime = Date.now() - healthStartTime;
      const healthData = await healthResponse.json();
      
      console.log('✅ Health response:', { status: healthResponse.status, data: healthData, time: healthResponseTime });

      setResult({
        success: healthResponse.ok,
        status: healthResponse.status,
        responseTime: healthResponseTime,
        data: healthData,
        endpoint: 'health',
        message: healthResponse.ok ? 'Edge function is ALIVE!' : 'Edge function returned error'
      });

    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      
      setResult({
        success: false,
        error: error.message || 'Health check failed',
        isTimeout: error.name === 'TimeoutError' || error.message?.includes('timeout'),
        isNetworkError: error.message?.includes('Failed to fetch'),
        endpoint: 'health',
        message: error.name === 'TimeoutError' 
          ? 'Edge function took >10s to respond (severe cold start or not deployed)'
          : 'Cannot reach edge function (check if deployed)'
      });
    }

    setTesting(false);
  };

  return (
    <div className="bg-blue-50 border-4 border-blue-500 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-blue-900 text-lg">Simple Health Check</h3>
            <p className="text-sm text-gray-600">Test if edge function is deployed</p>
          </div>
        </div>
        <button
          onClick={testHealth}
          disabled={testing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? (
            <>
              <MuruganLoader variant="button" />
              Testing...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Ping Health
            </>
          )}
        </button>
      </div>

      {testing && (
        <div className="bg-white rounded-lg p-8 text-center border-2 border-blue-200">
          <MuruganLoader variant="page" className="mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Pinging edge function...</p>
          <p className="text-sm text-gray-500 mt-1">Timeout: 10 seconds</p>
        </div>
      )}

      {result && !testing && (
        <div className={`rounded-lg p-6 border-2 ${
          result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-start gap-3 mb-4">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-lg text-gray-900 mb-2">
                {result.success ? '✅ Edge Function ALIVE!' : '❌ Edge Function NOT RESPONDING'}
              </h4>

              {result.success ? (
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Response Time:</p>
                    <p className="text-2xl font-bold text-green-600">{result.responseTime}ms</p>
                    {result.responseTime > 5000 && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ Slow (cold start)</p>
                    )}
                  </div>

                  <div className="bg-green-50 rounded p-4 border border-green-200">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ Good News:</p>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Edge function is deployed and running</li>
                      <li>• Network connection is working</li>
                      <li>• CORS headers are configured</li>
                      <li>• Ready to serve wallpapers!</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded p-3 border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 mb-1">Next Step:</p>
                    <p className="text-sm text-blue-600">
                      Now test the full wallpaper endpoint with the purple "Test Backend Connection" button below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border border-red-200">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Error:</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>

                  <div className="bg-white rounded p-3 border border-red-200">
                    <p className="text-sm font-semibold text-gray-600 mb-1">What This Means:</p>
                    <p className="text-sm text-red-700">{result.message}</p>
                  </div>

                  {result.isTimeout && (
                    <div className="bg-yellow-50 rounded p-4 border border-yellow-300">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">⏱️ TIMEOUT ({'>'}10 seconds)</p>
                      <p className="text-sm text-gray-700 mb-2">Possible causes:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• <strong>Cold start:</strong> First request takes 10-30s. Wait and try again.</li>
                        <li>• <strong>Not deployed:</strong> Edge function doesn't exist in Supabase.</li>
                        <li>• <strong>Paused project:</strong> Supabase project is inactive.</li>
                      </ul>
                      <div className="mt-3 pt-3 border-t border-yellow-200">
                        <p className="text-sm font-semibold text-yellow-800">🎯 Solution:</p>
                        <ol className="text-sm text-gray-700 space-y-1 mt-1">
                          <li>1. Wait 30 seconds and click "Ping Health" again</li>
                          <li>2. If still fails: Check Supabase Dashboard → Edge Functions</li>
                          <li>3. Deploy or redeploy the function</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {result.isNetworkError && (
                    <div className="bg-orange-50 rounded p-4 border border-orange-300">
                      <p className="text-sm font-semibold text-orange-800 mb-2">🌐 NETWORK ERROR</p>
                      <p className="text-sm text-gray-700 mb-2">Cannot reach the edge function at all.</p>
                      <p className="text-sm font-semibold text-orange-700 mb-1">🎯 Solutions:</p>
                      <ol className="text-sm text-gray-700 space-y-1">
                        <li>1. Check Supabase Dashboard: <a href="https://app.supabase.com/project/xgqtycssifmpfbxmqzri" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open Dashboard</a></li>
                        <li>2. Verify project is ACTIVE (not paused)</li>
                        <li>3. Check Edge Functions tab - is function deployed?</li>
                        <li>4. If not deployed: Deploy from `/supabase/functions/server/`</li>
                      </ol>
                    </div>
                  )}

                  {result.status && (
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-600 mb-1">HTTP Status:</p>
                      <p className="text-lg font-mono text-gray-900">
                        {result.status} {result.statusText || ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-300">
            <details>
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                📋 View Full Response
              </summary>
              <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {!result && !testing && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Click "Ping Health" to check if edge function is deployed</p>
          <p className="text-xs mt-1">This tests /health endpoint (no database query)</p>
        </div>
      )}
    </div>
  );
}