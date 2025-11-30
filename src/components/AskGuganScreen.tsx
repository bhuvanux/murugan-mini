import React, { useState, useEffect } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import imgSparkIcon from "figma:asset/1c07a5ebea0879d9c6f92eb876c88c63c6de2a3c.png";
import muruganAvatar from "figma:asset/d5f2b8db8be54cd7632e2a54ce5388d6337b0c00.png";
import { OptimizedImage, SmartText } from "./OptimizedImage";
import { AppHeader } from "./AppHeader";
import { projectId, publicAnonKey } from "../utils/supabase/info";

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

  // Load conversations from backend
  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4a075ebc/ask-gugan/conversations/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.conversations) {
        // Transform backend format to frontend format
        const transformedChats: Chat[] = data.conversations.map(
          (conv: any) => ({
            id: conv.id,
            title: conv.title || "New Conversation",
            lastMessage: conv.preview || conv.lastMessage || "",
            timestamp: formatTimestamp(conv.timestamp),
            messageCount: conv.messageCount || 0,
          })
        );

        setChats(transformedChats);
        console.log(
          `[Ask Gugan] ✅ Loaded ${transformedChats.length} conversations`
        );
      } else {
        setChats([]);
      }
    } catch (error: any) {
      console.error("[Ask Gugan] Error loading conversations:", error);
      setError(error.message);
      setChats([]);
    } finally {
      setLoading(false);
    }
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
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0d5e38]" />
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
                    {chat.timestamp}
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
