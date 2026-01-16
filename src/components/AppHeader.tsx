import React from "react";
import kolamPattern from "../assets/kolam.png";
import logoImg from "../assets/splash-logo.png";
import { ArrowLeft } from "lucide-react";

interface AppHeaderProps {
  title?: string;
  icon?: React.ReactNode;
  showKolam?: boolean;
  logoCenter?: boolean;
  variant?: 'primary' | 'white';
  onBack?: () => void;
  children?: React.ReactNode;
}

export function AppHeader({
  title,
  icon,
  showKolam = true,
  logoCenter = false,
  variant = 'primary',
  onBack,
  children,
}: AppHeaderProps) {
  const isWhite = variant === 'white';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-colors ${isWhite ? 'bg-white border-b border-gray-100 shadow-sm' : 'bg-[#0d5e38]'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Wavy Kolam Pattern at the very top */}
      {showKolam && (
        <div className="w-full h-[80px]">
          <img
            src={kolamPattern}
            alt=""
            className="w-full h-full object-cover"
            style={{ display: "block" }}
          />
        </div>
      )}

      {/* Header Content */}
      <div className="flex items-center px-4 py-3 gap-3 min-h-[56px] relative">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-1.5 -ml-1 ${isWhite ? 'text-gray-900' : 'text-white/90'} hover:bg-black/5 rounded-lg transition-colors relative z-10`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}

          {icon && <div className={`${isWhite ? 'text-[#0d5e38]' : 'text-white'} shrink-0 relative z-10`}>{icon}</div>}

          {!logoCenter && title && (
            <h1
              className={`flex-1 text-lg font-bold ${isWhite ? 'text-gray-900' : 'text-white'} mb-0 truncate`}
              style={{ fontFamily: 'var(--font-english)' }}
            >
              {title}
            </h1>
          )}
        </div>

      </div>

      {/* Additional content like search bar */}
      {children && (
        <div className="pb-4 pt-1 px-4">
          {children}
        </div>
      )}
    </div>
  );
}