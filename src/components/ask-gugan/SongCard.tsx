import React, { useState, useEffect } from 'react';
import { Play, Heart, Share2, ExternalLink } from 'lucide-react';
import { analyticsTracker } from '../../utils/analytics/useAnalytics';

interface SongCardProps {
  song: {
    id: string;
    title: string;
    description?: string;
    embedUrl: string;
    thumbnail?: string;
    duration?: number;
    tags?: string[];
  };
  onPlay?: () => void;
  onShare?: () => void;
  onLike?: () => void;
}

export function SongCard({ song, onPlay, onShare, onLike }: SongCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  // Track view when component mounts
  useEffect(() => {
    analyticsTracker.track('song', song.id, 'view', {
      title: song.title,
      duration: song.duration,
      has_thumbnail: !!song.thumbnail
    }).catch(err => {
      console.warn('Analytics track failed:', err);
    });
  }, [song.id, song.title, song.duration, song.thumbnail]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    
    // Track like/unlike event
    if (!isLiked) {
      analyticsTracker.track('song', song.id, 'like').catch(console.warn);
    } else {
      analyticsTracker.untrack('song', song.id, 'like').catch(console.warn);
    }
    
    if (onLike) onLike();
  };

  const handlePlay = () => {
    // Track play event
    analyticsTracker.track('song', song.id, 'play').catch(console.warn);
    
    if (onPlay) onPlay();
  };

  const handleShare = () => {
    // Track share event
    analyticsTracker.track('song', song.id, 'share').catch(console.warn);
    
    if (onShare) onShare();
  };

  const handleOpenYouTube = () => {
    // Track YouTube open event
    analyticsTracker.track('song', song.id, 'open_in_youtube').catch(console.warn);
    window.open(song.embedUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* Thumbnail with Play Overlay - Compact */}
      <div className="relative h-40 bg-gradient-to-br from-[#0d5e38]/10 to-[#0d5e38]/5">
        {song.thumbnail && (
          <img 
            src={song.thumbnail} 
            alt={song.title}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Play Button Overlay */}
        <div 
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-full bg-[#0d5e38] flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>

      {/* Song Info - Compact */}
      <div className="p-3">
        <h3 className="text-[#0d5e38] line-clamp-2 mb-1 text-sm leading-snug">
          {song.title}
        </h3>
        
        {song.description && (
          <p className="text-gray-500 text-xs mb-2 line-clamp-1">
            {song.description}
          </p>
        )}

        {/* Tags - Compact */}
        {song.tags && song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {song.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-full bg-[#0d5e38]/10 text-[#0d5e38] text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons - Horizontal Layout */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlay}
            className="flex-1 bg-[#0d5e38] hover:bg-[#0a4a2a] text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" fill="white" />
            <span>Play</span>
          </button>

          <button
            onClick={handleLike}
            className={`p-2 rounded-lg border transition-colors ${
              isLiked 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {song.embedUrl && (
            <button
              onClick={handleOpenYouTube}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
