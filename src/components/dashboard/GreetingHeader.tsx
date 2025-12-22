import React from "react";
import kolamPattern from "@/custom-assets/kolam.png";

function getTamilGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "காலை வணக்கம்! 🙏";
  if (hour < 17) return "மதிய வணக்கம்! 🙏";
  return "மாலை வணக்கம்! 🙏";
}

export function GreetingHeader() {
  const [greeting, setGreeting] = React.useState(() => getTamilGreeting(new Date()));

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setGreeting(getTamilGreeting(new Date()));
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="sticky top-0 z-40 bg-[#0d5e38]">
      <div className="w-full h-auto">
        <img
          src={kolamPattern}
          alt=""
          className="w-full h-auto object-cover"
          style={{ display: "block" }}
        />
      </div>

      <div className="px-5 pt-4 pb-6">
        <div
          style={{
            fontFamily: "var(--font-tamil-bold)",
            fontSize: "clamp(26px, 8vw, 40px)",
            lineHeight: 1.05,
            color: "#FFCC2D",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {greeting}
        </div>
      </div>
    </div>
  );
}
