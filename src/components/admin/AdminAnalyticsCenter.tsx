/**
 * ADMIN ANALYTICS CONTROL CENTER
 * Full control over unified analytics system
 * Auto-detects new modules and events
 * Real-time stats and configuration
 */

import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Eye,
  Heart,
  Download,
  Share2,
  Play,
  CheckCircle,
  BookOpen,
  MessageCircle,
  Send,
  MousePointer,
  HeartOff,
  Plus,
  RefreshCw,
  TrendingUp,
  Activity,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Image as ImageIcon,
  Music,
  Video,
  Camera,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc`;

interface AnalyticsConfig {
  id: string;
  module_name: string;
  event_type: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  is_enabled: boolean;
  track_anonymous: boolean;
  sort_order: number;
}

interface DashboardStats {
  total_events: number;
  unique_ips: number;
  modules: Record<string, ModuleStats>;
}

interface ModuleStats {
  total_events: number;
  unique_items: number;
  unique_ips: number;
  events_by_type: Record<string, number>;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  wallpaper: <ImageIcon className="w-5 h-5" />,
  song: <Music className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  sparkle: <Sparkles className="w-5 h-5" />,
  photo: <Camera className="w-5 h-5" />,
  ask_gugan: <Brain className="w-5 h-5" />,
  banner: <Activity className="w-5 h-5" />,
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  like: <Heart className="w-4 h-4" />,
  unlike: <HeartOff className="w-4 h-4" />,
  download: <Download className="w-4 h-4" />,
  share: <Share2 className="w-4 h-4" />,
  play: <Play className="w-4 h-4" />,
  watch_complete: <CheckCircle className="w-4 h-4" />,
  read: <BookOpen className="w-4 h-4" />,
  click: <MousePointer className="w-4 h-4" />,
};

export function AdminAnalyticsCenter() {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<Record<string, AnalyticsConfig[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load dashboard stats
      const dashboardRes = await fetch(`${API_BASE}/api/analytics/admin/dashboard`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const dashboardData = await dashboardRes.json();
      if (dashboardData.success) {
        setDashboard(dashboardData.dashboard);
      }

      // Load configuration
      const configRes = await fetch(`${API_BASE}/api/analytics/admin/config`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.config);
        // Auto-expand all modules on first load
        setExpandedModules(new Set(Object.keys(configData.config)));
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleName)) {
        newSet.delete(moduleName);
      } else {
        newSet.add(moduleName);
      }
      return newSet;
    });
  };

  const toggleEventEnabled = async (moduleName: string, eventType: string, currentValue: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: moduleName,
          event_type: eventType,
          updates: { is_enabled: !currentValue },
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${eventType} tracking ${!currentValue ? "enabled" : "disabled"}`);
        loadAnalytics();
      } else {
        toast.error("Failed to update configuration");
      }
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Failed to update configuration");
    }
  };

  const resetEventStats = async (moduleName: string, eventType: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: moduleName,
          item_id: null, // Reset all items
          event_type: eventType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Reset ${eventType} stats for ${moduleName}`);
        loadAnalytics();
      } else {
        toast.error("Failed to reset stats");
      }
    } catch (error) {
      console.error("Error resetting stats:", error);
      toast.error("Failed to reset stats");
    }
  };

  const refreshCache = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Analytics cache refreshed");
        loadAnalytics();
      } else {
        toast.error("Failed to refresh cache");
      }
    } catch (error) {
      console.error("Error refreshing cache:", error);
      toast.error("Failed to refresh cache");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0d5e38]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Control Center</h1>
          <p className="text-gray-600 mt-1">
            Unified IP-based tracking for all modules • Real-time insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={refreshCache}
            variant="outline"
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Cache
          </Button>
          <AddEventDialog onSuccess={loadAnalytics} />
        </div>
      </div>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard?.total_events?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Users (IP)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard?.unique_ips?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Modules</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {Object.keys(config).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Module Sections */}
      <div className="space-y-4">
        {Object.entries(config).map(([moduleName, events]) => {
          const moduleStats = dashboard?.modules?.[moduleName];
          const isExpanded = expandedModules.has(moduleName);

          return (
            <Card key={moduleName} className="overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(moduleName)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0d5e38]/10 rounded-lg flex items-center justify-center">
                    {MODULE_ICONS[moduleName] || <Activity className="w-5 h-5 text-[#0d5e38]" />}
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                      {moduleName.replace("_", " ")}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{moduleStats?.total_events?.toLocaleString() || 0} events</span>
                      <span>•</span>
                      <span>{moduleStats?.unique_items || 0} items</span>
                      <span>•</span>
                      <span>{moduleStats?.unique_ips || 0} unique users</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Event List */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6 space-y-3">
                    {events
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((event) => {
                        const count = moduleStats?.events_by_type?.[event.event_type] || 0;
                        return (
                          <div
                            key={event.id}
                            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                {EVENT_ICONS[event.event_type] || <Activity className="w-4 h-4" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">
                                    {event.display_name}
                                  </h3>
                                  <Badge
                                    variant={event.is_enabled ? "default" : "secondary"}
                                    className={event.is_enabled ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {event.is_enabled ? "Active" : "Disabled"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {event.description || `Track ${event.event_type} events`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">
                                  {count.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">unique</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={event.is_enabled}
                                  onCheckedChange={() =>
                                    toggleEventEnabled(
                                      event.module_name,
                                      event.event_type,
                                      event.is_enabled
                                    )
                                  }
                                />

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      disabled={count === 0}
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      Reset
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reset {event.display_name}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete all {count.toLocaleString()} tracking
                                        records for this event across all items in {moduleName}. This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          resetEventStats(event.module_name, event.event_type)
                                        }
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Reset Stats
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {Object.keys(config).length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Analytics Configuration Found
            </h3>
            <p className="text-gray-600 mb-6">
              Run the database migration to set up the analytics system.
            </p>
            <AddEventDialog onSuccess={loadAnalytics} />
          </div>
        </Card>
      )}
    </div>
  );
}

// Add Event Dialog Component
function AddEventDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [eventType, setEventType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/analytics/admin/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          module_name: moduleName,
          event_type: eventType,
          display_name: displayName,
          description,
          icon,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Event type added successfully");
        setOpen(false);
        onSuccess();
        // Reset form
        setModuleName("");
        setEventType("");
        setDisplayName("");
        setDescription("");
        setIcon("");
      } else {
        toast.error(data.error || "Failed to add event type");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event type");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0d5e38] hover:bg-[#0a5b34] gap-2">
          <Plus className="w-4 h-4" />
          Add Event Type
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Event Type</DialogTitle>
            <DialogDescription>
              Create a new trackable event for any module. This will immediately start tracking
              once enabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="moduleName">Module Name *</Label>
              <Input
                id="moduleName"
                placeholder="e.g., wallpaper, song, custom_module"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value.toLowerCase())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type *</Label>
              <Input
                id="eventType"
                placeholder="e.g., view, like, custom_action"
                value={eventType}
                onChange={(e) => setEventType(e.target.value.toLowerCase())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                placeholder="e.g., Wallpaper Views, Custom Action"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this tracks"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon Name (Lucide)</Label>
              <Input
                id="icon"
                placeholder="e.g., Eye, Heart, Download"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Optional: Icon name from Lucide React icons
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0d5e38] hover:bg-[#0a5b34]"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Event Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
