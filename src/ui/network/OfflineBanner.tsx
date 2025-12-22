import { cn } from "../../components/ui/utils";

type Props = {
  isOffline: boolean;
  className?: string;
  message?: string;
};

export function OfflineBanner({
  isOffline,
  className,
  message = "இணையம் இல்லை. கடைசியாக சேமிக்கப்பட்ட தகவல்கள் காட்டப்படுகின்றன 🙏",
}: Props) {
  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <div className="mt-[2px] h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <div className="leading-5">{message}</div>
      </div>
    </div>
  );
}
