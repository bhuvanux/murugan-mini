import React from "react";
import { Database, HardDrive, Zap, Archive, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function AdminStorageMonitor() {
  const storageData = [
    { name: "Wallpapers Originals", size: 2.4, color: "#3b82f6" },
    { name: "Wallpapers Optimized", size: 1.1, color: "#60a5fa" },
    { name: "Wallpapers Thumbnails", size: 0.3, color: "#93c5fd" },
    { name: "Media Audio", size: 1.8, color: "#a855f7" },
    { name: "Media Thumbnails", size: 0.2, color: "#c084fc" },
    { name: "Sparkle Covers", size: 0.6, color: "#eab308" },
    { name: "Photos", size: 1.2, color: "#ec4899" },
    { name: "Banners", size: 0.4, color: "#14b8a6" },
  ];

  const total = storageData.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Storage Monitor</h2>
        <p className="text-gray-500 mt-1">Track storage usage and optimization opportunities</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total.toFixed(1)} GB</p>
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
              <p className="text-2xl font-bold">3.8 GB</p>
              <p className="text-sm text-gray-500">Optimized</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">1.2 GB</p>
              <p className="text-sm text-gray-500">Can Optimize</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">92.0 GB</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Storage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={storageData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="size"
              >
                {storageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Storage Breakdown</h3>
          <div className="space-y-3">
            {storageData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {item.size.toFixed(2)} GB
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">Optimization Suggestions</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Compress Old Images</p>
              <p className="text-sm text-blue-700 mt-1">
                234 images uploaded before auto-optimization can be compressed to save ~0.8 GB
              </p>
              <button className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                Start Compression
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Archive className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Archive Unused Files</p>
              <p className="text-sm text-yellow-700 mt-1">
                89 files haven't been accessed in 90+ days and can be moved to cold storage
              </p>
              <button className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">
                Review Files
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Generate Missing AVIF</p>
              <p className="text-sm text-green-700 mt-1">
                156 wallpapers don't have AVIF format. Generate for better compression (~0.4 GB saved)
              </p>
              <button className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                Generate AVIF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
