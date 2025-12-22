import { AdminAnalytics } from "./AdminAnalytics";

export function AdminAnalyticsProduct() {
  return (
    <div className="space-y-6">
      <AdminAnalytics
        title="Product"
        subtitle="Behavior analytics"
        defaultTab="features"
        allowedTabs={["features"]}
      />

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">User Flow</h3>
        <p className="text-sm text-gray-500 mt-1">Dashboard → Feature → Exit</p>
        {/* TODO: Add a flow visualization derived from analytics_events (page_enter/feature_card_click/page_exit) without introducing new event names. */}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Retention</h3>
        <p className="text-sm text-gray-500 mt-1">D1 / D7 / D30 · Festival vs Non-festival cohorts</p>
        {/* TODO: Implement cohort retention using analytics_sessions + first_open once first_open exists and user identity strategy is confirmed for anonymous users. */}
      </div>
    </div>
  );
}
