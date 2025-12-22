import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Menu,
} from "lucide-react";
import { AdminDashboardMain } from "./AdminDashboardMain";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminContent } from "./AdminContent";
import { AdminAnalyticsHub } from "./AdminAnalyticsHub";
import { AdminSettingsHub } from "./AdminSettingsHub";
import { useAuth } from "../../contexts/AuthContext";

type AdminView =
  | "dashboard"
  | "content"
  | "analytics"
  | "users"
  | "settings";

type AdminDashboardProps = {
  onExitAdmin?: () => void;
};

export function AdminDashboard({ onExitAdmin }: AdminDashboardProps) {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Main menu items (non-analytics)
  const mainMenuItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "content" as const, label: "Content", icon: LayoutDashboard },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <AdminDashboardMain />;
      case "content":
        return <AdminContent />;
      case "analytics":
        return <AdminAnalyticsHub />;
      case "users":
        return <AdminUserManagement />;
      case "settings":
        return <AdminSettingsHub />;
      default:
        return <AdminDashboardMain />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* LEFT SIDEBAR */}
      <aside
        className={`${
          isSidebarCollapsed ? "w-20" : "w-64"
        } bg-gradient-to-b from-green-800 to-green-900 shadow-xl fixed left-0 top-0 bottom-0 overflow-y-auto transition-all duration-300`}
      >
        {/* Logo & Brand */}
        <div className="p-6 border-b border-white/10">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-green-900" />
                </div>
                <div>
                  <h1
                    className="text-white text-lg font-bold leading-tight"
                    style={{ fontFamily: "var(--font-english)" }}
                  >
                    Murugan Admin
                  </h1>
                  <p className="text-green-200 text-xs">Content Management</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-green-900" />
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1 pb-24">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${
                  isActive
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-green-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <>
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1 h-6 bg-yellow-400 rounded-full" />
                    )}
                  </>
                )}
                
                {/* Tooltip on collapsed */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-gray-900" />
                  </div>
                )}
                
                {isActive && isSidebarCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-yellow-400 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync Status at Bottom - Fixed Position */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-green-900/90">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">All Synced</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* TOP HEADER */}
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Page Title with Menu Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <h2 className="text-xl font-bold text-gray-800 capitalize">
                {activeView.replace("-", " ")}
              </h2>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Global Search */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-80">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search admin panel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-gray-800 text-sm placeholder:text-gray-400 outline-none"
                />
              </div>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Admin Profile */}
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-green-900 font-bold text-sm">A</span>
                </div>
                <div className="text-left">
                  <p className="text-gray-800 text-sm font-medium">Admin User</p>
                  <p className="text-gray-500 text-xs">{user?.email || ""}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {showProfileMenu && (
          <div className="fixed top-16 right-6 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-800 break-all">{user?.email || ""}</p>
            </div>
            <div className="p-2">
              <button
                onClick={async () => {
                  setShowProfileMenu(false);
                  await signOut();
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100"
              >
                Sign out
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onExitAdmin?.();
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100"
              >
                Exit admin
              </button>
            </div>
          </div>
        )}

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="fixed top-16 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Notifications</h3>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      Wallpaper optimization complete
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      23 images optimized • 2 minutes ago
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">New user signup</p>
                    <p className="text-xs text-gray-500 mt-1">rajesh@gmail.com • 15 minutes ago</p>
                  </div>
                </div>
              </div>
              <div className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Storage warning</p>
                    <p className="text-xs text-gray-500 mt-1">85% capacity reached • 1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-gray-200 text-center">
              <button className="text-sm text-green-700 font-medium hover:text-green-800">
                View all notifications
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="p-6">
          <div className="max-w-[1600px] mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}