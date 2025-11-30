import React, { useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * BACKEND DIAGNOSTICS TOOL
 * Checks if admin backend is working and identifies issues
 */
export function BackendDiagnostics() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    // 1. Check if backend is reachable
    try {
      console.log('[Diagnostics] Testing backend reachability...');
      const startTime = Date.now();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/wallpapers/list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`, // ✅ Use correct anon key
          },
          body: JSON.stringify({ page: 1, limit: 5 }),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        }
      );

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      diagnostics.checks.push({
        name: 'Backend Reachable',
        status: response.ok ? 'pass' : 'fail',
        details: `Response time: ${responseTime}ms, Status: ${response.status}`,
        data: data
      });

      // 2. Check if wallpapers table exists
      if (data.error) {
        diagnostics.checks.push({
          name: 'Wallpapers Table',
          status: 'fail',
          details: `Database error: ${data.error}`,
          solution: 'The wallpapers table does not exist. Create it in Supabase dashboard.'
        });
      } else if (data.success && Array.isArray(data.data)) {
        diagnostics.checks.push({
          name: 'Wallpapers Table',
          status: 'pass',
          details: `Found ${data.data.length} wallpapers (Total: ${data.pagination?.total || 0})`,
          data: data.data
        });
      }

      // 3. Check response time
      if (responseTime > 10000) {
        diagnostics.checks.push({
          name: 'Response Time',
          status: 'warning',
          details: `Slow response: ${responseTime}ms (Cold start issue)`,
          solution: 'Edge function is cold starting. Retry or increase timeout.'
        });
      } else if (responseTime > 3000) {
        diagnostics.checks.push({
          name: 'Response Time',
          status: 'warning',
          details: `Moderate response: ${responseTime}ms`,
          solution: 'Consider optimizing queries or database indexes.'
        });
      } else {
        diagnostics.checks.push({
          name: 'Response Time',
          status: 'pass',
          details: `Fast response: ${responseTime}ms`
        });
      }

    } catch (error: any) {
      console.error('[Diagnostics] Backend error:', error);
      
      if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        diagnostics.checks.push({
          name: 'Backend Reachable',
          status: 'fail',
          details: 'Request timeout after 30 seconds',
          solution: 'Edge function is not responding. Check Supabase logs or redeploy.'
        });
      } else if (error.message?.includes('Failed to fetch')) {
        diagnostics.checks.push({
          name: 'Backend Reachable',
          status: 'fail',
          details: 'Network error - cannot reach backend',
          solution: 'Check if Supabase project is active and edge function is deployed.'
        });
      } else {
        diagnostics.checks.push({
          name: 'Backend Reachable',
          status: 'fail',
          details: error.message,
          solution: 'Unknown error. Check browser console for details.'
        });
      }
    }

    setResults(diagnostics);
    setIsChecking(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-500';
      case 'warning':
        return 'bg-yellow-50 border-yellow-500';
      case 'fail':
        return 'bg-red-50 border-red-500';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  return (
    <div className="bg-blue-50 border-4 border-blue-500 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-blue-900 text-lg">Backend Diagnostics</h3>
            <p className="text-sm text-gray-600">Check why backend is timing out</p>
          </div>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isChecking}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Run Diagnostics
            </>
          )}
        </button>
      </div>

      {isChecking && (
        <div className="bg-white rounded-lg p-8 text-center border-2 border-blue-200">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Testing backend connection...</p>
          <p className="text-sm text-gray-500 mt-1">This may take up to 30 seconds</p>
        </div>
      )}

      {results && !isChecking && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Test Run:</strong> {new Date(results.timestamp).toLocaleString()}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {results.checks.filter((c: any) => c.status === 'pass').length} Passed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">
                  {results.checks.filter((c: any) => c.status === 'warning').length} Warnings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-700">
                  {results.checks.filter((c: any) => c.status === 'fail').length} Failed
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          {results.checks.map((check: any, idx: number) => (
            <div
              key={idx}
              className={`rounded-lg p-4 border-2 ${getStatusColor(check.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{check.name}</h4>
                  <p className="text-sm text-gray-700 mt-1">{check.details}</p>
                  
                  {check.solution && (
                    <div className="mt-2 bg-white rounded p-2 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">💡 Solution:</p>
                      <p className="text-xs text-gray-700">{check.solution}</p>
                    </div>
                  )}

                  {check.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View raw data
                      </summary>
                      <pre className="mt-2 bg-gray-900 text-green-400 p-2 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(check.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Common Solutions */}
          <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
            <h4 className="font-semibold text-gray-900 mb-2">🔧 Common Solutions:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>
                  <strong>Timeout errors:</strong> Edge function is cold starting. Wait 30s and retry, or redeploy the function.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>
                  <strong>Table not found:</strong> Create the <code className="bg-gray-100 px-1 rounded">wallpapers</code> table in Supabase dashboard.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>
                  <strong>Network error:</strong> Check if Supabase project is active and accessible.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">4.</span>
                <span>
                  <strong>Slow response:</strong> First request after deploy is slow. Subsequent requests will be faster.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {!results && !isChecking && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "Run Diagnostics" to check backend health</p>
        </div>
      )}
    </div>
  );
}