// Spotify-style animated bars to show currently playing song
import React from "react";

interface PlayingIndicatorProps {
  isPlaying: boolean;
  size?: "sm" | "md";
}

export function PlayingIndicator({
  isPlaying,
  size = "sm",
}: PlayingIndicatorProps) {
  const barHeight = size === "sm" ? "h-3" : "h-4";
  const barWidth = size === "sm" ? "w-0.5" : "w-1";

  return (
    <div
      className="flex items-end gap-0.5"
      style={{ height: size === "sm" ? "12px" : "16px" }}
    >
      <div
        className={`${barWidth} ${barHeight} bg-[#ffffff] rounded-full transition-all ${
          isPlaying ? "animate-playing-bar-1" : "opacity-50"
        }`}
        style={{
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      />
      <div
        className={`${barWidth} ${barHeight} bg-[#ffffff] rounded-full transition-all ${
          isPlaying ? "animate-playing-bar-2" : "opacity-50"
        }`}
        style={{
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      />
      <div
        className={`${barWidth} ${barHeight} bg-[#ffffff] rounded-full transition-all ${
          isPlaying ? "animate-playing-bar-3" : "opacity-50"
        }`}
        style={{
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      />
    </div>
  );
}