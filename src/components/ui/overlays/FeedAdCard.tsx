import React from 'react';
import { ExternalLink, MoreHorizontal, Heart, MessageCircle, Send } from 'lucide-react';
import mockAdImage from '../../../assets/mock_ad_murugan.png';
import adAvatar from '../../../assets/icon.png';

export function FeedAdCard() {
    return (
        <div className="w-full bg-white mb-2 pb-2">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100">
                        <img
                            src={adAvatar}
                            alt="Brand Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1">
                            <span className="text-[14px] font-semibold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                                Tamil Kadavul Murugan
                            </span>
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg viewBox="0 0 12 12" className="w-2 h-2 text-white fill-current">
                                    <path d="M10.2 3.6l-5.4 5.4-2.4-2.4c-.2-.2-.2-.5 0-.7.2-.2.5-.2.7 0l1.7 1.7 4.7-4.7c.2-.2.5-.2.7 0 .2.2.2.5 0 .7z" />
                                </svg>
                            </div>
                        </div>
                        <span className="text-[12px] text-gray-500 font-normal">Sponsored</span>
                    </div>
                </div>
                <button className="text-gray-900">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Media */}
            <div className="w-full relative aspect-square bg-gray-100">
                <img
                    src={mockAdImage}
                    alt="Advertisement"
                    className="w-full h-full object-cover"
                />

                {/* Instagram-style "Learn More" overlay strip */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#262626] py-3.5 px-4 flex items-center justify-between cursor-pointer active:bg-[#303030]">
                    <span className="text-[14px] font-semibold text-white">Learn more</span>
                    <ExternalLink size={16} className="text-white" />
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-4">
                    <Heart size={24} className="text-gray-900 stroke-[1.5]" />
                    <MessageCircle size={24} className="text-gray-900 stroke-[1.5] -rotate-90" />
                    <Send size={24} className="text-gray-900 stroke-[1.5]" />
                </div>
            </div>

            {/* Caption */}
            <div className="px-3 pb-2 space-y-1">
                <div className="text-[14px] text-gray-900 font-semibold">
                    1,204 likes
                </div>
                <div className="text-[14px] leading-snug">
                    <span className="font-semibold text-gray-900 mr-1.5">Tamil Kadavul Murugan</span>
                    <span className="text-gray-900">Experience divine wallpapers and soulful devotional songs daily. Download the app now! 🙏✨</span>
                </div>
                <div className="text-[14px] text-gray-500 font-medium pt-1">
                    See translation
                </div>
            </div>
        </div>
    );
}
