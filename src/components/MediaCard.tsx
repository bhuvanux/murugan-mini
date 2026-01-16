import React, { useState, useEffect } from 'react';
import { MediaItem } from '../utils/api/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImageOff } from 'lucide-react';
import { analyticsTracker } from '../utils/analytics/useAnalytics';

type MediaCardProps = {
  media: MediaItem;
  onSelect: (media: MediaItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (mediaId: string) => void;
  moduleType?: 'wallpaper' | 'song' | 'video' | 'photo' | 'sparkle';
};

export function MediaCard({ media, onSelect, isFavorite, onToggleFavorite, moduleType = 'wallpaper' }: MediaCardProps) {
  // Track view event when component mounts
  useEffect(() => {
    // Track view event for analytics
    analyticsTracker.track(moduleType, media.id, 'view', {
      title: media.title,
      type: media.type,
      is_video: media.is_video
    }).catch(err => {
      // Silently fail to not break UI
      console.warn('Analytics track failed:', err);
    });
  }, [media.id, moduleType, media.title, media.type, media.is_video]);

  // For videos, use video_url or storage_path
  // For images, use thumbnail_url or storage_path
  const isVideo = media.is_video || media.type === 'video';
  const imageUrl = isVideo
    ? (media.thumbnail_url || media.video_url || media.storage_path || '')
    : (media.thumbnail_url || media.storage_path || '');

  // State to hold actual video duration from metadata
  const [videoDuration] = useState<number | null>(
    media.duration_seconds || null
  );

  return (
    <div
      className="relative cursor-pointer rounded-lg overflow-hidden bg-gray-100 shadow-md transition-shadow"
      onClick={() => {
        // Track click event before onSelect
        analyticsTracker.track(moduleType, media.id, 'click', {
          title: media.title,
          type: media.type
        }).catch(err => {
          console.warn('Analytics click track failed:', err);
        });
        onSelect(media);
      }}
    >
      <div className="relative aspect-[3/4]">
        {imageUrl ? (
          <>
            {isVideo ? (
              // For videos, show thumbnail image with Play overlay
              <div className="relative w-full h-full group">
                <ImageWithFallback
                  src={imageUrl}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border border-white/50">
                    <svg className="w-5 h-5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              // For images, use ImageWithFallback
              <ImageWithFallback
                src={imageUrl}
                alt={media.title}
                className="w-full h-full object-cover"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center p-4">
              <ImageOff className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">No preview</p>
            </div>
          </div>
        )}
        {/* Duration badge at top-left corner - Pinterest style */}
        {isVideo && (
          <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-bold px-2 py-0.5 rounded">
            {videoDuration && videoDuration > 0
              ? formatDuration(videoDuration)
              : '0:00'
            }
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}