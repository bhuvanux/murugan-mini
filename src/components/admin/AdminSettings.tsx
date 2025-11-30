import React, { useState } from "react";
import {
  Settings,
  Users,
  Database,
  Key,
  Zap,
  Brain,
  Server,
  Upload,
  Shield,
  Save,
} from "lucide-react";

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<
    | "general"
    | "admins"
    | "storage"
    | "api"
    | "optimization"
    | "ai"
    | "cdn"
    | "upload"
    | "security"
  >("general");

  const sections = [
    { id: "general" as const, label: "General", icon: Settings },
    { id: "admins" as const, label: "Admin Accounts", icon: Users },
    { id: "storage" as const, label: "Storage", icon: Database },
    { id: "api" as const, label: "API Keys", icon: Key },
    { id: "optimization" as const, label: "Image Optimization", icon: Zap },
    { id: "ai" as const, label: "AI Engine", icon: Brain },
    { id: "cdn" as const, label: "CDN", icon: Server },
    { id: "upload" as const, label: "Upload Config", icon: Upload },
    { id: "security" as const, label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-gray-800"
          style={{ fontFamily: "var(--font-english)" }}
        >
          Settings
        </h2>
        <p className="text-gray-500 mt-1">Configure admin panel and app settings</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Settings Menu */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeSection === section.id
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeSection === "general" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">General App Settings</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  defaultValue="Tamil Kadavul Murugan"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  defaultValue="admin@murugan.app"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  defaultValue="support@murugan.app"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Enable maintenance mode</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Allow user registrations</span>
                </label>
              </div>

              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeSection === "admins" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Admin Accounts</h3>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
                  Add Admin
                </button>
              </div>

              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-800">Admin User</td>
                    <td className="px-4 py-3 text-sm text-gray-600">admin@murugan.app</td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
                        Super Admin
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "storage" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">Storage Configuration</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Provider
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600">
                  <option>Supabase Storage</option>
                  <option>AWS S3</option>
                  <option>Google Cloud Storage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  defaultValue="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Auto-delete unused files after 90 days</span>
                </label>
              </div>

              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeSection === "api" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">API Keys</h3>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Keep your API keys secure. Never share them publicly.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supabase URL
                </label>
                <input
                  type="text"
                  defaultValue="https://your-project.supabase.co"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 font-mono text-sm"
                />
              </div>

              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeSection === "optimization" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">Image Optimization Rules</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Image Width (px)
                </label>
                <input
                  type="number"
                  defaultValue="2048"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality (%)
                </label>
                <input
                  type="number"
                  defaultValue="80"
                  min="1"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Generate WebP format</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Generate AVIF format</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Strip EXIF metadata</span>
                </label>
              </div>

              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeSection === "ai" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">AI Engine Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Provider
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600">
                  <option>OpenAI GPT-4</option>
                  <option>Google Gemini</option>
                  <option>Anthropic Claude</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (0-1)
                </label>
                <input
                  type="number"
                  defaultValue="0.7"
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  defaultValue="500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">Security & Rate Limits</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Rate Limit (requests/minute)
                </label>
                <input
                  type="number"
                  defaultValue="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  defaultValue="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Enable 2FA for admins</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm text-gray-700">Log all admin actions</span>
                </label>
              </div>

              <button className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}