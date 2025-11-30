import React, { useEffect } from 'react';
import imgMurugan from "figma:asset/aefa8dc74d7f949c3233faf44a28b2568db3db4f.png";

interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    if (!onComplete) return;
    
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="bg-[#084C28] fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Centered Murugan Image */}
      <div className="w-[240px] h-[240px]">
        <img 
          src={imgMurugan}
          alt="Lord Murugan" 
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}