import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronRight, Heart, Music, Bell, Settings, Phone, Shield, LogOut, Download, Eye } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AppHeader } from './AppHeader';
import { projectId, publicAnonKey } from '../utils/supabase/info';

type Tab = "saved" | "notifications" | "account" | "contact" | "privacy";

type ProfileScreenProps = {
  onNavigate: (tab: Tab) => void;
  onLogout: () => void;
};

type UserStats = {
  totalLikes: number;
  totalDownloads: number;
  totalViews: number;
};

export function ProfileScreen({ 
  onNavigate,
  onLogout
}: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalLikes: 0,
    totalDownloads: 0,
    totalViews: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch user statistics
  useEffect(() => {
    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/user/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats || {
          totalLikes: 0,
          totalDownloads: 0,
          totalViews: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackAnalytics = async (action: string, contentId?: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/track`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            module: 'app',
            action: action,
            content_id: contentId || null,
            user_id: user?.id || null,
            session_id: sessionStorage.getItem('session_id') || `session_${Date.now()}`,
            metadata: {
              screen: 'profile',
              timestamp: new Date().toISOString(),
              device_type: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
            }
          })
        }
      );
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  const handleMenuClick = async (tab: Tab, menuName: string) => {
    await trackAnalytics('profile_menu_click', menuName);
    onNavigate(tab);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      try {
        await trackAnalytics('logout', 'profile_screen');
        await signOut();
        toast.success('See you soon! 🙏');
        onLogout();
      } catch (error) {
        toast.error('Failed to sign out');
      }
    }
  };

  const getUserDisplayName = () => {
    if (user?.email) {
      const name = user.email.split('@')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    if (user?.phone) {
      return `User ${user.phone.slice(-4)}`;
    }
    return 'Bhuvanesh';
  };

  const getUserEmail = () => {
    return user?.email || user?.phone || 'bhuvanux@gmail.com';
  };

  return (
    <div className="bg-[#F2FFF6] min-h-screen pb-20" style={{ fontFamily: 'var(--font-english)' }}>
      {/* Header with Kolam */}
      <AppHeader title="Profile" />
      
      {/* Hero Banner with Profile */}
      <div className="relative">
        {/* Lord Murugan Banner */}
        <div 
          className="h-56 bg-cover bg-center relative"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1590659948963-caafdecdfe64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaW5kdSUyMHRlbXBsZSUyMGRlaXR5fGVufDF8fHx8MTc2MjkyNTA2N3ww&ixlib=rb-4.1.0&q=80&w=1080')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-transparent" />
        </div>

        {/* Profile Picture Overlapping */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-20">
          <div className="w-40 h-40 rounded-full bg-white p-1.5 shadow-2xl">
            <div 
              className="w-full h-full rounded-full bg-cover bg-center border-4 border-white"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1550853607-9b3b692e50bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb3JkJTIwbXVydWdhbiUyMHN0YXR1ZXxlbnwxfHx8fDE3NjI5NTYyMTd8MA&ixlib=rb-4.1.0&q=80&w=1080')`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-24 pb-4 text-center px-4">
        <h2 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 700 }}>
          {getUserDisplayName()}
        </h2>
        <p className="text-[15px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
          {getUserEmail()}
        </p>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3 mt-2">
        {/* Saved Items */}
        <button
          onClick={() => handleMenuClick("saved", "saved_items")}
          className="w-full bg-white rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-left">
              <div className="text-[16px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Saved Items
              </div>
              <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                Wallpapers, songs & videos
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => handleMenuClick("notifications", "notifications")}
          className="w-full bg-white rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-left">
              <div className="text-[16px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Notifications
              </div>
              <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                Updates and new songs
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Account Settings */}
        <button
          onClick={() => handleMenuClick("account", "account_settings")}
          className="w-full bg-white rounded-[8px] p-5 flex items-center justify-between hover:shadow-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-left">
              <div className="text-[16px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Account Settings
              </div>
              <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                Manage your account
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Contact us */}
        <button
          onClick={() => handleMenuClick("contact", "contact_us")}
          className="w-full bg-white rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <div className="text-[16px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Contact us
              </div>
              <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                24×7 customer support
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Privacy Policy */}
        <button
          onClick={() => handleMenuClick("privacy", "privacy_policy")}
          className="w-full bg-white rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-left">
              <div className="text-[16px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Privacy Policy
              </div>
              <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                How we protect your data
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-left">
              <div className="text-[16px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Log out
              </div>
              <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                See you soon!
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-10 px-4 pb-4">
        <p className="text-[13px] text-gray-500" style={{ fontFamily: 'var(--font-english)' }}>
          Version 0.0.1
        </p>
        <p className="text-[12px] text-gray-400 mt-1" style={{ fontFamily: 'var(--font-english)' }}>
          Made with devotion for Lord Murugan
        </p>
      </div>
    </div>
  );
}
