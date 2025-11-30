import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Analytics Event Types
export type AnalyticsEvent = 
  | 'message_sent'
  | 'voice_used'
  | 'function_called'
  | 'feature_clicked'
  | 'sentiment_detected'
  | 'error_occurred';

export interface AnalyticsData {
  event_type: AnalyticsEvent;
  user_id: string;
  timestamp: string;
  metadata: Record<string, any>;
}

// Analytics Hook
export function useAnalytics() {
  const trackEvent = async (eventType: AnalyticsEvent, metadata: Record<string, any> = {}, userId: string = 'anonymous') => {
    try {
      const analyticsData: AnalyticsData = {
        event_type: eventType,
        user_id: userId,
        timestamp: new Date().toISOString(),
        metadata,
      };

      // Send to backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/ask-gugan/analytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(analyticsData),
        }
      );

      if (!response.ok) {
        console.error('[Analytics] Failed to track event:', eventType);
      }
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  };

  const trackMessageSent = (method: 'text' | 'voice', aiProvider: string, userId?: string) => {
    trackEvent('message_sent', { method, ai_provider: aiProvider }, userId);
  };

  const trackVoiceUsed = (duration: number, success: boolean, userId?: string) => {
    trackEvent('voice_used', { duration, success }, userId);
  };

  const trackFunctionCall = (functionName: string, success: boolean, latency?: number, userId?: string) => {
    trackEvent('function_called', { 
      function_name: functionName, 
      success, 
      latency_ms: latency 
    }, userId);
  };

  const trackFeatureClick = (featureName: string, userId?: string) => {
    trackEvent('feature_clicked', { feature_name: featureName }, userId);
  };

  const trackSentiment = (message: string, emotion: string, userId?: string) => {
    trackEvent('sentiment_detected', { 
      message_preview: message.substring(0, 50), 
      emotion 
    }, userId);
  };

  const trackError = (errorType: string, errorMessage: string, context?: string, userId?: string) => {
    trackEvent('error_occurred', { 
      error_type: errorType, 
      error_message: errorMessage,
      context 
    }, userId);
  };

  return {
    trackMessageSent,
    trackVoiceUsed,
    trackFunctionCall,
    trackFeatureClick,
    trackSentiment,
    trackError,
  };
}

// Analytics Dashboard Data Fetcher
export function useAnalyticsDashboard(userId?: string) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (timeRange: 'today' | 'week' | 'month' | 'all' = 'week') => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = userId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/ask-gugan/analytics/${userId}?range=${timeRange}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/ask-gugan/analytics/all?range=${timeRange}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err: any) {
      console.error('[Analytics Dashboard] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  return {
    data,
    loading,
    error,
    refresh: fetchAnalytics,
  };
}

// Analytics Summary Component
export function AnalyticsSummary({ userId }: { userId?: string }) {
  const { data, loading, error, refresh } = useAnalyticsDashboard(userId);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
        <p className="text-red-600">Error loading analytics: {error}</p>
        <button
          onClick={() => refresh()}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg space-y-6">
      <h3 className="text-xl text-gray-900">Ask Gugan Analytics</h3>

      {/* Interaction Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
          <p className="text-sm text-gray-600 mb-1">Total Interactions</p>
          <p className="text-2xl text-gray-900">{data.total_interactions || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-sm text-gray-600 mb-1">Active Users</p>
          <p className="text-2xl text-gray-900">{data.active_users || 0}</p>
        </div>
      </div>

      {/* Voice vs Text */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
        <p className="text-sm text-gray-600 mb-3">Voice vs Text</p>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-600">Voice</p>
            <p className="text-lg text-gray-900">{data.voice_percent || 0}%</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Text</p>
            <p className="text-lg text-gray-900">{data.text_percent || 100}%</p>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
        <p className="text-sm text-gray-600 mb-3">Popular Features</p>
        <div className="space-y-2">
          {data.feature_usage && Object.entries(data.feature_usage).map(([feature, count]: [string, any]) => (
            <div key={feature} className="flex justify-between text-sm">
              <span className="text-gray-700 capitalize">{feature.replace('_', ' ')}</span>
              <span className="text-gray-900 font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      {data.sentiment && (
        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl p-4 border border-rose-100">
          <p className="text-sm text-gray-600 mb-3">User Sentiment</p>
          <div className="space-y-2">
            {Object.entries(data.sentiment).map(([emotion, count]: [string, any]) => (
              <div key={emotion} className="flex justify-between text-sm">
                <span className="text-gray-700 capitalize">{emotion}</span>
                <span className="text-gray-900 font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={() => refresh()}
        className="w-full py-3 bg-gradient-to-r from-[#0A5C2E] to-[#0d7a3e] text-white rounded-2xl hover:shadow-lg transition-all"
      >
        Refresh Analytics
      </button>
    </div>
  );
}
