

interface AdCTAProps {
    text?: string;
    onClick?: () => void;
    className?: string;
}

export function AdCTA({ text = "Install Now", onClick, className = "" }: AdCTAProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            className={`bg-[#0d5e38] text-white px-6 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all hover:bg-[#0a4d2c] ${className}`}
        >
            {text}
        </button>
    );
}
