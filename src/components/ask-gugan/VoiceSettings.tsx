import React from "react";
import { Volume2, Mic, Music as MusicIcon, Gauge } from "lucide-react";

export interface VoiceConfig {
  voice_enabled: boolean;
  voice_gender: "female_tamil" | "male_tamil" | "default";
  chant_bg: boolean;
  voice_speed: "slow" | "normal" | "fast";
  voice_pitch: number;
  voice_volume: number;
  chant_volume: number;
  language: "ta-IN" | "en-US";
}

interface VoiceSettingsProps {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
  language?: "en" | "ta";
}

export function VoiceSettings({ config, onChange, language = "en" }: VoiceSettingsProps) {
  const labels = {
    en: {
      title: "Voice Settings",
      enableVoice: "Enable Voice Output",
      voiceType: "Voice Type",
      femaleTamil: "Female Tamil (Recommended)",
      maleTamil: "Male Tamil",
      default: "Default English",
      backgroundChant: "Background Chanting",
      chantDesc: "Soft \"Om Saravanabhava\" chant in background",
      speed: "Voice Speed",
      slow: "Slow & Clear",
      normal: "Normal",
      fast: "Fast",
      volume: "Voice Volume",
      chantVol: "Chant Volume",
      preview: "Preview Voice",
      note: "Note: Voice features work best on Chrome, Edge, and Safari browsers.",
    },
    ta: {
      title: "குரல் அமைப்புகள்",
      enableVoice: "குரல் வெளியீடு இயக்கு",
      voiceType: "குரல் வகை",
      femaleTamil: "தமிழ் பெண் குரல் (பரிந்துரை)",
      maleTamil: "தமிழ் ஆண் குரல்",
      default: "இங்கிலீஷ் குரல்",
      backgroundChant: "பின்னணி ஜபம்",
      chantDesc: "மெதுவான \"ஓம் சரவணபவ\" ஜபம்",
      speed: "குரல் வேகம்",
      slow: "மெதுவாக",
      normal: "இயல்பான",
      fast: "வேகமாக",
      volume: "குரல் ஒலி",
      chantVol: "ஜப ஒலி",
      preview: "குரல் முன்பார்வை",
      note: "குறிப்பு: Chrome, Edge, Safari உலாவிகளில் சிறப்பாக செயல்படும்.",
    },
  };

  const t = labels[language];

  const updateConfig = (updates: Partial<VoiceConfig>) => {
    onChange({ ...config, ...updates });
  };

  const previewVoice = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        config.language === 'ta-IN'
          ? 'வணக்கம்! நான் குகன். உங்களுக்கு எப்படி உதவ முடியும்?'
          : 'Hello! I am Gugan. How can I help you today?'
      );
      
      utterance.lang = config.language;
      utterance.rate = config.voice_speed === 'slow' ? 0.8 : config.voice_speed === 'fast' ? 1.2 : 1.0;
      utterance.pitch = config.voice_pitch;
      utterance.volume = config.voice_volume;

      // Try to find a female Tamil voice if available
      const voices = window.speechSynthesis.getVoices();
      const tamilVoice = voices.find(v => 
        v.lang.includes('ta') || v.lang.includes('IN')
      );
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A5C2E] to-[#0d7a3e] px-6 py-4">
        <div className="flex items-center gap-3">
          <Volume2 className="w-6 h-6 text-white" />
          <h3 className="text-white text-lg" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
            {t.title}
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Enable Voice Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-gray-900 mb-1" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
              {t.enableVoice}
            </p>
          </div>
          <button
            onClick={() => updateConfig({ voice_enabled: !config.voice_enabled })}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              config.voice_enabled ? 'bg-[#0A5C2E]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                config.voice_enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {config.voice_enabled && (
          <>
            {/* Voice Type Selection */}
            <div className="space-y-3">
              <label className="text-sm text-gray-700" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                {t.voiceType}
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => updateConfig({ voice_gender: 'female_tamil', language: 'ta-IN' })}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                    config.voice_gender === 'female_tamil'
                      ? 'border-[#0A5C2E] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      config.voice_gender === 'female_tamil' ? 'border-[#0A5C2E]' : 'border-gray-300'
                    }`}>
                      {config.voice_gender === 'female_tamil' && (
                        <div className="w-3 h-3 rounded-full bg-[#0A5C2E]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                        {t.femaleTamil}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => updateConfig({ voice_gender: 'male_tamil', language: 'ta-IN' })}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                    config.voice_gender === 'male_tamil'
                      ? 'border-[#0A5C2E] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      config.voice_gender === 'male_tamil' ? 'border-[#0A5C2E]' : 'border-gray-300'
                    }`}>
                      {config.voice_gender === 'male_tamil' && (
                        <div className="w-3 h-3 rounded-full bg-[#0A5C2E]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                        {t.maleTamil}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => updateConfig({ voice_gender: 'default', language: 'en-US' })}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                    config.voice_gender === 'default'
                      ? 'border-[#0A5C2E] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      config.voice_gender === 'default' ? 'border-[#0A5C2E]' : 'border-gray-300'
                    }`}>
                      {config.voice_gender === 'default' && (
                        <div className="w-3 h-3 rounded-full bg-[#0A5C2E]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontFamily: "var(--font-english-body)" }}>
                        {t.default}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Background Chanting */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MusicIcon className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-gray-900" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                      {t.backgroundChant}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                    {t.chantDesc}
                  </p>
                </div>
                <button
                  onClick={() => updateConfig({ chant_bg: !config.chant_bg })}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    config.chant_bg ? 'bg-amber-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                      config.chant_bg ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.chant_bg && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-700" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                    {t.chantVol}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.chant_volume * 100}
                    onChange={(e) => updateConfig({ chant_volume: Number(e.target.value) / 100 })}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>{Math.round(config.chant_volume * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Speed */}
            <div className="space-y-3">
              <label className="text-sm text-gray-700 flex items-center gap-2" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                <Gauge className="w-4 h-4 text-gray-600" />
                {t.speed}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['slow', 'normal', 'fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => updateConfig({ voice_speed: speed })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      config.voice_speed === speed
                        ? 'border-[#0A5C2E] bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm text-center" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                      {t[speed]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Volume */}
            <div className="space-y-3">
              <label className="text-sm text-gray-700 flex items-center gap-2" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
                <Volume2 className="w-4 h-4 text-gray-600" />
                {t.volume}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.voice_volume * 100}
                onChange={(e) => updateConfig({ voice_volume: Number(e.target.value) / 100 })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0A5C2E]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>{Math.round(config.voice_volume * 100)}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Preview Button */}
            <button
              onClick={previewVoice}
              className="w-full py-4 bg-gradient-to-r from-[#0A5C2E] to-[#0d7a3e] text-white rounded-2xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}
            >
              <Mic className="w-5 h-5" />
              {t.preview}
            </button>
          </>
        )}

        {/* Note */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-800" style={{ fontFamily: language === "ta" ? "TAU_elango_apsara, sans-serif" : "var(--font-english-body)" }}>
            ℹ️ {t.note}
          </p>
        </div>
      </div>
    </div>
  );
}
