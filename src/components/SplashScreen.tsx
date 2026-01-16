import React, { useEffect } from 'react';
import imgSplashLogo from "../assets/splash-logo.png";

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
    <div className="bg-[#084C28] fixed inset-0 z-[9999] flex items-center justify-center p-8">
      {/* Centered Splash Logo */}
      <div className="w-full max-w-[280px] aspect-square relative animate-pulse">
        <img
          src={imgSplashLogo}
          alt="Tamil Kadavul Murugan"
          className="w-full h-full object-contain filter drop-shadow-2xl"
        />
      </div>
    </div>
  );
}