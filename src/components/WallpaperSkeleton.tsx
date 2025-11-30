import React from 'react';
import muruganImage from 'figma:asset/d5f2b8db8be54cd7632e2a54ce5388d6337b0c00.png';

type WallpaperSkeletonProps = {
  className?: string;
};

export function WallpaperSkeleton({ className = '' }: WallpaperSkeletonProps) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Shimmer background */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes muruganFloat {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.7;
          }
        }
      `}</style>
      
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, #e8f5e9 0%, #c8e6c9 25%, #e8f5e9 50%, #c8e6c9 75%, #e8f5e9 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s linear infinite'
        }}
      />
      
      {/* Centered Murugan loader */}
      <div 
        className="absolute top-1/2 left-1/2"
        style={{
          transform: 'translate(-50%, -50%)',
          animation: 'muruganFloat 2s ease-in-out infinite'
        }}
      >
        <img
          src={muruganImage}
          alt=""
          className="w-12 h-12"
        />
      </div>
    </div>
  );
}
