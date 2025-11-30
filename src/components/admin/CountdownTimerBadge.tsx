import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerBadgeProps {
  scheduledAt: string;
  wallpaperId?: string;
  onTimeUp?: (wallpaperId?: string) => void;
}

export function CountdownTimerBadge({ scheduledAt, wallpaperId, onTimeUp }: CountdownTimerBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const targetTime = new Date(scheduledAt).getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft("Publishing...");
        if (onTimeUp) {
          onTimeUp(wallpaperId);
        }
        return;
      }

      // Calculate time components
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Format the display
      if (days > 0) {
        setTimeLeft(`${days}d : ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setTimeLeft(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [scheduledAt, onTimeUp]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isExpired
          ? "bg-green-100 text-green-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{isExpired ? "Publishing..." : `${timeLeft} left`}</span>
    </div>
  );
}
