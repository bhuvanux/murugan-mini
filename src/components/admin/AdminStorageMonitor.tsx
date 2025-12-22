import React, { useState, useEffect } from "react";
import { Database, HardDrive, Zap, Archive, AlertCircle, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getStorageStats } from "../../utils/adminAPI";
import { toast } from "sonner";

export function AdminStorageMonitor() {
  const [storageData, setStorageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await getStorageStats();
      if (result.success && result.data) {
        // Map data to chart format
        const colors: Record<string, string> = {
          'wallpapers': '#3b82f6',
          'banners': '#14b8a6',
          'media': '#a855f7',
          'photos': '#ec4899',
          'sparkle': '#eab308'
        };

        const totalBytes = result.data.reduce((acc: number, item: any) => acc + item.size, 0);
        setTotalSize(totalBytes);

        const transformed = result.data.map((item: any) => ({
          name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
          // Convert to GB for chart readability, minimum 0.01 to show slice
          size: Math.max(parseFloat((item.size / (1024 * 1024 * 1024)).toFixed(3)), 0.001),
          rawSize: item.size,
          count: item.count,
          color: colors[item.name] || '#9ca3af'
        })).filter((item: any) => item.count > 0); // Only show buckets with files

        setStorageData(transformed);
      }
    } catch (error) {
      console.error("Failed to fetch storage stats:", error);
      toast.error("Failed to load storage statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Storage Monitor</h2>
          <p className="text-gray-500 mt-1">Track storage usage and optimization opportunities</p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Refresh Stats"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-xl border">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
            <p className="text-gray-500">Calculating storage usage...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatSize(totalSize)}</p>
                  <p className="text-sm text-gray-500">Total Used</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-sm text-gray-500">Health Check</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{storageData.reduce((acc, item) => acc + item.count, 0)}</p>
                  <p className="text-sm text-gray-500">Total Files</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">~</p>
                  <p className="text-sm text-gray-500">Supabase Storage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Storage Distribution</h3>
              {storageData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storageData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="size"
                      >
                        {storageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [formatSize(props.payload.rawSize), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No storage data available
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Detailed Breakdown</h3>
              <div className="space-y-4">
                {storageData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700 block">{item.name}</span>
                        <span className="text-xs text-gray-400">{item.count} files</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatSize(item.rawSize)}
                    </span>
                  </div>
                ))}
                {storageData.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No files found in visible buckets.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Optimization Suggestions - Static for now but could be dynamic */}
      <div className="bg-white rounded-xl shadow-sm border opacity-75">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">Optimization Suggestions (Coming Soon)</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <Zap className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-600">Compress Images</p>
              <p className="text-sm text-gray-500 mt-1">
                Automated image compression analysis will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
