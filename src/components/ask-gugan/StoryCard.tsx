import React, { useState } from 'react';
import { BookOpen, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface StoryCardProps {
  story: {
    id: string;
    title: string;
    topic: string;
    content: string;
    length?: 'short' | 'medium' | 'long';
    tags?: string[];
  };
  onShare?: () => void;
  onLike?: () => void;
}

export function StoryCard({ story, onShare, onLike }: StoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (onLike) onLike();
  };

  const handleShare = () => {
    if (onShare) onShare();
  };

  const getLengthBadge = (length?: string) => {
    switch (length) {
      case 'short': return { label: 'Quick Read', color: 'bg-green-100 text-green-700' };
      case 'long': return { label: 'Long Read', color: 'bg-orange-100 text-orange-700' };
      case 'medium':
      default: return { label: 'Medium Read', color: 'bg-blue-100 text-blue-700' };
    }
  };

  const badge = getLengthBadge(story.length);

  // Show preview (first 200 chars) or full content
  const contentPreview = story.content.substring(0, 200);
  const shouldShowReadMore = story.content.length > 200;

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-amber-50/50 to-white border-[#0d5e38]/10">
      {/* Header with Icon */}
      <div className="p-4 bg-gradient-to-r from-[#0d5e38]/5 to-[#0d5e38]/10 border-b border-[#0d5e38]/10">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-[#0d5e38]/20">
            <BookOpen className="w-5 h-5 text-[#0d5e38]" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-[#0d5e38] mb-1">
              {story.title}
            </h3>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs ${badge.color}`}>
                {badge.label}
              </span>
              
              {story.tags && story.tags.length > 0 && (
                <>
                  {story.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 rounded-full bg-[#0d5e38]/10 text-[#0d5e38] text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="p-4">
        <div className={`text-gray-700 text-sm leading-relaxed whitespace-pre-line ${
          !isExpanded ? 'line-clamp-6' : ''
        }`}>
          {isExpanded ? story.content : contentPreview}
          {!isExpanded && shouldShowReadMore && '...'}
        </div>

        {/* Read More / Less Button */}
        {shouldShowReadMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-[#0d5e38] hover:bg-[#0d5e38]/10 w-full"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Read More
              </>
            )}
          </Button>
        )}

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Moral/Teaching Badge */}
        {story.content.includes('Moral:') && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200">
            <div className="text-xs text-amber-800 mb-1">🙏 Teaching</div>
            <div className="text-sm text-amber-900">
              {story.content.split('Moral:')[1]?.trim() || 'Wisdom from Lord Murugan'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLike}
            className={`flex-1 ${
              isLiked 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'border-[#0d5e38]/20 text-[#0d5e38]'
            }`}
          >
            <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-red-600' : ''}`} />
            {isLiked ? 'Liked' : 'Like'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="flex-1 border-[#0d5e38]/20 text-[#0d5e38]"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>

        {/* Blessing */}
        <div className="mt-4 text-center">
          <p className="text-sm text-[#0d5e38] italic">
            🙏 Om Muruga 🙏
          </p>
        </div>
      </div>
    </Card>
  );
}
