import { useMemo, useState } from "react";

import { AdminSettings } from "./AdminSettings";
import { AdminSubscriptions } from "./AdminSubscriptions";
import { AdminStorageMonitor } from "./AdminStorageMonitor";

type SettingsTab = "settings" | "subscriptions" | "storage";

export function AdminSettingsHub() {
  const tabs = useMemo(
    () => [
      { id: "settings" as const, label: "Settings" },
      { id: "subscriptions" as const, label: "Subscriptions" },
      { id: "storage" as const, label: "Storage" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");

  const render = () => {
    switch (activeTab) {
      case "settings":
        return <AdminSettings />;
      case "subscriptions":
        return <AdminSubscriptions />;
      case "storage":
        return <AdminStorageMonitor />;
      default:
        return <AdminSettings />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "var(--font-english)" }}>
          Settings
        </h2>
        <p className="text-gray-500 mt-1">Configure admin panel and app settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? "bg-green-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {render()}
    </div>
  );
}
