import { useMemo, useState } from "react";

import { AdminAnalytics } from "./AdminAnalytics";
import { AdminAnalyticsCenter } from "./AdminAnalyticsCenter";
import AdminAnalyticsUnified from "./AdminAnalyticsUnified";
import { AdminAnalyticsOverview } from "./AdminAnalyticsOverview";
import { AdminAnalyticsProduct } from "./AdminAnalyticsProduct";
import { AdminAnalyticsContent } from "./AdminAnalyticsContent";
import { AdminAnalyticsGrowth } from "./AdminAnalyticsGrowth";
import { AnalyticsSetupGuide } from "./AnalyticsSetupGuide";
import { AnalyticsTestingDashboard } from "./AnalyticsTestingDashboard";
import AnalyticsTestSuite from "./AnalyticsTestSuite";
import AnalyticsInstallationGuide from "./AnalyticsInstallationGuide";
import { TrackingSystemDashboard } from "./TrackingSystemDashboard";
import { AdminGuganAnalytics } from "./AdminGuganAnalytics";
import { AdminExperiments } from "./AdminExperiments.tsx";
import { AdminDgMediaHub } from "./divine-guard/media/AdminDgMediaHub";
import { AdminDgControlPlane } from "./divine-guard/control/AdminDgControlPlane";

type AnalyticsTab =
  | "overview"
  | "product"
  | "content"
  | "growth"
  | "advanced";

export function AdminAnalyticsHub() {
  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview" },
      { id: "product" as const, label: "Product" },
      { id: "content" as const, label: "Content" },
      { id: "growth" as const, label: "Growth" },
      { id: "advanced" as const, label: "Advanced" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  const render = () => {
    switch (activeTab) {
      case "overview":
        return <AdminAnalyticsOverview />;
      case "product":
        return <AdminAnalyticsProduct />;
      case "content":
        return <AdminAnalyticsContent />;
      case "growth":
        return <AdminAnalyticsGrowth />;
      case "advanced":
        return (
          <div className="space-y-6">
            <AdminAnalytics title="Raw Explorer" subtitle="Universal event stream" defaultTab="events" allowedTabs={["events"]} />
            <AdminAnalytics title="Session Timeline" subtitle="Universal sessions" defaultTab="sessions" allowedTabs={["sessions"]} />
            <AdminExperiments />
            <AdminGuganAnalytics />
            <AdminAnalyticsCenter />
            <AdminAnalyticsUnified />
            <TrackingSystemDashboard />
            <AnalyticsSetupGuide />
            <AnalyticsInstallationGuide />
            <AnalyticsTestingDashboard />
            <AnalyticsTestSuite />
            <AdminDgMediaHub />
            <AdminDgControlPlane />
          </div>
        );
      default:
        return <AdminAnalyticsOverview />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "var(--font-english)" }}>
          Analytics
        </h2>
        <p className="text-gray-500 mt-1">Monitor and manage analytics</p>
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
