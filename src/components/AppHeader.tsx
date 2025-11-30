import React from "react";
import kolamPattern from "figma:asset/b3ac2b3a02519330f1ea65a656a1877f2890715f.png";

interface AppHeaderProps {
  title: string;
  icon?: React.ReactNode;
  showKolam?: boolean;
  children?: React.ReactNode;
}

export function AppHeader({
  title,
  icon,
  showKolam = true,
  children,
}: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-[#0d5e38]">
      {/* Wavy Kolam Pattern at the very top */}
      {showKolam && (
        <div className="w-full h-auto">
          <img
            src={kolamPattern}
            alt=""
            className="w-full h-auto object-cover"
            style={{ display: "block" }}
          />
        </div>
      )}

      {/* Header Content */}

      {/* Additional content like search bar */}
      {children && (
        <div className="pb-[16px] pt-[16px] pr-[16px] pl-[16px] p-[16px]">
          {children}
        </div>
      )}
    </div>
  );
}