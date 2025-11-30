import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Bell, Volume2, Mail, Smartphone, Check, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon: string;
};

export function NotificationsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newSongsAlert, setNewSongsAlert] = useState(true);
  const [newPhotosAlert, setNewPhotosAlert] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/user/notifications`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (type: string, value: boolean) => {
    toast.success(value ? `${type} enabled` : `${type} disabled`);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="px-4 pb-20 bg-[#F2FFF6] min-h-screen" style={{ fontFamily: 'var(--font-english)' }}>
      <div className="py-4">
        <h2 className="text-[18px] mb-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 700 }}>
          Notifications
        </h2>
        <p className="text-[14px] text-gray-600 mb-6" style={{ fontFamily: 'var(--font-english)' }}>
          Recent updates and alerts
        </p>

        {/* Recent Notifications */}
        {!loading && notifications.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-[15px] mb-3" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
              Recent Activity
            </h3>
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`border-[#E6F0EA] ${notification.read ? 'bg-white' : 'bg-green-50/30'}`}
              >
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-[15px]" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-[13px] text-gray-600 mb-2" style={{ fontFamily: 'var(--font-english)' }}>
                        {notification.message}
                      </p>
                      <p className="text-[12px] text-gray-400" style={{ fontFamily: 'var(--font-english)' }}>
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <h3 className="text-[15px] mb-4 mt-6" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
          Notification Preferences
        </h3>

        {/* Push Notifications */}
        <Card className="mb-3 border-[#E6F0EA]">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-[15px] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                <Bell className="w-5 h-5 text-[#0d5e38]" />
                Push Notifications
              </h3>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-[14px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 500 }}>
                  Enable Push Notifications
                </div>
                <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                  Receive notifications on your device
                </div>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(checked) => {
                  setPushNotifications(checked);
                  handleToggle('Push notifications', checked);
                }}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-[14px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 500 }}>
                  New Songs
                </div>
                <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                  Alert when new devotional songs are added
                </div>
              </div>
              <Switch
                checked={newSongsAlert}
                onCheckedChange={(checked) => {
                  setNewSongsAlert(checked);
                  handleToggle('New songs alerts', checked);
                }}
                disabled={!pushNotifications}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-[14px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 500 }}>
                  New Wallpapers
                </div>
                <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                  Alert when new wallpapers are uploaded
                </div>
              </div>
              <Switch
                checked={newPhotosAlert}
                onCheckedChange={(checked) => {
                  setNewPhotosAlert(checked);
                  handleToggle('New photos alerts', checked);
                }}
                disabled={!pushNotifications}
              />
            </div>
          </div>
        </Card>

        {/* Email Notifications */}
        <Card className="mb-3 border-[#E6F0EA]">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-[15px] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                <Mail className="w-5 h-5 text-[#D97706]" />
                Email Notifications
              </h3>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-[14px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 500 }}>
                  Email Updates
                </div>
                <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                  Receive weekly updates via email
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  handleToggle('Email notifications', checked);
                }}
              />
            </div>
          </div>
        </Card>

        {/* Sound & Vibration */}
        <Card className="mb-4 border-[#E6F0EA]">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-[15px] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                <Volume2 className="w-5 h-5 text-[#7C3AED]" />
                Sound & Vibration
              </h3>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-[14px] mb-0.5" style={{ fontFamily: 'var(--font-english)', fontWeight: 500 }}>
                  Notification Sound
                </div>
                <div className="text-[13px] text-gray-600" style={{ fontFamily: 'var(--font-english)' }}>
                  Play sound for notifications
                </div>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={(checked) => {
                  setSoundEnabled(checked);
                  handleToggle('Notification sound', checked);
                }}
              />
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] text-blue-900 mb-1" style={{ fontFamily: 'var(--font-english)', fontWeight: 600 }}>
                Stay Connected
              </div>
              <div className="text-[13px] text-blue-700" style={{ fontFamily: 'var(--font-english)' }}>
                Enable notifications to never miss new devotional content and updates about Lord Murugan.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
