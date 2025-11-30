import React from "react";
import {
  TrendingUp,
  Users,
  Image,
  Music,
  Sparkles,
  Camera,
  MessageCircle,
  Download,
  Heart,
  Share2,
  Eye,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export function AdminDashboardHome() {
  // Mock data - replace with real API calls
  const stats = [
    { label: "Total Wallpapers", value: "2,847", icon: Image, color: "bg-blue-500", trend: "+12%" },
    { label: "Total Media", value: "1,234", icon: Music, color: "bg-purple-500", trend: "+8%" },
    { label: "Total Sparkles", value: "456", icon: Sparkles, color: "bg-yellow-500", trend: "+5%" },
    { label: "Total Photos", value: "3,921", icon: Camera, color: "bg-pink-500", trend: "+15%" },
    { label: "Daily Active Users", value: "12,458", icon: Users, color: "bg-green-500", trend: "+23%" },
    { label: "Monthly Active Users", value: "45,892", icon: Users, color: "bg-indigo-500", trend: "+18%" },
    { label: "Total Gugan Chats", value: "8,765", icon: MessageCircle, color: "bg-teal-500", trend: "+34%" },
    { label: "Total Downloads", value: "34,567", icon: Download, color: "bg-orange-500", trend: "+27%" },
  ];

  const dailyActiveUsersData = [
    { date: "Mon", users: 9800 },
    { date: "Tue", users: 10200 },
    { date: "Wed", users: 11500 },
    { date: "Thu", users: 10800 },
    { date: "Fri", users: 12100 },
    { date: "Sat", users: 13200 },
    { date: "Sun", users: 12458 },
  ];

  const engagementData = [
    { module: "Wallpapers", likes: 45678, shares: 12345, downloads: 34567 },
    { module: "Media", likes: 34567, shares: 8901, downloads: 0 },
    { module: "Sparkle", likes: 23456, shares: 15678, downloads: 0 },
    { module: "Photos", likes: 56789, shares: 9876, downloads: 0 },
  ];

  const topWallpapers = [
    { id: 1, title: "Lord Murugan Blessing", views: 45678, downloads: 12345, likes: 8976 },
    { id: 2, title: "Vel Divine Power", views: 39876, downloads: 10234, likes: 7654 },
    { id: 3, title: "Palani Temple", views: 35432, downloads: 9876, likes: 6543 },
    { id: 4, title: "Peacock Murugan", views: 32109, downloads: 8765, likes: 5432 },
    { id: 5, title: "Six Abodes", views: 28765, downloads: 7654, likes: 4321 },
  ];

  const storageData = [
    { name: "Wallpapers", value: 2.4, color: "#3b82f6" },
    { name: "Media", value: 1.8, color: "#a855f7" },
    { name: "Sparkle", value: 0.6, color: "#eab308" },
    { name: "Photos", value: 1.2, color: "#ec4899" },
  ];

  const totalStorage = storageData.reduce((sum, item) => sum + item.value, 0);

  const aiResponseData = [
    { hour: "00:00", responseTime: 1.2 },
    { hour: "04:00", responseTime: 0.9 },
    { hour: "08:00", responseTime: 1.5 },
    { hour: "12:00", responseTime: 1.8 },
    { hour: "16:00", responseTime: 1.4 },
    { hour: "20:00", responseTime: 1.6 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-green-600 text-sm font-semibold bg-green-50 px-2 py-1 rounded">
                  {stat.trend}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Daily Active Users */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Active Users</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyActiveUsersData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement by Module */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Engagement by Module</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="module" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="likes" fill="#ef4444" />
              <Bar dataKey="shares" fill="#3b82f6" />
              <Bar dataKey="downloads" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Storage Usage */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Storage Usage ({totalStorage.toFixed(1)} GB)
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={storageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {storageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Response Time */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            AI Average Response Time (seconds)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={aiResponseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Wallpapers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Top Performing Wallpapers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Eye className="w-4 h-4 inline mr-1" />
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Download className="w-4 h-4 inline mr-1" />
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Heart className="w-4 h-4 inline mr-1" />
                  Likes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topWallpapers.map((wallpaper, index) => (
                <tr key={wallpaper.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : index === 2
                            ? "bg-orange-600"
                            : "bg-gray-300"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{wallpaper.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{wallpaper.views.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {wallpaper.downloads.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{wallpaper.likes.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
