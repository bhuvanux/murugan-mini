import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import muruganAvatar from "../custom-assets/kid-murugan.png";
import { OptimizedImage, SmartText } from "./OptimizedImage";
import { AppHeader } from "./AppHeader";
import { MuruganLoader } from "./MuruganLoader";

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread?: boolean;
  avatar?: string;
  messageCount?: number;
}

interface AskGuganScreenProps {
  onStartChat: (chatId: string) => void;
  userId?: string;
}

export function AskGuganScreen({
  onStartChat,
  userId = "anonymous",
}: AskGuganScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load conversations (stubbed while backend is being refactored)
  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    // For now, do not call any backend. Keep UI intact with an empty list.
    setError(null);
    setChats([]);
    setLoading(false);
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "long" });
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "";
    }
  };

  const filteredChats = chats.filter(
    (chat) =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#EFF5EF]">
      {/* SECTION A - HEADER WITH SEARCH IN GREEN BACKGROUND */}
      <div className="bg-[#0d5e38] pb-4">
        <AppHeader title="Ask Gugan" />

        {/* SECTION B - SEARCH BAR (Inside Green Background) */}
        <div className="px-[20px] mt-[14px]">
          <div className="h-[44px] bg-white rounded-[24px] flex items-center px-[16px] gap-3 shadow-sm">
            <Search className="w-[20px] h-[20px] text-[#57666B] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[15px] text-gray-800 placeholder:text-[#88979E]"
              style={{
                fontFamily: "var(--font-english-body)",
              }}
            />
          </div>
        </div>
      </div>

      {/* SECTION C - CHAT LIST */}
      <div className="bg-white min-h-[calc(100vh-200px)]">
        {loading ? (
          <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-6">
            <MuruganLoader variant="page" />
            <p className="text-gray-500 mt-4">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center px-6">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadConversations}
              className="px-4 py-2 bg-[#0d5e38] text-white rounded-lg hover:bg-[#0a4d2e] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="py-20 text-center px-6">
            {chats.length === 0 ? (
              <>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#0d5e38] to-[#0a4d2e] flex items-center justify-center">
                  <img
                    src={muruganAvatar}
                    alt="Gugan"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                </div>
                <h3
                  className="text-[20px] mb-2"
                  style={{
                    fontFamily: "TAU_elango_apsara, sans-serif",
                    color: "#0d5e38",
                  }}
                >
                  வணக்கம்! 🙏
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Start your first conversation with Ask Gugan - your AI
                  devotional companion for Lord Murugan
                </p>
                <button
                  onClick={() => onStartChat("new")}
                  className="px-6 py-3 bg-[#F9C300] text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Start New Chat
                </button>
              </>
            ) : (
              <p className="text-gray-400">
                No conversations found matching "{searchQuery}"
              </p>
            )}
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <button
              key={chat.id}
              onClick={() => onStartChat(chat.id)}
              className="w-full h-[72px] px-[20px] flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors relative"
            >
              {/* Left: Avatar */}
              <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center flex-shrink-0">
                {chat.avatar ? (
                  <OptimizedImage
                    src={chat.avatar}
                    alt={chat.title}
                    type="avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <img
                    src={muruganAvatar}
                    alt=""
                    className="w-[48px] h-[48px] rounded-full object-cover"
                  />
                )}
              </div>

              {/* Center: Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-[2px]">
                  <SmartText
                    variant="subtitle"
                    className="text-[16px] text-gray-900 truncate font-semibold"
                  >
                    {chat.title}
                  </SmartText>
                  <span className="text-[12px] text-[#6B767E] ml-2 flex-shrink-0 font-english-body">
                    {formatTimestamp(chat.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SmartText
                    variant="body"
                    className="text-[14px] text-gray-500 truncate"
                  >
                    {chat.lastMessage}
                  </SmartText>
                  {chat.unread && (
                    <div className="w-[20px] h-[20px] rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-bold">
                        1
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Divider */}
              {index < filteredChats.length - 1 && (
                <div className="absolute bottom-0 left-[76px] right-0 h-[1px] bg-[#EAEAEA]" />
              )}
            </button>
          ))
        )}
      </div>

      {/* SECTION D - FLOATING NEW CHAT BUTTON */}
      {!loading && (
        <button
          onClick={() => onStartChat("new")}
          className="fixed bottom-[100px] right-[20px] w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50"
          style={{ background: "#F9C300" }}
        >
          <Plus className="w-[26px] h-[26px] text-white" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
