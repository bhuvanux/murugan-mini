import React from "react";
import { Calendar, Clock, Sun, Moon, Star } from "lucide-react";

interface PanchangData {
  date: string;
  day: string;
  location?: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  rahuKalam?: string;
  yamagandam?: string;
  gulikai?: string;
  auspicious_times?: Array<{
    name: string;
    time: string;
    description?: string;
  }>;
  tamilMonth?: string;
  tamilYear?: string;
  guidance?: string;
}

interface PanchangCardProps {
  panchang: PanchangData;
  onSetReminder?: (time: string, title: string) => void;
  language?: "en" | "ta";
}

export function PanchangCard({ panchang, onSetReminder, language = "en" }: PanchangCardProps) {
  const labels = {
    en: {
      title: "Today's Panchangam",
      tithi: "Tithi",
      nakshatra: "Nakshatra",
      yoga: "Yoga",
      karana: "Karana",
      sun: "Sun",
      moon: "Moon",
      rise: "Rise",
      set: "Set",
      auspiciousTimes: "Auspicious Times",
      rahuKalam: "Rahu Kalam",
      yamagandam: "Yamagandam",
      guidance: "Murugan Guidance for Today",
      tamilMonth: "Tamil Month",
    },
    ta: {
      title: "இன்றைய பஞ்சாங்கம்",
      tithi: "திதி",
      nakshatra: "நட்சத்திரம்",
      yoga: "யோகம்",
      karana: "கரணம்",
      sun: "சூரியன்",
      moon: "சந்திரன்",
      rise: "உதயம்",
      set: "அஸ்தமனம்",
      auspiciousTimes: "நல்ல நேரங்கள்",
      rahuKalam: "ராகு காலம்",
      yamagandam: "எமகண்டம்",
      guidance: "இன்றைய முருகன் வழிகாட்டுதல்",
      tamilMonth: "தமிழ் மாதம்",
    },
  };

  const t = labels[language];

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-white to-orange-50/30 rounded-3xl overflow-hidden shadow-lg border border-orange-100/50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0A5C2E] to-[#0d7a3e] px-6 py-4 relative overflow-hidden">
        {/* Vel watermark pattern - subtle */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 transform rotate-12">
            <div className="w-full h-full bg-white rounded-full"></div>
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-white" />
            <h3 className="text-white text-lg" style={{ fontFamily: "var(--font-english-body)" }}>
              {t.title}
            </h3>
          </div>
          <p className="text-white/90 text-sm" style={{ fontFamily: "var(--font-english-body)" }}>
            {panchang.day}, {panchang.date}
          </p>
          {panchang.location && (
            <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
              <span>📍</span> {panchang.location}
            </p>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3">
        {/* Tithi & Nakshatra Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/50">
            <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: "var(--font-english-body)" }}>
              {t.tithi}
            </p>
            <p className="text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
              {panchang.tithi}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/50">
            <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: "var(--font-english-body)" }}>
              {t.nakshatra}
            </p>
            <p className="text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
              {panchang.nakshatra}
            </p>
          </div>
        </div>

        {/* Yoga & Karana Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/50">
            <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: "var(--font-english-body)" }}>
              {t.yoga}
            </p>
            <p className="text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
              {panchang.yoga}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/50">
            <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: "var(--font-english-body)" }}>
              {t.karana}
            </p>
            <p className="text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
              {panchang.karana}
            </p>
          </div>
        </div>

        {/* Sun & Moon Times */}
        {(panchang.sunrise || panchang.moonrise) && (
          <div className="grid grid-cols-2 gap-3">
            {panchang.sunrise && panchang.sunset && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-gray-600" style={{ fontFamily: "var(--font-english-body)" }}>
                    {t.sun}
                  </p>
                </div>
                <p className="text-xs text-gray-700">
                  {t.rise}: {panchang.sunrise}
                </p>
                <p className="text-xs text-gray-700">
                  {t.set}: {panchang.sunset}
                </p>
              </div>
            )}
            
            {panchang.moonrise && panchang.moonset && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-gray-600" style={{ fontFamily: "var(--font-english-body)" }}>
                    {t.moon}
                  </p>
                </div>
                <p className="text-xs text-gray-700">
                  {t.rise}: {panchang.moonrise}
                </p>
                <p className="text-xs text-gray-700">
                  {t.set}: {panchang.moonset}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Auspicious Times */}
        {panchang.auspicious_times && panchang.auspicious_times.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <p className="text-sm text-gray-900" style={{ fontFamily: "var(--font-english-body)" }}>
                {t.auspiciousTimes}
              </p>
            </div>
            <div className="space-y-2">
              {panchang.auspicious_times.map((time, index) => (
                <div key={index} className="bg-white/60 rounded-xl p-3 border border-green-100/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 mb-1" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                        {time.name}
                      </p>
                      {time.description && (
                        <p className="text-xs text-gray-600" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                          {time.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-green-600" />
                      <p className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: "var(--font-english-body)" }}>
                        {time.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inauspicious Times */}
        {(panchang.rahuKalam || panchang.yamagandam) && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border border-red-100/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-sm">⚠</span>
              </div>
              <p className="text-sm text-gray-900" style={{ fontFamily: "var(--font-english-body)" }}>
                {language === "en" ? "Avoid These Times" : "தவிர்க்க வேண்டிய நேரங்கள்"}
              </p>
            </div>
            <div className="space-y-2">
              {panchang.rahuKalam && (
                <div className="flex items-center justify-between bg-white/60 rounded-xl p-2 border border-red-100/50">
                  <p className="text-sm text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                    {t.rahuKalam}
                  </p>
                  <p className="text-xs text-gray-700" style={{ fontFamily: "var(--font-english-body)" }}>
                    {panchang.rahuKalam}
                  </p>
                </div>
              )}
              {panchang.yamagandam && (
                <div className="flex items-center justify-between bg-white/60 rounded-xl p-2 border border-red-100/50">
                  <p className="text-sm text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                    {t.yamagandam}
                  </p>
                  <p className="text-xs text-gray-700" style={{ fontFamily: "var(--font-english-body)" }}>
                    {panchang.yamagandam}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tamil Month & Year */}
        {(panchang.tamilMonth || panchang.tamilYear) && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100/50">
            <p className="text-xs text-gray-600 mb-1" style={{ fontFamily: "var(--font-english-body)" }}>
              {t.tamilMonth}
            </p>
            <p className="text-gray-900" style={{ fontFamily: "TAU_elango_apsara, sans-serif" }}>
              {panchang.tamilMonth} {panchang.tamilYear && `- ${panchang.tamilYear}`}
            </p>
          </div>
        )}

        {/* Divine Guidance Card */}
        {panchang.guidance && (
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-200/50 relative overflow-hidden">
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-100/30 to-transparent rounded-bl-full"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                  {t.guidance}
                </p>
              </div>
              <p className="text-gray-800 leading-relaxed" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                {panchang.guidance}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
