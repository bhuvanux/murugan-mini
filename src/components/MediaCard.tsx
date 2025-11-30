import React, { useState, useRef } from 'react';
import { MediaItem } from '../utils/api/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ImageOff } from 'lucide-react';

type MediaCardProps = {
  media: MediaItem;
  onSelect: (media: MediaItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (mediaId: string) => void;
};

export function MediaCard({ media, onSelect, isFavorite, onToggleFavorite }: MediaCardProps) {
  // For videos, use video_url or storage_path
  // For images, use thumbnail_url or storage_path
  const isVideo = media.is_video || media.type === 'video';
  const imageUrl = isVideo 
    ? (media.thumbnail_url || media.video_url || media.storage_path || '')
    : (media.thumbnail_url || media.storage_path || '');
  
  // State to hold actual video duration from metadata
  const [videoDuration, setVideoDuration] = useState<number | null>(
    media.duration_seconds || null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Extract duration from video metadata when loaded
  const handleVideoMetadataLoaded = () => {
    if (videoRef.current && videoRef.current.duration) {
      const duration = Math.floor(videoRef.current.duration);
      setVideoDuration(duration);
      console.log('[MediaCard] Extracted video duration:', {
        id: media.id,
        title: media.title,
        duration_seconds: duration
      });
    }
  };
  
  return (
    <div
      className="relative cursor-pointer rounded-lg overflow-hidden bg-gray-100 shadow-md transition-shadow"
      onClick={() => onSelect(media)}
    >
      <div className="relative aspect-[3/4]">
        {imageUrl ? (
          <>
            {isVideo ? (
              // For videos, show video element muted as thumbnail
              <video
                ref={videoRef}
                src={imageUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={handleVideoMetadataLoaded}
              />
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