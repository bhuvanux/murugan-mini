import React, { useEffect, useState } from "react";
import { Users, UserPlus, Shield, Ban, Search, Smartphone, MapPin, Calendar, ArrowUpRight, ArrowDownRight, AlertCircle, BarChart3, Clock, LayoutPanelTop, ShieldAlert, TrendingUp, X, CheckCircle2, History, ShieldCheck, UserCheck, Activity } from "lucide-react";
import { supabase } from "../../utils/supabase/client";
import { useAuthAnalytics } from "../../utils/analytics/useAnalytics";
import { format, subDays } from "date-fns";
import { UserAnalyticsDrawer } from "./UserAnalyticsDrawer";

type UserProfile = {
  id: string;
  phone: string;
  full_name: string | null;
  name: string | null;
  city: string | null;
  device: string | null;
  created_at: string;
  last_login_at: string | null;
  login_count_30d?: number;
  failed_attempts_30d?: number;
  status?: string;
};

type AuthStats = {
  total_users: number;
  active_today_2min: number;
  total_signups: number;
  total_logins: number;
  otp_success_rate: number;
  avg_otp_delivery_seconds: number;
};

type FunnelStep = {
  step_name: string;
  event_count: number;
};

type SecurityAlert = {
  alert_type: string;
  user_identifier: string;
  event_count: number;
  metadata: any;
};

type PeakWindow = {
  hour_range: string;
  login_count: number;
};

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [authStats, setAuthStats] = useState<AuthStats | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [peakWindows, setPeakWindows] = useState<PeakWindow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // Date Filtering State
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [activePreset, setActivePreset] = useState<'today' | '7d' | '30d'>('30d');

  // Extended Analytics State
  const [moduleUsage, setModuleUsage] = useState<{ module_name: string, usage_count: number }[]>([]);
  const [locationStats, setLocationStats] = useState<{ city: string, user_count: number, event_count: number }[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchAuthAnalytics();
  }, [dateRange]);

  const setPreset = (preset: 'today' | '7d' | '30d') => {
    setActivePreset(preset);
    const end = new Date();
    let start = new Date();
    if (preset === 'today') start = new Date(new Date().setHours(0, 0, 0, 0));
    else if (preset === '7d') start = subDays(new Date(), 7);
    else if (preset === '30d') start = subDays(new Date(), 30);
    setDateRange({ start, end });
  };

  const fetchAuthAnalytics = async () => {
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();

      // Fetch Stats (V3)
      const { data: statsData, error: statsError } = await supabase.rpc('get_auth_stats_v3', {
        p_start_date: start,
        p_end_date: end
      });

      console.log('[AdminUserManagement] RPC get_auth_stats_v3 response:', {
        start,
        end,
        statsData,
        statsError
      });

      if (statsData) setAuthStats(statsData[0]);

      // Fetch Funnel
      const { data: funnelData } = await supabase.rpc('get_signup_funnel', {
        start_date: start,
        end_date: end
      });
      if (funnelData) setFunnel(funnelData);

      // Fetch Alerts
      const { data: alertsData } = await supabase.rpc('get_security_alerts');
      if (alertsData) setAlerts(alertsData);

      // Fetch Peak Windows
      const { data: peakData } = await supabase.rpc('get_auth_peak_windows');
      if (peakData) setPeakWindows(peakData);

      // Fetch Module Usage
      const { data: usageData } = await supabase.rpc('get_peak_modules', {
        p_start_date: start,
        p_end_date: end
      });
      if (usageData) setModuleUsage(usageData);

      // Fetch Location Stats
      const { data: locationData } = await supabase.rpc('get_location_map_data', {
        p_start_date: start,
        p_end_date: end
      });
      if (locationData) setLocationStats(locationData);

    } catch (error) {
      console.error('Error fetching auth analytics:', error);
    }
  };

  const fetchUserActivity = async (userId: string) => {
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase.rpc('get_user_activity', {
        p_user_id: userId
      });

      if (error) throw error;
      setUserActivity(data || []);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleUserClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    fetchUserActivity(user.id);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('[AdminUserManagement] Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.city && user.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLocation = locationFilter === "" || user.city === locationFilter;

      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "active":
          return (b.last_login_at ? new Date(b.last_login_at).getTime() : 0) -
            (a.last_login_at ? new Date(a.last_login_at).getTime() : 0);
        case "name":
          return (a.full_name || a.phone).localeCompare(b.full_name || b.phone);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const otpSuccessRate = authStats?.otp_success_rate || 0;

  const getHealthColor = (rate: number) => {
    if (rate > 90) return 'text-green-600';
    if (rate > 80) return 'text-amber-500';
    return 'text-red-600';
  };

  // Helper function to check if user signed up in last 24 hours
  const isNewUser = (user: UserProfile) => {
    const signupDate = new Date(user.created_at);
    const now = new Date();
    const diffHours = (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor user acquisition, security health, and engagement insights</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            {(['today', '7d', '30d'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activePreset === p
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {p === 'today' ? 'Today' : p.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => { fetchUsers(); fetchAuthAnalytics(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
            title="Refresh Data"
          >
            <History className="w-4 h-4" />
            <span className="text-sm font-semibold">Refresh</span>
          </button>
        </div>
      </div>

      {/* Row 1: Core KPIs (3 Cards) */}
      <div className="grid grid-cols-3 gap-6">
        {[
          {
            label: 'Total App Users',
            value: users.length || 0,
            icon: Users,
            iconBg: 'bg-blue-600',
            iconColor: 'text-white',
            trend: '+12%',
            sub: 'Mobile Registry'
          },
          {
            label: 'Active Today',
            value: authStats?.active_today_2min || 0,
            icon: Activity,
            iconBg: '', // Will use inline style instead
            iconStyle: { backgroundColor: '#10b981' }, // emerald-500 hex
            iconColor: 'text-white',
            trend: '+8%',
            sub: '>2m session duration'
          },
          {
            label: 'Signup Conversion',
            value: funnel.length > 0 ? `${Math.round((funnel[funnel.length - 1]?.event_count || 0) / (funnel[0]?.event_count || 1) * 100)}%` : '0%',
            icon: TrendingUp,
            iconBg: 'bg-purple-600',
            iconColor: 'text-white',
            trend: '+5%',
            sub: 'Phone → Signup rate'
          }
        ].map((stat, i) => {
          const IconComponent = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`${stat.iconBg} w-12 h-12 rounded-lg flex items-center justify-center`}
                  style={stat.iconStyle || {}}
                >
                  <IconComponent className={`w-6 h-6 ${stat.iconColor || 'text-white'}`} strokeWidth={2.5} />
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

      {/* Row 2: Authentication Funnel & Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              Authentication Funnel & Activity
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">{activePreset.toUpperCase()}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Section (1/3): Activity Summary */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-700 mb-4">Activity Summary</h4>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-600 mb-1">Logins Today</p>
                <p className="text-3xl font-bold text-blue-700">{authStats?.total_logins || 0}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-600 mb-1">New Signups Today</p>
                <p className="text-3xl font-bold text-emerald-700">{authStats?.total_signups || 0}</p>
              </div>
            </div>

            {/* Right Section (2/3): Authentication Funnel */}
            <div className="col-span-2">
              <h4 className="text-sm font-bold text-gray-700 mb-4">Authentication Funnel</h4>
              <div className="space-y-4">
                {funnel.length === 0 ? (
                  <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-center">
                      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Waiting for first activity...</p>
                    </div>
                  </div>
                ) : (
                  funnel.map((step, idx) => {
                    const prev = idx > 0 ? funnel[idx - 1].event_count : step.event_count;

                    // Calculate conversion rate, capping at 100% for resend scenarios
                    // (e.g., OTP Sent can be > Phone Entered due to resends)
                    let cvr = prev > 0 ? (step.event_count / prev) * 100 : 100;
                    if (cvr > 100) cvr = 100; // Cap at 100% - can't have more than 100% conversion

                    const dropPercent = Math.max(0, 100 - cvr); // Prevent negative drops
                    const peak = funnel[0]?.event_count || 1; // Peak for progress bar width calculation

                    // Color coding based on conversion
                    let barColor = 'bg-green-500';
                    let badgeColor = 'bg-green-100 text-green-700';
                    if (cvr < 80) {
                      barColor = 'bg-red-500';
                      badgeColor = 'bg-red-100 text-red-700';
                    } else if (cvr < 90) {
                      barColor = 'bg-yellow-500';
                      badgeColor = 'bg-yellow-100 text-yellow-700';
                    }

                    return (
                      <div key={step.step_name}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">{step.step_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">{step.event_count}</span>
                            {idx > 0 && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${badgeColor}`}>
                                {Math.round(dropPercent)}% drop
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-700`}
                            style={{ width: `${(step.event_count / peak) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: User Distribution Insights (Merged: Peak Hours + Top Cities) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            User Distribution Insights
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Section: Peak Hours */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                <h4 className="text-sm font-bold text-purple-700">Peak Hours</h4>
              </div>
              <div className="space-y-2">
                {peakWindows.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No activity patterns yet</p>
                  </div>
                ) : (
                  peakWindows.slice(0, 6).map((window, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-purple-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-purple-100 text-purple-700 rounded text-[10px] font-bold">#{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-800">{window.hour_range}</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">{window.login_count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Section: Top Cities */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-rose-500 rounded flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <h4 className="text-sm font-bold text-rose-700">Top Cities</h4>
              </div>
              <div className="space-y-2">
                {locationStats.length === 0 ? (
                  <div className="py-8 text-center">
                    <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No location data yet</p>
                  </div>
                ) : (
                  locationStats.slice(0, 6).map((l, i) => (
                    <div key={l.city} className="flex items-center justify-between p-2 rounded-lg hover:bg-rose-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-rose-100 text-rose-700 rounded text-[10px] font-bold">#{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-800 truncate">{l.city}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{l.user_count}</div>
                        <div className="text-[10px] text-gray-400">{l.event_count} evt</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Row 3: App User Registry */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">App User Registry</h3>
                <p className="text-xs text-gray-600 mt-0.5">Complete list of devotees signed up via mobile app</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border-gray-300 border bg-white rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-64 transition-all"
                />
              </div>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-3 pr-9 py-2 text-sm border-gray-300 border rounded-lg outline-none bg-white text-gray-700 cursor-pointer hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px_8px] bg-[position:right_0.75rem_center] bg-no-repeat"
              >
                <option value="">All Locations</option>
                <option value="Chennai">Chennai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Madurai">Madurai</option>
                <option value="Salem">Salem</option>
                <option value="Erode">Erode</option>
                <option value="Thoothukudi">Thoothukudi</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-3 pr-9 py-2 text-sm border-gray-300 border rounded-lg outline-none bg-white text-gray-700 cursor-pointer hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjNkI3MjgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px_8px] bg-[position:right_0.75rem_center] bg-no-repeat"
              >
                <option value="recent">Sort: Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="active">Most Active</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide">User Profile</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide">Signup Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide">Last Login</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">No users found matching your search.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => handleUserClick(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold group-hover:bg-green-600 group-hover:text-white transition-all">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.phone.slice(-1)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <span>{user.name || user.full_name || 'Anonymous'}</span>
                            {isNewUser(user) && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wide">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Smartphone className="w-3 h-3 text-gray-400" /> {user.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{user.city || 'Chennai'}</div>
                      <div className="text-xs text-gray-400">Tamil Nadu, IN</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{format(new Date(user.created_at), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-gray-500">{format(new Date(user.created_at), 'h:mm a')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.last_login_at ? (
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{format(new Date(user.last_login_at), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-green-600 font-medium">{format(new Date(user.last_login_at), 'h:mm a')}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Never logged in</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors" title="View Details">
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Analytics Drawer */}
      <UserAnalyticsDrawer
        userId={selectedUser?.id || ""}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default AdminUserManagement;
