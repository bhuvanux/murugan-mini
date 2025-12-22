import { cn } from "../../components/ui/utils";

type FailureType = "offline" | "timeout" | "5xx" | "4xx" | "unknown";

type Props = {
  show: boolean;
  failureType?: FailureType;
  className?: string;
};

function getCopy(failureType?: FailureType): { title: string; body: string } {
  if (failureType === "offline") {
    return {
      title: "இணையம் கிடைக்கவில்லை",
      body: "இப்போது இணையம் இல்லை போலிருக்கிறது. இணையம் வந்தவுடன் மீண்டும் முயற்சி செய்யலாம். 🙏",
    };
  }

  if (failureType === "timeout" || failureType === "5xx") {
    return {
      title: "சேவை தாமதமாகிறது",
      body: "சற்று நேரம் கழித்து மீண்டும் முயற்சி செய்யலாம். முருகன் அருள் துணை. 🙏",
    };
  }

  return {
    title: "இப்போது காண்பிக்க முடியவில்லை",
    body: "சற்று நேரம் கழித்து மீண்டும் முயற்சி செய்யலாம். 🙏",
  };
}

export function NetworkErrorFallback({ show, failureType, className }: Props) {
  if (!show) return null;

  const copy = getCopy(failureType);

  return (
    <div
      className={cn(
        "mx-3 my-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-semibold">{copy.title}</div>
      <div className="mt-1 text-sm text-rose-900/90">{copy.body}</div>
    </div>
  );
}
