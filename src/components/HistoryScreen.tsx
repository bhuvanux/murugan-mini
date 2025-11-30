import React from 'react';
import { Clock, Image, Music } from 'lucide-react';

interface HistoryItem {
  id: string;
  type: 'photo' | 'song';
  title: string;
  thumbnail: string;
  viewedAt: string;
}

// Sample history data
const SAMPLE_HISTORY: HistoryItem[] = [
  {
    id: '1',
    type: 'photo',
    title: 'Lord Murugan with Peacock',
    thumbnail: 'https://images.unsplash.com/photo-1604608672516-f5f1d33637e5?w=400',
    viewedAt: '2 hours ago',
  },
  {
    id: '2',
    type: 'song',
    title: 'Murugan Kavasam',
    thumbnail: 'https://images.unsplash.com/photo-1514820720301-4c4790309f46?w=400',
    viewedAt: '5 hours ago',
  },
  {
    id: '3',
    type: 'photo',
    title: 'Temple Architecture',
    thumbnail: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400',
    viewedAt: 'Yesterday',
  },
  {
    id: '4',
    type: 'photo',
    title: 'Divine Murugan',
    thumbnail: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400',
    viewedAt: 'Yesterday',
  },
  {
    id: '5',
    type: 'song',
    title: 'Vel Vel Muruga',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    viewedAt: '2 days ago',
  },
];

export function HistoryScreen() {
  return (
    <div className="px-4 pb-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-gray-900">Recently Viewed</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your viewing history from the last 30 days
        </p>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {SAMPLE_HISTORY.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="absolute top-1 right-1 bg-white/90 rounded-full p-1">
                {item.type === 'photo' ? (
                  <Image className="w-3 h-3 text-green-600" />
                ) : (
                  <Music className="w-3 h-3 text-green-600" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm text-gray-900 truncate">{item.title}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-500">{item.viewedAt}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon Banner */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Clock className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-green-900 mb-2">Full History Coming Soon</h3>
        <p className="text-sm text-green-700">
          Connect with Supabase to track your complete viewing history
        </p>
      </div>

      {/* Clear History Button */}
      <button className="w-full mt-4 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
        Clear History
      </button>
    </div>
  );
}
