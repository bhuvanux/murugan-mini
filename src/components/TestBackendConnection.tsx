import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * SIMPLE BACKEND CONNECTION TEST
 * Tests if we can reach the admin backend from the user app
 */
export function TestBackendConnection() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setResult(null);

    const url = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/wallpapers/list`;

    console.log('🧪 Testing connection to:', url);

    try {
      const startTime = Date.now();
      
      // ✅ IMPORTANT: Send correct Authorization header with correct anon key
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`, // Use correct key from info.tsx
        },
        body: JSON.stringify({
          page: 1,
          limit: 5
        }),
        signal: AbortSignal.timeout(30000)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log('✅ Response received:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Response data:', data);

      setResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        data,
        error: response.ok ? null : data.error || 'Unknown error'
      });

    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      
      setResult({
        success: false,
        error: error.message || 'Connection failed',
        isTimeout: error.name === 'TimeoutError',
        isNetworkError: error.message?.includes('Failed to fetch')
      });
    }

    setIsTesting(false);
  };

  return (
    <div className="bg-purple-50 border-4 border-purple-500 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-bold text-purple-900 text-lg">Test Backend Connection</h3>
            <p className="text-sm text-gray-600">Direct test of user → admin backend</p>
          </div>
        </div>
        <button
          onClick={testConnection}
          disabled={isTesting}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Test Now
            </>
          )}
        </button>
      </div>

      {isTesting && (
        <div className="bg-white rounded-lg p-8 text-center border-2 border-purple-200">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Testing connection...</p>
          <p className="text-sm text-gray-500 mt-1">Maximum wait: 30 seconds</p>
        </div>
      )}

      {result && !isTesting && (
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
                {result.success ? '✅ Connection Successful!' : '❌ Connection Failed'}
              </h4>

              {result.success ? (
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Response Time:</p>
                    <p className="text-2xl font-bold text-green-600">{result.responseTime}ms</p>
                  </div>

                  <div className="bg-white rounded p-3 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Wallpapers Found:</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {result.data?.data?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total: {result.data?.pagination?.total || 0}
                    </p>
                  </div>

                  {result.data?.data && result.data.data.length > 0 && (
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Sample Wallpaper:</p>
                      <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(result.data.data[0], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border border-red-200">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Error:</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>

                  {result.isTimeout && (
                    <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-700">⏱️ Timeout Issue</p>
                      <p className="text-xs text-gray-700 mt-1">
                        The backend took longer than 30 seconds. This usually means cold start or slow database.
                      </p>
                    </div>
                  )}

                  {result.isNetworkError && (
                    <div className="bg-orange-50 rounded p-3 border border-orange-200">
                      <p className="text-sm font-semibold text-orange-700">🌐 Network Error</p>
                      <p className="text-xs text-gray-700 mt-1">
                        Cannot reach the backend. Check if Supabase project is active.
                      </p>
                    </div>
                  )}

                  {result.status && (
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-600 mb-1">HTTP Status:</p>
                      <p className="text-lg font-mono text-gray-900">
                        {result.status} {result.statusText}
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
              <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {!result && !isTesting && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "Test Now" to check if user app can reach admin backend</p>
        </div>
      )}
    </div>
  );
}