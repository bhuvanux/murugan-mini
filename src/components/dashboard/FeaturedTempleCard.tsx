import { ArrowRight } from "lucide-react";
import loginCover from "@/custom-assets/Login-cover.png";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

export function FeaturedTempleCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-black/5 shadow-[0px_10px_28px_rgba(0,0,0,0.10)] bg-gradient-to-r from-[#FFF4F7] to-[#EAF2FF]">
      <div className="relative min-h-[150px]">
        <div className="p-5 pr-[140px]">
          <div className="text-[16px] text-gray-900" style={{ fontFamily: "var(--font-tamil-bold)" }}>
            புதுமைப்பட்ற முருகன் ஆலயம்:
          </div>

          <div className="mt-2 text-[13px] text-gray-800" style={{ fontFamily: "var(--font-tamil)" }}>
            வேலூர் மாவட்டம், மேல்மாயில் –
            மலையிறுடும் மலை – சத்தியவேல்
            முருகன் கோவில்
          </div>

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-[13px] text-[#C1121F]"
            style={{ fontFamily: "var(--font-tamil-bold)" }}
          >
            கோவிலை பற்றி அறிய
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-[150px]">
          <ImageWithFallback
            src={loginCover}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
