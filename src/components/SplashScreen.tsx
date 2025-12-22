import { useEffect } from 'react';
import muruganGif from "../custom-assets/murugan.gif";
import tkmLogo from "../assets/TKM_White.png";

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
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-[120px] h-[120px]">
          <img 
            src={muruganGif}
            alt="Lord Murugan" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="w-[90px] max-w-[70vw]">
          <img
            src={tkmLogo}
            alt="Murugan"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}