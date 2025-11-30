// USER PANEL - UPDATED SparkScreen.tsx
// Replace your existing SparkScreen.tsx with this file

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  ExternalLink,
  Heart,
  Sparkles,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner@2.0.3";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { userAPI, SparkleArticle } from "../utils/api/client";
import { MuruganLoader } from "./MuruganLoader";
import { analyticsTracker } from "../utils/analytics/useAnalytics";

export function SparkScreen() {
  const [articles, setArticles] = useState<SparkleArticle[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedArticles, setLikedArticles] = useState<
    Set<string>
  >(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadArticles();
    // Load liked articles from localStorage
    const saved = localStorage.getItem("likedArticles");
    if (saved) {
      setLikedArticles(new Set(JSON.parse(saved)));
    }
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      console.log(
        "[SparkScreen] Loading articles from admin backend...",
      );

      const result = await userAPI.getSparkleArticles({
        page: 1,
        limit: 50,
      });

      console.log(
        `[SparkScreen] Loaded ${result.data.length} articles`,
      );
      setArticles(result.data || []);

      if (result.data.length === 0) {
        console.log('No articles yet. Check back later!');
      }
    } catch (error) {
      console.error("Error loading articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / cardHeight);

    if (
      newIndex !== currentIndex &&
      newIndex >= 0 &&
      newIndex < articles.length
    ) {
      setCurrentIndex(newIndex);
    }
  };

  const toggleLike = async (articleId: string) => {
    const isLiked = likedArticles.has(articleId);
    
    try {
      // Optimistic update
      setLikedArticles((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(articleId);
        } else {
          newSet.add(articleId);
        }
        localStorage.setItem(
          "likedArticles",
          JSON.stringify(Array.from(newSet)),
        );
        return newSet;
      });

      // Track like/unlike on backend using new unified analytics
      if (isLiked) {
        await analyticsTracker.untrack('sparkle', articleId, 'like');
        toast.success("Removed from favorites");
      } else {
        await analyticsTracker.track('sparkle', articleId, 'like');
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      setLikedArticles((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(articleId);
        } else {
          newSet.delete(articleId);
        }
        localStorage.setItem(
          "likedArticles",
          JSON.stringify(Array.from(newSet)),
        );
        return newSet;
      });
    }
  };

  const handleShare = async (article: SparkleArticle) => {
    try {
      // Track share using new unified analytics
      await analyticsTracker.track('sparkle', article.id, 'share');
      
      const shareData = {
        title: article.title,
        text: article.snippet,
        url: article.url,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        // Fallback: create a temporary textarea to copy
        const textToCopy = `${article.title}\n\n${article.url}`;
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          toast.success("Link copied to clipboard!");
        } catch (e) {
          console.error('Failed to copy link');
          toast.error("Failed to copy link");
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing:", error);
        toast.error("Failed to share");
      }
    }
  };

  const handleReadFull = async (url: string, articleId: string) => {
    if (url && url !== "#") {
      // Track view/read using new unified analytics
      await analyticsTracker.track('sparkle', articleId, 'read');
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#0d5e38] to-black">
        <div className="flex justify-center pt-12 pb-4">
          <MuruganLoader size={50} />
        </div>
        <div className="text-center">
          <p className="text-white text-sm">
            Loading divine updates...
          </p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-[#0d5e38] to-black px-4">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">
            No articles yet
          </h3>
          <p className="text-white/80 mb-4">
            Check back later for divine updates
          </p>
          <Button
            onClick={loadArticles}
            className="bg-white text-[#0d5e38] hover:bg-white/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {articles.map((article, index) => (
          <div
            key={article.id}
            className="h-screen w-full snap-start snap-always relative"
          >
            <ArticleCard
              article={article}
              isActive={index === currentIndex}
              formatDate={formatDate}
            />
          </div>
        ))}
      </div>

      {/* Fixed Action Buttons - Aligned with description bottom */}
      {articles.length > 0 && (
        <div className="fixed right-4 bottom-40 flex flex-col-reverse gap-4 z-50 p-[0px] m-[0px]">
          {/* Like Button */}
          <button
            onClick={() => toggleLike(articles[currentIndex].id)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Heart
                className={`w-6 h-6 transition-all ${
                  likedArticles.has(articles[currentIndex].id)
                    ? "fill-red-500 text-red-500"
                    : "text-white group-hover:scale-110"
                }`}
              />
            </div>
          </button>

          {/* WhatsApp Share Button */}
          <button
            onClick={() => handleShare(articles[currentIndex])}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
              <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </div>
          </button>

          {/* Read Article Button */}
          <button
            onClick={() => handleReadFull(articles[currentIndex].url, articles[currentIndex].id)}
            className="group"
          >
            <div className="w-14 h-14 rounded-full bg-[#0d5e38] hover:bg-[#0a5b34] flex items-center justify-center transition-all border border-[#0d5e38]/50 group-hover:scale-110">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}

interface ArticleCardProps {
  article: SparkleArticle;
  isActive: boolean;
  formatDate: (date: string) => string;
}

function ArticleCard({
  article,
  isActive,
  formatDate,
}: ArticleCardProps) {
  return (
    <div className="relative w-full h-full">
      {/* Hero Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/95" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 pt-20 pb-40">
        {/* Top Content */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={
            isActive
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: -20 }
          }
          transition={{ duration: 0.5 }}
        >
          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-[#0d5e38]/90 backdrop-blur-sm text-white text-xs font-semibold rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Bottom Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={
            isActive
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 20 }
          }
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          {/* Title */}
          <h2 className="text-white text-2xl font-extrabold leading-tight line-clamp-3 pr-20">
            {article.title}
          </h2>

          {/* Snippet - with proper width to avoid icon overlap */}
          <p className="text-white/90 text-base leading-relaxed line-clamp-4 pr-20 max-w-[calc(100%-80px)] mb-0">
            {article.snippet || article.content}
          </p>
        </motion.div>
      </div>
    </div>
  );
}