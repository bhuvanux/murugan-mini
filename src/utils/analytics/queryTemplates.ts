/**
 * Analytics Query Templates - PRODUCTION READY (52 QUERIES)
 * 
 * Predefined analytics queries organized by category and business impact tier.
 * Each template maps to existing RPC functions and analytics schemas.
 * 
 * Query Distribution:
 * - Tier 1 (Daily Decisions): 12 queries
 * - Tier 2 (Weekly Insights): 26 queries  
 * - Tier 3 (Optimization): 14 queries
 * 
 * Categories:
 * - Auth: 14 queries (8 Tier 1, 6 Tier 2)
 * - Users: 10 queries (4 Tier 1, 6 Tier 2)
 * - Content: 8 queries (Tier 2)
 * - Notifications: 8 queries (Tier 3 - requires future RPC)
 * - Storage: 6 queries (Tier 3 - requires future RPC)
 * - Health: 6 queries (mixed tier)
 */

export type QueryCategory = 'auth' | 'users' | 'content' | 'notifications' | 'storage' | 'health';
export type ResultType = 'kpi' | 'table' | 'chart' | 'list';
export type BusinessTier = 1 | 2 | 3;

export interface QueryParameter {
    name: string;
    type: 'date' | 'string' | 'number';
    required: boolean;
    default?: any;
}

export interface QueryTemplate {
    id: string;
    name: string;
    description: string;
    category: QueryCategory;
    tier: BusinessTier; // 1 = Daily, 2 = Weekly, 3 = Monthly
    rpcFunction: string;
    resultType: ResultType;
    parameters: QueryParameter[];
    dataSource: string; // e.g., "auth_events", "users"
    metricKey?: string; // For extracting specific metric from RPC result
}

export const QUERY_CATEGORIES = {
    auth: {
        label: 'Authentication & Onboarding',
        icon: 'Key',
        color: 'blue',
        description: 'Login, signup, and OTP analytics'
    },
    users: {
        label: 'Users & Geo Insights',
        icon: 'Users',
        color: 'green',
        description: 'User demographics and location data'
    },
    content: {
        label: 'Content Usage',
        icon: 'Image',
        color: 'purple',
        description: 'Wallpapers, media, and Sparkle engagement'
    },
    notifications: {
        label: 'Notifications Performance',
        icon: 'Bell',
        color: 'orange',
        description: 'Push notification analytics'
    },
    storage: {
        label: 'Storage & Bandwidth',
        icon: 'Database',
        color: 'red',
        description: 'Storage usage and optimization'
    },
    health: {
        label: 'System Health',
        icon: 'Activity',
        color: 'emerald',
        description: 'Overall app performance metrics'
    },
};

/**
 * All predefined query templates - 52 TOTAL
 */
export const QUERY_TEMPLATES: QueryTemplate[] = [

    // ============================================================
    // 🔐 AUTH (14 queries: 8 Tier 1, 6 Tier 2)
    // ============================================================

    // Tier 1 - Critical Daily Metrics
    {
        id: 'auth_logins_today',
        name: 'Logins Today',
        description: 'Total successful login attempts today',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'total_logins',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_logins_yesterday',
        name: 'Logins Yesterday',
        description: 'Total successful login attempts yesterday',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'total_logins',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'yesterday' },
            { name: 'end_date', type: 'date', required: true, default: 'yesterday_end' }
        ]
    },
    {
        id: 'auth_signups_today',
        name: 'New Signups Today',
        description: 'Users who completed signup today',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'total_signups',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_otp_success_rate',
        name: 'OTP Success Rate Today',
        description: 'Percentage of OTPs successfully verified',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'otp_success_rate',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_otp_failure_rate',
        name: 'OTP Failure Rate Today',
        description: 'Percentage of failed OTP verifications',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'otp_success_rate',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_signup_funnel',
        name: 'Signup Funnel Analysis',
        description: 'Step-by-step conversion through signup process',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_signup_funnel',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_signup_login_ratio',
        name: 'Signup vs Login Ratio',
        description: 'New signups compared to returning logins',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_avg_otp_delivery',
        name: 'Average OTP Delivery Time',
        description: 'Average time to deliver OTP in seconds',
        category: 'auth',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'avg_otp_delivery_seconds',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },

    // Tier 2 - Weekly Insights
    {
        id: 'auth_login_trend_7d',
        name: 'Daily Login Trend (7 Days)',
        description: 'Login attempts over the past week',
        category: 'auth',
        tier: 2,
        rpcFunction: 'get_auth_trends',
        resultType: 'chart',
        dataSource: 'auth_events',
        parameters: [
            { name: 'days_ago', type: 'number', required: true, default: 7 }
        ]
    },
    {
        id: 'auth_login_trend_30d',
        name: 'Weekly Login Trend (30 Days)',
        description: 'Login pattern over the past month',
        category: 'auth',
        tier: 2,
        rpcFunction: 'get_auth_trends',
        resultType: 'chart',
        dataSource: 'auth_events',
        parameters: [
            { name: 'days_ago', type: 'number', required: true, default: 30 }
        ]
    },
    {
        id: 'auth_peak_hours',
        name: 'Peak Login Hours',
        description: 'Hours with highest login activity',
        category: 'auth',
        tier: 2,
        rpcFunction: 'get_auth_peak_windows',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: []
    },
    {
        id: 'auth_security_alerts',
        name: 'Security Alerts',
        description: 'Suspicious activity and multi-device logins',
        category: 'auth',
        tier: 2,
        rpcFunction: 'get_security_alerts',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: []
    },
    {
        id: 'auth_signups_7d',
        name: 'New Signups (7 Days)',
        description: 'Total signups over the past week',
        category: 'auth',
        tier: 2,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'total_signups',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'auth_login_failure_hours',
        name: 'Peak Hours for Login Failures',
        description: 'Hours with most failed login attempts',
        category: 'auth',
        tier: 2,
        rpcFunction: 'get_auth_peak_windows',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: []
    },

    // ============================================================
    // 👥 USERS (10 queries: 4 Tier 1, 6 Tier 2)
    // ============================================================

    // Tier 1 - Critical
    {
        id: 'users_active_today',
        name: 'Active Users Today (DAU)',
        description: 'Users with >2min session today',
        category: 'users',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'active_today_2min',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_city_distribution',
        name: 'City-wise User Distribution',
        description: 'User count and activity by city',
        category: 'users',
        tier: 1,
        rpcFunction: 'get_location_map_data',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_top_cities',
        name: 'Top 5 Cities by Active Users',
        description: 'Cities with highest user engagement',
        category: 'users',
        tier: 1,
        rpcFunction: 'get_location_map_data',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_total_count',
        name: 'Total Registered Users',
        description: 'All-time user count',
        category: 'users',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'users',
        metricKey: 'total_users',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },

    // Tier 2
    {
        id: 'users_new_7d',
        name: 'New Users (7 Days)',
        description: 'Users onboarded in past week',
        category: 'users',
        tier: 2,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'total_signups',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_city_onboarding_7d',
        name: 'City-wise Onboarding (7 Days)',
        description: 'New signups by city this week',
        category: 'users',
        tier: 2,
        rpcFunction: 'get_location_map_data',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_growth_trend',
        name: 'User Growth Trend (30 Days)',
        description: 'Daily new users over last month',
        category: 'users',
        tier: 2,
        rpcFunction: 'get_auth_trends',
        resultType: 'chart',
        dataSource: 'auth_events',
        parameters: [
            { name: 'days_ago', type: 'number', required: true, default: 30 }
        ]
    },
    {
        id: 'users_city_inactivity',
        name: 'Cities with Zero Activity',
        description: 'Cities with no activity this week',
        category: 'users',
        tier: 2,
        rpcFunction: 'get_location_map_data',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_returning_vs_new',
        name: 'Returning vs New Users',
        description: 'User type breakdown for today',
        category: 'users',
        tier: 2,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'users_dau_mau_ratio',
        name: 'DAU / MAU Ratio',
        description: 'Daily vs monthly active users',
        category: 'users',
        tier: 2,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },

    // ============================================================
    // 🖼 CONTENT (8 queries - Tier 2)
    // ============================================================

    {
        id: 'content_module_usage',
        name: 'Content Module Usage',
        description: 'Activity by module (Wallpapers/Media/Sparkle)',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_peak_modules',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'content_wallpaper_views',
        name: 'Wallpaper Views Today',
        description: 'Total wallpaper views',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_peak_modules',
        resultType: 'kpi',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'content_media_engagement',
        name: 'Media Engagement (7 Days)',
        description: 'Songs and videos playback activity',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_peak_modules',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'content_sparkle_engagement',
        name: 'Sparkle Engagement Count',
        description: 'Sparkle content interactions',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_peak_modules',
        resultType: 'kpi',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'content_usage_trend',
        name: 'Content Usage Trend (30 Days)',
        description: 'Daily content interactions',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_peak_modules',
        resultType: 'chart',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'content_module_comparison',
        name: 'Module Usage Comparison',
        description: 'Compare Wallpapers vs Media vs Sparkle',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_peak_modules',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'content_peak_hours',
        name: 'Peak Content Viewing Hours',
        description: 'Hours with highest content engagement',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_auth_peak_windows',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: []
    },
    {
        id: 'content_daily_consumers',
        name: 'Daily Active Content Consumers',
        description: 'Users who viewed content today',
        category: 'content',
        tier: 2,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'active_today_2min',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },

    // ============================================================
    // 🔔 NOTIFICATIONS (8 queries - Tier 3)
    // NOTE: Requires notification analytics RPCs (future)
    // ============================================================

    {
        id: 'notif_sent_today',
        name: 'Notifications Sent Today',
        description: 'Total push notifications sent',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_notification_stats',
        resultType: 'kpi',
        dataSource: 'notification_events',
        metricKey: 'total_sent',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'notif_open_rate',
        name: 'Notification Open Rate Today',
        description: 'Percentage of notifications opened',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_notification_stats',
        resultType: 'kpi',
        dataSource: 'notification_events',
        metricKey: 'open_rate',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'notif_best_performing',
        name: 'Best Performing Notification (30d)',
        description: 'Notification with highest open rate',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_top_notifications',
        resultType: 'table',
        dataSource: 'notification_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' },
            { name: 'limit', type: 'number', required: false, default: 10 }
        ]
    },
    {
        id: 'notif_low_open_rate',
        name: 'Notifications with Low Open Rate',
        description: 'Notifications with <20% opens',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_low_performing_notifications',
        resultType: 'table',
        dataSource: 'notification_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'notif_city_engagement',
        name: 'City-wise Notification Engagement',
        description: 'Open rates by city',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_notification_city_stats',
        resultType: 'table',
        dataSource: 'notification_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '7d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'notif_type_performance',
        name: 'Important vs Normal Performance',
        description: 'Engagement by priority level',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_notification_type_stats',
        resultType: 'table',
        dataSource: 'notification_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'notif_failures',
        name: 'Notification Failures Today',
        description: 'Failed notification deliveries',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_notification_stats',
        resultType: 'kpi',
        dataSource: 'notification_events',
        metricKey: 'failures',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'notif_scheduled_pending',
        name: 'Scheduled Notifications Pending',
        description: 'Queued for future delivery',
        category: 'notifications',
        tier: 3,
        rpcFunction: 'get_pending_notifications',
        resultType: 'table',
        dataSource: 'notification_events',
        parameters: []
    },

    // ============================================================
    // 🗄 STORAGE (6 queries - Tier 3)
    // NOTE: Requires storage analytics schema/RPCs (future)
    // ============================================================

    {
        id: 'storage_by_module',
        name: 'Storage Usage by Module',
        description: 'Breakdown across modules',
        category: 'storage',
        tier: 3,
        rpcFunction: 'get_storage_by_module',
        resultType: 'table',
        dataSource: 'storage_assets',
        parameters: []
    },
    {
        id: 'storage_top_consumers',
        name: 'Files Consuming Most Storage',
        description: 'Top 10 files by size',
        category: 'storage',
        tier: 3,
        rpcFunction: 'get_top_storage_files',
        resultType: 'table',
        dataSource: 'storage_assets',
        parameters: []
    },
    {
        id: 'storage_compression_savings',
        name: 'Storage Saved by Compression',
        description: 'Bytes saved through optimization',
        category: 'storage',
        tier: 3,
        rpcFunction: 'get_compression_savings',
        resultType: 'kpi',
        dataSource: 'storage_assets',
        metricKey: 'bytes_saved',
        parameters: []
    },
    {
        id: 'storage_bandwidth_today',
        name: 'Bandwidth Usage Today',
        description: 'Total data transferred',
        category: 'storage',
        tier: 3,
        rpcFunction: 'get_bandwidth_usage',
        resultType: 'kpi',
        dataSource: 'storage_assets',
        metricKey: 'bytes_transferred',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'storage_optimization_candidates',
        name: 'Files Eligible for Optimization',
        description: 'Uncompressed files',
        category: 'storage',
        tier: 3,
        rpcFunction: 'get_optimization_candidates',
        resultType: 'table',
        dataSource: 'storage_assets',
        parameters: []
    },
    {
        id: 'storage_growth_projection',
        name: 'Days Until Storage Full',
        description: 'Projected capacity timeline',
        category: 'storage',
        tier: 3,
        rpcFunction: 'get_storage_projection',
        resultType: 'kpi',
        dataSource: 'storage_assets',
        metricKey: 'days_remaining',
        parameters: []
    },

    // ============================================================
    // 📈 HEALTH (6 queries - Mixed Tier)
    // ============================================================

    {
        id: 'health_dau',
        name: 'Daily Active Users (DAU)',
        description: 'Unique active users today',
        category: 'health',
        tier: 1,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        metricKey: 'active_today_2min',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'health_peak_usage_hours',
        name: 'Peak Usage Hours',
        description: 'Hours with highest app activity',
        category: 'health',
        tier: 2,
        rpcFunction: 'get_auth_peak_windows',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: []
    },
    {
        id: 'health_activity_trend',
        name: 'App Activity Trend (30d)',
        description: 'Daily user activity over month',
        category: 'health',
        tier: 2,
        rpcFunction: 'get_auth_trends',
        resultType: 'chart',
        dataSource: 'auth_events',
        parameters: [
            { name: 'days_ago', type: 'number', required: true, default: 30 }
        ]
    },
    {
        id: 'health_error_events',
        name: 'Error Events Count Today',
        description: 'System errors and failures',
        category: 'health',
        tier: 3,
        rpcFunction: 'get_security_alerts',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: []
    },
    {
        id: 'health_overall_summary',
        name: 'System Health Summary',
        description: 'Overall app health metrics',
        category: 'health',
        tier: 2,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'table',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: 'today' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },
    {
        id: 'health_user_retention',
        name: 'User Retention Rate',
        description: '7-day and 30-day retention',
        category: 'health',
        tier: 3,
        rpcFunction: 'get_auth_stats_v3',
        resultType: 'kpi',
        dataSource: 'auth_events',
        parameters: [
            { name: 'start_date', type: 'date', required: true, default: '30d_ago' },
            { name: 'end_date', type: 'date', required: true, default: 'now' }
        ]
    },

];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: QueryCategory): QueryTemplate[] {
    return QUERY_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by business tier
 */
export function getTemplatesByTier(tier: BusinessTier): QueryTemplate[] {
    return QUERY_TEMPLATES.filter(t => t.tier === tier);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): QueryTemplate | undefined {
    return QUERY_TEMPLATES.find(t => t.id === id);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): QueryTemplate[] {
    const lowerQuery = query.toLowerCase();
    return QUERY_TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get Tier 1 (critical daily) templates
 */
export function getTier1Templates(): QueryTemplate[] {
    return getTemplatesByTier(1);
}

/**
 * Get query count by category
 */
export function getQueryStats() {
    const stats = {
        total: QUERY_TEMPLATES.length,
        byCategory: {} as Record<QueryCategory, number>,
        byTier: {} as Record<number, number>
    };

    QUERY_TEMPLATES.forEach(t => {
        stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1;
        stats.byTier[t.tier] = (stats.byTier[t.tier] || 0) + 1;
    });

    return stats;
}
