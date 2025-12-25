# Murugan Wallpapers & Videos - Admin Panel Master Specification

**Version:** 2.0 (Left Sidebar Architecture)  
**Last Updated:** November 25, 2025  
**Status:** Single Source of Truth  
**Architecture:** Left Sidebar (20:80) Layout

---

## 🎯 CRITICAL: Single Source of Truth Declaration

This document is the **ONLY** valid specification for the Murugan Admin Panel.

**❌ DEPRECATED AND MUST NOT BE USED:**
- Top navigation bar layout
- "More" dropdown system
- Old header structures
- Old spacing rules
- Old AdminDashboard versions
- Any top-nav based components

**✅ ONLY THIS SYSTEM IS VALID:**
- Left Sidebar (20:80) layout
- Collapsible sidebar navigation
- Unified component system
- Master design tokens
- Consistent interaction patterns

---

## 📐 Core Architecture

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│                    Top Bar (64px)                   │
│  [Logo/Toggle]              [Search]  [User Avatar] │
├──────────┬──────────────────────────────────────────┤
│          │                                           │
│          │                                           │
│  Sidebar │         Main Content Area                │
│  (20%)   │              (80%)                        │
│  256px   │                                           │
│          │                                           │
│  [Menu]  │         [Dynamic Module Content]         │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│  [Menu]  │                                           │
│          │                                           │
│  [Colps] │                                           │
└──────────┴──────────────────────────────────────────┘
```

### Dimensions

| Element | Width (Expanded) | Width (Collapsed) | Height |
|---------|-----------------|-------------------|---------|
| Sidebar | 256px (20%) | 64px | 100vh |
| Content | calc(100% - 256px) | calc(100% - 64px) | 100vh |
| Top Bar | 100% | 100% | 64px |
| Menu Item | 100% | 56px | 44px |

### Breakpoints

```css
/* Mobile First */
xs: 0-639px      /* Mobile - Sidebar overlay */
sm: 640px-767px  /* Mobile landscape - Sidebar overlay */
md: 768px-1023px /* Tablet - Sidebar push/overlay */
lg: 1024px+      /* Desktop - Sidebar fixed 20:80 */
xl: 1280px+      /* Large desktop - Sidebar fixed 20:80 */
2xl: 1536px+     /* XL desktop - Sidebar fixed 20:80 */
```

---

## 🎨 Design System

### Color Palette

```typescript
const colors = {
  // Primary Brand Colors
  primary: {
    DEFAULT: '#0d5e38',      // Murugan Green
    light: '#1a8f5a',        // Light green
    dark: '#0a4a2a',         // Dark green
    hover: '#0d5e38e6',      // 90% opacity
  },
  
  // Accent Colors
  accent: {
    yellow: '#fbbf24',       // Active state marker
    orange: '#f97316',       // Warning/Alert
    red: '#ef4444',          // Error/Delete
    blue: '#3b82f6',         // Info/Edit
    purple: '#a855f7',       // Analytics
  },
  
  // Neutral Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Status Colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  
  // Background Colors
  background: {
    main: '#f9fafb',         // Gray-50
    card: '#ffffff',
    sidebar: '#ffffff',
    hover: '#f3f4f6',        // Gray-100
  }
};
```

### Typography

```typescript
const typography = {
  fonts: {
    tamil: {
      heading: 'TAU-Paalai',      // Bold for titles
      body: 'TAU-Nilavu',         // Regular for body text
    },
    english: {
      sans: 'Inter',              // Fallback for English
    }
  },
  
  sizes: {
    // DO NOT use Tailwind font-size classes
    // Typography is managed in globals.css
    // Only use semantic HTML tags
  }
};
```

### Spacing System

```typescript
const spacing = {
  xs: '4px',      // 0.25rem
  sm: '8px',      // 0.5rem
  md: '12px',     // 0.75rem
  base: '16px',   // 1rem
  lg: '24px',     // 1.5rem
  xl: '32px',     // 2rem
  '2xl': '48px',  // 3rem
  '3xl': '64px',  // 4rem
};
```

### Border Radius

```typescript
const borderRadius = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};
```

### Shadows

```typescript
const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};
```

### Animation Timings

```typescript
const animations = {
  fast: '150ms',
  normal: '250ms',
  slow: '300ms',
  page: '500ms',
  
  easing: {
    default: 'ease-in-out',
    in: 'ease-in',
    out: 'ease-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  }
};
```

---

## 🏗️ Component Architecture

### Master Layout Component

```tsx
// /components/AdminLayout.tsx
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar Component

```tsx
// /components/Sidebar.tsx
import { useState } from 'react';
import {
  LayoutDashboard,
  Image,
  Wallpaper,
  Music,
  Sparkles,
  Camera,
  Brain,
  Users,
  CreditCard,
  HardDrive,
  Settings,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useRouter } from 'next/router';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'banners', label: 'Banners', icon: Image, path: '/admin/banners' },
  { id: 'wallpapers', label: 'Wallpapers', icon: Wallpaper, path: '/admin/wallpapers' },
  { id: 'media', label: 'Media', icon: Music, path: '/admin/media' },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles, path: '/admin/sparkles' },
  { id: 'photos', label: 'Photos', icon: Camera, path: '/admin/photos' },
  { id: 'ai-analytics', label: 'AI Analytics', icon: Brain, path: '/admin/ai-analytics' },
  { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, path: '/admin/subscriptions' },
  { id: 'storage', label: 'Storage', icon: HardDrive, path: '/admin/storage' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, open, onClose }: SidebarProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <aside
      className={`
        bg-white border-r border-gray-200 flex flex-col
        fixed lg:static inset-y-0 left-0 z-50
        transition-all duration-250 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0d5e38] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-['TAU-Paalai'] text-[#0d5e38]">
                Murugan Admin
              </h1>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="w-8 h-8 bg-[#0d5e38] rounded-lg flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    router.push(item.path);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-150
                    ${isActive
                      ? 'bg-[#0d5e38]/5 text-[#0d5e38]'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#0d5e38]' : ''}`} />
                  
                  {!collapsed && (
                    <span className={`text-sm font-medium flex-1 text-left ${isActive ? 'text-[#0d5e38]' : ''}`}>
                      {item.label}
                    </span>
                  )}

                  {!collapsed && item.badge && (
                    <span className="px-2 py-0.5 text-xs bg-[#0d5e38] text-white rounded-full">
                      {item.badge}
                    </span>
                  )}

                  {/* Active State Marker - Yellow Left Border */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-400 rounded-r-full" />
                  )}
                </button>

                {/* Tooltip for Collapsed Mode */}
                {collapsed && (
                  <div className="
                    absolute left-full ml-2 top-1/2 -translate-y-1/2
                    px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity whitespace-nowrap z-50
                  ">
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-[#0d5e38] rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="
            w-full flex items-center justify-center gap-2
            px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg
            transition-colors
          "
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
```

### Top Bar Component

```tsx
// /components/TopBar.tsx
import { useState } from 'react';
import { Search, Menu, Bell, Settings as SettingsIcon, LogOut } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left Side - Mobile Menu + Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="
              w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg
              border border-gray-200
              focus:outline-none focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent
              text-sm
            "
          />
        </div>
      </div>

      {/* Right Side - Status + Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Online Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-700">Online</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm text-gray-900">New banner uploaded successfully</p>
                  <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm text-gray-900">5 new user registrations</p>
                  <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar + Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/admin-avatar.png"
              alt="Admin"
              className="w-9 h-9 rounded-full border-2 border-[#0d5e38] object-cover"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="font-medium text-gray-900">Admin User</p>
                <p className="text-sm text-gray-500">admin@murugan.app</p>
              </div>
              
              <button className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Settings
              </button>
              
              <button className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## 📊 Module Specifications

### Module 1: Dashboard

**Path:** `/admin`  
**Purpose:** Overview and quick stats

#### Layout

```tsx
// /pages/admin/index.tsx
import { AdminLayout } from '../../components/AdminLayout';
import { DashboardStats } from '../../components/dashboard/DashboardStats';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { AnalyticsCharts } from '../../components/dashboard/AnalyticsCharts';

export default function Dashboard() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-['TAU-Paalai'] text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, Admin</p>
        </div>

        {/* Stats Grid */}
        <DashboardStats />

        {/* Charts + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsCharts />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </AdminLayout>
  );
}
```

#### Stats Cards

```tsx
// /components/dashboard/DashboardStats.tsx
import { TrendingUp, TrendingDown, Users, Image, Music, Sparkles } from 'lucide-react';

interface Stat {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const stats: Stat[] = [
  {
    label: 'Total Users',
    value: '12,458',
    change: 12.5,
    trend: 'up',
    icon: Users,
    color: 'blue'
  },
  {
    label: 'Wallpapers',
    value: '1,234',
    change: 8.2,
    trend: 'up',
    icon: Image,
    color: 'purple'
  },
  {
    label: 'Media Files',
    value: '856',
    change: -3.1,
    trend: 'down',
    icon: Music,
    color: 'green'
  },
  {
    label: 'Sparkles',
    value: '234',
    change: 15.3,
    trend: 'up',
    icon: Sparkles,
    color: 'yellow'
  },
];

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <Icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              
              <div className={`flex items-center gap-1 text-sm ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(stat.change)}%</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### Analytics Charts

```tsx
// /components/dashboard/AnalyticsCharts.tsx
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', users: 400, downloads: 240 },
  { name: 'Tue', users: 300, downloads: 139 },
  { name: 'Wed', users: 200, downloads: 980 },
  { name: 'Thu', users: 278, downloads: 390 },
  { name: 'Fri', users: 189, downloads: 480 },
  { name: 'Sat', users: 239, downloads: 380 },
  { name: 'Sun', users: 349, downloads: 430 },
];

export function AnalyticsCharts() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="font-medium text-gray-900 mb-4">Weekly Overview</h2>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d5e38" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0d5e38" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip />
          <Area 
            type="monotone" 
            dataKey="users" 
            stroke="#0d5e38" 
            fillOpacity={1} 
            fill="url(#colorUsers)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### Module 2: Banners Manager

**Path:** `/admin/banners`  
**Purpose:** Manage homepage and module banners

#### Features

- Upload banners with type selection (wallpaper, home, media, sparkle)
- Drag-to-reorder
- Schedule publish/unpublish
- Analytics per banner (clicks, impressions)
- Grid/List view toggle

#### Layout

```tsx
// /pages/admin/banners.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Plus, Grid3x3, List, Calendar, BarChart3 } from 'lucide-react';
import { BannerCard } from '../../components/banners/BannerCard';
import { BannerListItem } from '../../components/banners/BannerListItem';
import { BannerUploadModal } from '../../components/banners/BannerUploadModal';
import { supabase } from '../../utils/supabase/client';

interface Banner {
  id: string;
  title: string;
  title_tamil: string;
  image_url: string;
  banner_type: 'wallpaper' | 'home' | 'media' | 'sparkle';
  link_url?: string;
  order_index: number;
  active: boolean;
  scheduled_at?: string;
  expires_at?: string;
  impressions: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export default function BannersManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, [filterType]);

  const fetchBanners = async () => {
    let query = supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (filterType !== 'all') {
      query = query.eq('banner_type', filterType);
    }

    const { data, error } = await query;
    if (!error && data) {
      setBanners(data);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-['TAU-Paalai'] text-gray-900">Banners</h1>
            <p className="text-sm text-gray-600 mt-1">Manage promotional banners</p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload Banner
          </button>
        </div>

        {/* Filters + View Toggle */}
        <div className="flex items-center justify-between">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            {['all', 'wallpaper', 'home', 'media', 'sparkle'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${filterType === type
                    ? 'bg-[#0d5e38] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banners Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                onRefresh={fetchBanners}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {banners.map((banner) => (
              <BannerListItem
                key={banner.id}
                banner={banner}
                onRefresh={fetchBanners}
              />
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <BannerUploadModal
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={fetchBanners}
          />
        )}
      </div>
    </AdminLayout>
  );
}
```

#### Banner Upload Modal

```tsx
// /components/banners/BannerUploadModal.tsx
import { useState } from 'react';
import { X, Upload, Calendar, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface BannerUploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export function BannerUploadModal({ onClose, onUploadComplete }: BannerUploadModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    title_tamil: '',
    banner_type: 'wallpaper' as 'wallpaper' | 'home' | 'media' | 'sparkle',
    link_url: '',
    scheduled_at: '',
    expires_at: '',
    image: null as File | null
  });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) return;

    setUploading(true);

    try {
      // Upload image
      const imagePath = `banners/${Date.now()}_${formData.image.name}`;
      const { error: uploadError } = await supabase.storage
        .from('banner-assets')
        .upload(imagePath, formData.image);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('banner-assets')
        .getPublicUrl(imagePath);

      // Insert banner record
      const { error: insertError } = await supabase
        .from('banners')
        .insert({
          title: formData.title,
          title_tamil: formData.title_tamil,
          image_url: urlData.publicUrl,
          banner_type: formData.banner_type,
          link_url: formData.link_url || null,
          scheduled_at: formData.scheduled_at || null,
          expires_at: formData.expires_at || null,
          active: true,
          impressions: 0,
          clicks: 0,
          order_index: 999
        });

      if (insertError) throw insertError;

      onUploadComplete();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-['TAU-Paalai'] text-gray-900">Upload Banner</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#0d5e38] transition-colors">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreview('');
                      setFormData({ ...formData, image: null });
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="banner-upload"
                    required
                  />
                  <label
                    htmlFor="banner-upload"
                    className="mt-4 inline-block px-4 py-2 bg-[#0d5e38] text-white rounded-lg cursor-pointer hover:bg-[#0a4a2a]"
                  >
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Title (English) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (English) *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              placeholder="Enter banner title"
            />
          </div>

          {/* Title (Tamil) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Tamil)
            </label>
            <input
              type="text"
              value={formData.title_tamil}
              onChange={(e) => setFormData({ ...formData, title_tamil: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent font-['TAU-Nilavu']"
              placeholder="தலைப்பை உள்ளிடவும்"
            />
          </div>

          {/* Banner Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Type *
            </label>
            <select
              required
              value={formData.banner_type}
              onChange={(e) => setFormData({ ...formData, banner_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
            >
              <option value="wallpaper">Wallpaper Section</option>
              <option value="home">Home Screen</option>
              <option value="media">Media Section</option>
              <option value="sparkle">Sparkle Section</option>
            </select>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Link URL (Optional)
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Publish At
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Expires At
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d5e38] focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !formData.image}
              className="flex-1 px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### Module 3: Wallpapers Manager

**Path:** `/admin/wallpapers`  
**Purpose:** Manage wallpaper content

#### Features

- Upload wallpapers with metadata
- Category management
- Tags system
- Bulk upload support
- Image optimization automatic
- Analytics (downloads, favorites, views)
- Grid/List view toggle

#### Database Schema

```sql
CREATE TABLE wallpapers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_tamil TEXT,
  description TEXT,
  description_tamil TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[],
  dimensions TEXT,
  file_size INTEGER,
  downloads INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  sync_status TEXT DEFAULT 'pending'
);
```

#### Layout (Same pattern as Banners)

```tsx
// Similar structure to BannersManager with:
// - Category filter dropdown
// - Tag filter chips
// - Bulk selection mode
// - Bulk delete/activate/deactivate
// - Featured toggle
// - Analytics overlay on hover
```

---

### Module 4: Media Manager

**Path:** `/admin/media`  
**Purpose:** Manage songs and videos

#### Features

- Songs/Videos tab switcher
- Category folders at top
- YouTube to MP3 converter
- Metadata editor (title, artist, duration, etc.)
- Grid/List view toggle
- Analytics per item

#### Layout

```tsx
// Covered in ADMIN_PANEL_PATCHES.md Section 2
// Key additions:
// - Auto-extract metadata from uploaded files
// - Audio waveform preview
// - Video thumbnail generator
// - Playlist creation
// - Batch metadata editor
```

---

### Module 5: Sparkles Manager

**Path:** `/admin/sparkles`  
**Purpose:** Manage devotional content articles

#### Features

- Rich text editor for content
- Full bilingual support (English + Tamil)
- Categories and tags
- Publish/Draft status
- Schedule publishing
- Analytics (views, reads, scroll depth, shares)
- Grid/List view toggle

#### Layout

```tsx
// Covered in ADMIN_PANEL_PATCHES.md Section 3
// Key additions:
// - Rich text editor (TipTap or similar)
// - Preview mode
// - SEO metadata fields
// - Related content suggestions
// - Reading time estimator
```

---

### Module 6: Photos Manager

**Path:** `/admin/photos`  
**Purpose:** Manage photo gallery content

#### Features

- Bulk photo upload
- Album/Collection organization
- Tag-based filtering
- Automatic thumbnail generation
- EXIF data extraction
- Grid/List view toggle

#### Upload Modal

```tsx
// /components/photos/PhotoUploadModal.tsx
// Similar to BannerUploadModal but with:
// - Multi-file upload support
// - Drag-and-drop zone
// - Album selector
// - Batch metadata editor
// - Progress bar for multiple uploads
```

---

### Module 7: AI Analytics

**Path:** `/admin/ai-analytics`  
**Purpose:** Track AI chatbot usage and performance

#### Features

- Session metrics
- Message volume charts
- Top questions list
- Average response time
- Token usage tracking
- Language distribution
- User satisfaction scores

#### Layout

```tsx
// Covered in ADMIN_PANEL_PATCHES.md Section 8
// Key additions:
// - Real-time session viewer
// - Question clustering
// - Response quality metrics
// - Export chat logs
// - Training data export
```

---

### Module 8: Users Manager

**Path:** `/admin/users`  
**Purpose:** Manage user accounts

#### Features

- User list with search/filter
- User details drawer
- Activity timeline
- Subscription status
- Device information
- Content preferences
- Favorites/Downloads history

#### Layout

```tsx
// /pages/admin/users.tsx
import { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { Search, Filter, MoreVertical, UserCheck, UserX, Mail } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  name_tamil: string;
  avatar_url?: string;
  phone?: string;
  subscription_status: 'free' | 'premium';
  registered_at: string;
  last_active: string;
  total_downloads: number;
  total_favorites: number;
  devices: number;
  active: boolean;
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Implementation similar to other managers
  // With user-specific actions and analytics
}
```

---

### Module 9: Subscriptions Manager

**Path:** `/admin/subscriptions`  
**Purpose:** Manage premium subscriptions

#### Features

- Active subscriptions list
- Revenue metrics
- Subscription plans editor
- Renewal tracking
- Churn analysis
- Payment history

#### Database Schema

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_tamil TEXT,
  description TEXT,
  description_tamil TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  duration_days INTEGER NOT NULL,
  features JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  status TEXT CHECK (status IN ('active', 'expired', 'canceled', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Module 10: Storage Manager

**Path:** `/admin/storage`  
**Purpose:** Monitor and manage storage usage

#### Features

- Storage usage by type (images, videos, audio)
- Bucket-level analytics
- Orphaned files detector
- Bulk delete tools
- Storage optimization suggestions
- Cost estimation

#### Layout

```tsx
// /pages/admin/storage.tsx
import { AdminLayout } from '../../components/AdminLayout';
import { HardDrive, Trash2, AlertTriangle, TrendingUp } from 'lucide-react';
import { StorageBreakdown } from '../../components/storage/StorageBreakdown';
import { OrphanedFiles } from '../../components/storage/OrphanedFiles';
import { OptimizationSuggestions } from '../../components/storage/OptimizationSuggestions';

export default function StorageManager() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-['TAU-Paalai']">Storage Management</h1>

        {/* Storage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Used" value="45.2 GB" icon={HardDrive} />
          <StatCard title="Banners" value="8.3 GB" icon={HardDrive} />
          <StatCard title="Wallpapers" value="22.1 GB" icon={HardDrive} />
          <StatCard title="Media" value="14.8 GB" icon={HardDrive} />
        </div>

        {/* Storage Breakdown Chart */}
        <StorageBreakdown />

        {/* Orphaned Files */}
        <OrphanedFiles />

        {/* Optimization Suggestions */}
        <OptimizationSuggestions />
      </div>
    </AdminLayout>
  );
}
```

---

### Module 11: Settings

**Path:** `/admin/settings`  
**Purpose:** Configure admin panel and app settings

#### Sections

1. **General Settings**
   - App name
   - Logo upload
   - Default language
   - Timezone

2. **Theme Settings**
   - Primary color picker
   - Tamil font selection
   - Layout preferences

3. **Notification Settings**
   - Email notifications
   - Push notification configuration
   - Alert thresholds

4. **API Settings**
   - API keys management
   - Webhook configurations
   - Rate limits

5. **Security Settings**
   - Two-factor authentication
   - Session timeout
   - IP whitelist
   - Audit logs

6. **Sync Settings**
   - Sync schedule
   - Conflict resolution rules
   - Backup configuration

---

## 🔄 Data Flow & Sync Architecture

### Dual Backend System

```
┌─────────────────────────────────────────────────────┐
│              ADMIN BACKEND                          │
│         (Supabase Project 1)                        │
│                                                     │
│  - Content Management Tables                       │
│  - Version Tracking                                │
│  - Sync Status Fields                              │
│  - Audit Logs                                      │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Sync Engine
                   │ (Edge Function)
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              USER BACKEND                           │
│         (Supabase Project 2)                        │
│                                                     │
│  - Read-Only Content Tables                        │
│  - User Analytics                                  │
│  - Session Data                                    │
│  - Download Tracking                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Sync Trigger Flow

```typescript
// 1. Admin uploads content
handleUpload() → Insert to admin_backend.banners

// 2. Database trigger fires
trigger_sync() → Update sync_status to 'pending'

// 3. Frontend calls sync API
syncToUserBackend(bannerId)

// 4. Edge function processes
fetch admin record → upsert to user_backend → update sync_status to 'synced'

// 5. Log sync event
insert into sync_log

// 6. Update UI
realtime listener → show "Synced" badge
```

### Conflict Resolution

```typescript
// Version-based resolution
if (admin_version > user_version) {
  // Admin wins - overwrite user backend
  await user_supabase.upsert(admin_record);
} else if (admin_version === user_version) {
  // Already synced - skip
  return;
} else {
  // Error - user version ahead of admin
  log_conflict_error();
}
```

---

## 🎭 Interaction Patterns

### Modal Behavior

```typescript
// All modals follow this pattern
interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
}

// Modal structure
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b">
      <h2>Modal Title</h2>
      <button onClick={onClose}><X /></button>
    </div>
    
    {/* Content */}
    <div className="p-6">{/* Form fields */}</div>
    
    {/* Footer */}
    <div className="flex gap-3 p-6 border-t">
      <button onClick={onClose}>Cancel</button>
      <button onClick={handleSave}>Save</button>
    </div>
  </div>
</div>
```

### Drawer Behavior

```typescript
// Slide-in from right
<div className={`
  fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-xl
  transform transition-transform duration-300 z-50
  ${open ? 'translate-x-0' : 'translate-x-full'}
`}>
  {/* Drawer content */}
</div>
```

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('Banner uploaded successfully');

// Error
toast.error('Failed to upload banner');

// Loading
const toastId = toast.loading('Uploading...');
// Later: toast.success('Done!', { id: toastId });
```

### Confirmation Dialogs

```typescript
// Use AlertDialog from shadcn
import { AlertDialog } from './components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📱 Responsive Behavior

### Sidebar Breakpoints

```tsx
// Desktop (lg: 1024px+)
- Sidebar: 256px fixed
- Content: calc(100% - 256px)
- Sidebar can collapse to 64px

// Tablet (md: 768px - 1023px)
- Sidebar: Overlay mode
- Opens with backdrop
- Pushes content when open

// Mobile (< 768px)
- Sidebar: Full overlay
- Hamburger menu in top bar
- Full-screen backdrop
```

### Grid Responsive Classes

```tsx
// Standard responsive grid
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"

// Stats cards
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"

// Content + sidebar
className="grid grid-cols-1 lg:grid-cols-3 gap-6"
```

### Typography Scaling

```tsx
// Headings
<h1 className="text-xl md:text-2xl lg:text-3xl">

// Body
<p className="text-sm md:text-base">

// Small text
<span className="text-xs md:text-sm">
```

---

## 🔐 Security & Permissions

### Row Level Security (RLS)

```sql
-- Admin backend - only admin users
CREATE POLICY admin_access ON banners
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- User backend - read-only for all
CREATE POLICY public_read ON banners
  FOR SELECT
  USING (active = true);
```

### API Key Management

```typescript
// Store in environment variables
const ADMIN_SUPABASE_KEY = process.env.ADMIN_SUPABASE_SERVICE_KEY;
const USER_SUPABASE_KEY = process.env.USER_SUPABASE_SERVICE_KEY;

// Never expose service keys to frontend
// Only use anon keys in frontend code
```

### File Upload Security

```typescript
// Validate file type
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}

// Validate file size (max 10MB)
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large');
}

// Sanitize filename
const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Component tests
describe('BannerCard', () => {
  it('renders banner information', () => {
    // Test implementation
  });

  it('handles delete action', () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// Upload flow test
describe('Banner Upload Flow', () => {
  it('uploads banner and syncs to user backend', async () => {
    // 1. Upload to admin backend
    // 2. Verify record created
    // 3. Trigger sync
    // 4. Verify sync to user backend
    // 5. Verify sync status updated
  });
});
```

### E2E Tests

```typescript
// Full user journey
describe('Admin Panel E2E', () => {
  it('admin can manage banners', async () => {
    // 1. Login
    // 2. Navigate to banners
    // 3. Upload banner
    // 4. Edit banner
    // 5. Delete banner
  });
});
```

---

## 📈 Performance Optimization

### Image Optimization

```typescript
// Always use optimized images
<picture>
  <source srcSet={`${url}.avif`} type="image/avif" />
  <source srcSet={`${url}.webp`} type="image/webp" />
  <img src={`${url}.jpg`} alt="" loading="lazy" />
</picture>
```

### Lazy Loading

```tsx
// Lazy load heavy components
const AnalyticsCharts = lazy(() => import('./AnalyticsCharts'));

<Suspense fallback={<Skeleton />}>
  <AnalyticsCharts />
</Suspense>
```

### Query Optimization

```typescript
// Use select to fetch only needed columns
const { data } = await supabase
  .from('banners')
  .select('id, title, image_url, active')
  .limit(50);

// Use indexes on frequently queried columns
CREATE INDEX idx_banners_type ON banners(banner_type);
CREATE INDEX idx_banners_active ON banners(active);
```

### Caching Strategy

```typescript
// Cache frequently accessed data
const cachedBanners = useMemo(() => {
  return banners.filter(b => b.active);
}, [banners]);

// Use SWR or React Query for data fetching
import useSWR from 'swr';

const { data, error } = useSWR('/api/banners', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000 // 1 minute
});
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Storage buckets created
- [ ] RLS policies enabled
- [ ] API keys rotated
- [ ] SSL certificates valid
- [ ] Build passes without errors
- [ ] Tests passing

### Post-Deployment

- [ ] Verify admin login
- [ ] Test content upload
- [ ] Verify sync engine
- [ ] Check analytics tracking
- [ ] Monitor error logs
- [ ] Verify backups running
- [ ] Test mobile responsiveness
- [ ] Verify Tamil fonts loading

---

## 📚 Code Standards

### File Naming

```
Components: PascalCase (BannerCard.tsx)
Pages: lowercase-dash (banners.tsx)
Utils: camelCase (supabase.ts)
Types: PascalCase (Banner.ts)
```

### Import Order

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { supabase } from '@supabase/supabase-js';

// 3. Internal components
import { BannerCard } from '../../components/banners/BannerCard';

// 4. Utils and helpers
import { formatDate } from '../../utils/date';

// 5. Types
import type { Banner } from '../../types/Banner';

// 6. Styles (if any)
import styles from './styles.module.css';
```

### Component Structure

```tsx
// 1. Imports
import { ... } from '...';

// 2. Types/Interfaces
interface ComponentProps {
  ...
}

// 3. Constants (outside component)
const CONSTANTS = { ... };

// 4. Component
export function Component({ props }: ComponentProps) {
  // 4a. State hooks
  const [state, setState] = useState();
  
  // 4b. Effect hooks
  useEffect(() => { ... }, []);
  
  // 4c. Handlers
  const handleClick = () => { ... };
  
  // 4d. Computed values
  const computed = useMemo(() => { ... }, []);
  
  // 4e. Render
  return (
    <div>...</div>
  );
}

// 5. Sub-components (if needed)
function SubComponent() { ... }
```

---

## 🛠️ Maintenance Procedures

### Daily Tasks

- Monitor sync log for errors
- Check storage usage
- Review error logs
- Verify scheduled content published

### Weekly Tasks

- Optimize slow queries
- Clean orphaned files
- Review user feedback
- Update content categories

### Monthly Tasks

- Database performance audit
- Security patch updates
- Backup verification
- Cost optimization review
- Font license check

---

## 📞 Support & Resources

### Documentation

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Next.js Docs](https://nextjs.org/docs)

### Internal Resources

- Design System: `/ADMIN_PANEL_MASTER_SPEC.md` (This file)
- Patch History: `/ADMIN_PANEL_PATCHES.md`
- API Documentation: `/docs/api.md`
- Database Schema: `/docs/schema.sql`

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 20, 2025 | Initial top-nav layout |
| 1.5 | Nov 23, 2025 | Added modules, CORS fixes |
| 2.0 | Nov 25, 2025 | **Left Sidebar (20:80) Architecture - CURRENT** |

---

## ⚠️ Critical Reminders

### DO NOT

- ❌ Use top navigation layout
- ❌ Create "More" dropdown systems
- ❌ Mix old and new patterns
- ❌ Override Tamil typography rules
- ❌ Expose service keys to frontend
- ❌ Skip sync engine when uploading content
- ❌ Modify protected components without review
- ❌ Use custom fonts (only TAU-Paalai, TAU-Nilavu, Inter)

### ALWAYS

- ✅ Use Left Sidebar (20:80) layout
- ✅ Follow spacing system (4/8/12/16/24/32/48/64px)
- ✅ Use Murugan green (#0d5e38) as primary color
- ✅ Support Tamil + English bilingual content
- ✅ Implement proper error handling
- ✅ Log all sync operations
- ✅ Optimize images before upload
- ✅ Test responsive behavior
- ✅ Validate user input
- ✅ Use semantic HTML

---

**END OF MASTER SPECIFICATION**

This document is the single source of truth for the Murugan Wallpapers & Videos Admin Panel.  
All development, modifications, and patches must reference and follow this specification.

Last Updated: November 25, 2025  
Version: 2.0 (Left Sidebar Architecture)
