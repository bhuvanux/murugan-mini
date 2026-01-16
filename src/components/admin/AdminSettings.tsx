import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  ShieldCheck,
  Cloud,
} from "lucide-react";
import { MediaOptimizationSettings } from "./MediaOptimizationSettings";
import { AnalyticsEventManager } from "./AnalyticsEventManager";

const inputClasses =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-[#0d5e38] focus:ring-2 focus:ring-[#0d5e38]/20 transition";

const toggleClasses =
  "flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition hover:border-[#0d5e38]";

const buttonClasses =
  "inline-flex items-center gap-2 rounded-lg bg-[#0d5e38] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a2b]";

interface SettingsSectionMeta {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
}

type SettingsSection =
  | "general"
  | "admins"
  | "storage"
  | "api"
  | "optimization"
  | "ai"
  | "cdn"
  | "upload"
  | "security"
  | "eventmanager";

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const sections: SettingsSectionMeta[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "admins", label: "Admin Accounts", icon: Users },
    { id: "storage", label: "Storage", icon: Database },
    { id: "api", label: "API Keys", icon: Key },
    { id: "optimization", label: "Optimization", icon: Zap },
    { id: "ai", label: "AI Engine", icon: Brain },
    { id: "cdn", label: "CDN", icon: Server },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "security", label: "Security", icon: Shield },
    { id: "eventmanager", label: "Event Manager", icon: ShieldCheck },
  ];

  const renderGeneral = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
        <p className="mt-1 text-sm text-gray-600">Configure basic app settings and preferences</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">App Name</label>
          <input type="text" defaultValue="Tamil Kadavul Murugan" className={inputClasses} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Primary Email</label>
          <input type="email" defaultValue="admin@murugan.app" className={inputClasses} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Support Email</label>
          <input type="email" defaultValue="support@murugan.app" className={inputClasses} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Timezone</label>
          <select className={inputClasses}>
            <option value="asia-chennai">Asia/Chennai</option>
            <option value="asia-kolkata">Asia/Kolkata</option>
            <option value="asia-singapore">Asia/Singapore</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Enable maintenance mode</span>
        </label>
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Allow user registrations</span>
        </label>
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Send release notes</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button className={buttonClasses}>
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderAdmins = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Admin Accounts</h3>
        <p className="mt-1 text-sm text-gray-600">Manage admin access and permissions</p>
      </div>
      <div className="space-y-3">
        {[{ name: "Super Admin", email: "admin@murugan.app", role: "Owner" }].map((admin) => (
          <div
            key={admin.email}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
          >
            <div>
              <p className="font-semibold text-gray-900">{admin.name}</p>
              <p className="text-xs text-gray-500">{admin.role}</p>
              <p className="text-xs text-gray-500">{admin.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Edit</button>
              <button className="text-sm font-medium text-red-600 hover:text-red-700">Revoke</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button className={buttonClasses}>Add Admin</button>
      </div>
    </div>
  );

  const renderStorage = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Storage Configuration</h3>
        <p className="mt-1 text-sm text-gray-600">Manage storage providers and limits</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Storage Provider</label>
          <select className={inputClasses}>
            <option>Supabase Storage</option>
            <option>AWS S3</option>
            <option>Google Cloud Storage</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Max File Size (MB)</label>
            <input type="number" defaultValue="50" className={inputClasses} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Retention Period</label>
            <input type="text" defaultValue="90 days" className={inputClasses} />
          </div>
        </div>
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Auto-purge unused uploads after 90 days</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button className={buttonClasses}>
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderApi = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
        <p className="mt-1 text-sm text-gray-600">Manage Supabase API credentials</p>
      </div>
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
        ⚠️ Keep your API keys secure. Never share them publicly.
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Supabase URL</label>
          <input type="text" defaultValue="https://your-project.supabase.co" className={`${inputClasses} font-mono text-xs`} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Supabase Anon Key</label>
          <input type="password" defaultValue="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." className={`${inputClasses} font-mono text-xs`} />
        </div>
      </div>
      <div className="flex justify-end">
        <button className={buttonClasses}>
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderAi = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">AI Engine</h3>
        <p className="mt-1 text-sm text-gray-600">Configure LLM settings</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Provider</label>
          <select className={inputClasses}>
            <option>OpenAI GPT-4</option>
            <option>Google Gemini</option>
            <option>Anthropic Claude</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Temperature</label>
          <input type="number" defaultValue="0.7" min="0" max="1" step="0.1" className={inputClasses} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">API Key</label>
          <input type="password" placeholder="sk-..." className={`${inputClasses} font-mono text-xs`} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Max Tokens</label>
          <input type="number" defaultValue="500" className={inputClasses} />
        </div>
      </div>
      <div className="flex justify-end">
        <button className={buttonClasses}>
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Security & Rate Limits</h3>
        <p className="mt-1 text-sm text-gray-600">Configure security settings</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">API Rate Limit</label>
          <input type="number" defaultValue="100" className={inputClasses} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Max Login Attempts</label>
          <input type="number" defaultValue="5" className={inputClasses} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Enable 2FA for admins</span>
        </label>
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Log admin actions</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button className={buttonClasses}>
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderCdn = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">CDN Configuration</h3>
        <p className="mt-1 text-sm text-gray-600">Manage edge caching and CDN</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">CDN Provider</label>
          <select className={inputClasses}>
            <option>Cloudflare</option>
            <option>AWS CloudFront</option>
            <option>Fastly</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Cache TTL</label>
          <input type="text" defaultValue="4 hours" className={inputClasses} />
        </div>
        <button className={buttonClasses}>
          <Cloud className="w-4 h-4" />
          Purge Cache
        </button>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Upload Configuration</h3>
        <p className="mt-1 text-sm text-gray-600">Control file upload settings</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Max Upload Size (MB)</label>
          <input type="number" defaultValue="50" className={inputClasses} />
        </div>
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Enable virus scan</span>
        </label>
        <label className={toggleClasses}>
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0d5e38]" />
          <span>Auto-optimize images</span>
        </label>
      </div>
    </div>
  );

  const renderOptimization = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Media Optimization</h3>
        <p className="mt-1 text-sm text-gray-600">View storage savings and compression insights</p>
      </div>
      <MediaOptimizationSettings />
    </div>
  );

  const renderEventManager = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Analytics Event Manager</h3>
        <p className="mt-1 text-sm text-gray-600">Monitor and debug analytics tracking system</p>
      </div>
      <AnalyticsEventManager />
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return renderGeneral();
      case "admins":
        return renderAdmins();
      case "storage":
        return renderStorage();
      case "api":
        return renderApi();
      case "optimization":
        return renderOptimization();
      case "ai":
        return renderAi();
      case "cdn":
        return renderCdn();
      case "upload":
        return renderUpload();
      case "security":
        return renderSecurity();
      case "eventmanager":
        return renderEventManager();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage your application settings and configurations
        </p>
      </div>

      {/* Horizontal Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto px-1" aria-label="Tabs">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`group inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-4 text-sm font-medium transition ${isActive
                    ? "border-[#0d5e38] text-[#0d5e38]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-[#0d5e38]" : "text-gray-400 group-hover:text-gray-500"
                    }`}
                />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {renderSection()}
      </div>
    </div>
  );
}