import React from "react";
import { ArrowLeft } from "lucide-react";

export function GreenHeader({
  title,
  onBack,
  rightSlot,
  backgroundColor = "#0d5e38",
  titleFontFamily = "var(--font-tamil-bold)",
  layout,
  paddingBottom,
  backTitleGap,
}: {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  backgroundColor?: string;
  titleFontFamily?: string;
  layout?: "center" | "left";
  paddingBottom?: number;
  backTitleGap?: number;
}) {
  const computedLayout: "center" | "left" = layout ?? (onBack ? "left" : "center");
  const computedPaddingBottom = paddingBottom ?? 20;
  const computedBackTitleGap = backTitleGap ?? 6;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 px-4"
      style={{
        backgroundColor,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
        paddingBottom: computedPaddingBottom,
      }}
    >
      {computedLayout === "left" ? (
        <div className="flex items-center">
          <div className="flex min-w-0 flex-1 items-center" style={{ gap: computedBackTitleGap }}>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="-ml-2 flex items-center justify-center p-2"
                aria-label="Back"
              >
                <ArrowLeft className="w-6 h-6" style={{ color: "#FFFFFF" }} />
              </button>
            ) : null}

            <div
              className="min-w-0 text-left"
              style={{
                fontFamily: titleFontFamily,
                fontSize: 26,
                lineHeight: 1.25,
                color: "#FFFFFF",
                paddingBottom: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
          </div>

          {rightSlot ? <div className="ml-2 flex-shrink-0">{rightSlot}</div> : null}
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-0 flex items-center justify-center p-2"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" style={{ color: "#FFFFFF" }} />
            </button>
          ) : null}

          <div
            className="w-full px-12 text-center"
            style={{
              fontFamily: titleFontFamily,
              fontSize: 26,
              lineHeight: 1.25,
              color: "#FFFFFF",
              paddingBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>

          {rightSlot ? <div className="absolute right-0">{rightSlot}</div> : null}
        </div>
      )}
    </div>
  );
}
