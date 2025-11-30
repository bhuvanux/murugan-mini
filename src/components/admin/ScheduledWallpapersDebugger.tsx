import React, { useState } from 'react';
import { AlertCircle, Database, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface WallpaperDebugInfo {
  id: string;
  title: string;
  publish_status: string;
  scheduled_at?: string;
  created_at: string;
  kvData?: any;
  hasKvData: boolean;
  isValidScheduled: boolean;
  shouldShowInScheduledTab: boolean;
  issues: string[];
}

export function ScheduledWallpapersDebugger() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<WallpaperDebugInfo[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    scheduledStatus: number;
    withKvData: number;
    withoutKvData: number;
    validScheduled: number;
    brokenScheduled: number;
  } | null>(null);

  const runDiagnostic = async () => {
    setIsChecking(true);
    try {
      // Step 1: Fetch all wallpapers from API
      console.log('[Debugger] Fetching wallpapers from API...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/api/wallpapers`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch wallpapers');
      }

      const wallpapers = result.data || [];
      console.log('[Debugger] Total wallpapers:', wallpapers.length);

      // Step 2: Analyze each wallpaper
      const debugInfo: WallpaperDebugInfo[] = [];
      let scheduledStatusCount = 0;
      let withKvCount = 0;
      let withoutKvCount = 0;
      let validCount = 0;
      let brokenCount = 0;

      for (const wallpaper of wallpapers) {
        const issues: string[] = [];
        const isScheduledStatus = wallpaper.publish_status === 'scheduled';
        const hasScheduledAt = !!wallpaper.scheduled_at;
        const isValidDate = wallpaper.scheduled_at ? !isNaN(new Date(wallpaper.scheduled_at).getTime()) : false;
        
        if (isScheduledStatus) {
          scheduledStatusCount++;
        }

        // Check for issues
        if (isScheduledStatus && !hasScheduledAt) {
          issues.push('❌ Has publish_status=scheduled but NO scheduled_at date');
          brokenCount++;
        }
        
        if (isScheduledStatus && hasScheduledAt && !isValidDate) {
          issues.push('❌ Has scheduled_at but date is INVALID');
          brokenCount++;
        }
        
        if (hasScheduledAt && !isScheduledStatus) {
          issues.push('⚠️ Has scheduled_at but publish_status is not "scheduled"');
        }

        if (hasScheduledAt) {
          withKvCount++;
        }

        const isValid = isScheduledStatus && hasScheduledAt && isValidDate;
        if (isValid) {
          validCount++;
        }

        const shouldShow = isScheduledStatus && hasScheduledAt;

        debugInfo.push({
          id: wallpaper.id,
          title: wallpaper.title,
          publish_status: wallpaper.publish_status,
          scheduled_at: wallpaper.scheduled_at,
          created_at: wallpaper.created_at,
          hasKvData: hasScheduledAt,
          isValidScheduled: isValid,
          shouldShowInScheduledTab: shouldShow,
          issues,
        });
      }

      setResults(debugInfo);
      setSummary({
        total: wallpapers.length,
        scheduledStatus: scheduledStatusCount,
        withKvData: withKvCount,
        withoutKvData: scheduledStatusCount - withKvCount,
        validScheduled: validCount,
        brokenScheduled: brokenCount,
      });

      console.log('[Debugger] Analysis complete:', {
        total: wallpapers.length,
        scheduledStatus: scheduledStatusCount,
        withKvData: withKvCount,
        withoutKvData: scheduledStatusCount - withKvCount,
        validScheduled: validCount,
        brokenScheduled: brokenCount,
      });

    } catch (error: any) {
      console.error('[Debugger] Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const scheduledWallpapers = results.filter(w => w.publish_status === 'scheduled');
  const validScheduled = scheduledWallpapers.filter(w => w.isValidScheduled);
  const brokenScheduled = scheduledWallpapers.filter(w => !w.isValidScheduled);

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Search className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-inter-semibold-18 text-blue-800">Scheduled Wallpapers Debugger</h3>
          <p className="text-sm text-blue-700 mt-1">
            This tool checks all wallpapers in your database and identifies why scheduled wallpapers might not be appearing in the Scheduled tab.
          </p>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={isChecking}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Database className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Run Diagnostic'}
        </button>
      </div>

      {summary && (
        <div className="bg-white rounded-lg p-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Total Wallpapers</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-600">Marked as Scheduled</p>
              <p className="text-2xl font-bold text-blue-900">{summary.scheduledStatus}</p>
              <p className="text-xs text-blue-600 mt-1">publish_status = "scheduled"</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-600">Valid Scheduled</p>
              <p className="text-2xl font-bold text-green-900">{summary.validScheduled}</p>
              <p className="text-xs text-green-600 mt-1">Will show in Scheduled tab</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-sm text-orange-600">⚠️ Broken Scheduled</p>
              <p className="text-2xl font-bold text-orange-900">{summary.brokenScheduled}</p>
              <p className="text-xs text-orange-600 mt-1">Scheduled status but no date</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-purple-600">With Schedule Data</p>
              <p className="text-2xl font-bold text-purple-900">{summary.withKvData}</p>
              <p className="text-xs text-purple-600 mt-1">Has scheduled_at field</p>
            </div>
          </div>

          {/* Results Table */}
          {scheduledWallpapers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-inter-semibold-16 text-gray-800 mb-3">
                🔍 Wallpapers with publish_status = "scheduled"
              </h4>
              
              {/* Valid Scheduled */}
              {validScheduled.length > 0 && (
                <div className="mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                    <h5 className="text-inter-semibold-14 text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      ✅ Valid Scheduled Wallpapers ({validScheduled.length})
                    </h5>
                    <p className="text-xs text-green-700 mt-1">These should appear in the Scheduled tab</p>
                  </div>
                  <div className="space-y-2">
                    {validScheduled.map((wallpaper) => (
                      <div key={wallpaper.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{wallpaper.title}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              ID: <code className="bg-white px-1 rounded">{wallpaper.id}</code>
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-green-700">
                                ✅ Status: {wallpaper.publish_status}
                              </span>
                              <span className="text-green-700">
                                🕐 Scheduled: {wallpaper.scheduled_at ? new Date(wallpaper.scheduled_at).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Broken Scheduled */}
              {brokenScheduled.length > 0 && (
                <div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                    <h5 className="text-inter-semibold-14 text-orange-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      ⚠️ Broken Scheduled Wallpapers ({brokenScheduled.length})
                    </h5>
                    <p className="text-xs text-orange-700 mt-1">These have issues and won't appear in Scheduled tab</p>
                  </div>
                  <div className="space-y-2">
                    {brokenScheduled.map((wallpaper) => (
                      <div key={wallpaper.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{wallpaper.title}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              ID: <code className="bg-white px-1 rounded">{wallpaper.id}</code>
                            </p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                {wallpaper.scheduled_at ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span className={wallpaper.scheduled_at ? 'text-green-700' : 'text-red-700'}>
                                  scheduled_at: {wallpaper.scheduled_at || 'MISSING ❌'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-orange-700">
                                  publish_status: {wallpaper.publish_status}
                                </span>
                              </div>
                            </div>
                            {wallpaper.issues.length > 0 && (
                              <div className="mt-2 bg-white rounded p-2">
                                {wallpaper.issues.map((issue, idx) => (
                                  <p key={idx} className="text-xs text-orange-800">{issue}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {scheduledWallpapers.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-inter-semibold-16">No wallpapers with publish_status = "scheduled" found</p>
              <p className="text-sm text-gray-500 mt-2">
                When you upload a wallpaper and select "Scheduled" status with a date, it will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
