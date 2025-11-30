// Ask Gugan Enhancements Module - Phase 2 Features
// Includes: TTS, Location, Calendar, Maps, Notifications, Analytics
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MapPin, Calendar, Bell, Share2, BookOpen } from 'lucide-react';

// ========================================
// TEXT-TO-SPEECH UTILITIES
// ========================================

export interface TTSConfig {
  enabled: boolean;
  autoPlay: boolean;
  rate: number;
  pitch: number;
  volume: number;
}

export const useTTS = (initialConfig: TTSConfig = {
  enabled: true,
  autoPlay: false,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
}) => {
  const [config, setConfig] = useState(initialConfig);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  const speak = (text: string, messageId: string) => {
    if (!config.enabled || !text) return;

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detect if text contains Tamil characters
    const hasTamil = /[\u0B80-\u0BFF]/.test(text);
    
    // Set language and voice
    if (hasTamil) {
      utterance.lang = 'ta-IN'; // Tamil (India)
      utterance.rate = 0.85; // Slower for Tamil clarity
    } else {
      utterance.lang = 'en-IN'; // Indian English
      utterance.rate = config.rate;
    }
    
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentMessageId(null);
    };

    utterance.onerror = (event) => {
      console.error('[TTS] Error:', event);
      setIsSpeaking(false);
      setCurrentMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentMessageId(null);
    }
  };

  const toggle = () => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    if (config.enabled) {
      stop();
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, toggle, isSpeaking, currentMessageId, config, setConfig };
};

// ========================================
// GEOLOCATION UTILITIES
// ========================================

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  city?: string;
  state?: string;
  country?: string;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          // Try to get city name using reverse geocoding (optional)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}`
            );
            const data = await response.json();
            locationData.city = data.address?.city || data.address?.town || data.address?.village;
            locationData.state = data.address?.state;
            locationData.country = data.address?.country;
          } catch (err) {
            console.warn('[Geolocation] Reverse geocoding failed:', err);
          }

          setLocation(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };

  return { location, error, loading, getLocation };
};

// ========================================
// CALENDAR INTEGRATION
// ========================================

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  reminder?: number; // minutes before event
}

export const useCalendar = () => {
  const createEvent = (event: CalendarEvent) => {
    // Create .ics file for download
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ask Gugan//Murugan Wallpapers//EN
BEGIN:VEVENT
DTSTART:${formatICSDate(event.startTime)}
DTEND:${formatICSDate(event.endTime)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
${event.reminder ? `BEGIN:VALARM\nTRIGGER:-PT${event.reminder}M\nACTION:DISPLAY\nDESCRIPTION:${event.title}\nEND:VALARM` : ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addToGoogleCalendar = (event: CalendarEvent) => {
    const startTime = formatGoogleDate(event.startTime);
    const endTime = formatGoogleDate(event.endTime);
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`;
    
    window.open(url, '_blank');
  };

  return { createEvent, addToGoogleCalendar };
};

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// ========================================
// GOOGLE MAPS INTEGRATION
// ========================================

export const openInGoogleMaps = (lat: number, lng: number, label?: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `&query_place_id=${encodeURIComponent(label)}` : ''}`;
  window.open(url, '_blank');
};

export const getDirections = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
  window.open(url, '_blank');
};

// ========================================
// PUSH NOTIFICATIONS
// ========================================

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!supported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!supported || permission !== 'granted') return;

    new Notification(title, {
      icon: '/murugan-icon.png',
      badge: '/murugan-badge.png',
      ...options
    });
  };

  const scheduleNotification = (title: string, body: string, delay: number) => {
    setTimeout(() => {
      sendNotification(title, { body });
    }, delay);
  };

  return { permission, supported, requestPermission, sendNotification, scheduleNotification };
};

// ========================================
// SOCIAL SHARING
// ========================================

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

export const useSharing = () => {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  const share = async (data: ShareData): Promise<boolean> => {
    if (!canShare) {
      // Fallback to clipboard
      const shareText = `${data.title}\n\n${data.text}${data.url ? `\n\n${data.url}` : ''}`;
      await navigator.clipboard.writeText(shareText);
      alert('📋 Copied to clipboard!');
      return true;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[Share] Error:', err);
      }
      return false;
    }
  };

  const shareStory = (title: string, content: string) => {
    return share({
      title: `🔱 ${title}`,
      text: content,
      url: window.location.href
    });
  };

  const shareSong = (title: string, youtubeUrl: string) => {
    return share({
      title: `🎵 ${title}`,
      text: `Listen to this devotional song: ${title}`,
      url: youtubeUrl
    });
  };

  return { canShare, share, shareStory, shareSong };
};

// ========================================
// ANALYTICS TRACKING
// ========================================

export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
}

export const useAnalytics = () => {
  const track = async (event: AnalyticsEvent) => {
    try {
      console.log('[Analytics]', event);
      
      // You can integrate with your backend analytics here
      // For now, just log to console
      
      // Example: Send to backend
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   body: JSON.stringify(event)
      // });
    } catch (err) {
      console.error('[Analytics] Error:', err);
    }
  };

  const trackFunctionCall = (functionName: string, success: boolean) => {
    track({
      event: 'function_call',
      category: 'ask_gugan',
      action: functionName,
      label: success ? 'success' : 'failure',
      value: success ? 1 : 0
    });
  };

  const trackMessageSent = (provider: 'openai' | 'gemini', hasImage: boolean) => {
    track({
      event: 'message_sent',
      category: 'ask_gugan',
      action: provider,
      label: hasImage ? 'with_image' : 'text_only',
      value: 1
    });
  };

  const trackVoiceInput = (duration: number) => {
    track({
      event: 'voice_input',
      category: 'ask_gugan',
      action: 'speech_recognition',
      value: duration
    });
  };

  return { track, trackFunctionCall, trackMessageSent, trackVoiceInput };
};

// ========================================
// UI COMPONENTS
// ========================================

export const TTSButton: React.FC<{
  isSpeaking: boolean;
  enabled: boolean;
  onToggle: () => void;
  onStop: () => void;
}> = ({ isSpeaking, enabled, onToggle, onStop }) => {
  return (
    <button
      onClick={isSpeaking ? onStop : onToggle}
      className={`p-2 rounded-lg transition-all ${
        enabled
          ? 'bg-[#0d5e38] text-white'
          : 'bg-gray-200 text-gray-600'
      } ${isSpeaking ? 'animate-pulse' : ''}`}
      title={isSpeaking ? 'Stop speaking' : enabled ? 'Voice enabled' : 'Voice disabled'}
    >
      {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
};

export const LocationButton: React.FC<{
  onClick: () => void;
  loading: boolean;
}> = ({ onClick, loading }) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-2 rounded-lg bg-[#0d5e38] text-white transition-all hover:bg-[#0a4a2b] disabled:opacity-50"
      title="Get current location"
    >
      <MapPin size={20} className={loading ? 'animate-pulse' : ''} />
    </button>
  );
};

export const ShareButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-700"
      title="Share"
    >
      <Share2 size={18} />
    </button>
  );
};

export const CalendarButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-purple-600 text-white transition-all hover:bg-purple-700"
      title="Add to calendar"
    >
      <Calendar size={18} />
    </button>
  );
};
