// Unified Tracking System Types

export type TrackingModule = 
  | 'wallpaper'
  | 'sparkle'
  | 'song'
  | 'banner'
  | 'ask_gugan'
  | 'auth'
  | 'app';

export type TrackingAction =
  // Wallpaper
  | 'view'
  | 'like'
  | 'unlike'
  | 'download'
  | 'share'
  | 'favorite'
  | 'unfavorite'
  // Sparkle
  | 'play'
  | 'pause'
  | 'complete'
  | 'read'
  // Song
  | 'listen'
  | 'skip'
  // Banner
  | 'impression'
  | 'click'
  // Ask Gugan
  | 'message_sent'
  | 'message_received'
  | 'conversation_start'
  // Auth
  | 'login'
  | 'signup'
  | 'logout'
  // App
  | 'app_open'
  | 'app_close'
  | 'tab_switch';

export interface TrackingEvent {
  id?: string;
  module: TrackingModule;
  action: TrackingAction;
  content_id?: string;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface TrackingStats {
  module: TrackingModule;
  total_events: number;
  today_events: number;
  active_users: number;
  top_actions: { action: TrackingAction; count: number }[];
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
  status: 'active' | 'inactive' | 'error';
  last_event?: string;
}

export interface ModuleConfig {
  id: TrackingModule;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  actions: TrackingAction[];
  description: string;
}

// Module Configurations
export const TRACKING_MODULES: ModuleConfig[] = [
  {
    id: 'wallpaper',
    name: 'Wallpapers',
    icon: 'Image',
    color: 'bg-blue-500',
    enabled: true,
    actions: ['view', 'like', 'unlike', 'download', 'share', 'favorite', 'unfavorite'],
    description: 'Track wallpaper interactions'
  },
  {
    id: 'sparkle',
    name: 'Sparkle Videos',
    icon: 'Sparkles',
    color: 'bg-purple-500',
    enabled: true,
    actions: ['view', 'play', 'pause', 'complete', 'read', 'like', 'share'],
    description: 'Track video views and reads'
  },
  {
    id: 'song',
    name: 'Songs',
    icon: 'Music',
    color: 'bg-pink-500',
    enabled: true,
    actions: ['view', 'listen', 'play', 'pause', 'skip', 'like', 'download', 'share'],
    description: 'Track song plays and interactions'
  },
  {
    id: 'banner',
    name: 'Banners',
    icon: 'Layout',
    color: 'bg-orange-500',
    enabled: true,
    actions: ['impression', 'click', 'view'],
    description: 'Track banner impressions and clicks'
  },
  {
    id: 'ask_gugan',
    name: 'Ask Gugan AI',
    icon: 'MessageCircle',
    color: 'bg-green-500',
    enabled: true,
    actions: ['conversation_start', 'message_sent', 'message_received'],
    description: 'Track AI chat interactions'
  },
  {
    id: 'auth',
    name: 'Authentication',
    icon: 'User',
    color: 'bg-indigo-500',
    enabled: true,
    actions: ['login', 'signup', 'logout'],
    description: 'Track user authentication'
  },
  {
    id: 'app',
    name: 'App Usage',
    icon: 'Smartphone',
    color: 'bg-gray-500',
    enabled: true,
    actions: ['app_open', 'app_close', 'tab_switch'],
    description: 'Track general app usage'
  }
];

export interface DateRange {
  from: Date;
  to: Date;
}
