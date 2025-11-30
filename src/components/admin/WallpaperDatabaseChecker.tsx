import React, { useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import * as adminAPI from '../../utils/adminAPI';

/**
 * WALLPAPER DATABASE CHECKER
 * Shows exactly what's in the wallpapers table to debug the "12 photos instead of 2" issue
 */
export function WallpaperDatabaseChecker() {
  const [wallpapers, setWallpapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDatabase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[DB Checker] Fetching ALL wallpapers from database...');
      const result = await adminAPI.getWallpapers();
      console.log('[DB Checker] Result:', result);
      
      const allWallpapers = result.data || [];
      setWallpapers(allWallpapers);
      
      console.log(`[DB Checker] ✅ Found ${allWallpapers.length} total wallpapers`);
      console.log('[DB Checker] Published count:', allWallpapers.filter((w: any) => w.publish_status === 'published').length);
    } catch (err: any) {
      console.error('[DB Checker] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const publishedWallpapers = wallpapers.filter(
    w => w.publish_status === 'published' && w.visibility === 'public'
  );

  return (
    <div className="bg-purple-50 border-4 border-purple-500 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-bold text-purple-900 text-lg">Wallpaper Database Checker</h3>
            <p className="text-sm text-gray-600">Why are you seeing 12 photos instead of 2?</p>
          </div>
        </div>
        <button
          onClick={checkDatabase}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking...' : 'Check Database'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-4">
          <p className="text-red-900 font-semibold">❌ Error:</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {wallpapers.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-gray-600 text-sm">Total in Admin</p>
              <p className="text-3xl font-bold text-gray-900">{wallpapers.length}</p>
              <p className="text-xs text-gray-500 mt-1">(What admin panel shows)</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
              <p className="text-gray-600 text-sm">Published + Public</p>
              <p className="text-3xl font-bold text-green-700">{publishedWallpapers.length}</p>
              <p className="text-xs text-green-600 mt-1">Visible in user app</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-500">
              <p className="text-gray-600 text-sm">Draft / Private</p>
              <p className="text-3xl font-bold text-yellow-700">{wallpapers.length - publishedWallpapers.length}</p>
              <p className="text-xs text-yellow-600 mt-1">Hidden from users</p>
            </div>
          </div>

          {/* If there's a mismatch, show warning */}
          {wallpapers.length === 2 && publishedWallpapers.length === 12 && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
              <p className="font-semibold text-red-900 mb-2">🚨 FOUND THE ISSUE!</p>
              <p className="text-sm text-red-800">
                You have 2 wallpapers in admin, but <strong>12 in user app</strong>.
                This usually means:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-red-700">
                <li>The user app is showing <strong>demo/fallback data</strong></li>
                <li>OR there's old data in the <code className="bg-white px-1 rounded">wallpapers</code> table</li>
                <li>OR the user app is querying a different table (e.g., <code className="bg-white px-1 rounded">photos</code>)</li>
              </ul>
            </div>
          )}

          {/* Wallpaper List */}
          <div className="bg-white rounded-lg border-2 border-gray-300 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Visibility</th>
                  <th className="px-4 py-2 text-left">Views</th>
                  <th className="px-4 py-2 text-left">In User App?</th>
                </tr>
              </thead>
              <tbody>
                {wallpapers.map((wallpaper, idx) => {
                  const isLive = wallpaper.publish_status === 'published' && wallpaper.visibility === 'public';
                  return (
                    <tr key={wallpaper.id} className={`border-b ${isLive ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3 font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{wallpaper.title}</p>
                        {wallpaper.thumbnail_url && (
                          <img src={wallpaper.thumbnail_url} alt="" className="w-12 h-12 object-cover rounded mt-1" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          wallpaper.publish_status === 'published' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {wallpaper.publish_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          wallpaper.visibility === 'public' ? 'bg-blue-200 text-blue-800' : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {wallpaper.visibility}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{wallpaper.view_count || 0}</td>
                      <td className="px-4 py-3">
                        {isLive ? (
                          <span className="text-green-600 font-bold">✅ YES</span>
                        ) : (
                          <span className="text-gray-400">❌ NO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-2">💡 What to check next:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>If you see <strong>2 wallpapers here</strong> but <strong>12 in user app</strong>, the issue is in the <strong>frontend code</strong> (falling back to demo data)</li>
              <li>If you see <strong>12 wallpapers here</strong>, then delete the extras you don't want</li>
              <li>Check browser console in user app for messages like "Using demo data" or "Backend timeout"</li>
              <li>Verify the <code className="bg-white px-1 rounded">wallpapers</code> table actually exists in your Supabase database</li>
            </ol>
          </div>
        </div>
      )}

      {!loading && wallpapers.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "Check Database" to see what's in the wallpapers table</p>
        </div>
      )}
    </div>
  );
}
