import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface ReelItemBase {
  id: string;
}

interface RenderCardArgs<T extends ReelItemBase> {
  item: T;
  index: number;
  isActive: boolean;
}

interface RenderActionsArgs<T extends ReelItemBase> {
  item: T;
  index: number;
  isActive: boolean;
  isLiked: boolean;
  toggleLike: () => Promise<void>;
}

export interface ReelViewProps<T extends ReelItemBase> {
  items: T[];
  initialIndex?: number;
  onClose?: () => void;
  className?: string;
  actionsClassName?: string;
  storageKey?: string;
  onActiveItemChange?: (item: T, index: number) => void | Promise<void>;
  onItemView?: (item: T, index: number) => void | Promise<void>;
  renderCard: (args: RenderCardArgs<T>) => React.ReactNode;
  renderActions?: (args: RenderActionsArgs<T>) => React.ReactNode;
  onLikeToggle?: (item: T, nextLiked: boolean) => Promise<boolean | void> | boolean | void;
}

const DEFAULT_STORAGE_KEY = "reel_view_likes";

export function ReelView<T extends ReelItemBase>({
  items,
  initialIndex = 0,
  onClose,
  className,
  actionsClassName,
  storageKey = DEFAULT_STORAGE_KEY,
  onActiveItemChange,
  onItemView,
  renderCard,
  renderActions,
  onLikeToggle,
}: ReelViewProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (items.length === 0) return 0;
    return Math.min(initialIndex, items.length - 1);
  });
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return new Set<string>();
      const parsed: string[] = JSON.parse(stored);
      return new Set(parsed);
    } catch (error) {
      console.warn(`[ReelView] Failed to parse liked ids for key ${storageKey}`, error);
      return new Set<string>();
    }
  });

  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((prev) => {
      const next = Math.min(prev, items.length - 1);
      return next < 0 ? 0 : next;
    });
  }, [items.length]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (items.length === 0) return;

    const cardHeight = window.innerHeight;
    containerRef.current.scrollTop = currentIndex * cardHeight;
  }, [items.length, currentIndex]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(likedIds)),
      );
    } catch (error) {
      console.warn(`[ReelView] Failed to persist liked ids for key ${storageKey}`, error);
    }
  }, [likedIds, storageKey]);

  useEffect(() => {
    if (items.length === 0) return;
    const item = items[currentIndex];
    if (!item) return;

    onItemView?.(item, currentIndex);
    onActiveItemChange?.(item, currentIndex);
  }, [currentIndex, items, onActiveItemChange, onItemView]);

  const toggleLike = useCallback(
    async (item: T) => {
      const currentlyLiked = likedIds.has(item.id);
      const nextLiked = !currentlyLiked;

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
        return next;
      });

      try {
        const result = await onLikeToggle?.(item, nextLiked);
        if (result === false) {
          setLikedIds((prev) => {
            const reverted = new Set(prev);
            if (nextLiked) {
              reverted.delete(item.id);
            } else {
              reverted.add(item.id);
            }
            return reverted;
          });
        }
      } catch (error) {
        console.error("[ReelView] onLikeToggle failed", error);
        setLikedIds((prev) => {
          const reverted = new Set(prev);
          if (nextLiked) {
            reverted.delete(item.id);
          } else {
            reverted.add(item.id);
          }
          return reverted;
        });
      }
    },
    [likedIds, onLikeToggle],
  );

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight;
    const nextIndex = Math.round(scrollTop / cardHeight);

    if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < items.length) {
      setCurrentIndex(nextIndex);
    }
  };

  const actionsContainerClass = useMemo(() => {
    return (
      actionsClassName ||
      "flex flex-col-reverse gap-4"
    );
  }, [actionsClassName]);

  const safeTopOffset = "calc(env(safe-area-inset-top, 0px) + 52px)";
  const safeBottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 96px)";

  return (
    <div className={`relative h-screen overflow-hidden bg-black ${className ?? ""}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-all"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg
            className="w-6 h-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item, index) => (
          <div key={item.id} className="h-screen w-full snap-start snap-always relative">
            {renderCard({ item, index, isActive: index === currentIndex })}
          </div>
        ))}
      </div>

      {renderActions && items[currentIndex] && (
        <div
          className={`fixed right-4 z-50 ${actionsContainerClass}`}
          style={{
            top: safeTopOffset,
            bottom: safeBottomOffset,
          }}
        >
          {renderActions({
            item: items[currentIndex],
            index: currentIndex,
            isActive: true,
            isLiked: likedIds.has(items[currentIndex].id),
            toggleLike: () => toggleLike(items[currentIndex]),
          })}
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `,
        }}
      />
    </div>
  );
}
