import React from 'react';
import muruganImage from 'figma:asset/d5f2b8db8be54cd7632e2a54ce5388d6337b0c00.png';

type MuruganLoaderProps = {
  size?: number;
  className?: string;
};

export function MuruganLoader({ size = 40, className = '' }: MuruganLoaderProps) {
  return (
    <div className={`inline-block ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <style>{`
          @keyframes muruganPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
              filter: drop-shadow(0 0 0px rgba(13, 94, 56, 0));
            }
            50% {
              transform: scale(1.15);
              opacity: 0.85;
              filter: drop-shadow(0 0 12px rgba(13, 94, 56, 0.6));
            }
          }
        `}</style>
        <img
          src={muruganImage}
          alt="Loading..."
          className="w-full h-full"
          style={{
            animation: 'muruganPulse 1.5s ease-in-out infinite'
          }}
        />
      </div>
    </div>
  );
}
