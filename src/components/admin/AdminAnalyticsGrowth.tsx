export function AdminAnalyticsGrowth() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Installs</h3>
        <p className="text-sm text-gray-500 mt-1">Daily installs and weekly installs (privacy-first)</p>
        {/* TODO: Derive installs from first_open events once first_open is emitted and aggregated server-side. */}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Active Users</h3>
        <p className="text-sm text-gray-500 mt-1">DAU / WAU and time-of-day usage</p>
        {/* TODO: Add time-of-day usage using analytics_sessions.started_at distribution. */}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Push Notifications</h3>
        <p className="text-sm text-gray-500 mt-1">Open rate and festival effectiveness</p>
        {/* TODO: Wire push_sent and push_opened events once they exist. */}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">In-App Messages</h3>
        <p className="text-sm text-gray-500 mt-1">CTR and dismiss rate</p>
        {/* TODO: Define and wire in-app message events without adding PII or fingerprinting. */}
      </div>
    </div>
  );
}
