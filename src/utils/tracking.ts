// Unified Tracking Utility - Frontend Helper
import { TrackingModule, TrackingAction, TrackingEvent } from '../types/tracking';
import { projectId, publicAnonKey } from './supabase/info';

class TrackingService {
  private sessionId: string;
  private userId: string | null = null;
  private queue: TrackingEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startAutoFlush();
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('tracking_session_id', sessionId);
    }
    return sessionId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  async track(
    module: TrackingModule,
    action: TrackingAction,
    contentId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: TrackingEvent = {
      module,
      action,
      content_id: contentId,
      user_id: this.userId || undefined,
      session_id: this.sessionId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        referrer: document.referrer,
      },
    };

    this.queue.push(event);

    // If queue is large, flush immediately
    if (this.queue.length >= 10) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/tracking/track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(events[0]), // Send one at a time for now
        }
      );

      if (!response.ok) {
        console.error('[Tracking] Failed to send events:', response.statusText);
        // Re-queue failed events
        this.queue.unshift(...events);
      } else {
        console.log(`[Tracking] ✅ Sent event: ${events[0].module}.${events[0].action}`);
      }
    } catch (error) {
      console.error('[Tracking] Error sending events:', error);
      // Re-queue failed events
      this.queue.unshift(...events);
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

// Global tracking instance
const tracking = new TrackingService();

// Helper functions for common tracking scenarios
export const trackWallpaperView = (wallpaperId: string) => {
  tracking.track('wallpaper', 'view', wallpaperId);
};

export const trackWallpaperLike = (wallpaperId: string) => {
  tracking.track('wallpaper', 'like', wallpaperId);
};

export const trackWallpaperUnlike = (wallpaperId: string) => {
  tracking.track('wallpaper', 'unlike', wallpaperId);
};

export const trackWallpaperDownload = (wallpaperId: string) => {
  tracking.track('wallpaper', 'download', wallpaperId);
};

export const trackWallpaperShare = (wallpaperId: string, method?: string) => {
  tracking.track('wallpaper', 'share', wallpaperId, { share_method: method });
};

export const trackSparkleView = (sparkleId: string) => {
  tracking.track('sparkle', 'view', sparkleId);
};

export const trackSparkleRead = (sparkleId: string, readTime?: number) => {
  tracking.track('sparkle', 'read', sparkleId, { read_time_seconds: readTime });
};

export const trackSparklePlay = (sparkleId: string) => {
  tracking.track('sparkle', 'play', sparkleId);
};

export const trackSongView = (songId: string) => {
  tracking.track('song', 'view', songId);
};

export const trackSongListen = (songId: string, duration?: number) => {
  tracking.track('song', 'listen', songId, { listen_duration_seconds: duration });
};

export const trackSongPlay = (songId: string) => {
  tracking.track('song', 'play', songId);
};

export const trackSongPause = (songId: string) => {
  tracking.track('song', 'pause', songId);
};

export const trackSongSkip = (songId: string) => {
  tracking.track('song', 'skip', songId);
};

export const trackBannerImpression = (bannerId: string) => {
  tracking.track('banner', 'impression', bannerId);
};

export const trackBannerClick = (bannerId: string, targetUrl?: string) => {
  tracking.track('banner', 'click', bannerId, { target_url: targetUrl });
};

export const trackAskGuganConversationStart = () => {
  tracking.track('ask_gugan', 'conversation_start');
};

export const trackAskGuganMessageSent = (messageId?: string, messageLength?: number) => {
  tracking.track('ask_gugan', 'message_sent', messageId, { message_length: messageLength });
};

export const trackAskGuganMessageReceived = (messageId?: string, responseTime?: number) => {
  tracking.track('ask_gugan', 'message_received', messageId, { response_time_ms: responseTime });
};

export const trackLogin = (method?: string) => {
  tracking.track('auth', 'login', undefined, { login_method: method });
};

export const trackSignup = (method?: string) => {
  tracking.track('auth', 'signup', undefined, { signup_method: method });
};

export const trackLogout = () => {
  tracking.track('auth', 'logout');
};

export const trackAppOpen = () => {
  tracking.track('app', 'app_open');
};

export const trackTabSwitch = (tabName: string) => {
  tracking.track('app', 'tab_switch', undefined, { tab_name: tabName });
};

export const setTrackingUserId = (userId: string | null) => {
  tracking.setUserId(userId);
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    tracking.destroy();
  });
}

export default tracking;
