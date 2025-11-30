import React, { useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import * as adminAPI from '../../utils/adminAPI';

/**
 * DATABASE CHECKER - Shows exactly what's in the banners table
 * This will help identify why you're seeing 12 banners instead of 2
 */
export function BannerDatabaseChecker() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDatabase = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[DB Checker] Fetching ALL banners from database...');
      const result = await adminAPI.getBanners();
      console.log('[DB Checker] Result:', result);
      
      const allBanners = result.data || [];
      setBanners(allBanners);
      
      console.log(`[DB Checker] ✅ Found ${allBanners.length} total banners`);
      console.log('[DB Checker] Published count:', allBanners.filter((b: any) => b.publish_status === 'published').length);
      console.log('[DB Checker] Public count:', allBanners.filter((b: any) => b.visibility === 'public').length);
    } catch (err: any) {
      console.error('[DB Checker] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const publishedPublic = banners.filter(
    b => b.publish_status === 'published' && b.visibility === 'public'
  );

  return (
    <div className="bg-blue-50 border-4 border-blue-500 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-blue-900 text-lg">Banner Database Checker</h3>
            <p className="text-sm text-gray-600">Check what's actually in the banners table</p>
          </div>
        </div>
        <button
          onClick={checkDatabase}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

      {banners.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-gray-600 text-sm">Total Banners</p>
              <p className="text-3xl font-bold text-gray-900">{banners.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
              <p className="text-gray-600 text-sm">Published + Public</p>
              <p className="text-3xl font-bold text-green-700">{publishedPublic.length}</p>
              <p className="text-xs text-green-600 mt-1">These appear in user app</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-500">
              <p className="text-gray-600 text-sm">Draft / Private</p>
              <p className="text-3xl font-bold text-yellow-700">{banners.length - publishedPublic.length}</p>
            </div>
          </div>

          {/* Banner List */}
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
                {banners.map((banner, idx) => {
                  const isLive = banner.publish_status === 'published' && banner.visibility === 'public';
                  return (
                    <tr key={banner.id} className={`border-b ${isLive ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3 font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{banner.title}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{banner.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          banner.publish_status === 'published' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {banner.publish_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          banner.visibility === 'public' ? 'bg-blue-200 text-blue-800' : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {banner.visibility}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{banner.view_count || 0}</td>
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

          {/* Instructions */}
          <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
            <p className="font-semibold text-yellow-900 mb-2">📋 What to do next:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>The <strong className="text-green-700">{publishedPublic.length} green rows</strong> are showing in the user app carousel</li>
              <li>If you only want 2 banners, <strong>delete or unpublish</strong> the extras in the Banners section</li>
              <li>To hide a banner: Change <code className="bg-white px-1 rounded">publish_status</code> to "draft" OR <code className="bg-white px-1 rounded">visibility</code> to "private"</li>
              <li>After making changes, refresh the user app to see updates</li>
            </ol>
          </div>
        </div>
      )}

      {!loading && banners.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "Check Database" to see what's in the banners table</p>
        </div>
      )}
    </div>
  );
}
