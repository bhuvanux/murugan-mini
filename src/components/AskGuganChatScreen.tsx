// src/components/AskGuganChatScreen.tsx
// NOTE: I replaced the main image imports to load from ../custom-assets
// (kid-murugan.png, kolam.png, murugan.gif, splash-logo.png).
// A small inline SVG placeholder is provided for safety.

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Send,
  Sparkles,
  Music,
  Calendar,
  MapPin,
  Settings,
  BookOpen,
  Heart,
  Bell,
  ImageIcon as ImageIconGallery,
} from "lucide-react";

/**
 * Replace these imports with files from your `src/custom-assets` folder.
 * Make sure the files exist:
 *  - src/custom-assets/kid-murugan.png
 *  - src/custom-assets/kolam.png
 *  - src/custom-assets/murugan.gif
 *  - src/custom-assets/splash-logo.png
 *
 * If you want different file names, update them here.
 */
// 🔥 Final Asset Mapping (Mapping A – Correct Paths)
import kidMurugan from "../custom-assets/kid-murugan.png";
import imgSparkIcon from "../custom-assets/kolam.png";
import muruganAvatar from "../custom-assets/kid-murugan.png";
import muruganGif from "../custom-assets/murugan.gif";
import imgVelWatermark from "../custom-assets/kolam.png";
import exampleImage from "../custom-assets/splash-logo.png";



/* ---------- If you still have some hashed assets in src/assets you can import them as well.
   For this file I've only switched the primary UI images to custom-assets. ---------- */

// Keep your local project imports as-is:
import {
  SongCard,
  TempleCard,
  PanchangCard,
  ReminderCard,
  StoryCard,
  PlanCard,
} from "./ask-gugan";
import { MusicPlayer } from "./ask-gugan/MusicPlayerIntegration";
import {
  useTTS,
  useGeolocation,
  useCalendar,
  useNotifications,
  useGreetings,
  usePushNotifications,
  useSharing,
  useAnalytics,
  TTSButton,
  LocationButton,
  ShareButton,
  openInGoogleMaps,
  getDirections,
} from "./ask-gugan/AskGuganEnhancements";
import { callMuruganAgent } from "../lib/api/muruganAgent";
import { formatMuruganResponse } from "../lib/aiGuganFormatter";
import { detectIntent } from "../lib/aiGuganIntent";

/* ----------------- Simple inline placeholder (SVG) -----------------
   This prevents runtime breakage if an image fails to load.
   Browsers will still show broken image icon for missing imports at build-time,
   but at runtime <img src={placeholder} /> works as fallback.
*/
const INLINE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 24 24'><rect width='100%' height='100%' fill='#EEE'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='#999'>image missing</text></svg>`,
  );

/* ----------------- Type definitions (unchanged) ----------------- */
interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: string;
  image?: string;
  actionCard?: {
    type:
      | "song_results"
      | "temple_results"
      | "panchang"
      | "reminder_created"
      | "story"
      | "plan_created";
    data: any;
  };
}

interface AskGuganChatScreenProps {
  chatId: string;
  onBack: () => void;
  userId?: string;
}

/* ----------------- Component ----------------- */
export function AskGuganChatScreen({
  chatId,
  onBack,
  userId,
}: AskGuganChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(chatId === "new");
  const [aiProvider, setAiProvider] = useState<"openai" | "gemini">(
    "openai",
  );
  const [conversationId, setConversationId] = useState<string | null>(
    null,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [activeSongs, setActiveSongs] = useState<any[]>([]);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Phase 2 Enhancement Hooks
  const tts = useTTS({
    enabled: true,
    autoPlay: true,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });
  const geolocation = useGeolocation();
  const calendar = useCalendar();
  const notifications = usePushNotifications();
  const sharing = useSharing();
  const analytics = useAnalytics();

  // Tamil greeting messages for AI
  const greetings = [
    "வணக்கம்! 🙏 நான் குகன். உங்களுக்கு ஏதைப் பற்றி வழிகாட்ட வேண்டும்?",
    "முருகனின் அருளால் நலமா? இன்று என்ன உதவி வேண்டும்?",
    "வேல் முருகா! நான் குகன். நீங்கள் என்ன கேட்க விரும்புகிறீர்கள்?",
    "திருச்செந்தூர் முருகனின் கருணையுடன்… எப்படி உதவலாம்?",
  ];

  const getFallbackErrorMessage = (lang: "en" | "ta"): string => {
    if (lang === "ta") {
      return (
        "சிறிய தொழில்நுட்ப பிரச்சனை உள்ளது. தயவு செய்து மீண்டும் முயற்சிக்கவும்.\n" +
        "முருகனின் அருள் உங்களுடன் இருக்கட்டும்."
      );
    }
    return (
      "There seems to be a small technical issue. Please try again.\n" +
      "May Lord Murugan guide you."
    );
  };

  useEffect(() => {
    // Initialize chat
    if (chatId === "new") {
      // New chat - show welcome screen
      setShowWelcome(true);
      setConversationId(null);
      setMessages([]);
    } else {
      // Existing chat - load history
      setShowWelcome(false);
      setConversationId(chatId);
      loadChatHistory();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadChatHistory = async () => {
    // Backend chat history is temporarily disabled; preserve UI with empty state
    if (chatId === "new") {
      return;
    }

    setConversationId(chatId);
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US"; // Can switch to 'ta-IN' for Tamil

        recognition.onstart = () => {
          console.log("Voice recognition started");
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          setTranscript(finalTranscript || interimTranscript);

          // If final transcript, update input
          if (finalTranscript) {
            setInputText(finalTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.error(
            "Speech recognition error:",
            event.error,
          );
          setIsRecording(false);

          if (event.error === "not-allowed") {
            alert(
              "Microphone access denied. Please allow microphone permission to use voice input.",
            );
          }
        };

        recognition.onend = () => {
          console.log("Voice recognition ended");
          setIsRecording(false);
          setTranscript("");
        };

        recognitionRef.current = recognition;
      } else {
        console.warn(
          "Speech Recognition API not supported in this browser",
        );
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startVoiceRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error(
          "Error starting voice recognition:",
          error,
        );
      }
    } else {
      alert(
        "Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.",
      );
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;

      const userMsg: Message = {
        id: Date.now().toString(),
        text: "📷 Image attached",
        sender: "user",
        timestamp: getCurrentTime(),
        image: imageUrl,
      };

      setMessages((prev) => [...prev, userMsg]);

      setTimeout(() => {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: "I can see your image! However, image analysis is not yet implemented. Please describe what you'd like to know about it, and I'll help you.",
          sender: "ai",
          timestamp: getCurrentTime(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 1000);
    };

    reader.readAsDataURL(file);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText;
    setInputText("");
    setIsLoading(true);

    try {
      let aiText = "";

      if (!isOnline) {
        aiText = getFallbackErrorMessage(language);
      } else {
        const { tool, args } = detectIntent(messageText);
        const finalArgs: any = {
          ...(args || {}),
          userId: userId || "anonymous",
          language,
        };

        try {
          const res = await callMuruganAgent<any>(tool, finalArgs);
          aiText = formatMuruganResponse(tool, res.data, language);
        } catch (err: any) {
          console.error("[GUGAN ERROR]", err);
          aiText = getFallbackErrorMessage(language);
        }
      }

      if (showWelcome) {
        setShowWelcome(false);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: "ai",
        timestamp: getCurrentTime(),
      };

      setMessages((prev) => [...prev, aiResponse]);

      if (tts.config.autoPlay && aiResponse.text) {
        setTimeout(
          () => tts.speak(aiResponse.text, aiResponse.id),
          500,
        );
      }

      analytics.trackMessageSent(aiProvider, false);
    } catch (error: any) {
      console.error("[Ask Gugan] Unexpected error in handleSend:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getFallbackErrorMessage(language),
        sender: "ai",
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (prompt: string) => {
    setShowWelcome(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: "user",
      timestamp: getCurrentTime(),
    };

    setMessages([userMessage]);
    setIsLoading(true);

    try {
      let tool: string | null = null;
      let args: any = {};

      const lowerPrompt = prompt.toLowerCase();

      if (lowerPrompt.includes("panchang")) {
        tool = "get_today_panchangam";
      } else if (lowerPrompt.includes("find murugan temples")) {
        tool = "get_temple_info";
        const detectedLocation =
          geolocation.location?.city ||
          geolocation.location?.state ||
          geolocation.location?.country ||
          "Tamil Nadu";
        args = { location: detectedLocation };
      } else if (lowerPrompt.includes("devotional songs")) {
        tool = "get_murugan_songs";
      } else if (
        lowerPrompt.includes("kavacham") ||
        lowerPrompt.includes("kanda sashti") ||
        lowerPrompt.includes("kanda sashti kavacham")
      ) {
        tool = "get_kavacham";
        args = { kavacham_name: "Kanda Sashti Kavacham" };
      } else if (
        lowerPrompt.includes("story about lord murugan") ||
        lowerPrompt.includes("story")
      ) {
        tool = "get_random_story";
      } else if (lowerPrompt.includes("remind me for evening prayers")) {
        tool = "get_pariharam";
        args = { problem_type: "general" };
      } else if (lowerPrompt.includes("plan my pilgrimage")) {
        tool = "get_temple_route_map";
        const detectedLocation =
          geolocation.location?.city ||
          geolocation.location?.state ||
          geolocation.location?.country ||
          "current location";
        args = {
          origin: detectedLocation,
          temple_id: "palani",
        };
      } else if (lowerPrompt.includes("devotional rituals")) {
        tool = "get_spiritual_guidance";
        args = { topic: "rituals" };
      } else if (
        lowerPrompt.includes("significance of vel") ||
        lowerPrompt.includes("vel meaning")
      ) {
        tool = "get_random_fact";
      }

      let aiText: string;

      if (!isOnline) {
        aiText = getFallbackErrorMessage(language);
      } else if (tool) {
        try {
          const result = await callMuruganAgent<any>(tool, args);
          aiText = formatMuruganResponse(tool, result.data, language);
        } catch (apiError: any) {
          console.error(
            `[Ask Gugan Quick Action] murugan_agent error for ${tool}:`,
            apiError,
          );
          aiText = getFallbackErrorMessage(language);
        }
      } else {
        aiText = getFallbackErrorMessage(language);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: "ai",
        timestamp: getCurrentTime(),
      };

      setMessages((prev) => [...prev, aiResponse]);

      if (tts.config.autoPlay && aiResponse.text) {
        setTimeout(
          () => tts.speak(aiResponse.text, aiResponse.id),
          500,
        );
      }

      analytics.trackMessageSent(aiProvider, false);
    } catch (error: any) {
      console.error("[Ask Gugan Quick Action] Unexpected error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getFallbackErrorMessage(language),
        sender: "ai",
        timestamp: getCurrentTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateSeparator = (index: number): string | null => {
    if (index === 0) return "Today";
    return null;
  };

  const renderActionCard = (
    actionCard: NonNullable<Message["actionCard"]>,
  ) => {
    switch (actionCard.type) {
      case "song_results":
        return (
          <div className="space-y-3">
            {actionCard.data.songs?.map(
              (song: any, index: number) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onPlay={() => {
                    setActiveSongs(actionCard.data.songs);
                    setShowMusicPlayer(true);
                    console.log(
                      "Song played:",
                      song.id,
                      song.title,
                    );
                  }}
                  onShare={() => {
                    sharing.share({
                      title: `🎵 ${song.title}`,
                      text: `Listen to this devotional song: ${song.title}`,
                      url: song.embedUrl,
                    });
                    console.log("Song shared:", song.id);
                  }}
                  onLike={() => {
                    console.log("Like song:", song.id);
                  }}
                />
              ),
            )}
          </div>
        );

      case "temple_results":
        return (
          <div className="space-y-3">
            {actionCard.data.temples?.map((temple: any) => (
              <TempleCard
                key={temple.id}
                temple={temple}
                onGetDirections={() =>
                  console.log("Get directions to:", temple.id)
                }
                onBookSlot={() =>
                  console.log("Book slot at:", temple.id)
                }
              />
            ))}
          </div>
        );

      case "panchang":
        return (
          <PanchangCard
            panchang={actionCard.data.data}
            onSetReminder={(time, title) =>
              console.log("Set reminder:", title, time)
            }
          />
        );

      case "reminder_created":
        return (
          <ReminderCard
            reminder={actionCard.data.reminder}
            compact={true}
          />
        );

      case "story":
        return (
          <StoryCard
            story={actionCard.data.story}
            onShare={() =>
              console.log(
                "Share story:",
                actionCard.data.story.id,
              )
            }
            onLike={() =>
              console.log(
                "Like story:",
                actionCard.data.story.id,
              )
            }
          />
        );

      case "plan_created":
        return (
          <PlanCard
            plan={actionCard.data.plan}
            onViewDetails={() =>
              console.log("View plan:", actionCard.data.plan.id)
            }
          />
        );

      default:
        return null;
    }
  };

  /* ----------------- Render ----------------- */
  return (
    <div className="h-screen flex flex-col bg-[#ECE5DD]">
      {/* TOP BAR */}
      <div
        className="h-[64px] flex items-center gap-3 px-4 shadow-sm"
        style={{ background: "#0A5C2E" }}
      >
        <button
          onClick={onBack}
          className="w-[24px] h-[24px] flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors p-1"
        >
          <ArrowLeft className="w-full h-full" />
        </button>

        <div className="w-[40px] h-[40px] rounded-full bg-[#F9C300] flex items-center justify-center overflow-hidden">
          <img
            src={muruganAvatar || INLINE_PLACEHOLDER}
            alt="Gugan"
            className="w-full h-full object-cover"
            onError={(e) =>
              ((e.target as HTMLImageElement).src = INLINE_PLACEHOLDER)
            }
          />
        </div>

        <div className="flex-1">
          <div
            className="text-white"
            style={{
              fontFamily: "TAU_elango_apsara, sans-serif",
            }}
          >
            {language === "ta" ? "குகன்" : "Ask Gugan"}
          </div>
          <div className="text-[12px] text-[#B8D5C5]">
            {language === "ta"
              ? "AI உதவியாளர்"
              : "AI-powered devotional assistant"}
          </div>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center bg-white/20 rounded-full p-1 backdrop-blur-sm">
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              language === "en"
                ? "bg-white text-[#0A5C2E]"
                : "text-white/80"
            }`}
            style={{ fontFamily: "var(--font-english-body)" }}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("ta")}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              language === "ta"
                ? "bg-white text-[#0A5C2E]"
                : "text-white/80"
            }`}
            style={{ fontFamily: "TAU_elango_apsara, sans-serif" }}
          >
            அ
          </button>
        </div>

        {/* Settings icon (hidden for now, can be accessed via long press if needed) */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-[24px] h-[24px] flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Dropdown - Minimal */}
      {showSettings && (
        <div className="absolute right-4 top-[72px] bg-white rounded-2xl shadow-2xl p-4 z-50 w-[240px] border border-gray-100">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
            AI Provider
          </div>
          <select
            value={aiProvider}
            onChange={(e) =>
              setAiProvider(e.target.value as "openai" | "gemini")
            }
            className="w-full p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C2E]/20"
          >
            <option value="openai">OpenAI GPT</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
      )}

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-[16px] py-[24px] space-y-4 bg-gradient-to-b from-[#FFF8F0] to-[#ECE5DD]">
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center h-full space-y-8 px-4">
            {/* Avatar with border */}
            <div className="w-[140px] h-[140px] rounded-full border-4 border-[#0A5C2E] p-1 bg-white shadow-2xl">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    kidMurugan ||
                    INLINE_PLACEHOLDER
                  }
                  alt="Gugan"
                  className="w-full h-full object-cover"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).src =
                      INLINE_PLACEHOLDER)
                  }
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-3">
              <h2
                className="text-[28px]"
                style={{
                  fontFamily: "TAU_elango_apsara, sans-serif",
                  color: "#0A5C2E",
                }}
              >
                {language === "ta" ? "வணக்கம்!" : "வணக்கம்!"} 🙏
              </h2>
              <p
                className="text-[15px] text-gray-700 max-w-[320px] mx-auto leading-relaxed"
                style={{ fontFamily: "var(--font-english-body)" }}
              >
                {language === "ta"
                  ? "நான் குகன், உங்கள் AI வழிகாட்டி. உங்கள் ஆன்மீக பயணத்தில் இன்று எப்படி உதவ முடியும்?"
                  : "I'm Gugan, your AI devotional companion. How can I guide you on your spiritual journey today?"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-[320px] px-[16px] py-[0px] pt-[2px] pr-[16px] pb-[0px] pl-[16px] mt-[0px] mr-[0px] mb-[-80px] ml-[0px]">
              <button
                onClick={() =>
                  handleQuickAction("Find Murugan temples near me")
                }
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Find Temples</span>
              </button>

              <button
                onClick={() =>
                  handleQuickAction("Play Murugan devotional songs")
                }
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <Music className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Devotional Songs</span>
              </button>

              <button
                onClick={() => handleQuickAction("Tell me today's panchang")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Panchang</span>
              </button>

              <button
                onClick={() =>
                  handleQuickAction("Tell me a story about Lord Murugan")
                }
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Stories</span>
              </button>

              <button
                onClick={() => handleQuickAction("Remind me for evening prayers")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Reminders</span>
              </button>

              <button
                onClick={() =>
                  handleQuickAction("Plan my pilgrimage to Arupadai Veedu")
                }
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Plan Trip</span>
              </button>

              <button
                onClick={() => handleQuickAction("Show me devotional rituals")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#0A5C2E]" />
                </div>
                <span className="text-[12px] text-center">Rituals</span>
              </button>

              <button
                onClick={() => handleQuickAction("Explain significance of Vel")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A5C2E]/10 flex items-center justify-center">
                  <img
                    src={imgVelWatermark || INLINE_PLACEHOLDER}
                    alt="Vel"
                    className="w-6 h-6 object-contain"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src = INLINE_PLACEHOLDER)
                    }
                  />
                </div>
                <span className="text-[12px] text-center">Vel Meaning</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={message.id}>
                {getDateSeparator(index) && (
                  <div className="flex justify-center my-4">
                    <div className="bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full text-[12px] text-gray-600">
                      {getDateSeparator(index)}
                    </div>
                  </div>
                )}

                <div
                  className={`flex gap-2 ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.sender === "ai" && (
                    <div className="w-[32px] h-[32px] rounded-full bg-[#0A5C2E] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={muruganAvatar || INLINE_PLACEHOLDER}
                        alt="AI"
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src = INLINE_PLACEHOLDER)
                        }
                      />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-[#DCF8C6]"
                        : "bg-white shadow-sm"
                    }`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Uploaded"
                        className="max-w-full rounded-lg mb-2"
                      />
                    )}
                    {message.text && (
                      <p
                        className={`text-[14px] ${
                          message.sender === "user" ? "text-gray-900" : "text-gray-800"
                        }`}
                        style={{
                          fontFamily: /[\u0B80-\u0BFF]/.test(message.text)
                            ? "TAU_elango_apsara, sans-serif"
                            : "Inter, sans-serif",
                        }}
                      >
                        {message.text}
                      </p>
                    )}
                    {message.actionCard && <div className="mt-3">{renderActionCard(message.actionCard)}</div>}
                    <div className="text-[10px] text-gray-500 mt-1">{message.timestamp}</div>
                  </div>

                  {message.sender === "user" && (
                    <div className="w-[32px] h-[32px] rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px]">👤</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-[32px] h-[32px] rounded-full bg-[#0A5C2E] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={muruganAvatar || INLINE_PLACEHOLDER}
                    alt="AI"
                    className="w-full h-full object-cover"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src = INLINE_PLACEHOLDER)
                    }
                  />
                </div>
                <div className="bg-white shadow-sm rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-[40px] h-[40px] flex items-center justify-center text-[#0A5C2E] hover:bg-gray-100 rounded-full transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={isRecording ? "Listening..." : "Ask Gugan anything..."}
              className="flex-1 bg-transparent outline-none text-[14px]"
              disabled={isRecording}
            />
            <button
              onClick={handleMicClick}
              className={`w-[32px] h-[32px] flex items-center justify-center rounded-full transition-colors ${
                isRecording ? "bg-red-500 text-white animate-pulse" : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="w-[40px] h-[40px] flex items-center justify-center bg-[#0A5C2E] text-white rounded-full hover:bg-[#0D7A3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {isRecording && transcript && <div className="mt-2 text-[12px] text-gray-600 italic">"{transcript}"</div>}
        {!isOnline && <div className="mt-2 text-[12px] text-red-600 text-center">📵 You are offline. Messages will be sent when connection is restored.</div>}
      </div>

      {/* Music Player Overlay */}
      {showMusicPlayer && activeSongs.length > 0 && <MusicPlayer songs={activeSongs} onClose={() => setShowMusicPlayer(false)} />}
    </div>
  );
}
